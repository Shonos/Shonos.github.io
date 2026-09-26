import { trackPageView } from './analytics.js';
import { hashTarget, normalizePath, restoreRedirect, safeRelativePath } from './routing.js';

export function initNavigation() {
    restoreRedirect();
    const menuButton = document.getElementById('menuBtn');
    const menu = document.getElementById('navLinks');
    const header = document.querySelector('header');
    const links = Array.from(document.querySelectorAll('.nav-links a[data-route]'));
    const sections = links.flatMap(link => {
        if (!(link instanceof HTMLAnchorElement)) {
            return [];
        }
        const element = hashTarget(link.getAttribute('href') || '');
        const path = safeRelativePath(link.dataset.route || '');
        if (!(element instanceof HTMLElement) || !path || /[?#]/.test(path)) {
            return [];
        }
        return [{
            id: element.id,
            route: element.id === 'about' ? '/about' : normalizePath(path),
            title: link.textContent?.trim() || element.id,
            element,
            link
        }];
    });

    function setMenu(open = false) {
        menu?.classList.toggle('active', open);
        if (menuButton instanceof HTMLButtonElement) {
            menuButton.setAttribute('aria-expanded', String(open));
            menuButton.setAttribute('aria-label', open ? menuButton.dataset.closeLabel || 'Close navigation menu' :
                menuButton.dataset.openLabel || 'Open navigation menu');
            const icon = menuButton.querySelector('i');
            icon?.classList.toggle('fa-bars', !open);
            icon?.classList.toggle('fa-times', open);
        }
        if (open) {
            header?.classList.remove('hide');
        }
    }

    if (menuButton instanceof HTMLButtonElement && menu instanceof HTMLElement) {
        menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('active')));
        setMenu(false);
    }
    if (!sections.length) {
        return;
    }

    const about = sections.find(section => section.id === 'about') || sections[0];
    let ready = false;
    let initialLocation = true;
    let pending = null;
    let animationFrame = 0;
    let scrollFrame = 0;
    let locationFrame = 0;
    let settleTimer = 0;
    let settledId = '';
    let needsScrollReplace = false;
    let lastScrollY = window.scrollY;

    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }

    function activeSection(section = about) {
        sections.forEach(entry => {
            const active = entry.id === section.id;
            entry.link.classList.toggle('active', active);
            if (active) {
                entry.link.setAttribute('aria-current', 'page');
            } else {
                entry.link.removeAttribute('aria-current');
            }
        });
    }

    function visibleSection() {
        let visible = sections[0];
        sections.forEach(section => {
            if (section.element.getBoundingClientRect().top <= 200) {
                visible = section;
            }
        });
        if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            return sections[sections.length - 1];
        }
        return visible;
    }

    function changeUrl(section = about, push = false, hash = '') {
        const url = `${section.route}${window.location.search}${hash}`;
        if (url === window.location.pathname + window.location.search + window.location.hash) {
            return;
        }
        try {
            if (push) {
                window.history.pushState(null, '', url);
            } else {
                window.history.replaceState(window.history.state, '', url);
            }
        } catch {
            return;
        }
    }

    function settle(section = about, replace = false) {
        activeSection(section);
        if (replace && (settledId !== section.id || needsScrollReplace)) {
            changeUrl(section);
        }
        needsScrollReplace = false;
        if (settledId !== section.id) {
            settledId = section.id;
            trackPageView(section.route, section.title);
        }
    }

    function scheduleSettle() {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
            if (ready && !pending) {
                settle(visibleSection(), true);
            }
        }, 250);
    }

    function targetTop(target = about.element) {
        const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        return Math.max(0, Math.min(maximum, target.getBoundingClientRect().top + window.scrollY - 100));
    }

    function stopAnimation() {
        window.cancelAnimationFrame(animationFrame);
        window.clearTimeout(settleTimer);
        pending = null;
        window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'instant' });
    }

    function monitorAnimation(now = performance.now()) {
        if (!pending) {
            return;
        }
        if (Math.abs(window.scrollY - pending.lastY) > 0.5) {
            pending.lastY = window.scrollY;
            pending.stableSince = now;
        }
        const elapsed = now - pending.started;
        const arrived = Math.abs(window.scrollY - targetTop(pending.target)) < 2;
        const stable = now - pending.stableSince >= 140;
        if ((stable && elapsed >= 180 && (arrived || elapsed >= 600)) || elapsed > 3500) {
            const destination = pending;
            pending = null;
            const section = arrived ? destination.section : visibleSection();
            needsScrollReplace = !arrived;
            settle(section, !arrived);
            if (arrived && destination.focus && destination.target instanceof HTMLElement) {
                const target = destination.target;
                if (!target.hasAttribute('tabindex')) {
                    target.setAttribute('tabindex', '-1');
                    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
                }
                target.focus({ preventScroll: true });
            }
            return;
        }
        animationFrame = window.requestAnimationFrame(monitorAnimation);
    }

    function navigate(section = about, target = section.element, smooth = true, focus = false) {
        stopAnimation();
        ready = true;
        needsScrollReplace = false;
        activeSection(section);
        const now = performance.now();
        pending = { section, target, focus, started: now, stableSince: now, lastY: window.scrollY };
        const reduced = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: targetTop(target), behavior: smooth && !reduced ? 'smooth' : 'instant' });
        animationFrame = window.requestAnimationFrame(monitorAnimation);
    }

    function sectionForTarget(target = about.element) {
        return sections.find(section => section.element === target || section.element.contains(target));
    }

    function navigateLocation() {
        restoreRedirect();
        const target = hashTarget(window.location.hash);
        const hashSection = target instanceof HTMLElement ? sectionForTarget(target) : null;
        const path = normalizePath(window.location.pathname);
        const section = hashSection || sections.find(entry => entry.route === path) || about;
        setMenu(false);
        navigate(section, hashSection && target instanceof HTMLElement ? target : section.element, false);
    }

    function interrupt() {
        initialLocation = false;
        if (pending) {
            stopAnimation();
            needsScrollReplace = true;
        }
        ready = true;
        scheduleSettle();
    }

    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const link = event.target.closest('a');
        if (link?.closest('.nav-links')) {
            setMenu(false);
        } else if (!event.target.closest('nav') && menu?.classList.contains('active')) {
            setMenu(false);
        }
        if (!(link instanceof HTMLAnchorElement) || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            link.hasAttribute('download') || (link.target && link.target !== '_self')) {
            return;
        }
        const target = hashTarget(link.getAttribute('href') || '');
        if (!(target instanceof HTMLElement)) {
            return;
        }
        const section = sectionForTarget(target);
        if (!section) {
            return;
        }
        event.preventDefault();
        initialLocation = false;
        window.cancelAnimationFrame(locationFrame);
        changeUrl(section, true, target === section.element ? '' : `#${encodeURIComponent(target.id)}`);
        navigate(section, target, true, event.detail === 0);
    });

    window.addEventListener('scroll', () => {
        if (!scrollFrame) {
            scrollFrame = window.requestAnimationFrame(() => {
                const current = window.scrollY;
                const atBottom = current + window.innerHeight >= document.documentElement.scrollHeight - 2;
                const atContact = visibleSection().id === 'contact';
                if (current <= 0 || atBottom || atContact || menu?.classList.contains('active')) {
                    header?.classList.remove('hide');
                    lastScrollY = current;
                } else if (current > lastScrollY + 20) {
                    header?.classList.add('hide');
                    lastScrollY = current;
                } else if (current < lastScrollY - 10) {
                    header?.classList.remove('hide');
                    lastScrollY = current;
                }
                if (ready && !pending) {
                    activeSection(visibleSection());
                }
                scrollFrame = 0;
            });
        }
        if (ready && !pending) {
            initialLocation = false;
            scheduleSettle();
        }
    }, { passive: true });

    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu?.classList.contains('active')) {
            setMenu(false);
            if (menuButton instanceof HTMLButtonElement) {
                menuButton.focus({ preventScroll: true });
            }
        }
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey ||
            !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
            return;
        }
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) {
            return;
        }
        interrupt();
    });

    function scheduleLocation() {
        initialLocation = false;
        window.cancelAnimationFrame(locationFrame);
        stopAnimation();
        locationFrame = window.requestAnimationFrame(navigateLocation);
    }

    window.addEventListener('popstate', scheduleLocation);
    window.addEventListener('hashchange', scheduleLocation);
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            setMenu(false);
        }
        if (ready && !pending) {
            scheduleSettle();
        }
    });
    header?.addEventListener('focusin', () => header.classList.remove('hide'));

    function initializeLocation() {
        if (!ready) {
            navigateLocation();
        }
    }
    window.requestAnimationFrame(initializeLocation);
    if (document.readyState !== 'complete') {
        window.addEventListener('load', () => {
            if (initialLocation) {
                navigateLocation();
            }
        }, { once: true });
    }
}
