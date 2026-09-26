import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Handlebars from 'handlebars';
import { interpolateText, validateContent } from './validate-content.js';

function scriptJson(value) {
    const escapes = {
        '<': '\\u003c',
        '>': '\\u003e',
        '&': '\\u0026',
        '\u2028': '\\u2028',
        '\u2029': '\\u2029'
    };
    return new Handlebars.SafeString(JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => escapes[character]));
}

export async function loadContent(root = process.cwd()) {
    let content;
    try {
        content = JSON.parse(await readFile(resolve(root, 'content/site.json'), 'utf8'));
    } catch (error) {
        throw new Error(`content/site.json: ${error.message}`, { cause: error });
    }
    return validateContent(content, root);
}

export function renderTemplate(html, content, base = '/') {
    if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) {
        throw new Error('base must be a rooted directory path with a trailing slash');
    }
    const templates = Handlebars.create();
    const rootedAsset = path => {
        if (!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(path)) {
            throw new Error(`Invalid public asset path: ${path}`);
        }
        return `${base}${path}`;
    };
    const text = value => interpolateText(value, content.identity);
    templates.registerHelper('base', rootedAsset);
    templates.registerHelper('text', text);

    const runtimeConfig = {
        name: content.identity.name,
        email: content.identity.email,
        analytics: {
            measurementId: content.analytics.measurementId,
            allowedHosts: [...content.analytics.allowedHosts]
        },
        chat: {
            enabled: content.chat.enabled,
            welcome: content.chat.welcome.map(message => ({ text: text(message.text), delay: message.delay })),
            responses: content.chat.responses.map(response => ({ keywords: [...response.keywords], text: text(response.text) })),
            fallback: text(content.chat.fallback)
        }
    };
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: content.identity.name,
        jobTitle: content.identity.role,
        url: content.identity.url,
        sameAs: content.social.map(profile => profile.url),
        knowsAbout: [...content.metadata.knowsAbout],
        description: content.metadata.description
    };
    return templates.compile(html, { strict: true })({
        ...content,
        location: `${content.identity.location.city}, ${content.identity.location.country}`,
        openGraphImage: new URL(rootedAsset(content.identity.image.src), content.identity.url).href,
        structuredData: scriptJson(structuredData),
        runtimeConfig: scriptJson(runtimeConfig)
    });
}

export async function renderContent(html, root = process.cwd(), base = '/') {
    return renderTemplate(html, await loadContent(root), base);
}
