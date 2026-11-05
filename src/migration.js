import { MIGRATION_DURATION, MIGRATION_STAGES, migrationFrame } from './migration-state.js';

export function initMigrations() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let active = null;
    document.querySelectorAll('[data-migration]').forEach(root => {
        if (!(root instanceof HTMLElement)) return;
        const steps = Array.from(root.querySelectorAll('[data-migration-stage]'));
        const description = root.querySelector('[data-migration-description]');
        const playback = root.querySelector('[data-migration-playback]');
        const existing = root.querySelector('[data-system="existing"]');
        const replacement = root.querySelector('[data-system="replacement"]');
        if (steps.length !== 4 || !description || !playback || !existing || !replacement) return;
        const descriptions = steps.map(step => step.querySelector('p')?.textContent || '');
        const buttons = steps.map(step => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = step.querySelector('strong')?.textContent || '';
            step.querySelector('strong')?.replaceWith(button);
            return button;
        });
        const play = document.createElement('button');
        const replay = document.createElement('button');
        play.type = replay.type = 'button';
        replay.textContent = root.dataset.replayLabel;
        playback.append(play, replay);
        let elapsed = 0;
        let frameId = null;
        let lastTime = null;
        let playing = false;
        let started = false;
        let currentStage = -1;
        const paths = Array.from(root.querySelectorAll('[data-traffic-route]'));

        function render() {
            const frame = migrationFrame(elapsed);
            root.style.setProperty('--build-progress', String(frame.buildProgress));
            paths.forEach(path => {
                const route = path.getAttribute('data-traffic-route');
                const weight = route === 'customers' ? 1 : route === 'existing' ? frame.existingTraffic : frame.replacementTraffic;
                path.setAttribute('data-route-active', String(weight > 0));
                if (path instanceof SVGElement) {
                    path.style.strokeWidth = String(1.5 + weight * 2);
                    path.style.strokeDashoffset = String(-elapsed / 45);
                }
            });
            if (currentStage !== frame.index) {
                currentStage = frame.index;
                root.dataset.migrationState = frame.stage;
                existing.setAttribute('data-status', frame.existingStatus);
                replacement.setAttribute('data-status', frame.replacementStatus);
                existing.querySelector('[data-system-status]').textContent = root.dataset[`status${capitalize(frame.existingStatus)}`];
                replacement.querySelector('[data-system-status]').textContent = root.dataset[`status${capitalize(frame.replacementStatus)}`];
                description.textContent = descriptions[frame.index];
                buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === frame.index)));
            }
        }
        function pause() {
            playing = false;
            root.dataset.playing = 'false';
            play.textContent = root.dataset.playLabel;
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = lastTime = null;
            if (active === pause) active = null;
        }
        function tick(now) {
            if (!playing) return;
            if (lastTime !== null) elapsed = Math.min(MIGRATION_DURATION, elapsed + now - lastTime);
            lastTime = now;
            render();
            if (elapsed >= MIGRATION_DURATION) pause();
            else frameId = requestAnimationFrame(tick);
        }
        function start() {
            if (reduced.matches || document.hidden || playing) return;
            active?.();
            active = pause;
            if (elapsed >= MIGRATION_DURATION) elapsed = 0;
            started = playing = true;
            root.dataset.playing = 'true';
            play.textContent = root.dataset.pauseLabel;
            render();
            frameId = requestAnimationFrame(tick);
        }
        function select(index) {
            pause();
            started = true;
            elapsed = MIGRATION_STAGES[index].start;
            render();
        }
        buttons.forEach((button, index) => {
            button.addEventListener('click', () => select(index));
            button.addEventListener('keydown', event => {
                let next;
                if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % buttons.length;
                else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + buttons.length - 1) % buttons.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = buttons.length - 1;
                else return;
                event.preventDefault();
                select(next);
                buttons[next].focus();
            });
        });
        play.addEventListener('click', () => playing ? pause() : start());
        replay.addEventListener('click', () => { pause(); elapsed = 0; render(); start(); });
        function preferenceChanged() {
            if (reduced.matches) { started = true; pause(); }
            playback.hidden = reduced.matches;
            const note = root.querySelector('[data-migration-reduced]');
            if (note instanceof HTMLElement) note.hidden = !reduced.matches;
        }
        root.classList.add('is-enhanced');
        description.removeAttribute('hidden');
        render();
        play.textContent = root.dataset.playLabel;
        preferenceChanged();
        reduced.addEventListener('change', preferenceChanged);
        document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (!entry.isIntersecting || entry.intersectionRatio < 0.1) pause();
                    else if (!started && entry.intersectionRatio >= 0.55) start();
                }
            }, { threshold: [0, 0.1, 0.55] });
            observer.observe(root);
        }
    });
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
