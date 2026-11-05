import { readFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';
import { renderTemplate } from '../../scripts/render-content.js';

const content = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));
const preview = 'http://127.0.0.1:4174';
const development = 'http://127.0.0.1:5174';
const review = 'http://127.0.0.1:4175';
const production = 'https://shaunalonzo.com';
const test = base.extend({
    network: [async ({ context }, use) => {
        const network = { external: [], errors: [], failures: [], documents: [] };
        const observe = page => page.on('pageerror', error => network.errors.push(error.message));
        context.pages().forEach(observe);
        context.on('page', observe);
        context.on('response', response => {
            if (response.request().resourceType() === 'document') network.documents.push({ url: response.url(), status: response.status() });
            if (response.status() >= 400 && response.request().resourceType() !== 'document') network.failures.push(response.url());
        });
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if ([preview, development, review].includes(url.origin)) return route.continue();
            network.external.push(url.href);
            return route.fulfill({ status: 200, contentType: 'application/javascript', body: 'void 0;' });
        });
        await use(network);
        expect(network.errors, 'Uncaught browser errors').toEqual([]);
        expect(network.failures, 'Failed assets').toEqual([]);
    }, { auto: true }]
});

async function nearTop(page, id) {
    await expect.poll(() => page.locator(`[id="${id}"]`).evaluate(element => {
        const rect = element.getBoundingClientRect();
        return rect.top >= 65 && rect.top < 170;
    })).toBe(true);
}

test('homepage leads with the business problem and explicit inquiry paths', async ({ page, network }) => {
    const response = await page.goto('/');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('I solve business bottlenecks.');
    await expect(page.locator('h1')).toContainText('software & practical AI');
    await expect(page.locator('.hero-actions .btn')).toHaveAttribute('href', /mailto:.*subject=/);
    await expect(page.locator('.hiring-link a')).toHaveAttribute('href', '#experience');
    await expect(page.locator('.hero-proof')).toBeVisible();
    await expect(page.locator('.chat-widget')).toHaveCount(0);
    expect(network.external).toEqual([]);
});

test('normal anchor navigation preserves native history and never rewrites on scroll', async ({ page }) => {
    await page.goto('/?source=review');
    await page.locator('#navLinks a[href="#work"]').click();
    await expect(page).toHaveURL(`${preview}/?source=review#work`);
    await nearTop(page, 'work');
    await page.locator('#navLinks a[href="#approach"]').click();
    await expect(page).toHaveURL(`${preview}/?source=review#approach`);
    await page.goBack();
    await expect(page).toHaveURL(`${preview}/?source=review#work`);
    await page.goForward();
    await expect(page).toHaveURL(`${preview}/?source=review#approach`);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(page).toHaveURL(`${preview}/?source=review#approach`);
});

test('review labels are explicit and confined to the separate local-review artifact', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-review-slot], [data-review-mode]')).toHaveCount(0);
    await page.goto(review);
    await expect(page.locator('[data-review-mode]')).toContainText('Local visual review');
    await expect(page.locator('[data-review-slot]')).toHaveCount(6);
    await expect(page.locator('.media-surface video')).toHaveCount(0);
    for (const width of [320, 390, 767, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator('.media-surface').evaluateAll(elements => elements.every(element => element.scrollHeight <= element.clientHeight + 1))).toBe(true);
    }
});

test('owner checklist links to flagged media and career confirmations without implying required uploads', async ({ page }) => {
    await page.goto(review);
    const banner = page.locator('[data-review-mode]');
    await expect(banner).toContainText('6 Media decisions');
    await expect(banner).toContainText('3 Content confirmations');
    await banner.getByRole('link', { name: content.ui.reviewChecklistCta }).click();
    const checklist = page.locator('[data-review-checklist]');
    await expect(page).toHaveURL(`${review}/#review-checklist`);
    await expect(checklist.getByRole('heading', { name: content.ui.reviewChecklistTitle })).toBeInViewport();
    await expect(checklist).toContainText('optional media upgrades');
    await checklist.getByRole('link', { name: content.media.featured.placeholder }).click();
    const note = page.locator('[data-review-slot="featured"]');
    await expect(note).toContainText(`${content.ui.reviewAction}:`);
    await expect(note).toContainText(content.ui.reviewLocalOnly);
    await expect(note).toBeInViewport();
    await checklist.getByRole('link', { name: content.review.career.title }).click();
    await expect(page).toHaveURL(`${review}/profile/#review-career`);
    await expect(page.locator('[data-review-note="career"]')).toContainText(content.review.career.description);
    await expect(page.locator('[data-review-note="career"]')).toBeInViewport();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-review-mode]')).toBeHidden();
    await expect(page.locator('[data-review-note="career"]')).toBeHidden();
});

