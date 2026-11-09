import { initAnalytics, trackEvent, trackPageView } from './analytics.js';
import { initContact } from './contact.js';
import { initNavigation } from './navigation.js';
import { initTheme } from './theme.js';
import { initMedia, initMotion } from './motion.js';
import { initMigrations } from './migration.js';
import { initAgentWorkflows } from './agent-workflow.js';

export function readSiteConfig() {
    let value = {};
    const element = document.getElementById('site-config');
    if (element instanceof HTMLScriptElement && element.type === 'application/json') {
        try {
            value = JSON.parse(element.textContent || '{}') || {};
        } catch {
            value = {};
        }
    }
    const analytics = value.analytics || {};
    return {
        name: typeof value.name === 'string' ? value.name : '',
        email: typeof value.email === 'string' ? value.email : '',
        analytics: {
            measurementId: typeof analytics.measurementId === 'string' ? analytics.measurementId : '',
            allowedHosts: Array.isArray(analytics.allowedHosts) ?
                analytics.allowedHosts.filter(host => typeof host === 'string') : []
        },
        legacyRoutes: value.legacyRoutes && typeof value.legacyRoutes === 'object' ? value.legacyRoutes : {}
    };
}

let initialized = false;

export function initialize() {
    if (initialized) {
        return;
    }
    initialized = true;
    const config = readSiteConfig();
    initAnalytics(config.analytics, config.name);
    initTheme();
    initNavigation(config.legacyRoutes);
    initContact(config.email);
    initMedia();
    initMotion();
    initMigrations();
    initAgentWorkflows();
    trackPageView(window.location.pathname, document.title);
    const allowedEvents = new Set(['case_study_open', 'hiring_path', 'profile_open']);
    document.querySelectorAll('a[data-track]').forEach(link => {
        if (!(link instanceof HTMLAnchorElement) || !allowedEvents.has(link.dataset.track)) return;
        link.addEventListener('click', () => trackEvent(link.dataset.track, {
            ...(link.dataset.study ? { study: link.dataset.study } : {})
        }));
    });
    if (document.body.dataset.page === 'case-study') {
        trackEvent('case_study_view', { study: document.body.dataset.study });
    }
    document.getElementById('printProfile')?.addEventListener('click', () => {
        trackEvent('profile_print');
        window.print();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}
