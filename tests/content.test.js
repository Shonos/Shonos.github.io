import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseFragment } from 'parse5';
import { loadContent, renderContent, renderTemplate } from '../scripts/render-content.js';
import { interpolateText, validateContent } from '../scripts/validate-content.js';

const repository = fileURLToPath(new URL('../', import.meta.url));
const source = JSON.parse(await readFile(join(repository, 'content/site.json'), 'utf8'));
const template = await readFile(join(repository, 'index.html'), 'utf8');

async function fixture(t, raw = JSON.stringify(source)) {
    const temporary = join(tmpdir(), 'opencode');
    await mkdir(temporary, { recursive: true });
    const root = await mkdtemp(join(temporary, 'site-content-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'content'));
    await mkdir(join(root, 'public/assets'), { recursive: true });
    await copyFile(join(repository, 'content/site.schema.json'), join(root, 'content/site.schema.json'));
    await writeFile(join(root, 'content/site.json'), raw);
    await writeFile(join(root, 'public/assets/shaunalonzo.jpg'), 'image fixture');
    await writeFile(join(root, 'public/favicon.ico'), 'favicon fixture');
    for (const asset of new Set(Object.values(source.media).flatMap(item => (item.images || []).map(image => image.src)))) {
        await mkdir(dirname(join(root, 'public', asset)), { recursive: true });
        await copyFile(join(repository, 'public', asset), join(root, 'public', asset));
    }
    await mkdir(join(root, 'public/assets/brands'));
    for (const mark of Object.values(source.brands)) {
        for (const asset of [mark.src, mark.darkSrc].filter(Boolean)) {
            await copyFile(join(repository, 'public', asset), join(root, 'public', asset));
        }
    }
    return root;
}

function scripts(html) {
    const runtime = html.match(/<script type="application\/json" id="site-config">([\s\S]*?)<\/script>/);
    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(runtime);
    assert.ok(structured);
    return { runtime: JSON.parse(runtime[1]), structured: JSON.parse(structured[1]), texts: [runtime[1], structured[1]] };
}

test('validates and renders editable content without unresolved templates', async t => {
    const root = await fixture(t);
    assert.deepEqual(await loadContent(root), source);
    assert.equal(await renderContent(template, root), renderTemplate(template, source));
    const html = renderTemplate(template, source);
    assert.doesNotMatch(html, /\{\{|dev-feature|chat-widget|cdnjs|user-confirmations/);
    for (const section of ['home', 'services', 'ai', 'work', 'approach', 'experience', 'skills', 'contact']) {
        assert.ok(html.includes(`id="${section}"`));
    }
    for (const study of source.work.cases) assert.ok(html.includes(`href="/work/${study.slug}/"`));
});

test('reports malformed JSON and missing files with their filenames', async t => {
    const root = await fixture(t, '{"identity":');
    await assert.rejects(loadContent(root), /content\/site\.json:/);
    await rm(join(root, 'content/site.json'));
    await assert.rejects(loadContent(root), /content\/site\.json:.*ENOENT/);
    await rm(join(root, 'content/site.schema.json'));
    await assert.rejects(validateContent(source, root), /content\/site\.schema\.json:.*ENOENT/);
});

test('rejects missing, empty, incorrectly typed, and unexpected content', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    delete content.identity.email;
    delete content.services.items[0].description;
    content.ui.copySuccess = '';
    content.experience.skills[0].items = 'not a list';
    content.identity.unexpected = 'invalid';
    await assert.rejects(validateContent(content, root), error => {
        for (const field of ['/identity/email', '/services/items/0/description', '/ui/copySuccess', '/experience/skills/0/items', '/identity/unexpected']) {
            assert.ok(error.message.includes(field), error.message);
        }
        return true;
    });
    for (const invalid of [null, [], {}, 'not an object']) await assert.rejects(validateContent(invalid, root), /Content validation failed/);
});

test('rejects unsafe URLs, credentials, controls, and origin paths', async t => {
    const root = await fixture(t);
    for (const value of ['javascript:alert(1)', 'data:text/html,x', '//example.com', 'https://', 'https://[broken',
        'https://user:pass@example.com', 'https://example.com\\evil', 'https://example.com/\npath',
        'https://example.com/"onclick="bad', 'https:///example.com']) {
        for (const path of [['identity', 'url'], ['social', 0, 'url'], ['ai', 'stories', 1, 'url']]) {
            const content = structuredClone(source);
            path.slice(0, -1).reduce((obj, key) => obj[key], content)[path.at(-1)] = value;
            await assert.rejects(validateContent(content, root), /Content validation failed/);
        }
    }
    const content = structuredClone(source);
    content.identity.url = 'https://example.com/nested?query=1';
    await assert.rejects(validateContent(content, root), /must be the site origin/);
});

test('rejects email injection and invalid analytics hosts', async t => {
    const root = await fixture(t);
    for (const email of ['invalid', 'a@example.com?subject=bad', 'a@example.com\r\nBcc:other@example.com']) {
        const content = structuredClone(source);
        content.identity.email = email;
        await assert.rejects(validateContent(content, root), /\/identity\/email/);
    }
    const content = structuredClone(source);
    content.analytics.measurementId = 'bad';
    content.analytics.allowedHosts = ['https://example.com', 'localhost:5000'];
    await assert.rejects(validateContent(content, root), /\/analytics/);
});

test('rejects duplicate navigation, slugs, invalid targets, and missing compatibility routes', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    content.navigation[1].id = content.navigation[0].id;
    content.work.cases[1].slug = content.work.cases[0].slug;
    delete content.legacyRoutes['/projects'];
    await assert.rejects(validateContent(content, root), error => {
        assert.match(error.message, /duplicate navigation id/);
        assert.match(error.message, /duplicate case-study slug/);
        assert.match(error.message, /missing legacy route/);
        return true;
    });
    content.services.items[0].target = 'nonexistent';
    content.work.cases[0].slug = '../escape';
    await assert.rejects(validateContent(content, root), /Content validation failed/);
});

test('rejects missing, traversing, directory, and escaped symlink assets', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    for (const path of ['assets/missing.jpg', '../outside.jpg', '/assets/photo.jpg', 'https://example.com/a.jpg']) {
        content.identity.image.src = path;
        await assert.rejects(validateContent(content, root), /\/identity\/image\/src/);
    }
    await mkdir(join(root, 'public/assets/directory.jpg'));
    content.identity.image.src = 'assets/directory.jpg';
    await assert.rejects(validateContent(content, root), /not|asset must exist/);
    await writeFile(join(root, 'outside.jpg'), 'outside');
    await symlink(join(root, 'outside.jpg'), join(root, 'public/assets/escape.jpg'));
    content.identity.image.src = 'assets/escape.jpg';
    await assert.rejects(validateContent(content, root), /asset must exist/);
});

test('runtime contains only browser configuration, never evidence or build copy', () => {
    const { runtime, structured } = scripts(renderTemplate(template, source));
    assert.deepEqual(Object.keys(runtime), ['name', 'email', 'analytics', 'legacyRoutes']);
    assert.equal(runtime.email, source.identity.email);
    assert.deepEqual(runtime.legacyRoutes, source.legacyRoutes);
    assert.deepEqual(structured, {
        '@context': 'https://schema.org', '@type': 'Person', name: source.identity.name,
        jobTitle: source.identity.role, url: source.identity.url,
        sameAs: source.social.map(item => item.url), knowsAbout: source.metadata.knowsAbout,
        description: source.metadata.description
    });
});

test('official marks are local, sized, and labeled; text fallback needs no asset', async t => {
    const root = await fixture(t);
    const html = renderTemplate(template, source);
    for (const [name, mark] of Object.entries(source.brands)) {
        assert.ok(html.includes(`src="/${mark.src}" alt="${name}" width="${mark.width}" height="${mark.height}"`));
        if (mark.darkSrc) assert.ok(html.includes(`src="/${mark.darkSrc}" alt="${name}"`));
    }
    assert.match(html, /data-brand="MONEYME">\s*MONEYME/);
    assert.match(html, /data-brand="Nowcom">\s*Nowcom/);
    assert.match(html, /Employment experience/);
    assert.match(html, /not endorsement/);
    assert.doesNotMatch(html, /src="https?:\/\/.*(?:logo|brand)/);
    const content = structuredClone(source);
    delete content.brands;
    await assert.doesNotReject(validateContent(content, root));
    const fallback = renderTemplate(template, content);
    assert.doesNotMatch(fallback, /class="brand-logo/);
    assert.match(fallback, /data-brand="Domain">\s*Domain/);
    assert.match(fallback, /data-brand="\.NET">\s*\.NET/);
});

test('validates brand asset paths, dimensions, and optional dark assets', async t => {
    const root = await fixture(t);
    for (const asset of ['../outside.svg', 'https://example.com/logo.svg', 'assets/brands/missing.svg']) {
        const content = structuredClone(source);
        content.brands.Domain.src = asset;
        await assert.rejects(validateContent(content, root), /\/brands\/Domain\/src/);
    }
    const content = structuredClone(source);
    content.brands.Domain.darkSrc = 'assets/brands/missing.svg';
    await assert.rejects(validateContent(content, root), /\/brands\/Domain\/darkSrc/);
    content.brands.Domain.width = 0;
    await assert.rejects(validateContent(content, root), /\/brands\/Domain\/width/);
});

test('SVG brand assets contain only self-contained static artwork', async () => {
    for (const mark of Object.values(source.brands)) {
        for (const asset of [mark.src, mark.darkSrc].filter(Boolean)) {
            const svg = await readFile(join(repository, 'public', asset), 'utf8');
            assert.match(svg, /<svg\b/);
            assert.match(svg, /viewBox="[\d. ]+"/);
            assert.doesNotMatch(svg, /<script|<foreignObject|<image|<iframe|<!DOCTYPE|<!ENTITY|\bon[a-z]+\s*=|(?:href|src)\s*=|url\s*\(/i);
        }
    }
});

test('review slots never appear in the default publication render', () => {
    const published = renderTemplate(template, source);
    const review = renderTemplate(template, source, '/', '/', undefined, { review: true });
    assert.doesNotMatch(published, /data-review-|Your input needed|Featured project screenshot|Agent workflow recording/);
    assert.match(published, /conceptual illustration/);
    assert.match(review, /data-review-mode/);
    for (const [key, item] of Object.entries(source.media)) {
        assert.equal(review.includes(`data-review-slot="${key}"`), item.publish !== true && item.reviewed !== true);
    }
    assert.ok(published.indexOf('id="work"') < published.indexOf('id="services"'));
    const visibleText = node => node.attrs?.some(attribute => attribute.name === 'hidden') ? '' :
        node.nodeName === '#text' ? node.value : (node.childNodes || []).map(visibleText).join(' ');
    const words = visibleText(parseFragment(published.match(/<main[\s\S]*?<\/main>/)[0])).trim().split(/\s+/).length;
    assert.ok(words < 900, `Keep the readable no-JS homepage compact, excluding hidden enhancement-only stage copy (${words} words)`);
});

test('owner review flags are actionable, resolvable, and never change public copy', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    Object.assign(content.media.featured, { kind: 'pending', publish: false, reviewed: false });
    const publicBaseline = renderTemplate(template, content);
    const review = renderTemplate(template, content, '/', '/', undefined, { review: true });
    assert.match(review, /data-review-checklist/);
    assert.match(review, /Your input needed: Featured project screenshot/);
    assert.match(review, /Note for Shaun/);
    for (const [key, item] of Object.entries(content.media)) {
        assert.equal(review.includes(`href="#review-media-${key}"`), item.publish !== true && item.reviewed !== true);
    }
    assert.match(review, /href="\/profile\/#review-career"/);
    assert.match(review, /optional media upgrades/);
    content.media.featured.reviewed = true;
    content.review.career.resolved = true;
    const resolved = renderTemplate(template, content, '/', '/', undefined, { review: true });
    assert.doesNotMatch(resolved, /data-review-slot="featured"|href="#review-media-featured"|href="\/profile\/#review-career"/);
    assert.equal(renderTemplate(template, content), publicBaseline);
    const profile = await readFile(join(repository, 'templates/profilePage.html'), 'utf8');
    assert.match(renderTemplate(profile, source, '/', 'profile/', undefined, { review: true }), /data-review-note="career"/);
    assert.doesNotMatch(renderTemplate(profile, content, '/', 'profile/', undefined, { review: true }), /data-review-note="career"/);
    assert.doesNotMatch(renderTemplate(profile, source, '/', 'profile/'), /data-review-|Your input needed/);
    Object.values(content.media).forEach(item => { item.reviewed = true; });
    Object.values(content.review).forEach(item => { item.resolved = true; });
    const complete = renderTemplate(template, content, '/', '/', undefined, { review: true });
    assert.ok(complete.includes(content.ui.reviewAllDone));
    assert.ok(complete.includes(content.ui.reviewNoMedia));
    assert.ok(complete.includes(content.ui.reviewNoContent));
    assert.doesNotMatch(complete, /data-review-slot=|data-review-note=/);
    content.review.availability.resolved = 'yes';
    await assert.rejects(validateContent(content, root), /\/review\/availability\/resolved/);
});

test('image and video slots preserve native controls, names, captions, and publication gates', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    const item = content.media.featured;
    Object.assign(item, { kind: 'image', publish: true, src: 'assets/shaunalonzo.jpg', alt: 'A supplied example screen', width: 300, height: 300 });
    await assert.doesNotReject(validateContent(content, root));
    let html = renderTemplate(template, content);
    assert.match(html, /class="project-image"[^>]*alt="A supplied example screen"/);
    assert.match(html, /loading="eager"/);
    item.publish = false;
    html = renderTemplate(template, content);
    assert.doesNotMatch(html, /class="project-image"/);
    assert.match(html, /class="concept-visual concept-visual--product"/);
    Object.assign(item, { kind: 'video', publish: true, src: 'assets/test.webm', poster: 'assets/shaunalonzo.jpg', mime: 'video/webm', hasAudio: false, transcript: 'A written description of the demonstrated task.' });
    await writeFile(join(root, 'public/assets/test.webm'), 'transport fixture, not a recording');
    await assert.doesNotReject(validateContent(content, root));
    html = renderTemplate(template, content);
    assert.match(html, /<video class="project-video" controls playsinline preload="none"/);
    assert.doesNotMatch(html.match(/<video\b[^>]*>/)[0], /\bautoplay\b|\bloop\b/);
    assert.match(html, /A written description of the demonstrated task/);
    item.hasAudio = true;
    await assert.rejects(validateContent(content, root), /captions/);
    item.captions = 'assets/test.vtt';
    await writeFile(join(root, 'public/assets/test.vtt'), 'WEBVTT\n\n');
    await assert.doesNotReject(validateContent(content, root));
    assert.match(renderTemplate(template, content), /<track kind="captions"/);
    item.mime = 'video/mp4';
    await assert.rejects(validateContent(content, root), /extension must match/);
    item.src = '../outside.mp4';
    await assert.rejects(validateContent(content, root), /\/media\/featured\/src/);
});

test('media references and workflow node counts are validated', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    content.work.cases[0].media = 'missing';
    content.media.agents.layout = 'workflow';
    content.media.agents.nodes.pop();
    await assert.rejects(validateContent(content, root), error => {
        assert.match(error.message, /unknown media slot/);
        assert.match(error.message, /workflow nodes/);
        return true;
    });
});

test('supplied galleries use safe local assets, correct dimensions, and matching case context', async t => {
    const root = await fixture(t);
    await assert.doesNotReject(validateContent(source, root));
    const html = renderTemplate(template, source);
    assert.equal((html.match(/class="gallery-image"/g) || []).length, 4);
    for (const image of source.media.featured.images) {
        assert.equal(html.split(`src="/${image.src}"`).length - 1, 1, 'Featured screenshots must appear only once on the homepage');
    }
    assert.doesNotMatch(html, /data-media-slot="product"/);
    const study = renderTemplate('{{> casePage}}', source, '/', '/work/redbook-product-modernization/');
    assert.match(study, /data-media-slot="product"/);
    assert.equal((study.match(/class="gallery-image"/g) || []).length, 2);
    assert.match(html, /src="\/assets\/work\/redbook-desktop-search.png"[^>]*width="2553" height="1368" loading="eager"/);
    assert.match(html, /data-study="redbook-product-modernization"/);
    assert.doesNotMatch(html, /data-review-slot="(?:featured|product|personal-project|agents)"/);
    assert.match(html, /Cards Guide PH/);
    assert.doesNotMatch(JSON.stringify(scripts(html).runtime), /assets\/work|my-inputs|orchestration/);
    const content = structuredClone(source);
    content.media.featured.images[0].src = '../private.png';
    await assert.rejects(validateContent(content, root), /\/media\/featured\/images\/0\/src/);
    content.media.featured.images[0].src = source.media.featured.images[0].src;
    content.media.featured.images[0].alt = '';
    await assert.rejects(validateContent(content, root), /\/media\/featured\/images\/0\/alt/);
    content.media.featured.images[0].alt = source.media.featured.images[0].alt;
    content.hero.proofSlug = 'missing-case';
    await assert.rejects(validateContent(content, root), /featured visual must link/);
});

test('migration stage order and complete written fallback are validated', async t => {
    const root = await fixture(t);
    const html = renderTemplate(template, source);
    assert.match(html, /data-migration-state="build"/);
    assert.match(html, /data-system="replacement" data-status="building"/);
    for (const stage of source.migration.stages) assert.ok(html.includes(stage.description));
    const content = structuredClone(source);
    content.migration.stages.reverse();
    await assert.rejects(validateContent(content, root), /migration stages must follow/);
    content.migration.stages.pop();
    await assert.rejects(validateContent(content, root), /\/migration\/stages/);
});

test('orchestration copy follows the finite routes and cannot silently disable enhancement', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    content.orchestration.nodes[1].id = content.orchestration.nodes[0].id;
    await assert.rejects(validateContent(content, root), /each workflow role/);
    content.orchestration.nodes = source.orchestration.nodes;
    content.orchestration.routes[0].stages.reverse();
    await assert.rejects(validateContent(content, root), /handoffs must follow/);
    content.orchestration.routes = [source.orchestration.routes[0], source.orchestration.routes[0]];
    await assert.rejects(validateContent(content, root), /each workflow route/);
});

