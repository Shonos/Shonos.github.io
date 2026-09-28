import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
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
    return root;
}

function scripts(html) {
    const runtime = html.match(/<script type="application\/json" id="site-config">([\s\S]*?)<\/script>/);
    const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(runtime);
    assert.ok(structured);
    return { runtime: JSON.parse(runtime[1]), structured: JSON.parse(structured[1]), runtimeText: runtime[1], structuredText: structured[1] };
}

function textContent(html) {
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#x([0-9a-f]+);/gi, (match, number) => String.fromCodePoint(parseInt(number, 16)))
        .replace(/&#([0-9]+);/g, (match, number) => String.fromCodePoint(Number(number)))
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ').trim();
}

test('loads valid content and renders through the asynchronous interface', async t => {
    const root = await fixture(t);
    assert.deepEqual(await loadContent(root), source);
    assert.deepEqual(await validateContent(source, root), source);
    assert.equal(await renderContent(template, root), renderTemplate(template, source));
    assert.equal(await renderContent(template, root, '/preview/'), renderTemplate(template, source, '/preview/'));
});

test('reports malformed JSON, missing content, and missing schemas with filenames', async t => {
    const root = await fixture(t, '{"identity":');
    await assert.rejects(loadContent(root), /content\/site\.json:/);
    await rm(join(root, 'content/site.json'));
    await assert.rejects(loadContent(root), /content\/site\.json:.*ENOENT/);
    await rm(join(root, 'content/site.schema.json'));
    await assert.rejects(validateContent(source, root), /content\/site\.schema\.json:.*ENOENT/);
});

test('rejects missing, invalid, empty, and unexpected fields with field-level errors', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    delete content.identity.email;
    delete content.services.items[0].description;
    content.ui.copySuccess = '';
    content.ui.unexpected = 'not allowed';
    content.chat.welcome[0].delay = -1;
    content.skills.categories[0].items = 'not an array';
    await assert.rejects(validateContent(content, root), error => {
        for (const path of ['/identity/email', '/services/items/0/description', '/ui/copySuccess', '/ui/unexpected', '/chat/welcome/0/delay', '/skills/categories/0/items']) {
            assert.ok(error.message.includes(path), error.message);
        }
        return true;
    });
    for (const invalid of [null, [], {}, 'not an object']) {
        await assert.rejects(validateContent(invalid, root), /Content validation failed/);
    }
    await writeFile(join(root, 'content/site.json'), JSON.stringify(content));
    await assert.rejects(renderContent(template, root), /\/identity\/email/);
});

test('rejects unsafe and malformed external URLs in every URL-bearing field', async t => {
    const root = await fixture(t);
    const invalid = [
        'javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', '//example.com',
        'https://', 'https://[broken', 'https://user:password@example.com',
        'https://example.com\\evil', 'https://example.com/\npath',
        'https://example.com/"onclick="bad', 'https:///example.com'
    ];
    const fields = [
        ['identity', 'url'], ['social', 0, 'url'],
        ['experience', 'items', 0, 'url'], ['projects', 'items', 0, 'url']
    ];
    for (const path of fields) {
        for (const value of invalid) {
            const content = structuredClone(source);
            const object = path.slice(0, -1).reduce((current, key) => current[key], content);
            object[path.at(-1)] = value;
            await assert.rejects(validateContent(content, root), error => {
                assert.ok(error.message.includes(`/${path.join('/')}`), `${value}: ${error.message}`);
                return true;
            });
        }
    }
    const content = structuredClone(source);
    content.identity.url = 'https://example.com/nested?query=1';
    await assert.rejects(validateContent(content, root), /\/identity\/url: must be the site origin/);
    content.identity.url = 'https://example.com';
    content.projects.items[0].url = 'https://example.com/project?one=1&two=2#details';
    await assert.doesNotReject(validateContent(content, root));
    const rendered = renderTemplate(template, content);
    assert.ok(rendered.includes('href="https://example.com/project?one&#x3D;1&amp;two&#x3D;2#details"'));
});

test('rejects email header injection and malformed analytics configuration', async t => {
    const root = await fixture(t);
    for (const email of ['invalid', 'name@example.com?subject=bad', 'name@example.com\r\nBcc:other@example.com']) {
        const content = structuredClone(source);
        content.identity.email = email;
        await assert.rejects(validateContent(content, root), /\/identity\/email/);
    }
    const content = structuredClone(source);
    content.analytics.measurementId = 'bad-id';
    content.analytics.allowedHosts = ['https://shaunalonzo.com', 'localhost:8000'];
    await assert.rejects(validateContent(content, root), error => {
        assert.match(error.message, /\/analytics\/measurementId/);
        assert.match(error.message, /\/analytics\/allowedHosts\/0/);
        assert.match(error.message, /\/analytics\/allowedHosts\/1/);
        return true;
    });
});

