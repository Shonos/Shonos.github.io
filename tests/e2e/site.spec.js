import { readFile } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';

const content = JSON.parse(await readFile(new URL('../../content/site.json', import.meta.url), 'utf8'));
const preview = 'http://127.0.0.1:4174';
const development = 'http://127.0.0.1:5174';
const production = 'https://shaunalonzo.com';
const localOrigins = new Set([preview, development]);
const analyticsHost = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com)$/;

function documentURL(value) {
    const url = new URL(value);
    url.hash = '';
    return url.href;
}

const test = base.extend({
    network: [async ({ context }, use) => {
        const network = {
            external: [],
            google: [],
            documents: [],
            responses: [],
            consoleErrors: [],
            pageErrors: [],
            allowedDocument404s: new Set()
        };
        const observe = page => {
            page.on('pageerror', error => network.pageErrors.push(error.message));
            page.on('console', message => {
                if (message.type() === 'error') {
                    network.consoleErrors.push({ text: message.text(), url: message.location().url });
                }
            });
        };
        context.pages().forEach(observe);
        context.on('page', observe);
        context.on('response', response => {
            const entry = {
                url: response.url(),
                status: response.status(),
                type: response.request().resourceType()
            };
            if (entry.type === 'document') {
                network.documents.push(entry);
            }
            if (entry.status >= 400) {
                network.responses.push(entry);
            }
        });
        await context.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (localOrigins.has(url.origin)) {
                await route.continue();
                return;
            }
            network.external.push({ url: url.href, type: request.resourceType() });
            if (analyticsHost.test(url.hostname)) {
                network.google.push(url.href);
            }
            const type = request.resourceType();
            await route.fulfill({
                status: type === 'script' || type === 'stylesheet' ? 200 : 204,
                contentType: type === 'stylesheet' ? 'text/css' : 'application/javascript',
                body: type === 'script' ? 'void 0;' : ''
            });
        });
        await context.routeWebSocket(/.*/, socket => {
            const url = new URL(socket.url());
            if (url.hostname === '127.0.0.1' && url.port === '5174') {
                socket.connectToServer();
            } else {
                network.external.push({ url: url.href, type: 'websocket' });
                socket.close();
            }
        });
        await use(network);
        expect(network.pageErrors, 'Uncaught browser JavaScript errors').toEqual([]);
        expect(network.responses.filter(response => !(response.status === 404 &&
            response.type === 'document' && network.allowedDocument404s.has(documentURL(response.url)))),
        'Unexpected HTTP failures, including missing local assets').toEqual([]);
        expect(network.consoleErrors.filter(error => !(error.url &&
            network.allowedDocument404s.has(documentURL(error.url)) &&
            /^Failed to load resource: the server responded with a status of 404\b/.test(error.text))),
        'Unexpected browser console errors').toEqual([]);
    }, { auto: true }]
});