test('owner-only instructions are absent from every normal public page', async ({ page }) => {
    for (const path of ['/', '/profile/', ...content.work.cases.map(study => `/work/${study.slug}/`)]) {
        await page.goto(path);
        await expect(page.locator('[data-review-mode], [data-review-slot], [data-review-note], [data-review-checklist]')).toHaveCount(0);
        await expect(page.locator('body')).not.toContainText(content.ui.reviewAction);
        await expect(page.locator('body')).not.toContainText(content.ui.reviewLocalOnly);
    }
});

test('illustrative workflow responds to touch and keyboard without implying a live agent', async ({ page }) => {
    await page.goto('/#ai');
    const showcase = page.locator('[data-workflow]');
    const buttons = showcase.locator('.workflow-controls button');
    await expect(showcase).toContainText('not a live agent run');
    await expect(buttons).toHaveCount(4);
    await buttons.nth(2).click();
    await expect(buttons.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(showcase.locator('[data-flow-node="2"]')).toHaveClass(/is-current/);
    await page.keyboard.press('End');
    await expect(buttons.last()).toBeFocused();
    await expect(showcase).toHaveAttribute('data-active-step', '3');
    await page.keyboard.press('Home');
    await expect(buttons.first()).toBeFocused();
    await expect(showcase.locator('[data-motion-replay]')).toBeHidden();
});

test('manual illustration replay is finite and settles when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.locator('#ai').scrollIntoViewIfNeeded();
    const replay = page.locator('[data-motion-replay]');
    await expect(replay).toBeVisible();
    await replay.click();
    expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(replay).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('.concept-node.is-current')).toBeVisible();
});

