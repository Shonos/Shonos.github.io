import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';

export function interpolateText(text, identity) {
    const tokens = {
        name: identity.name,
        firstName: identity.name.trim().split(/\s+/)[0],
        role: identity.role,
        email: identity.email,
        city: identity.location.city,
        country: identity.location.country,
        timezone: identity.location.timezone,
        location: `${identity.location.city}, ${identity.location.country}`
    };
    if (/[{}]/.test(text.replace(/\{[A-Za-z]+\}/g, ''))) {
        throw new Error('use single-brace identity placeholders, not nested templates');
    }
    return text.replace(/\{([A-Za-z]+)\}/g, (match, key) => {
        if (!Object.prototype.hasOwnProperty.call(tokens, key)) {
            throw new Error(`unknown identity placeholder ${match}`);
        }
        return tokens[key];
    });
}

export async function validateContent(content, root = process.cwd()) {
    let schema;
    try {
        schema = JSON.parse(await readFile(resolve(root, 'content/site.schema.json'), 'utf8'));
    } catch (error) {
        throw new Error(`content/site.schema.json: ${error.message}`, { cause: error });
    }
    const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);
    if (!validate(content)) {
        const errors = validate.errors.map(error => {
            const field = error.params.missingProperty || error.params.additionalProperty;
            const path = `${error.instancePath}${field ? `/${field}` : ''}` || '/';
            return `${path}: ${error.message}`;
        });
        throw new Error(`Content validation failed:\n${errors.join('\n')}`);
    }

    const errors = [];
    const ids = new Set();
    const routes = new Set();
    content.navigation.forEach((item, index) => {
        if (ids.has(item.id)) errors.push(`/navigation/${index}/id: duplicate navigation id "${item.id}"`);
        if (routes.has(item.route)) errors.push(`/navigation/${index}/route: duplicate route "${item.route}"`);
        ids.add(item.id);
        routes.add(item.route);
    });
    for (const id of ['about', 'services', 'skills', 'experience', 'projects', 'contact']) {
        if (!ids.has(id)) errors.push(`/navigation: missing section reference "${id}"`);
    }
    const links = [
        ['/hero/cta/target', content.hero.cta.target],
        ...['hero', 'services', 'skills', 'experience', 'projects', 'contact'].map(section => [
            `/${section}/next/target`, content[section].next.target
        ])
    ];
    for (const [path, target] of links) {
        if (!ids.has(target)) errors.push(`${path}: unknown navigation target "${target}"`);
    }

    const urls = [
        ['/identity/url', content.identity.url],
        ...content.social.map((item, index) => [`/social/${index}/url`, item.url]),
        ...content.experience.items.map((item, index) => [`/experience/items/${index}/url`, item.url]),
        ...content.projects.items.map((item, index) => [`/projects/items/${index}/url`, item.url])
    ];
    for (const [path, value] of urls) {
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password ||
                /[\s\\<>"'`\u0000-\u001f\u007f]/.test(value) || !/^https?:\/\/[^/]/.test(value)) {
                throw new Error('must be an absolute HTTP(S) URL without credentials or unsafe characters');
            }
            if (path === '/identity/url' && (url.pathname !== '/' || url.search || url.hash)) {
                throw new Error('must be the site origin without a path, query, or fragment');
            }
        } catch (error) {
            errors.push(`${path}: ${error.message}`);
        }
    }

    const interpolated = [
        ['/metadata/title', content.metadata.title],
        ['/identity/image/alt', content.identity.image.alt],
        ['/ui/chatTitle', content.ui.chatTitle],
        ['/contact/locationNote', content.contact.locationNote],
        ['/footer', content.footer],
        ...content.chat.welcome.map((message, index) => [`/chat/welcome/${index}/text`, message.text]),
        ...content.chat.responses.map((response, index) => [`/chat/responses/${index}/text`, response.text]),
        ['/chat/fallback', content.chat.fallback]
    ];
    for (const [path, text] of interpolated) {
        try {
            interpolateText(text, content.identity);
        } catch (error) {
            errors.push(`${path}: ${error.message}`);
        }
    }

    const assets = [
        ['/identity/image/src', content.identity.image.src],
        ['/identity/favicon', content.identity.favicon]
    ];
    for (const [path, asset] of assets) {
        try {
            const publicRoot = await realpath(resolve(root, 'public'));
            const assetPath = await realpath(resolve(publicRoot, asset));
            const localPath = relative(publicRoot, assetPath);
            if (isAbsolute(localPath) || localPath === '..' || localPath.startsWith(`..${sep}`) ||
                !(await stat(assetPath)).isFile()) {
                throw new Error('not a regular file inside public');
            }
        } catch {
            errors.push(`${path}: asset must exist as a regular file inside public: ${asset}`);
        }
    }
    if (errors.length) throw new Error(`Content validation failed:\n${errors.join('\n')}`);
    return content;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    try {
        const content = JSON.parse(await readFile(resolve('content/site.json'), 'utf8'));
        await validateContent(content);
        console.log('Content is valid.');
    } catch (error) {
        console.error(`Content validation failed: ${error.message}`);
        process.exitCode = 1;
    }
}
