import { trackEvent } from './analytics.js';

function saveTheme(theme = '') {
    try {
        window.localStorage.setItem('theme', theme);
    } catch {
        return;
    }
}

export function initTheme() {
    const button = document.getElementById('themeToggle');
    const preference = typeof window.matchMedia === 'function' ?
        window.matchMedia('(prefers-color-scheme: dark)') : null;
    let saved = '';
    try {
        saved = window.localStorage.getItem('theme') || '';
    } catch {
        saved = '';
    }
    let manual = saved === 'light' || saved === 'dark' ? saved : '';

    function applyTheme(theme = 'light') {
        document.documentElement.setAttribute('data-theme', theme);
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }
        const light = theme === 'light';
        const icon = button.querySelector('i');
        icon?.classList.toggle('fa-sun', light);
        icon?.classList.toggle('fa-moon', !light);
        button.setAttribute('aria-label', light ? button.dataset.darkLabel || 'Switch to dark mode' :
            button.dataset.lightLabel || 'Switch to light mode');
    }

    function applyPreference() {
        applyTheme(manual || (preference?.matches ? 'dark' : 'light'));
    }

    if (button instanceof HTMLButtonElement) {
        button.addEventListener('click', () => {
            manual = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(manual);
            saveTheme(manual);
            trackEvent('theme_change', {
                event_category: 'preferences',
                event_label: manual,
                value: 1
            });
        });
    }

    preference?.addEventListener('change', applyPreference);
    window.addEventListener('storage', event => {
        if (event.key !== 'theme' && event.key !== null) {
            return;
        }
        try {
            if (event.storageArea && event.storageArea !== window.localStorage) {
                return;
            }
        } catch {
            return;
        }
        manual = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : '';
        applyPreference();
    });
    applyPreference();
}
