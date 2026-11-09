import { test, expect } from '@playwright/test';
import { AGENT_WORKFLOW_EDGES, AGENT_WORKFLOW_ROUTES } from '../../src/agent-workflow-state.js';

const workflow = page => page.locator('[data-agent-workflow]');
const choice = (root, id) => root.locator(`[data-agent-route-choice="${id}"]`);
const stageButton = (root, route, stage) => root.locator(`[data-agent-route-panel="${route}"] [data-agent-stage="${stage}"] button`);
const boxes = root => root.locator('[data-agent-node]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { id: node.getAttribute('data-agent-node'), x: box.x, y: box.y, width: box.width, height: box.height };
}));

test('both routes expose every explicit handoff and support stage/route keyboard selection with motion off', async ({ page }) => {
    await page.goto('/');
    const root = workflow(page);
    await expect(root).toHaveAttribute('data-agent-enhanced', 'true');
    await expect(root.locator('[data-agent-playback]')).toBeHidden();
    await expect(root.locator('[data-agent-reduced]')).toBeVisible();
    for (const [id, route] of Object.entries(AGENT_WORKFLOW_ROUTES)) {
        await choice(root, id).click();
        for (const stage of route.stages) {
            const button = stageButton(root, id, stage.id);
            await button.click();
            await expect(root).toHaveAttribute('data-agent-state', stage.id);
            await expect(root).toHaveAttribute('data-agent-playing', 'false');
            await expect(button).toHaveAttribute('aria-pressed', 'true');
            await expect(root.locator('[data-agent-node][data-agent-active="true"]')).toHaveAttribute('data-agent-node', stage.activeNode);
            const edge = root.locator('[data-agent-edge][data-agent-active="true"]');
            if (stage.edge) await expect(edge).toHaveAttribute('data-agent-edge', stage.edge);
            else await expect(edge).toHaveCount(0);
            await expect(root.locator('[data-agent-current-title]')).toHaveText(await button.textContent());
            await expect(root.locator('[data-agent-current-description]')).not.toBeEmpty();
        }
        const last = stageButton(root, id, 'approval');
        await last.press('Home');
        await expect(stageButton(root, id, 'brief')).toBeFocused();
        await last.focus();
        await last.press('ArrowRight');
        await expect(stageButton(root, id, 'brief')).toBeFocused();
        await stageButton(root, id, 'brief').press('End');
        await expect(last).toBeFocused();
    }
    await choice(root, 'need-more-context').focus();
    await choice(root, 'need-more-context').press('Home');
    await expect(choice(root, 'ready-to-build')).toBeFocused();
    await expect(root).toHaveAttribute('data-agent-route', 'ready-to-build');
    await expect(root).toHaveAttribute('data-agent-research', 'skipped');
});

