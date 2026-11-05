import { hashTarget, normalizePath, restoreRedirect } from './routing.js';

export function initNavigation(legacyRoutes = {}) {
    restoreRedirect();
    document.documentElement.classList.add('js');
    const button = document.getElementById('menuBtn');
    const menu = document.getElementById('navLinks');
    const header = document.querySelector('.site-header');
    const mobile = window.matchMedia('(max-width: 800px)');
    if (button instanceof HTMLButtonElement) button.hidden = false;

    function setMenu(open = false) {
        menu?.classList.toggle('active', open);
        if (button instanceof HTMLButtonElement) {
            button.setAttribute('aria-expanded', String(open));
            button.setAttribute('aria-label', open ? button.dataset.closeLabel : button.dataset.openLabel);
        }
        // The disclosure follows its links in desktop DOM order. Move focus
        // into the revealed mobile links so keyboard users don't skip them.
        // Tab can then continue naturally through the header and into the page.
        if (open && mobile.matches) menu?.querySelector('a')?.focus();
    }

    button?.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu?.classList.contains('active')) {
            setMenu(false);
            button?.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!(event.target instanceof Element)) return;
        if (event.target.closest('.nav-links a') || !event.target.closest('.site-header')) setMenu(false);
    });
    header?.addEventListener('focusout', event => {
        if (mobile.matches && event instanceof FocusEvent && event.relatedTarget instanceof Node &&
            !header.contains(event.relatedTarget)) setMenu(false);
    });
    mobile.addEventListener('change', () => setMenu(false));

    if (document.body.dataset.page !== 'home') return;
    function restoreSection() {
        const hash = hashTarget(window.location.hash);
        const alias = legacyRoutes[normalizePath(window.location.pathname)];
        const target = hash || (alias ? document.getElementById(alias) : null);
        if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    }
    // Ordinary links retain native history and hash behavior. No URL rewriting on scroll.
    document.fonts.ready.then(restoreSection);
    window.addEventListener('popstate', restoreSection);
    window.addEventListener('hashchange', () => setMenu(false));

    const links = Array.from(menu?.querySelectorAll('a') || []);
    const sections = links.flatMap(link => {
        const target = hashTarget(new URL(link.href).hash);
        return target ? [{ link, target }] : [];
    });
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                for (const item of sections) {
                    if (item.target === entry.target) item.link.setAttribute('aria-current', 'location');
                    else item.link.removeAttribute('aria-current');
                }
            }
        }, { rootMargin: '-15% 0px -60% 0px' });
        sections.forEach(item => observer.observe(item.target));
    }
}