test('migration stages route traffic only to serving systems and remain keyboard selectable', async ({ page }) => {
    await page.goto('/');
    const diagram = page.locator('.hero-proof [data-migration]');
    const stages = diagram.locator('.migration-steps button');
    await expect(stages).toHaveCount(4);
    await expect(diagram.locator('[data-migration-playback]')).toBeHidden();
    await expect(diagram.locator('[data-migration-reduced]')).toBeVisible();
    for (const [index, id, oldStatus, newStatus, oldTraffic, newTraffic] of [
        [0, 'build', 'serving', 'building', true, false],
        [1, 'check', 'serving', 'ready', true, false],
        [2, 'share', 'serving', 'serving', true, true],
        [3, 'retire', 'retired', 'serving', false, true]
    ]) {
        await stages.nth(index).click();
        await expect(diagram).toHaveAttribute('data-migration-state', id);
        await expect(stages.nth(index)).toHaveAttribute('aria-pressed', 'true');
        await expect(diagram.locator('[data-system="existing"]')).toHaveAttribute('data-status', oldStatus);
        await expect(diagram.locator('[data-system="replacement"]')).toHaveAttribute('data-status', newStatus);
        await expect(diagram.locator('[data-traffic-route="existing"]')).toHaveAttribute('data-route-active', String(oldTraffic));
        await expect(diagram.locator('[data-traffic-route="replacement"]')).toHaveAttribute('data-route-active', String(newTraffic));
        await expect(diagram.locator('[data-migration-description]')).toHaveText(content.migration.stages[index].description);
        await expect(diagram).toHaveAttribute('data-playing', 'false');
    }
    await page.keyboard.press('Home');
    await expect(stages.first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(stages.last()).toBeFocused();
    await expect(diagram).toHaveAttribute('data-migration-state', 'retire');
    await expect(page.locator('.hero-proof')).toContainText('not live traffic');
});

test('migration plays once, pauses precisely, resumes, hands over gradually, and replays', async ({ page }) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const diagram = page.locator('.hero-proof [data-migration]');
    await expect(diagram).toHaveAttribute('data-playing', 'true');
    await page.clock.runFor(3400);
    await expect(diagram).toHaveAttribute('data-migration-state', 'check');
    await diagram.getByRole('button', { name: content.ui.migrationPause, exact: true }).click();
    const route = diagram.locator('[data-traffic-route="existing"]');
    const paused = await route.getAttribute('style');
    await page.clock.runFor(4000);
    await expect(route).toHaveAttribute('style', paused);
    await expect(diagram).toHaveAttribute('data-migration-state', 'check');
    await diagram.getByRole('button', { name: content.ui.migrationPlay, exact: true }).click();
    await page.clock.runFor(3400);
    await expect(diagram).toHaveAttribute('data-migration-state', 'share');
    const newRoute = diagram.locator('[data-traffic-route="replacement"]');
    const earlierWidth = await newRoute.evaluate(element => parseFloat(element.style.strokeWidth));
    await page.clock.runFor(1800);
    expect(await newRoute.evaluate(element => parseFloat(element.style.strokeWidth))).toBeGreaterThan(earlierWidth);
    await page.clock.runFor(7000);
    await expect(diagram).toHaveAttribute('data-migration-state', 'retire');
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    await expect(route).toHaveAttribute('data-route-active', 'false');
    await page.clock.runFor(16000);
    await expect(diagram).toHaveAttribute('data-migration-state', 'retire');
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    await diagram.getByRole('button', { name: content.ui.migrationReplay, exact: true }).click();
    await expect(diagram).toHaveAttribute('data-migration-state', 'build');
    await expect(diagram).toHaveAttribute('data-playing', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    const stopped = await route.getAttribute('style');
    await page.clock.runFor(4000);
    await expect(route).toHaveAttribute('style', stopped);
    await expect(diagram.locator('[data-migration-playback]')).toBeHidden();
});

test('migration pauses offscreen and in a background document without auto-resuming', async ({ page }) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');
    const diagram = page.locator('.hero-proof [data-migration]');
    await expect(diagram).toHaveAttribute('data-playing', 'true');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    await diagram.getByRole('button', { name: content.ui.migrationPlay, exact: true }).click();
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(diagram).toHaveAttribute('data-playing', 'false');
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(diagram).toHaveAttribute('data-playing', 'false');
});

test('migration preserves the complete written sequence without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${preview}/`);
    const diagram = page.locator('.hero-proof [data-migration]');
    await expect(diagram.locator('button')).toHaveCount(0);
    for (const stage of content.migration.stages) await expect(diagram.getByText(stage.description, { exact: true })).toBeVisible();
    await expect(diagram.locator('[data-system="existing"]')).toContainText(content.migration.statuses.serving);
    await expect(diagram.locator('[data-system="replacement"]')).toContainText(content.migration.statuses.building);
    await context.close();
});

for (const width of [390, 1440]) {
    test(`diagram system boxes remain upright and stable on hover at ${width}px`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.setViewportSize({ width, height: 1000 });
        for (const origin of [preview, review]) {
            await page.goto(origin);
            await page.evaluate(() => document.fonts.ready);
            for (const theme of ['light', 'dark']) {
                await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
                const figures = page.locator('.media-figure');
                for (const figure of await figures.all()) {
                    await page.mouse.move(0, 0);
                    await figure.scrollIntoViewIfNeeded();
                    const nodes = figure.locator('.concept-node, .migration-system');
                    const geometry = () => nodes.evaluateAll(elements => elements.map(element => {
                        const { x, y, width, height } = element.getBoundingClientRect();
                        return { x, y, width, height, transform: getComputedStyle(element).transform };
                    }));
                    const before = await geometry();
                    expect(before.every(node => node.transform === 'none')).toBe(true);
                    await figure.hover();
                    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                    expect(await geometry()).toEqual(before);
                    if (await figure.locator('.concept-visual--migration').count()) {
                        expect(new Set(before.map(node => node.x)).size).toBe(1);
                        expect(new Set(before.map(node => node.width)).size).toBe(1);
                    }
                }
            }
        }
    });
}

