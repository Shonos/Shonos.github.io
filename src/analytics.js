let measurementId = '';
let siteName = '';
let lastPage = '';

export function initAnalytics(config = { measurementId: '', allowedHosts: [] }, name = '') {
    const hostname = window.location.hostname;
    const localName = hostname.toLowerCase().replace(/\.$/, '');
    const localHost = localName === 'localhost' || localName.endsWith('.localhost') ||
        localName === '[::1]' || localName === '::1' || localName === '0.0.0.0' ||
        localName.startsWith('127.');

    if (!import.meta.env?.PROD || localHost || !Array.isArray(config.allowedHosts) ||
        !config.allowedHosts.includes(hostname) || typeof config.measurementId !== 'string' ||
        !/^G-[A-Z0-9]+$/.test(config.measurementId) || measurementId) {
        return;
    }

    measurementId = config.measurementId;
    siteName = typeof name === 'string' ? name : '';
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.gtag = function () {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.addEventListener('error', () => script.remove(), { once: true });
    document.head?.appendChild(script);
}

export function trackEvent(name = '', parameters = {}) {
    if (!measurementId || !name || typeof window.gtag !== 'function') {
        return;
    }

    try {
        window.gtag('event', name, { ...parameters, send_to: measurementId });
    } catch {
        return;
    }
}

export function trackPageView(route = '/about', title = '') {
    const path = route === '/' ? '/about' : route;
    if (!measurementId || lastPage === path) {
        return;
    }

    lastPage = path;
    const label = title || path.slice(1).replace(/^./, character => character.toUpperCase());
    trackEvent('page_view', {
        page_title: siteName ? `${label} - ${siteName}` : label,
        page_path: path,
        page_location: `${window.location.origin}${path}${window.location.search}`
    });
}