test('identity, metadata, links, and email subjects stay consistent', () => {
    const content = structuredClone(source);
    content.identity.name = 'Alex Rivera';
    content.identity.email = 'alex@example.com';
    content.identity.url = 'https://example.com';
    content.identity.location.city = 'Cebu';
    const html = renderTemplate(template, content);
    assert.match(html, /<title>Alex Rivera \| Practical AI/);
    assert.match(html, /href="mailto:alex@example.com\?subject&#x3D;/);
    assert.match(html, /href="mailto:alex@example.com">alex@example.com/);
    assert.match(html, /© 2026 Alex Rivera/);
    assert.match(html, /Cebu, Philippines/);
    assert.match(html, /rel="canonical" href="https:\/\/example.com\/"/);
    assert.equal(scripts(html).structured.name, 'Alex Rivera');
});

test('Domain testing evidence distinguishes backend feature coverage and the production gate from EKS rollout health', () => {
    const study = renderTemplate('{{> casePage}}', source, '/', '/work/dotnet-modernization/');
    const profile = renderTemplate('{{> profilePage}}', source, '/', '/profile/');
    for (const html of [study, profile]) {
        assert.match(html, /more than 400 Playwright|Playwright[^<]*more than 400/i);
        assert.match(html, /reserving, booking/);
        assert.match(html, /agency and agent/);
        assert.match(html, /Failed (?:feature )?tests blocked production deployment/i);
        assert.doesNotMatch(html, /canary/i);
    }
    assert.match(study, /created test agencies and agents, updated their data, and deleted them/);
    assert.match(study, /previous-version pods were gradually switched off as new-version pods became healthy/);
    assert.match(study, /separate gate before production deployment/);
    assert.match(renderTemplate(template, source), /More than 400 Playwright backend feature tests/);
});

test('escapes HTML and keeps embedded JSON safe against script closure', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    const payload = '</script><script>alert("x")</script><img src=x onerror=alert(1)> & \u2028\u2029';
    content.identity.name = payload;
    content.metadata.description = payload;
    content.ui.copyError = payload;
    await assert.doesNotReject(validateContent(content, root));
    const html = renderTemplate(template, content);
    const data = scripts(html);
    assert.equal(data.runtime.name, payload);
    assert.equal(data.structured.description, payload);
    for (const json of data.texts) assert.doesNotMatch(json, /[<>&\u2028\u2029]/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /data-error="&lt;\/script&gt;/);
    assert.equal((html.match(/<script\b/g) || []).length, 4);
});

test('only whitelisted identity placeholders are interpolated', async t => {
    const root = await fixture(t);
    for (const value of ['{unknown}', '{constructor}', '{identity.name}', '{{name}}', '{email']) {
        const content = structuredClone(source);
        content.ui.copyright = value;
        await assert.rejects(validateContent(content, root), /\/ui\/copyright/);
        assert.throws(() => renderTemplate(template, content), /placeholder|nested templates/);
    }
    assert.equal(interpolateText('{name}', { ...source.identity, name: '{email}' }), '{email}');
});

test('assets are base-aware and template references are safe', () => {
    const html = renderTemplate(template, source, '/preview/');
    assert.match(html, /href="\/preview\/favicon.ico"/);
    assert.match(html, /src="\/preview\/assets\/shaunalonzo.jpg"/);
    assert.match(html, /src="\/preview\/assets\/brands\/domain.svg"/);
    assert.match(html, /src="\/preview\/assets\/brands\/dotnet.svg"/);
    assert.match(html, /href="\/preview\/work\/dotnet-modernization\/"/);
    assert.match(html, /<script src="__THEME_SCRIPT__"><\/script>/);
    for (const base of ['relative/', '//example.com/', '/../', '/preview', '/a/../../']) {
        assert.throws(() => renderTemplate(template, source, base), /base must be/);
    }
});

for (const study of source.work.cases) {
    test(`renders static case study, canonical, and technical content: ${study.slug}`, () => {
        const html = renderTemplate('{{> casePage}}', source, '/', `work/${study.slug}/index.html`);
        assert.ok(html.includes(`<title>${study.shortTitle} | Shaun Alonzo</title>`));
        assert.ok(html.includes(`href="https://shaunalonzo.com/work/${study.slug}/"`));
        assert.ok(html.includes('data-page="case-study"'));
        assert.ok(html.includes('href="/#work"'));
        assert.doesNotMatch(html, /\{\{|user-confirmations|kn-00|knowledge_id/);
    });
}

test('renders a printable profile without inventing a PDF or résumé download', () => {
    const html = renderTemplate('{{> profilePage}}', source, '/', 'profile/index.html');
    assert.match(html, /data-page="profile"/);
    assert.match(html, /id="printProfile"/);
    assert.doesNotMatch(html, /\.pdf|download=/);
    assert.match(html, /https:\/\/shaunalonzo.com\/profile\//);
    assert.throws(() => renderTemplate('{{> casePage}}', source, '/', 'work/not-a-case/'), /Unknown case study/);
});