for (const width of [320, 800, 1440]) {
    for (const theme of ['light', 'dark']) {
        test(`agent boxes stay fixed and connections meet boxes without crossing labels: ${width}px ${theme}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 1000 });
            await page.goto('/');
            await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
            const root = workflow(page);
            await root.scrollIntoViewIfNeeded();
            await expect(root).toHaveAttribute('data-agent-enhanced', 'true');
            const original = await boxes(root);
            // Compare in component coordinates because selecting controls may scroll
            // a long mobile illustration into view, but must never move its boxes.
            const local = values => values.map(box => ({ ...box, x: box.x - values[0].x, y: box.y - values[0].y }));
            for (const [id, route] of Object.entries(AGENT_WORKFLOW_ROUTES)) {
                await choice(root, id).click();
                for (const stage of route.stages) {
                    await stageButton(root, id, stage.id).click();
                    expect(local(await boxes(root))).toEqual(local(original));
                }
            }
            const geometry = await root.evaluate(element => {
                const map = element.querySelector('[data-agent-map]');
                const bounds = map.getBoundingClientRect();
                const nodes = [...element.querySelectorAll('[data-agent-node]')].map(node => {
                    const box = node.getBoundingClientRect();
                    return { id: node.getAttribute('data-agent-node'), left: box.left - bounds.left, right: box.right - bounds.left,
                        top: box.top - bounds.top, bottom: box.bottom - bounds.top };
                });
                const paths = [...element.querySelectorAll('[data-agent-edge]')].map(path => {
                    const length = path.getTotalLength();
                    const start = path.getPointAtLength(0);
                    const end = path.getPointAtLength(length);
                    let crossesBox = false;
                    for (let distance = 1; distance < length; distance += 2) {
                        const point = path.getPointAtLength(distance);
                        if (nodes.some(node => point.x > node.left + 1 && point.x < node.right - 1 && point.y > node.top + 1 && point.y < node.bottom - 1)) crossesBox = true;
                    }
                    return { id: path.getAttribute('data-agent-edge'), start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y }, crossesBox };
                });
                const controls = [...element.querySelectorAll('button, summary')].filter(control => control.getBoundingClientRect().height).map(control => control.getBoundingClientRect().height);
                const labels = [...element.querySelectorAll('.agent-workflow-node strong, .agent-workflow-node span, button')].map(label => parseFloat(getComputedStyle(label).fontSize));
                const clipped = [...element.querySelectorAll('[data-agent-node]')].filter(node => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight).map(node => node.getAttribute('data-agent-node'));
                return { width: bounds.width, nodes, paths, controls, labels, clipped, overflow: document.documentElement.scrollWidth > innerWidth };
            });
            expect(geometry.overflow).toBe(false);
            expect(geometry.clipped).toEqual([]);
            expect(geometry.controls.every(height => height >= 44)).toBe(true);
            expect(geometry.labels.every(size => size >= 12)).toBe(true);
            for (const node of geometry.nodes) {
                expect(node.left).toBeGreaterThanOrEqual(0);
                expect(node.right).toBeLessThanOrEqual(geometry.width);
            }
            for (const edge of AGENT_WORKFLOW_EDGES) {
                const path = geometry.paths.find(path => path.id === edge.id);
                expect(path.crossesBox, edge.id).toBe(false);
                for (const [point, id] of [[path.start, edge.from], [path.end, edge.to]]) {
                    const node = geometry.nodes.find(node => node.id === id);
                    const onHorizontal = Math.min(Math.abs(point.y - node.top), Math.abs(point.y - node.bottom)) < 1 && point.x >= node.left - 1 && point.x <= node.right + 1;
                    const onVertical = Math.min(Math.abs(point.x - node.left), Math.abs(point.x - node.right)) < 1 && point.y >= node.top - 1 && point.y <= node.bottom + 1;
                    expect(onHorizontal || onVertical, `${edge.id} endpoint ${id}`).toBe(true);
                }
            }
            const beforeHover = await boxes(root);
            await root.locator('[data-agent-node="orchestrator"]').hover();
            expect(local(await boxes(root))).toEqual(local(beforeHover));
        });
    }
}

for (const id of Object.keys(AGENT_WORKFLOW_ROUTES)) {
    test(`${id} plays a single bounded sequence, pauses, and replays without live-region frame noise`, async ({ page }) => {
        await page.clock.install();
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.goto('/');
        const root = workflow(page);
        await choice(root, id).click();
        await root.locator('[data-agent-map]').scrollIntoViewIfNeeded();
        // Freeze wall-clock advancement before measuring handoff boundaries;
        // browser/worker latency must not consume part of the first stage.
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
        await root.locator('[data-agent-play]').click();
        await expect(root).toHaveAttribute('data-agent-playing', 'true');
        await root.locator('[data-agent-announcement]').evaluate(element => {
            element.setAttribute('data-test-mutations', '0');
            new MutationObserver(() => element.setAttribute('data-test-mutations', String(Number(element.getAttribute('data-test-mutations')) + 1)))
                .observe(element, { childList: true, characterData: true, subtree: true });
        });
        await page.clock.runFor(1000);
        await expect(root.locator('[data-agent-announcement]')).toHaveAttribute('data-test-mutations', '0');
        await page.clock.runFor(3800);
        await expect(root).toHaveAttribute('data-agent-state', id === 'ready-to-build' ? 'build' : 'research');
        await root.locator('[data-agent-play]').click();
        await expect(root).toHaveAttribute('data-agent-playing', 'false');
        const pausedStage = await root.getAttribute('data-agent-state');
        await page.clock.runFor(4000);
        await expect(root).toHaveAttribute('data-agent-state', pausedStage);
        await root.locator('[data-agent-play]').click();
        await page.clock.runFor(AGENT_WORKFLOW_ROUTES[id].duration);
        await expect(root).toHaveAttribute('data-agent-state', 'approval');
        await expect(root).toHaveAttribute('data-agent-playing', 'false');
        await page.clock.runFor(AGENT_WORKFLOW_ROUTES[id].duration);
        await expect(root).toHaveAttribute('data-agent-state', 'approval');
        await root.locator('[data-agent-replay]').click();
        await expect(root).toHaveAttribute('data-agent-state', 'brief');
        await expect(root).toHaveAttribute('data-agent-playing', 'true');
    });
}

test('workflow pauses offscreen, in background, and on reduced-motion changes without surprise resumption', async ({ page }) => {
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const root = workflow(page);
    await choice(root, 'ready-to-build').click();
    await root.locator('[data-agent-map]').scrollIntoViewIfNeeded();
    await root.locator('[data-agent-play]').click();
    await expect(root).toHaveAttribute('data-agent-playing', 'true');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
    await root.locator('[data-agent-map]').scrollIntoViewIfNeeded();
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
    await root.locator('[data-agent-play]').click();
    await expect(root).toHaveAttribute('data-agent-playing', 'true');
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
    await root.locator('[data-agent-play]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(32);
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
    await expect(root.locator('[data-agent-playback]')).toBeHidden();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.runFor(32);
    await expect(root).toHaveAttribute('data-agent-playing', 'false');
});

test('without JavaScript both complete routes and model labels remain readable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4174/');
    const root = workflow(page);
    await expect(root.locator('[data-agent-node]')).toHaveCount(6);
    await expect(root.locator('[data-agent-written]')).toHaveAttribute('open', '');
    await expect(root.locator('[data-agent-written]')).toContainText('Research is skipped');
    await expect(root.locator('[data-agent-written]')).toContainText('revised plan returns');
    await expect(root.locator('[data-agent-node="orchestrator"]')).toContainText('Sonnet');
    await expect(root.locator('[data-agent-node="planner"]')).toContainText('Claude Opus');
    await expect(root.locator('[data-agent-node="researcher"]')).toContainText('Sonnet / Opus');
    await expect(root.locator('button:visible')).toHaveCount(0);
    await expect(root).toContainText('not a live run');
    await context.close();
});