async function expectSection(page, id, target = id) {
    const active = page.locator('#navLinks a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute('href', `#${id}`);
    const destination = page.locator(`[id="${target}"]`);
    await expect(destination).toBeAttached();
    await expect.poll(() => destination.evaluate(element => {
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const top = Math.max(0, Math.min(maximum, element.getBoundingClientRect().top + window.scrollY - 100));
        return Math.abs(window.scrollY - top);
    })).toBeLessThan(3);
    await page.waitForTimeout(400);
    await expect(active).toHaveAttribute('href', `#${id}`);
}

async function visit(page, network, path, id, origin = preview, target = id) {
    const url = new URL(path, origin);
    if (origin !== development && url.pathname !== '/') {
        network.allowedDocument404s.add(documentURL(url.href));
    }
    await page.goto(url.href);
    await expect(page).toHaveURL(url.href);
    await expectSection(page, id, target);
}

async function clickNavigation(page, id) {
    const link = page.locator(`#navLinks a[href="#${id}"]`);
    await link.focus();
    await link.click();
    await expectSection(page, id);
}

function expectPagesRedirect(network, offset, path, origin = preview) {
    const destination = new URL(path, origin);
    const relative = destination.pathname + destination.search + destination.hash;
    expect(network.documents.slice(offset)).toEqual([
        { url: documentURL(destination.href), status: 404, type: 'document' },
        { url: `${origin}/?__redirect=${encodeURIComponent(relative)}`, status: 200, type: 'document' }
    ]);
}

async function proxyProduction(context) {
    await context.route('https://shaunalonzo.com/**', async route => {
        const url = new URL(route.request().url());
        const response = await route.fetch({ url: `${preview}${url.pathname}${url.search}`, maxRedirects: 0 });
        await route.fulfill({ response });
    });
}

async function queuedEvents(page) {
    return page.evaluate(() => Array.from(window.dataLayer || [], entry => Array.from(entry)));
}

async function pageViews(page) {
    return (await queuedEvents(page)).filter(entry => entry[0] === 'event' && entry[1] === 'page_view')
        .map(entry => entry[2]);
}

async function expectPageViews(page, paths, query = '') {
    await expect.poll(async () => (await pageViews(page)).map(view => view.page_path)).toEqual(paths);
    expect(await pageViews(page)).toEqual(paths.map(path => ({
        send_to: content.analytics.measurementId,
        page_title: `${content.navigation.find(item => item.route === path).label} - ${content.identity.name}`,
        page_path: path,
        page_location: `${production}${path}${query}`
    })));
}

test('the root contains the rendered identity and starts in About', async ({ page, network }) => {
    await visit(page, network, '/', 'about');
    await expect(page).toHaveTitle(`${content.identity.name} — ${content.identity.role}`);
    await expect(page.locator('h1')).toHaveText(content.identity.name);
    await expect(page.locator('.hero-role')).toHaveText(content.identity.role);
    await expect(page.locator('.email-address')).toHaveText(content.identity.email);
    expect(network.documents).toEqual([{ url: `${preview}/`, status: 200, type: 'document' }]);
});

for (const { id, route } of content.navigation) {
    for (const path of [route, `${route}/`, `${route}/?q=a%2Bb&q=one+two&encoded=%26%3D#${id}`]) {
        test(`Pages deep link and refresh preserve ${path}`, async ({ page, network }) => {
            await visit(page, network, path, id);
            expectPagesRedirect(network, 0, path);
            const offset = network.documents.length;
            await page.reload();
            await expect(page).toHaveURL(`${preview}${path}`);
            await expectSection(page, id);
            expectPagesRedirect(network, offset, path);
        });
    }
}

for (const path of ['/?q=a%2Bb#skills-title', '/projects/?q=a%2Bb#skills-title']) {
    test(`a nested hash target takes priority over the route: ${path}`, async ({ page, network }) => {
        await visit(page, network, path, 'skills', preview, 'skills-title');
        await page.reload();
        await expect(page).toHaveURL(`${preview}${path}`);
        await expectSection(page, 'skills', 'skills-title');
    });
}

test('an unknown multi-level route falls back to About without looping or breaking navigation', async ({ page, network }) => {
    const path = '/missing/several/levels/?keep=a%2Bb#missing-target';
    await visit(page, network, path, 'about');
    expectPagesRedirect(network, 0, path);
    const offset = network.documents.length;
    await page.reload();
    await expect(page).toHaveURL(`${preview}${path}`);
    await expectSection(page, 'about');
    expectPagesRedirect(network, offset, path);
    await clickNavigation(page, 'contact');
    await expect(page).toHaveURL(`${preview}/contact?keep=a%2Bb`);
    expect(network.documents).toHaveLength(4);
});

for (const format of ['legacy', 'reserved']) {
    test(`${format} redirects preserve the complete path, query, and hash`, async ({ page, network }) => {
        const destination = '/skills/?value=a%2Bb&value=one+two&literal=~and~&encoded=%26%3D#skills-title';
        const entry = format === 'legacy' ? `/?${destination}` : `/?__redirect=${encodeURIComponent(destination)}`;
        await page.goto(`${preview}${entry}`);
        await expect(page).toHaveURL(`${preview}${destination}`);
        await expectSection(page, 'skills', 'skills-title');
        expect(network.documents).toHaveLength(1);
        expect(network.documents[0].status).toBe(200);
        network.allowedDocument404s.add(documentURL(`${preview}${destination}`));
        await page.reload();
        await expect(page).toHaveURL(`${preview}${destination}`);
        await expectSection(page, 'skills', 'skills-title');
        expectPagesRedirect(network, 1, destination);
    });
}

for (const candidate of [
    'https://outside.invalid/contact', '//outside.invalid', '/\\outside.invalid',
    '/%2Foutside.invalid', '/%5Coutside.invalid', '/contact%0Ainjected',
    '/?__redirect=%2Fcontact', '/?/contact', '/%E0%A4%A'
]) {
    test(`malicious redirect is rejected: ${candidate}`, async ({ page, network }) => {
        await page.goto(`${preview}/?keep=a%2Bb&__redirect=${encodeURIComponent(candidate)}#missing-target`);
        await expect(page).toHaveURL(`${preview}/?keep=a%2Bb#missing-target`);
        await expectSection(page, 'about');
        await clickNavigation(page, 'services');
        await expect(page).toHaveURL(`${preview}/services?keep=a%2Bb`);
        expect(network.documents).toHaveLength(1);
        expect(network.external.filter(request => request.type === 'document')).toEqual([]);
    });
}

test('navigation pushes history while Back and Forward restore the intended section', async ({ page, network }) => {
    await visit(page, network, '/?keep=a%2Bb', 'about');
    const initialLength = await page.evaluate(() => history.length);
    await clickNavigation(page, 'contact');
    await expect(page).toHaveURL(`${preview}/contact?keep=a%2Bb`);
    await clickNavigation(page, 'skills');
    await expect(page).toHaveURL(`${preview}/skills?keep=a%2Bb`);
    expect(await page.evaluate(() => history.length)).toBe(initialLength + 2);
    await page.goBack();
    await expect(page).toHaveURL(`${preview}/contact?keep=a%2Bb`);
    await expectSection(page, 'contact');
    await page.goBack();
    await expect(page).toHaveURL(`${preview}/?keep=a%2Bb`);
    await expectSection(page, 'about');
    await page.goForward();
    await expect(page).toHaveURL(`${preview}/contact?keep=a%2Bb`);
    await expectSection(page, 'contact');
    expect(network.documents).toHaveLength(1);
});

test('user wheel scrolling updates section state using replacement rather than new history entries', async ({ page, network }) => {
    await visit(page, network, '/?source=scroll', 'about');
    const initialLength = await page.evaluate(() => history.length);
    await page.mouse.move(900, 500);
    for (const id of ['services', 'skills']) {
        const distance = await page.locator(`#${id}`).evaluate(element => element.getBoundingClientRect().top - 100);
        await page.mouse.wheel(0, distance);
        await expect(page).toHaveURL(`${preview}/${id}?source=scroll`);
        await expectSection(page, id);
    }
    await page.keyboard.press('Home');
    await expect(page).toHaveURL(`${preview}/about?source=scroll`);
    await expectSection(page, 'about');
    expect(await page.evaluate(() => history.length)).toBe(initialLength);
    expect(network.documents).toHaveLength(1);
});

for (const width of [320, 390, 767]) {
    test(`mobile navigation and content fit a ${width}px viewport`, async ({ page, network }) => {
        await page.setViewportSize({ width, height: 844 });
        await visit(page, network, '/', 'about');
        const menu = page.locator('#menuBtn');
        const links = page.locator('#navLinks');
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        await expect(links).toBeHidden();
        await menu.click();
        await expect(menu).toHaveAttribute('aria-expanded', 'true');
        await expect(menu).toHaveAttribute('aria-label', content.ui.closeMenu);
        await expect(links).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(menu).toBeFocused();
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        await menu.click();
        await page.mouse.click(8, 836);
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        for (const { id } of content.navigation) {
            await menu.focus();
            await menu.click();
            await clickNavigation(page, id);
            await expect(menu).toHaveAttribute('aria-expanded', 'false');
            await expect(menu).toHaveAttribute('aria-label', content.ui.openMenu);
            await expect(links).toBeHidden();
            expect(await page.evaluate(() => Math.max(document.documentElement.scrollWidth,
                document.body.scrollWidth) - window.innerWidth)).toBeLessThanOrEqual(1);
        }
        await menu.focus();
        await menu.click();
        await page.setViewportSize({ width: 1024, height: 844 });
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        await expect(links).not.toHaveClass(/\bactive\b/);
        await expect(links).toBeVisible();
    });
}

for (const theme of ['light', 'dark']) {
    test(`saved ${theme} theme is restored before first contentful paint and before the app module`, async ({ page, context }) => {
        const opposite = theme === 'dark' ? 'light' : 'dark';
        await page.emulateMedia({ colorScheme: opposite });
        await context.addInitScript(saved => {
            if (!localStorage.getItem('theme')) {
                localStorage.setItem('theme', saved);
            }
            window.__themePaint = null;
            window.__themeChanges = [];
            new MutationObserver(records => {
                if (records.some(record => record.attributeName === 'data-theme')) {
                    window.__themeChanges.push({ theme: document.documentElement.dataset.theme, at: performance.now() });
                }
            }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] });
            new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        window.__themePaint = { theme: document.documentElement.dataset.theme, at: entry.startTime };
                    }
                }
            }).observe({ type: 'paint', buffered: true });
        }, theme);
        const response = await page.request.get(preview);
        expect(response.ok()).toBe(true);
        const html = await response.text();
        const modules = [...html.matchAll(/<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>/g)]
            .map(match => new URL(match[1], preview).href);
        expect(modules.length).toBeGreaterThan(0);
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        for (const url of modules) {
            await page.route(url, async route => {
                await gate;
                await route.fallback();
            });
        }
        try {
            await page.goto(preview, { waitUntil: 'commit' });
            await expect(page.locator('h1')).toHaveText(content.identity.name);
            await expect.poll(() => page.evaluate(() => window.__themePaint?.theme)).toBe(theme);
            const changes = await page.evaluate(() => ({ paint: window.__themePaint, changes: window.__themeChanges }));
            expect(changes.changes.length).toBeGreaterThan(0);
            expect(changes.changes.every(change => change.theme === theme)).toBe(true);
            expect(changes.changes[0].at).toBeLessThanOrEqual(changes.paint.at);
            await expect(page.locator('#themeToggle')).toHaveAttribute('aria-label', content.ui.themeToggle);
        } finally {
            release();
        }
        await page.waitForLoadState('load');
        const toggle = page.locator('#themeToggle');
        await expect(toggle).toHaveAttribute('aria-label', theme === 'dark' ? content.ui.switchToLight : content.ui.switchToDark);
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
        expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(opposite);
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', opposite);
        await expect(toggle).toHaveAttribute('aria-label', opposite === 'dark' ? content.ui.switchToLight : content.ui.switchToDark);
    });
}