test('supplied media uses native playback and reports failure without blocking the case-study path', async ({ page, network }) => {
    const example = structuredClone(content);
    Object.assign(example.media.featured, { kind: 'video', publish: true, src: 'assets/test.webm', poster: 'assets/shaunalonzo.jpg', mime: 'video/webm', hasAudio: false, transcript: 'Test recording description.', alt: 'Test recording' });
    const figure = renderTemplate('{{> media item=media.featured slot="featured" eager=true}}', example);
    await page.route(`${development}/`, async route => {
        const response = await route.fetch();
        const html = (await response.text()).replace(/<figure class="media-figure"[\s\S]*?<\/figure>/, figure);
        await route.fulfill({ response, body: html });
    });
    await page.route('**/assets/test.webm', route => route.fulfill({ status: 200, contentType: 'video/webm', body: '' }));
    await page.goto(development);
    const video = page.locator('video');
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).toHaveAttribute('preload', 'none');
    expect(await video.evaluate(element => element.autoplay)).toBe(false);
    await video.evaluate(element => {
        element.dataset.pauses = '0';
        element.pause = () => { element.dataset.pauses = String(Number(element.dataset.pauses) + 1); };
    });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect.poll(() => video.getAttribute('data-pauses')).not.toBe('0');
    const pauses = Number(await video.getAttribute('data-pauses'));
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(Number(await video.getAttribute('data-pauses'))).toBeGreaterThan(pauses);
    await video.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(page.locator('.media-error')).toHaveText(content.ui.mediaError);
    await expect(page.locator('.hero-proof .proof-link')).toHaveAttribute('href', '/work/dotnet-modernization/');
    expect(network.errors).toEqual([]);
});

test('supplied screenshots load with a useful alternative and a readable failure state', async ({ page }) => {
    const example = structuredClone(content);
    Object.assign(example.media.featured, { kind: 'image', publish: true, src: 'assets/shaunalonzo.jpg', width: 300, height: 300, alt: 'Supplied image fixture' });
    const figure = renderTemplate('{{> media item=media.featured slot="featured" eager=true}}', example);
    await page.route(`${development}/`, async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()).replace(/<figure class="media-figure"[\s\S]*?<\/figure>/, figure) });
    });
    await page.goto(development);
    const image = page.getByRole('img', { name: 'Supplied image fixture' });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(image.locator('..')).toHaveAttribute('href', '/assets/shaunalonzo.jpg');
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(page.locator('.media-error')).toHaveText(content.ui.mediaError);
});

