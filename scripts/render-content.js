import { readFile, readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import Handlebars from 'handlebars';
import { interpolateText, validateContent } from './validate-content.js';

const partialDirectory = new URL('../templates/', import.meta.url);
async function readPartials() {
    return Object.fromEntries(await Promise.all((await readdir(partialDirectory))
        .filter(file => file.endsWith('.html'))
        .map(async file => [basename(file, '.html'), await readFile(new URL(file, partialDirectory), 'utf8')])));
}
const partials = await readPartials();

const paths = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    external: '<path d="M14 4h6v6m0-6L10 14m0-10H4v16h16v-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h9v9M6 9v9h9"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
};

function scriptJson(value) {
    const escapes = { '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };
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

export function renderTemplate(html, content, base = '/', entry = '/', pagePartials = partials, options = {}) {
    if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) {
        throw new Error('base must be a rooted directory path with a trailing slash');
    }
    const templates = Handlebars.create();
    templates.registerPartial(pagePartials);
    const text = value => interpolateText(value, content.identity);
    const rootedAsset = path => {
        if (!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(path)) {
            throw new Error(`Invalid public asset path: ${path}`);
        }
        return `${base}${path}`;
    };
    templates.registerHelper('base', rootedAsset);
    templates.registerHelper('text', text);
    templates.registerHelper('icon', name => {
        if (!Object.hasOwn(paths, name)) throw new Error(`Unknown icon: ${name}`);
        return new Handlebars.SafeString(`<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`);
    });
    templates.registerHelper('mail', subject => `mailto:${content.identity.email}?subject=${encodeURIComponent(subject)}`);
    const match = entry.match(/^\/?work\/([a-z0-9-]+)(?:\/index\.html|\/)?$/);
    const study = match ? content.work.cases.find(story => story.slug === match[1]) : null;
    if (match && !study) throw new Error(`Unknown case study: ${match[1]}`);
    const profile = /^\/?profile(?:\/index\.html|\/)?$/.test(entry);
    const pagePath = study ? `work/${study.slug}/` : profile ? 'profile/' : '';
    const page = {
        review: options.review === true,
        title: study ? `${study.shortTitle} | ${content.identity.name}` : profile ?
            `${content.ui.profileTitle} | ${content.identity.name}` : text(content.metadata.title),
        description: study?.summary || (profile ? content.ui.profileDescription : content.metadata.description),
        canonical: new URL(`${base}${pagePath}`, content.identity.url).href,
        home: pagePath ? base : '',
        kind: study ? 'case-study' : profile ? 'profile' : 'home'
    };
    const structuredData = {
        '@context': 'https://schema.org', '@type': 'Person',
        name: content.identity.name, jobTitle: content.identity.role, url: content.identity.url,
        sameAs: content.social.map(item => item.url), knowsAbout: [...content.metadata.knowsAbout],
        description: content.metadata.description
    };
    const runtimeConfig = {
        name: content.identity.name,
        email: content.identity.email,
        analytics: content.analytics,
        legacyRoutes: content.legacyRoutes
    };
    const media = Object.fromEntries(Object.entries(content.media).map(([key, item]) => {
        const hasAsset = item.publish === true && item.kind !== 'pending' && Boolean(item.kind === 'gallery' ? item.images?.length : item.src);
        return [key, { ...item, hasAsset, image: hasAsset && item.kind === 'image', video: hasAsset && item.kind === 'video',
            gallery: hasAsset && item.kind === 'gallery', orchestration: item.layout === 'orchestration',
            migration: item.layout === 'migration',
            reviewPlaceholder: page.review && !hasAsset && item.reviewed !== true }];
    }));
    const reviewLinks = { career: `${base}profile/#review-career`, availability: `${base}#review-availability`, 'case-studies': `${base}#review-case-studies` };
    const reviewChecks = Object.fromEntries(Object.entries(content.review).map(([key, check]) => [key,
        page.review && !check.resolved ? { ...check, key, href: reviewLinks[key] } : null]));
    const reviewItems = Object.values(reviewChecks).filter(Boolean);
    const pendingMedia = Object.entries(media).filter(([, item]) => item.reviewPlaceholder).map(([key, item]) => ({ key, ...item }));
    const work = { ...content.work, cases: content.work.cases.map(item => ({ ...item,
        featuredInHero: media.featured.hasAsset && media[item.media]?.hasAsset && item.slug === content.hero.proofSlug
    })) };
    return templates.compile(html, { strict: true })({
        ...content, media, work, brands: content.brands || {}, study, page, rootPath: base,
        reviewChecks, reviewItems, pendingMedia, reviewOutstanding: reviewItems.length + pendingMedia.length > 0,
        openGraphImage: new URL(rootedAsset(content.identity.image.src), content.identity.url).href,
        structuredData: scriptJson(structuredData), runtimeConfig: scriptJson(runtimeConfig)
    });
}

export async function renderContent(html, root = process.cwd(), base = '/', entry = '/', options = {}) {
    return renderTemplate(html, await loadContent(root), base, entry, await readPartials(), options);
}