test('blocked storage falls back to the system theme and does not disable toggling or navigation', async ({ page, context, network }) => {
    await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() { throw new DOMException('Storage is blocked', 'SecurityError'); }
        });
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await visit(page, network, '/', 'about');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#themeToggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await clickNavigation(page, 'services');
});

for (const scenario of [
    { name: 'Clipboard API succeeds', mode: 'success', fallback: false, success: true },
    { name: 'Clipboard API rejects and fallback succeeds', mode: 'reject', fallback: true, success: true },
    { name: 'Clipboard API rejects and fallback returns false', mode: 'reject', fallback: false, success: false },
    { name: 'Clipboard API is unavailable and fallback returns false', mode: 'missing', fallback: false, success: false }
]) {
    test(scenario.name, async ({ page, context, network }) => {
        await context.addInitScript(({ mode, fallback }) => {
            window.__clipboard = { writes: [], commands: [] };
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: mode === 'missing' ? undefined : {
                    async writeText(text) {
                        window.__clipboard.writes.push(text);
                        if (mode !== 'success') {
                            throw new DOMException('Clipboard permission denied', 'NotAllowedError');
                        }
                    }
                }
            });
            Object.defineProperty(document, 'execCommand', {
                configurable: true,
                value(command) {
                    window.__clipboard.commands.push({ command, value: document.activeElement?.value });
                    return fallback;
                }
            });
        }, scenario);
        await visit(page, network, '/contact', 'contact');
        const button = page.locator('#copyEmailBtn');
        await button.focus();
        const scrollY = await page.evaluate(() => window.scrollY);
        await button.click();
        const tooltip = page.locator('#copyTooltip');
        await expect(tooltip).toHaveText(scenario.success ? content.ui.copySuccess : content.ui.copyError);
        await expect(tooltip).toHaveClass(/\bshow\b/);
        await expect(tooltip).toHaveAttribute('role', 'status');
        await expect(tooltip).toHaveAttribute('aria-live', 'polite');
        await expect(button).not.toHaveAttribute('aria-busy', 'true');
        await expect(button).toBeFocused();
        await expect(page.locator('textarea')).toHaveCount(0);
        expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollY)).toBeLessThanOrEqual(2);
        expect(await page.evaluate(() => window.__clipboard)).toEqual({
            writes: scenario.mode === 'missing' ? [] : [content.identity.email],
            commands: scenario.mode === 'success' ? [] : [{ command: 'copy', value: content.identity.email }]
        });
    });
}

