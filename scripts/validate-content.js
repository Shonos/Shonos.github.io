import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import { MIGRATION_STAGES } from '../src/migration-state.js';
import { AGENT_WORKFLOW_NODES, AGENT_WORKFLOW_ROUTES } from '../src/agent-workflow-state.js';

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
    // Copy dictionaries use typed additionalProperties for their text fields.
    // Required keys are still enforced, including those not listed in properties.
    const validate = new Ajv({ allErrors: true, strict: true, strictRequired: false }).compile(schema);
    if (!validate(content)) {
        const errors = validate.errors.map(error => {
            const field = error.params.missingProperty || error.params.additionalProperty;
            const path = `${error.instancePath}${field ? `/${field}` : ''}` || '/';
            return `${path}: ${error.message}`;
        });
        throw new Error(`Content validation failed:\n${errors.join('\n')}`);
    }

    const errors = [];
    content.migration.stages.forEach((stage, index) => {
        if (stage.id !== MIGRATION_STAGES[index].id) errors.push(`/migration/stages/${index}/id: migration stages must follow build, check, share, retire`);
    });
    if (new Set(content.orchestration.nodes.map(node => node.id)).size !== AGENT_WORKFLOW_NODES.length) {
        errors.push('/orchestration/nodes: each workflow role must appear exactly once');
    }
    if (new Set(content.orchestration.routes.map(route => route.id)).size !== Object.keys(AGENT_WORKFLOW_ROUTES).length) {
        errors.push('/orchestration/routes: each workflow route must appear exactly once');
    }
    content.orchestration.routes.forEach((route, index) => {
        const expected = AGENT_WORKFLOW_ROUTES[route.id].stages;
        if (route.stages.length !== expected.length || route.stages.some((stage, step) => stage.id !== expected[step].id)) {
            errors.push(`/orchestration/routes/${index}/stages: handoffs must follow the workflow model`);
        }
    });
    const ids = new Set();
    content.navigation.forEach((item, index) => {
        if (ids.has(item.id)) errors.push(`/navigation/${index}/id: duplicate navigation id "${item.id}"`);
        ids.add(item.id);
    });
    const slugs = new Set();
    content.work.cases.forEach((item, index) => {
        if (slugs.has(item.slug)) errors.push(`/work/cases/${index}/slug: duplicate case-study slug`);
        slugs.add(item.slug);
        if (!item.media || !Object.hasOwn(content.media, item.media)) errors.push(`/work/cases/${index}/media: unknown media slot`);
    });
    if (!slugs.has(content.hero.proofSlug)) errors.push('/hero/proofSlug: featured visual must link to a known case study');
    for (const [key, item] of Object.entries(content.media)) {
        if (item.kind === 'image' && !/\.(?:avif|jpe?g|png|webp)$/.test(item.src || '')) errors.push(`/media/${key}/src: image must use a web image format`);
        if (item.kind === 'video' && (!item.src?.endsWith(item.mime === 'video/mp4' ? '.mp4' : '.webm'))) errors.push(`/media/${key}/src: video extension must match its MIME type`);
    }
    if (!['workflow', 'orchestration'].includes(content.media.agents.layout) ||
        (content.media.agents.layout === 'workflow' && content.media.agents.nodes.length !== content.ai.workflow.length)) {
        errors.push('/media/agents: workflow nodes must match the explanatory steps');
    }
    for (const route of ['/about', '/services', '/skills', '/experience', '/projects', '/contact']) {
        if (!Object.hasOwn(content.legacyRoutes, route)) errors.push(`/legacyRoutes: missing legacy route "${route}"`);
    }

    const urls = [
        ['/identity/url', content.identity.url],
        ...content.social.map((item, index) => [`/social/${index}/url`, item.url]),
        ...content.ai.stories.flatMap((item, index) => item.url ? [[`/ai/stories/${index}/url`, item.url]] : [])
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
        ['/ui/copyright', content.ui.copyright]
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
        ['/identity/favicon', content.identity.favicon],
        ...Object.entries(content.brands || {}).flatMap(([name, mark]) => [
            [`/brands/${name}/src`, mark.src],
            ...(mark.darkSrc ? [[`/brands/${name}/darkSrc`, mark.darkSrc]] : [])
        ]),
        ...Object.entries(content.media).flatMap(([key, item]) => ['src', 'poster', 'captions']
            .filter(field => item[field]).map(field => [`/media/${key}/${field}`, item[field]])),
        ...Object.entries(content.media).flatMap(([key, item]) => (item.images || []).map((image, index) => [`/media/${key}/images/${index}/src`, image.src]))
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
