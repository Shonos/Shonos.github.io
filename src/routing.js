export function safeRelativePath(value = '') {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
        /[\\\u0000-\u0020\u007f]/.test(value)) {
        return '';
    }

    try {
        const url = new URL(value, window.location.origin);
        const pathname = decodeURIComponent(url.pathname);
        if (url.origin !== window.location.origin || url.username || url.password ||
            pathname.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(pathname)) {
            return '';
        }
        if (url.pathname === '/' && (url.searchParams.has('__redirect') || url.search.startsWith('?/'))) {
            return '';
        }
        return value;
    } catch {
        return '';
    }
}

export function restoreRedirect() {
    if (window.location.pathname !== '/') {
        return false;
    }

    const parameters = new URLSearchParams(window.location.search);
    const reserved = parameters.has('__redirect');
    const legacy = window.location.search.startsWith('?/');
    if (!reserved && !legacy) {
        return false;
    }

    const candidate = reserved ? parameters.get('__redirect') :
        window.location.search.slice(1) + window.location.hash;
    const restored = safeRelativePath(candidate);
    parameters.delete('__redirect');
    const remaining = !legacy && parameters.size ? `?${parameters.toString()}` : '';
    const fallback = `/${remaining}${window.location.hash}`;
    try {
        window.history.replaceState(window.history.state, '', restored || fallback);
        return Boolean(restored);
    } catch {
        return false;
    }
}

export function normalizePath(path = '/') {
    return path.replace(/\/+$/, '') || '/';
}

export function hashTarget(hash = '') {
    if (!hash.startsWith('#') || hash.length < 2) {
        return null;
    }
    try {
        return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
        return null;
    }
}