test('disabled chat is inert and creates no welcome, reply, or interval timers', async ({ page, context, network }) => {
    await context.addInitScript(() => {
        window.__timers = { timeouts: [], intervals: [] };
        const timeout = window.setTimeout.bind(window);
        const interval = window.setInterval.bind(window);
        window.setTimeout = (callback, delay, ...args) => {
            window.__timers.timeouts.push(Number(delay) || 0);
            return timeout(callback, delay, ...args);
        };
        window.setInterval = (callback, delay, ...args) => {
            window.__timers.intervals.push(Number(delay) || 0);
            return interval(callback, delay, ...args);
        };
    });
    await visit(page, network, '/', 'about');
    const widget = page.locator('.chat-widget');
    await expect(widget).toBeHidden();
    await expect(widget).toHaveAttribute('aria-hidden', 'true');
    await expect(widget).toHaveJSProperty('inert', true);
    await expect(page.locator('#chatContainer')).toHaveJSProperty('hidden', true);
    for (const id of ['chatButton', 'chatClose', 'chatInput', 'chatSubmit']) {
        await expect(page.locator(`#${id}`)).toBeDisabled();
    }
    const baseline = await page.evaluate(() => window.__timers);
    expect(baseline.timeouts.filter(delay => delay !== 250)).toEqual([]);
    expect(baseline.intervals).toEqual([]);
    await page.evaluate(() => {
        document.getElementById('chatButton').dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const input = document.getElementById('chatInput');
        input.value = 'hello';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        document.getElementById('chatSubmit').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(await page.evaluate(() => window.__timers)).toEqual(baseline);
    await expect(page.locator('#chatMessages')).toBeEmpty();
    await expect(page.locator('.typing-indicator')).toHaveCount(0);
    await expect(widget).toBeHidden();
});

for (const origin of [preview, development]) {
    test(`${origin} never loads analytics during local navigation`, async ({ page, network }) => {
        await visit(page, network, '/', 'about', origin);
        for (const { id } of content.navigation.slice(1)) {
            await clickNavigation(page, id);
        }
        await page.locator('#themeToggle').focus();
        await page.locator('#themeToggle').click();
        expect(await page.evaluate(() => ({ queue: typeof window.dataLayer, gtag: typeof window.gtag })))
            .toEqual({ queue: 'undefined', gtag: 'undefined' });
        await expect(page.locator('script[src*="googletagmanager"], script[src*="google-analytics"]')).toHaveCount(0);
        expect(network.google).toEqual([]);
    });
}

test.describe('production analytics without external traffic', () => {
    test.beforeEach(async ({ context }) => {
        await proxyProduction(context);
    });

    test('configuration disables automatic views and smooth navigation emits only settled destinations', async ({ page, network }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        const query = '?utm_source=e2e&value=a%2Bb';
        await visit(page, network, `/${query}`, 'about', production);
        expect(await page.evaluate(() => location.hostname)).toBe('shaunalonzo.com');
        const queue = await queuedEvents(page);
        expect(queue).toHaveLength(3);
        expect(queue[0][0]).toBe('js');
        expect(queue[1]).toEqual(['config', content.analytics.measurementId, { send_page_view: false }]);
        const paths = ['/about'];
        await expectPageViews(page, paths, query);
        for (const id of ['contact', 'about', ...content.navigation.slice(1).map(item => item.id)]) {
            await clickNavigation(page, id);
            paths.push(`/${id}`);
            await expectPageViews(page, paths, query);
        }
        const historyLength = await page.evaluate(() => history.length);
        await clickNavigation(page, 'contact');
        await expectPageViews(page, paths, query);
        expect(await page.evaluate(() => history.length)).toBe(historyLength);
        await page.goBack();
        await expectSection(page, 'projects');
        paths.push('/projects');
        await expectPageViews(page, paths, query);
        await page.goForward();
        await expectSection(page, 'contact');
        paths.push('/contact');
        await expectPageViews(page, paths, query);
        expect(network.google).toEqual([`https://www.googletagmanager.com/gtag/js?id=${content.analytics.measurementId}`]);
        expect(network.documents).toHaveLength(1);
    });

    for (const { id, route } of content.navigation) {
        test(`deep ${route} initialization and refresh each queue exactly one page view`, async ({ page, network }) => {
            const query = '?q=a%2Bb&value=one+two';
            const path = `${route}/${query}#${id}`;
            await visit(page, network, path, id, production);
            expectPagesRedirect(network, 0, path, production);
            await expectPageViews(page, [route], query);
            expect(await queuedEvents(page)).toHaveLength(3);
            await page.reload();
            await expect(page).toHaveURL(`${production}${path}`);
            await expectSection(page, id);
            await expectPageViews(page, [route], query);
            expect(await queuedEvents(page)).toHaveLength(3);
            expectPagesRedirect(network, 2, path, production);
            expect(network.google).toHaveLength(2);
        });
    }

    test('legacy and unknown routes do not queue an intermediate root page view', async ({ page, network }) => {
        await page.goto(`${production}/?/skills/?q=a%2Bb#skills-title`);
        await expect(page).toHaveURL(`${production}/skills/?q=a%2Bb#skills-title`);
        await expectSection(page, 'skills', 'skills-title');
        await expectPageViews(page, ['/skills'], '?q=a%2Bb');
        await visit(page, network, '/unknown/nested/path/?q=a%2Bb#missing', 'about', production);
        await expectPageViews(page, ['/about'], '?q=a%2Bb');
        await clickNavigation(page, 'contact');
        await expectPageViews(page, ['/about', '/contact'], '?q=a%2Bb');
    });

    test('user scrolling tracks a settled section once and not every wheel event', async ({ page, network }) => {
        await visit(page, network, '/', 'about', production);
        const distance = await page.locator('#services').evaluate(element => element.getBoundingClientRect().top - 100);
        await page.mouse.move(900, 500);
        await page.mouse.wheel(0, distance);
        await expect(page).toHaveURL(`${production}/services`);
        await expectSection(page, 'services');
        await expectPageViews(page, ['/about', '/services']);
        await page.mouse.wheel(0, 40);
        await page.waitForTimeout(500);
        await expectPageViews(page, ['/about', '/services']);
        await expect(page.locator('#navLinks a[aria-current="page"]')).toHaveAttribute('href', '#services');
    });
});

async function renderedDOM(page) {
    return page.evaluate(() => {
        const text = value => value.replace(/\s+/g, ' ').trim();
        const tree = node => {
            if (node.nodeType === Node.TEXT_NODE) {
                return text(node.textContent) || null;
            }
            if (!(node instanceof Element)) {
                return null;
            }
            return {
                tag: node.tagName,
                attributes: Array.from(node.attributes, attribute => [attribute.name, attribute.value])
                    .sort(([left], [right]) => left.localeCompare(right)),
                children: Array.from(node.childNodes, tree).filter(child => child !== null)
            };
        };
        return {
            title: document.title,
            language: document.documentElement.lang,
            meta: Array.from(document.querySelectorAll('meta[name], meta[property]'), element => tree(element)),
            navigation: tree(document.getElementById('navLinks')),
            main: tree(document.querySelector('main')),
            footer: tree(document.querySelector('footer')),
            runtime: JSON.parse(document.getElementById('site-config').textContent),
            structured: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)
        };
    });
}

test('the development server renders the same generated content as the production build', async ({ page, context, network }) => {
    await visit(page, network, '/', 'about');
    const expected = await renderedDOM(page);
    const devPage = await context.newPage();
    await visit(devPage, network, '/', 'about', development);
    expect(await renderedDOM(devPage)).toEqual(expected);
    await devPage.reload();
    await expectSection(devPage, 'about');
    expect(await renderedDOM(devPage)).toEqual(expected);
    expect(network.google).toEqual([]);
});

test.describe('static HTML without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const origin of [preview, development]) {
        test(`${origin} exposes complete content, links, metadata, and native disclosures`, async ({ page, network }) => {
            await page.goto(origin);
            await expect(page).toHaveTitle(`${content.identity.name} — ${content.identity.role}`);
            await expect(page.locator('h1')).toHaveText(content.identity.name);
            await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', content.metadata.description);
            await expect(page.locator('.service-card')).toHaveCount(content.services.items.length);
            await expect(page.locator('.skills-category')).toHaveCount(content.skills.categories.length);
            await expect(page.locator('.timeline-item:not(.timeline-earlier)')).toHaveCount(content.experience.items.length);
            await expect(page.locator('.project-card')).toHaveCount(content.projects.items.length);
            await expect(page.locator('.email-address')).toHaveText(content.identity.email);
            await expect(page.locator(`a[href="mailto:${content.identity.email}"]`)).toHaveText(content.ui.email);
            for (const { id, label } of content.navigation) {
                await expect(page.locator(`#${id}`)).toBeVisible();
                await expect(page.locator(`#navLinks a[href="#${id}"]`)).toHaveText(label);
            }
            for (const profile of content.social) {
                await expect(page.getByRole('link', { name: profile.ariaLabel, exact: true })).toHaveAttribute('href', profile.url);
            }
            const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
            expect(structured.name).toBe(content.identity.name);
            expect(structured.jobTitle).toBe(content.identity.role);
            expect(structured.sameAs).toEqual(content.social.map(profile => profile.url));
            expect(await page.content()).not.toMatch(/\{\{|__THEME_SCRIPT__/);
            await expect(page.locator('.chat-widget')).toBeHidden();
            await page.locator('#navLinks a[href="#skills"]').click();
            await expect(page).toHaveURL(`${origin}/#skills`);
            const details = page.locator('.skills-more').first();
            await details.locator('summary').click();
            await expect(details).toHaveAttribute('open', '');
            await expect(details.locator('.skill-tag').first()).toBeVisible();
            expect(network.google).toEqual([]);
        });
    }

    test('the actual 404 document offers a working home link when redirects cannot execute', async ({ page, network }) => {
        const url = `${preview}/missing/nested/static`;
        network.allowedDocument404s.add(url);
        const response = await page.goto(url);
        expect(response.status()).toBe(404);
        await expect(page).toHaveTitle('Page not found');
        await page.getByRole('link', { name: 'Return to the homepage' }).click();
        await expect(page).toHaveURL(`${preview}/`);
        await expect(page.locator('h1')).toHaveText(content.identity.name);
    });
});