test('rejects duplicate navigation ids and routes and broken section references', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    content.navigation[1].id = content.navigation[0].id;
    content.navigation[1].route = content.navigation[0].route;
    await assert.rejects(validateContent(content, root), error => {
        assert.match(error.message, /\/navigation\/1\/id: duplicate navigation id/);
        assert.match(error.message, /\/navigation\/1\/route: duplicate route/);
        assert.match(error.message, /missing section reference "services"/);
        assert.match(error.message, /\/hero\/next\/target: unknown navigation target/);
        return true;
    });
    const broken = structuredClone(source);
    broken.hero.cta.target = 'missing-section';
    broken.navigation[0].route = '//external.example';
    await assert.rejects(validateContent(broken, root), error => {
        assert.match(error.message, /\/hero\/cta\/target/);
        assert.match(error.message, /\/navigation\/0\/route/);
        return true;
    });
});

test('checks public assets, rejecting missing files, directories, traversal, and symlink escapes', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    content.identity.image.src = 'assets/missing.jpg';
    await assert.rejects(validateContent(content, root), /\/identity\/image\/src: asset must exist.*public/);
    for (const path of ['../shaunalonzo.jpg', 'assets/../shaunalonzo.jpg', '/assets/shaunalonzo.jpg', 'https://example.com/a.jpg', 'assets/%2e%2e/a.jpg']) {
        content.identity.image.src = path;
        await assert.rejects(validateContent(content, root), /\/identity\/image\/src/);
    }
    content.identity.image.src = 'assets/directory.jpg';
    await mkdir(join(root, 'public/assets/directory.jpg'));
    await assert.rejects(validateContent(content, root), /\/identity\/image\/src: asset must exist/);
    await writeFile(join(root, 'outside.jpg'), 'outside public');
    await symlink(join(root, 'outside.jpg'), join(root, 'public/assets/escape.jpg'));
    content.identity.image.src = 'assets/escape.jpg';
    await assert.rejects(validateContent(content, root), /\/identity\/image\/src: asset must exist/);
    content.identity.image.src = source.identity.image.src;
    await rm(join(root, 'public/favicon.ico'));
    await assert.rejects(validateContent(content, root), /\/identity\/favicon: asset must exist/);
});

test('preserves the complete visible content, collection order, and hidden chat structure', () => {
    const html = renderTemplate(template, source);
    const text = textContent(html);
    const phrases = [
        source.identity.name, source.identity.role, source.identity.email,
        source.hero.greeting, source.hero.description, source.services.title,
        source.skills.title, source.skills.intro, source.experience.title, source.experience.earlier,
        source.projects.title, source.contact.title, source.contact.description,
        ...source.navigation.map(item => item.label),
        ...source.services.items.flatMap(item => [item.title, item.description, item.fit, ...item.proof, item.outcome]),
        ...source.skills.categories.flatMap(category => [category.title, category.description, ...category.items, ...category.more]),
        ...source.experience.items.flatMap(item => [item.date, item.company, item.position, ...item.highlights]),
        ...source.projects.items.flatMap(item => [item.title, item.description, ...item.technologies]),
        ...source.social.map(profile => profile.label),
        "Chat with Shaun's Assistant", 'Manila, Philippines',
        '© 2026 Shaun Alonzo — Available for contract, consulting & full-time roles.'
    ];
    for (const phrase of phrases) assert.ok(text.includes(phrase), `Missing wording: ${phrase}`);
    assert.equal((html.match(/class="service-card"/g) || []).length, 4);
    assert.equal((html.match(/class="skills-category(?: skills-core)?"/g) || []).length, 7);
    assert.equal((html.match(/class="timeline-item"/g) || []).length, 4);
    assert.equal((html.match(/class="project-card"/g) || []).length, 3);
    assert.equal((html.match(/class="skill-tag skill-tag-primary"/g) || []).length, 5);
    assert.equal((html.match(/class="skills-more"/g) || []).length, 4);
    assert.match(html, /class="chat-widget dev-feature"/);
    for (const id of ['navLinks', 'themeToggle', 'menuBtn', 'skills-title', 'copyEmailBtn', 'copyTooltip', 'chatButton', 'chatContainer', 'chatClose', 'chatMessages', 'chatInput', 'chatSubmit']) {
        assert.ok(html.includes(`id="${id}"`), `Missing id: ${id}`);
    }
    const sections = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(sections, source.navigation.map(item => item.id));
    for (const item of source.navigation) {
        assert.ok(html.includes(`href="#${item.id}" data-route="${item.route}">${item.label}</a>`));
    }
    assert.ok(html.indexOf('Card Guide PH') < html.indexOf('Redbook Website Redesign'));
    assert.ok(html.indexOf('Redbook Website Redesign') < html.indexOf('MoneyMe+ WooCommerce Plugin'));
});

