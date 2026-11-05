// Progressive enhancement: the default page is fully visible and readable.
export function initMotion() {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set();
    function animate(element, frames, options = {}) {
        if (preference.matches || !(element instanceof HTMLElement) || typeof element.animate !== 'function') return;
        const animation = element.animate(frames, { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', ...options });
        animations.add(animation);
        animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    }
    function settle() {
        for (const animation of animations) animation.cancel();
        animations.clear();
    }
    function revealNodes(scope) {
        scope.querySelectorAll('.concept-node').forEach((node, index) => {
            const resting = getComputedStyle(node).transform;
            animate(node, [
                { transform: `translate(${index % 2 ? 22 : -22}px, 14px) ${resting === 'none' ? '' : resting}`, opacity: 0.45 },
                { transform: resting, opacity: 1 }
            ], { duration: 650, delay: index * 65 });
        });
    }
    // Diagrams are static by default. Only explicit workflow selection or
    // replay requests motion; hovering a media frame never moves its panels.
    document.querySelectorAll('[data-workflow]').forEach(showcase => {
        const nodes = Array.from(showcase.querySelectorAll('[data-flow-node]'));
        const steps = Array.from(showcase.querySelectorAll('[data-workflow-step]'));
        if (nodes.length !== steps.length || !nodes.length) return;
        const buttons = steps.map(step => {
            const button = document.createElement('button');
            button.type = 'button';
            const title = document.createElement('span');
            title.className = 'workflow-step-title';
            title.textContent = step.querySelector('h4')?.textContent || '';
            const detail = document.createElement('span');
            detail.className = 'workflow-step-detail';
            detail.textContent = step.querySelector('p')?.textContent || '';
            button.append(title, detail);
            step.replaceChildren(button);
            return button;
        });
        function activate(index, moving = true) {
            buttons.forEach((button, position) => button.setAttribute('aria-pressed', String(index === position)));
            nodes.forEach((node, position) => node.classList.toggle('is-current', index === position));
            showcase.setAttribute('data-active-step', String(index));
            if (moving) animate(nodes[index], [{ opacity: 0.65 }, { opacity: 1 }], { duration: 250 });
        }
        buttons.forEach((button, index) => {
            button.addEventListener('click', () => activate(index));
            button.addEventListener('keydown', event => {
                let next = index;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = buttons.length - 1;
                else return;
                event.preventDefault();
                buttons[next].focus();
                activate(next);
            });
        });
        activate(0, false);
        const replay = showcase.querySelector('[data-motion-replay]');
        function updateReplay() {
            if (replay instanceof HTMLButtonElement) replay.hidden = preference.matches;
        }
        updateReplay();
        preference.addEventListener('change', updateReplay);
        replay?.addEventListener('click', () => {
            settle();
            revealNodes(showcase);
        });
    });
    preference.addEventListener('change', () => { if (preference.matches) settle(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
}

export function initMedia() {
    const videos = Array.from(document.querySelectorAll('video'));
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => { if (!entry.isIntersecting && entry.target instanceof HTMLVideoElement) entry.target.pause(); });
        });
        videos.forEach(video => observer.observe(video));
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) videos.forEach(video => video.pause());
    });
    document.querySelectorAll('.media-figure').forEach(figure => {
        function reportFailure() {
            if (figure.querySelector('.media-error')) return;
            const message = document.createElement('p');
            message.className = 'media-error';
            message.setAttribute('role', 'status');
            message.textContent = figure.getAttribute('data-media-error') || '';
            figure.append(message);
        }
        figure.querySelectorAll('img, video, source').forEach(element => element.addEventListener('error', reportFailure));
        figure.querySelectorAll('img').forEach(image => {
            if (image.complete && image.naturalWidth === 0) reportFailure();
        });
    });
}