test('local official marks keep names, original colors, and readable theme variants', async ({ page, network }) => {
    for (const width of [320, 390, 767, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/');
        for (const theme of ['light', 'dark']) {
            await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
            const domain = page.locator(`.employers [data-brand="Domain"] .brand-logo--${theme}`);
            await expect(domain).toBeVisible();
            await expect(domain).toHaveAttribute('alt', 'Domain');
            await expect(page.locator('.employers [data-brand="carsales"] img')).toBeVisible();
            await expect(page.locator('.employers [data-brand="MONEYME"]')).toHaveText('MONEYME');
            await expect(page.locator('.employers [data-brand="Nowcom"]')).toHaveText('Nowcom');
            const marks = await page.locator('.brand-logo:visible').evaluateAll(async images => {
                await Promise.all(images.map(image => image.decode()));
                return images.map(image => ({
                    local: new URL(image.src).origin === location.origin,
                    loaded: image.naturalWidth > 0,
                    filter: getComputedStyle(image).filter,
                    width: image.getBoundingClientRect().width,
                    height: image.getBoundingClientRect().height,
                    name: image.alt
                }));
            });
            expect(marks.every(mark => mark.local && mark.loaded && mark.filter === 'none')).toBe(true);
            expect(marks.find(mark => mark.name === '.NET')).toMatchObject({ width: 56, height: 56 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
    }
    await expect(page.locator('.stack-line')).toContainText('AWS');
    await expect(page.locator('.brand[data-brand="AWS"]')).toHaveCount(0);
    expect(network.external).toEqual([]);
    await page.goto('/profile/');
    await expect(page.getByRole('img', { name: '.NET', exact: true })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.toolkit-heading .brand')).toBeHidden();
    await expect(page.locator('.skills-grid')).toContainText('C# / .NET');
});

for (const route of ['/about', '/services', '/skills', '/experience', '/projects', '/contact']) {
    test(`legacy route and refresh retain the requested section: ${route}`, async ({ page, network }) => {
        const target = content.legacyRoutes[route];
        const path = `${route}/?q=a%2Bb&keep=one+two`;
        await page.goto(path);
        await expect(page).toHaveURL(`${preview}${path}`);
        if (target !== 'home') await nearTop(page, target);
        else await expect(page.locator('h1')).toBeInViewport();
        await page.reload();
        await expect(page).toHaveURL(`${preview}${path}`);
        if (target !== 'home') await nearTop(page, target);
        expect(network.documents.some(item => item.status === 404)).toBe(true);
    });
}

test('a nested hash takes precedence over a legacy route', async ({ page }) => {
    await page.goto('/projects/?keep=a%2Bb#skills-title');
    await nearTop(page, 'skills-title');
    await expect(page).toHaveURL(`${preview}/projects/?keep=a%2Bb#skills-title`);
});

for (const id of ['about', 'projects', 'skills-title']) {
    test(`old hash still reaches its content: ${id}`, async ({ page }) => {
        await page.goto(`/#${id}`);
        await expect(page.locator(`[id="${id}"]`)).toBeAttached();
        if (id === 'about') await expect(page.locator('h1')).toBeInViewport();
        else await nearTop(page, id);
    });
}

for (const study of content.work.cases) {
    test(`case study is a real static page on direct load and refresh: ${study.slug}`, async ({ page, network }) => {
        const path = `/work/${study.slug}/`;
        expect((await page.goto(path)).status()).toBe(200);
        await expect(page).toHaveTitle(`${study.shortTitle} | ${content.identity.name}`);
        await expect(page.locator('h1')).toHaveText(study.title);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${production}${path}`);
        await expect(page.getByRole('heading', { name: content.ui.scopeHeading })).toBeVisible();
        await expect(page.getByRole('heading', { name: content.ui.technicalDetails })).toBeAttached();
        expect((await page.reload()).status()).toBe(200);
        expect(network.documents.every(item => item.status === 200)).toBe(true);
        for (const width of [320, 390]) {
            await page.setViewportSize({ width, height: 844 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            expect(await page.locator('.case-media .media-surface').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
        }
        await page.locator('.case-opening .back-link').click();
        await expect(page).toHaveURL(`${preview}/#work`);
        await nearTop(page, 'work');
    });
}

test('case-study directory paths redirect to a slash without a 404', async ({ page, network }) => {
    await page.goto('/work/dotnet-modernization?from=review');
    await expect(page).toHaveURL(`${preview}/work/dotnet-modernization/?from=review`);
    expect(network.documents.map(item => item.status)).not.toContain(404);
});

test('conceptual case media stays complete in both themes and artifacts on phones', async ({ page }) => {
    for (const origin of [preview, review]) {
        for (const study of content.work.cases) {
            await page.goto(`${origin}/work/${study.slug}/`);
            await page.evaluate(() => document.fonts.ready);
            for (const width of [320, 390]) {
                await page.setViewportSize({ width, height: 844 });
                for (const theme of ['light', 'dark']) {
                    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
                    const frame = page.locator('.case-media .media-surface');
                    expect(await frame.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
                    expect(await frame.evaluate(element => element.querySelector('.concept-node:last-child, .migration-system:last-child').getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom - 8)).toBe(true);
                    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                }
            }
        }
    }
});

test('engineering profile loads, links to evidence, and supports printing', async ({ page }) => {
    await page.goto('/profile/');
    await expect(page.locator('h1')).toHaveText(content.identity.name);
    await expect(page.locator('.profile-role')).toHaveCount(content.experience.items.length);
    await expect(page.locator('.profile-work a')).toHaveCount(content.work.cases.length);
    await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'true'; }; });
    await page.getByRole('button', { name: content.ui.profilePrint }).click();
    await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');
});

for (const width of [320, 390, 767, 1024, 1440]) {
    test(`responsive layout fits at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto('/');
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 390) {
            await expect(page.locator('.hero-actions .btn')).toBeInViewport();
            await expect(page.locator('h1')).toBeInViewport();
        }
        if (width < 801) {
            const menu = page.getByRole('button', { name: content.ui.openMenu });
            await expect(page.locator('#navLinks')).toBeHidden();
            await menu.click();
            await expect(page.locator('#navLinks')).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(menu).toBeFocused();
            await expect(page.locator('#navLinks')).toBeHidden();
            await menu.click();
            await page.locator('#navLinks a[href="#work"]').click();
            await expect(page.locator('#navLinks')).toBeHidden();
        }
        for (const study of content.work.cases) {
            await page.goto(`/work/${study.slug}/`);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
    });
}

test('mobile menu opens into its links and lets keyboard users leave without a trap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const button = page.locator('#menuBtn');
    const links = page.locator('#navLinks a');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(links.first()).toBeFocused();
    for (let index = 1; index < content.navigation.length; index++) {
        await page.keyboard.press('Tab');
        await expect(links.nth(index)).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('#themeToggle')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('.hero-actions .btn')).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#navLinks')).toBeHidden();
});

test('theme follows OS and preserves an explicit choice across pages and reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: content.ui.switchToLight }).click();
    await page.goto('/work/resilient-integrations/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('theme remains usable if local storage is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
    });
    await page.goto('/');
    await page.locator('#themeToggle').click();
    await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label', /Switch to (light|dark) mode/);
});

test('copy email reports success', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { document.body.dataset.copied = text; } } });
    });
    await page.goto('/#contact');
    await page.locator('#copyEmailBtn').click();
    await expect(page.locator('#copyTooltip')).toHaveText(content.ui.copySuccess);
    await expect(page.locator('body')).toHaveAttribute('data-copied', content.identity.email);
});

test('copy falls back on insecure contexts and reports actionable failure', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined });
        document.execCommand = () => false;
    });
    await page.goto('/#contact');
    await page.locator('#copyEmailBtn').click();
    await expect(page.locator('#copyTooltip')).toHaveText(content.ui.copyError);
    await expect(page.locator('.email-address')).toHaveText(content.identity.email);
});

test('project and full-time email subjects differ without sending private details', async ({ page }) => {
    await page.goto('/');
    const project = await page.locator('.hero-actions .btn').getAttribute('href');
    const role = await page.locator('.hiring-actions [data-intent="full-time"]').getAttribute('href');
    expect(project).not.toBe(role);
    expect(decodeURIComponent(project)).toContain(content.ui.projectSubject);
    expect(decodeURIComponent(role)).toContain(content.ui.roleSubject);
});

test('analytics remains completely off in development and local production preview', async ({ page, network }) => {
    for (const origin of [preview, development]) {
        await page.goto(origin);
        await page.locator('#themeToggle').click();
        expect(await page.evaluate(() => window.dataLayer)).toBeUndefined();
    }
    expect(network.external).toEqual([]);
});

test('production analytics tracks page and case intent without query strings or email', async ({ page, context }) => {
    await context.route(`${production}/**`, async route => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: `${preview}${url.pathname}${url.search}` });
        await route.fulfill({ response });
    });
    await page.goto(`${production}/?private=do-not-track-this`);
    const events = await page.evaluate(() => Array.from(window.dataLayer || [], item => Array.from(item)));
    const pageView = events.find(item => item[0] === 'event' && item[1] === 'page_view');
    expect(pageView[2].page_path).toBe('/');
    expect(pageView[2].page_location).toBe(`${production}/`);
    expect(JSON.stringify(events)).not.toContain('do-not-track-this');
    expect(JSON.stringify(events)).not.toContain(content.identity.email);
});

test('unknown routes still recover through the Pages fallback without looping', async ({ page, network }) => {
    await page.goto('/missing/several/levels/?keep=a%2Bb#missing');
    await expect(page.locator('h1')).toContainText('bottlenecks');
    await expect(page).toHaveURL(`${preview}/missing/several/levels/?keep=a%2Bb#missing`);
    expect(network.documents.length).toBe(2);
});

test.describe('progressive enhancement', () => {
    test.use({ javaScriptEnabled: false });
    test('homepage navigation, inquiry links, and evidence are readable without JavaScript', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('bottlenecks');
        await expect(page.locator('#navLinks')).toBeVisible();
        await expect(page.locator('.hero-actions .btn')).toHaveAttribute('href', /^mailto:/);
        await page.locator('.hero-proof a').click();
        await expect(page.locator('h1')).toHaveText(content.work.cases[0].title);
        await expect(page.getByRole('heading', { name: content.ui.decisionHeading })).toBeVisible();
    });
});