test('emits exactly the runtime contract rather than shipping build content', () => {
    const { runtime, structured } = scripts(renderTemplate(template, source));
    assert.deepEqual(Object.keys(runtime), ['name', 'email', 'analytics', 'chat']);
    assert.equal(runtime.name, 'Shaun Alonzo');
    assert.equal(runtime.email, 'contact@shaunalonzo.com');
    assert.deepEqual(runtime.analytics, {
        measurementId: 'G-EG4TMY27NZ',
        allowedHosts: ['shaunalonzo.com', 'www.shaunalonzo.com']
    });
    assert.deepEqual(Object.keys(runtime.chat), ['enabled', 'welcome', 'responses', 'fallback']);
    assert.equal(runtime.chat.enabled, false);
    assert.deepEqual(runtime.chat.welcome, [
        { text: "Hi there! I'm Shaun's assistant. How can I help you learn more about his .NET & AWS contract and consulting services?", delay: 500 },
        { text: 'I can tell you about his experience modernizing .NET systems, AWS architecture expertise, or AI-augmented engineering. What are you interested in?', delay: 2000 }
    ]);
    assert.equal(runtime.chat.responses.length, 6);
    for (const response of runtime.chat.responses) {
        assert.deepEqual(Object.keys(response), ['keywords', 'text']);
        assert.ok(response.keywords.length > 0);
        assert.doesNotMatch(response.text, /\{(?:firstName|email|location|country|timezone)\}/);
    }
    assert.equal(runtime.chat.fallback, "That's a great question! For specific inquiries about contract engagements or consulting, it's best to reach Shaun directly at contact@shaunalonzo.com. Is there anything else I can help with?");
    assert.deepEqual(structured, {
        '@context': 'https://schema.org', '@type': 'Person',
        name: source.identity.name, jobTitle: source.identity.role, url: source.identity.url,
        sameAs: source.social.map(profile => profile.url),
        knowsAbout: source.metadata.knowsAbout, description: source.metadata.description
    });
});

