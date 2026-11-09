import '../assets/agent-workflow.css';
import { AGENT_WORKFLOW_EDGES, AGENT_WORKFLOW_NODES, AGENT_WORKFLOW_ROUTES, agentWorkflowFrame } from './agent-workflow-state.js';

let instance = 0;
let pauseActiveWorkflow = null;

export function initAgentWorkflows() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.querySelectorAll('[data-agent-workflow]').forEach(root => {
        if (!(root instanceof HTMLElement) || root.dataset.agentEnhanced === 'true') return;
        const map = root.querySelector('[data-agent-map]');
        const svg = root.querySelector('[data-agent-connections]');
        const marker = root.querySelector('[data-agent-arrow]');
        const signal = root.querySelector('[data-agent-signal]');
        const playback = root.querySelector('[data-agent-playback]');
        const play = root.querySelector('[data-agent-play]');
        const replay = root.querySelector('[data-agent-replay]');
        const announcement = root.querySelector('[data-agent-announcement]');
        const title = root.querySelector('[data-agent-current-title]');
        const description = root.querySelector('[data-agent-current-description]');
        const count = root.querySelector('[data-agent-count]');
        if (!map || !svg || !marker || !signal || !playback || !play || !replay || !announcement || !title || !description || !count) return;
        const nodes = new Map(Array.from(root.querySelectorAll('[data-agent-node]'), node => [node.getAttribute('data-agent-node'), node]));
        const edges = new Map(Array.from(root.querySelectorAll('[data-agent-edge]'), edge => [edge.getAttribute('data-agent-edge'), edge]));
        const choices = Array.from(root.querySelectorAll('[data-agent-route-choice]'));
        const panels = new Map(Array.from(root.querySelectorAll('[data-agent-route-panel]'), panel => [panel.getAttribute('data-agent-route-panel'), panel]));
        const stageElements = new Map(Array.from(panels, ([id, panel]) => [id, Array.from(panel.querySelectorAll('[data-agent-stage]'))]));
        // Leave the complete written explanation intact if content and model differ.
        if (nodes.size !== AGENT_WORKFLOW_NODES.length || AGENT_WORKFLOW_NODES.some(id => !nodes.has(id)) ||
            AGENT_WORKFLOW_EDGES.some(edge => !edges.has(edge.id)) || choices.length !== 2 || panels.size !== 2 ||
            Object.entries(AGENT_WORKFLOW_ROUTES).some(([id, route]) => {
                const steps = stageElements.get(id);
                return !choices.some(choice => choice.getAttribute('data-agent-route-choice') === id) ||
                    steps?.length !== route.stages.length || route.stages.some((stage, index) =>
                        steps[index].getAttribute('data-agent-stage') !== stage.id || !steps[index].querySelector('button'));
            })) return;

        marker.id = `agent-workflow-arrow-${++instance}`;
        edges.forEach(edge => edge.setAttribute('marker-end', `url(#${marker.id})`));
        const lengths = new Map();
        let routeId = 'ready-to-build';
        let elapsed = 0;
        let playing = false;
        let started = reduced.matches;
        let inView = !('IntersectionObserver' in window);
        let frameId = null;
        let lastTime = null;
        let currentKey = '';

        function render() {
            const frame = agentWorkflowFrame(routeId, elapsed);
            const key = `${routeId}:${frame.index}`;
            if (key !== currentKey) {
                currentKey = key;
                root.dataset.agentRoute = routeId;
                root.dataset.agentState = frame.stage;
                root.dataset.agentResearch = frame.research;
                root.dataset.agentReplanned = String(frame.replanned);
                nodes.forEach((node, id) => node.setAttribute('data-agent-active', String(id === frame.activeNode)));
                edges.forEach((edge, id) => edge.setAttribute('data-agent-active', String(id === frame.edge)));
                choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.getAttribute('data-agent-route-choice') === routeId)));
                panels.forEach((panel, id) => { panel.hidden = id !== routeId; });
                stageElements.forEach((steps, id) => steps.forEach((step, index) => {
                    step.querySelector('button').setAttribute('aria-pressed', String(id === routeId && index === frame.index));
                }));
                const step = stageElements.get(routeId)[frame.index];
                count.textContent = `${root.dataset.agentStepLabel} ${frame.index + 1} / ${AGENT_WORKFLOW_ROUTES[routeId].stages.length}`;
                title.textContent = step.querySelector('button').textContent;
                description.textContent = step.querySelector('[data-agent-stage-description]')?.textContent || '';
            }
            const path = edges.get(frame.edge);
            const length = lengths.get(frame.edge);
            const showSignal = playing && !reduced.matches && !frame.finished && path && length;
            signal.toggleAttribute('hidden', !showSignal);
            if (showSignal) {
                const point = path.getPointAtLength(length * frame.handoffProgress);
                signal.setAttribute('cx', String(point.x));
                signal.setAttribute('cy', String(point.y));
            }
        }

        function drawConnections() {
            const bounds = map.getBoundingClientRect();
            if (!bounds.width || !bounds.height) return;
            svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
            const boxes = new Map(Array.from(nodes, ([id, node]) => {
                const box = node.getBoundingClientRect();
                return [id, { left: box.left - bounds.left, right: box.right - bounds.left,
                    top: box.top - bounds.top, bottom: box.bottom - bounds.top,
                    x: box.left - bounds.left + box.width / 2, y: box.top - bounds.top + box.height / 2,
                    width: box.width }];
            }));
            const hub = boxes.get('orchestrator');
            const wide = Math.abs(boxes.get('planner').y - hub.y) < 1;
            const paths = new Map();
            boxes.forEach((box, id) => {
                if (id === 'orchestrator') return;
                let points;
                if (id === 'developer') {
                    points = wide ? [[hub.x, hub.top], [box.x, box.bottom]] :
                        [[hub.left, hub.y], [2, hub.y], [2, box.y], [box.left, box.y]];
                } else if (wide && ['planner', 'researcher'].includes(id)) {
                    points = id === 'planner' ? [[hub.left, hub.y], [box.right, box.y]] : [[hub.right, hub.y], [box.left, box.y]];
                } else {
                    const above = box.y < hub.y;
                    const left = ['planner', 'builders'].includes(id);
                    const port = hub.left + hub.width * (left ? 0.3 : 0.7);
                    const hubY = above ? hub.top : hub.bottom;
                    const peerY = above ? box.bottom : box.top;
                    const lane = (hubY + peerY) / 2;
                    points = [[port, hubY], [port, lane], [box.x, lane], [box.x, peerY]];
                }
                paths.set(id, points);
                root.querySelector(`[data-agent-link="${id}"]`)?.setAttribute('d', pathData(points));
            });
            AGENT_WORKFLOW_EDGES.forEach(edge => {
                const outward = edge.from === 'orchestrator';
                const points = paths.get(outward ? edge.to : edge.from);
                const path = edges.get(edge.id);
                path.setAttribute('d', pathData(outward ? points : [...points].reverse()));
                lengths.set(edge.id, path.getTotalLength());
            });
            render();
        }

        function pause() {
            playing = false;
            root.dataset.agentPlaying = 'false';
            play.textContent = root.dataset.agentPlayLabel;
            signal.setAttribute('hidden', '');
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = lastTime = null;
            if (pauseActiveWorkflow === pause) pauseActiveWorkflow = null;
        }
        function tick(now) {
            if (!playing) return;
            if (reduced.matches || document.hidden || !inView) { preferenceChanged(); pause(); return; }
            const duration = AGENT_WORKFLOW_ROUTES[routeId].duration;
            if (lastTime !== null) elapsed = Math.min(duration, elapsed + now - lastTime);
            lastTime = now;
            render();
            if (elapsed >= duration) pause();
            else frameId = requestAnimationFrame(tick);
        }
        function start() {
            if (playing || reduced.matches || document.hidden || !inView) return;
            pauseActiveWorkflow?.();
            pauseActiveWorkflow = pause;
            if (elapsed >= AGENT_WORKFLOW_ROUTES[routeId].duration) elapsed = 0;
            started = playing = true;
            root.dataset.agentPlaying = 'true';
            play.textContent = root.dataset.agentPauseLabel;
            render();
            frameId = requestAnimationFrame(tick);
        }
        function chooseRoute(id) {
            pause();
            started = true;
            routeId = id;
            elapsed = 0;
            render();
        }
        function selectStage(id, index) {
            pause();
            started = true;
            routeId = id;
            elapsed = AGENT_WORKFLOW_ROUTES[id].stages[index].start;
            render();
        }
        choices.forEach(choice => choice.addEventListener('click', () => chooseRoute(choice.getAttribute('data-agent-route-choice'))));
        arrowSelection(choices, index => chooseRoute(choices[index].getAttribute('data-agent-route-choice')));
        stageElements.forEach((steps, id) => {
            const buttons = steps.map(step => step.querySelector('button'));
            buttons.forEach((button, index) => button.addEventListener('click', () => selectStage(id, index)));
            arrowSelection(buttons, index => selectStage(id, index));
        });
        play.addEventListener('click', () => playing ? pause() : start());
        replay.addEventListener('click', () => { pause(); started = true; elapsed = 0; render(); start(); });
        function preferenceChanged() {
            if (reduced.matches) { started = true; pause(); }
            playback.hidden = reduced.matches;
            const note = root.querySelector('[data-agent-reduced]');
            if (note instanceof HTMLElement) note.hidden = !reduced.matches;
        }

        // Fill the initial state before exposing the live region; announcements
        // thereafter happen only at handoff boundaries, never on animation frames.
        render();
        root.querySelectorAll('[data-agent-enhancement]').forEach(element => { element.hidden = false; });
        root.querySelector('[data-agent-written]')?.removeAttribute('open');
        root.dataset.agentEnhanced = 'true';
        preferenceChanged();
        drawConnections();
        reduced.addEventListener('change', preferenceChanged);
        document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
        if ('ResizeObserver' in window) new ResizeObserver(drawConnections).observe(map);
        else window.addEventListener('resize', drawConnections);
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    inView = entry.isIntersecting && entry.intersectionRatio >= 0.1;
                    if (!inView) pause();
                    else if (!started && entry.intersectionRatio >= 0.55) start();
                }
            }, { threshold: [0, 0.1, 0.55] });
            observer.observe(map);
        }
    });
}

function pathData(points) {
    return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
}

function arrowSelection(buttons, select) {
    buttons.forEach((button, index) => button.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let next;
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
        else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        select(next);
        buttons[next].focus();
    }));
}
