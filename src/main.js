import { initAnalytics } from './analytics.js';
import { initChat } from './chat.js';
import { initContact } from './contact.js';
import { initNavigation } from './navigation.js';
import { initTheme } from './theme.js';

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
    const chat = value.chat || {};
    return {
        name: typeof value.name === 'string' ? value.name : '',
        email: typeof value.email === 'string' ? value.email : '',
        analytics: {
            measurementId: typeof analytics.measurementId === 'string' ? analytics.measurementId : '',
            allowedHosts: Array.isArray(analytics.allowedHosts) ?
                analytics.allowedHosts.filter(host => typeof host === 'string') : []
        },
        chat: {
            enabled: chat.enabled === true,
            welcome: Array.isArray(chat.welcome) ? chat.welcome.filter(message =>
                message && typeof message.text === 'string' && Number.isFinite(message.delay)) : [],
            responses: Array.isArray(chat.responses) ? chat.responses.filter(response =>
                response && typeof response.text === 'string' && Array.isArray(response.keywords)) : [],
            fallback: typeof chat.fallback === 'string' ? chat.fallback : ''
        }
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
    initNavigation();
    initContact(config.email);
    initChat(config.chat);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    initialize();
}