test('derives identity, contact, location, metadata, and social values consistently', () => {
    const content = structuredClone(source);
    content.identity.name = 'Alex Rivera';
    content.identity.role = 'Platform Engineer';
    content.identity.email = 'alex@example.com';
    content.identity.url = 'https://example.com';
    content.identity.location = { city: 'Cebu', country: 'Philippines', timezone: 'UTC+9' };
    content.social[0].url = 'https://example.com/alex';
    const html = renderTemplate(template, content);
    const { runtime, structured } = scripts(html);
    assert.equal(runtime.name, content.identity.name);
    assert.equal(runtime.email, content.identity.email);
    assert.equal(structured.name, content.identity.name);
    assert.equal(structured.jobTitle, content.identity.role);
    assert.equal(structured.url, content.identity.url);
    assert.deepEqual(structured.sameAs, content.social.map(profile => profile.url));
    assert.match(html, /<title>Alex Rivera — Platform Engineer<\/title>/);
    assert.match(html, /alt="Alex Rivera"/);
    assert.match(html, /href="mailto:alex@example.com"/);
    assert.match(html, /class="email-address">alex@example.com<\/span>/);
    assert.match(html, /<span>Cebu, Philippines<\/span>/);
    assert.match(html, /© 2026 Alex Rivera/);
    assert.match(html, /https:\/\/example.com\/assets\/shaunalonzo.jpg/);
    const responses = runtime.chat.responses.map(response => response.text).join(' ');
    assert.match(responses, /Alex is based in Cebu, Philippines \(UTC\+9\)/);
    assert.match(responses, /alex@example.com/);
    assert.match(runtime.chat.fallback, /reach Alex directly at alex@example.com/);
    assert.match(runtime.chat.welcome[0].text, /Alex's assistant/);
    assert.doesNotMatch(responses, /Shaun|contact@shaunalonzo.com|Manila/);
});

test('escapes text and attributes and keeps JSON safe against script closure', async t => {
    const root = await fixture(t);
    const content = structuredClone(source);
    const payload = '</script><script>alert("x")</script><img src=x onerror=alert(1)> & \u2028\u2029';
    content.identity.name = payload;
    content.metadata.description = payload;
    content.services.items[0].title = payload;
    content.ui.copyError = payload;
    content.chat.fallback = payload;
    await assert.doesNotReject(validateContent(content, root));
    const html = renderTemplate(template, content);
    const { runtime, structured, runtimeText, structuredText } = scripts(html);
    assert.equal(runtime.name, payload);
    assert.equal(runtime.chat.fallback, payload);
    assert.equal(structured.name, payload);
    assert.equal(structured.description, payload);
    for (const json of [runtimeText, structuredText]) {
        assert.doesNotMatch(json, /[<>&\u2028\u2029]/);
        assert.match(json, /\\u003c\/script\\u003e/);
    }
    assert.equal((html.match(/<script\b/g) || []).length, 4);
    assert.equal((html.match(/<\/script>/g) || []).length, 4);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;\/script&gt;&lt;script&gt;alert\(&quot;x&quot;\)/);
    assert.match(html, /data-error="&lt;\/script&gt;/);
});

test('only interpolates whitelisted single-brace tokens and never recursively templates content', async t => {
    const root = await fixture(t);
    for (const value of ['{unknown}', '{constructor}', '{identity.name}', '{{name}}', '{{#each social}}', '{email']) {
        const content = structuredClone(source);
        content.chat.fallback = value;
        await assert.rejects(validateContent(content, root), /\/chat\/fallback:/);
        assert.throws(() => renderTemplate(template, content), /placeholder|nested templates/);
    }
    const identity = structuredClone(source.identity);
    identity.name = '{email}';
    assert.equal(interpolateText('{name}', identity), '{email}');
    const content = structuredClone(source);
    content.hero.description = '{{identity.email}}';
    assert.match(renderTemplate(template, content), /\{\{identity.email\}\}/);
});

test('roots public assets through the base helper and preserves bundler entry contracts', () => {
    const html = renderTemplate(template, source);
    assert.match(html, /href="\/favicon.ico"/);
    assert.match(html, /src="\/assets\/shaunalonzo.jpg"/);
    assert.match(html, /<script src="__THEME_SCRIPT__"><\/script>/);
    assert.ok(html.indexOf('<script src="__THEME_SCRIPT__"></script>') < html.indexOf('<link rel="stylesheet"'));
    assert.match(html, /href="\.\/assets\/styles.css"/);
    assert.match(html, /<script type="module" src="\.\/src\/main.js"><\/script>/);
    assert.doesNotMatch(html, /googletagmanager.com|fetch\(|handlebars|site\.json/);
    assert.doesNotMatch(html, /\{\{/);
    const nested = renderTemplate(template, source, '/preview/');
    assert.match(nested, /href="\/preview\/favicon.ico"/);
    assert.match(nested, /src="\/preview\/assets\/shaunalonzo.jpg"/);
    assert.match(nested, /content="https:\/\/shaunalonzo.com\/preview\/assets\/shaunalonzo.jpg"/);
    for (const base of ['relative/', '//example.com/', '/../', '/preview', '/a/../../', '/a?b/']) {
        assert.throws(() => renderTemplate(template, source, base), /base must be/);
    }
});

test('exposes editable UI state labels and clipboard status messages in the DOM', () => {
    const html = renderTemplate(template, source);
    assert.match(html, /id="copyTooltip" role="status" data-success="Copied!" data-error="Unable to copy\. Please copy the email address manually\."/);
    assert.match(html, /data-dark-label="Switch to dark mode" data-light-label="Switch to light mode"/);
    assert.match(html, /data-open-label="Open navigation menu" data-close-label="Close navigation menu"/);
    assert.match(html, /class="social-label">LinkedIn<\/span>/);
    assert.match(html, /class="social-label">GitHub<\/span>/);
    const content = structuredClone(source);
    content.ui.copySuccess = 'Done';
    content.ui.copyError = 'Try copying manually';
    content.ui.closeMenu = 'Close menu';
    const changed = renderTemplate(template, content);
    assert.match(changed, /data-success="Done" data-error="Try copying manually">Done<\/span>/);
    assert.match(changed, /data-close-label="Close menu"/);
});
