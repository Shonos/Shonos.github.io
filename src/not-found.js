import { safeRelativePath } from './routing.js';

const path = window.location.pathname;
if (path !== '/' && path !== '/404.html') {
    const destination = safeRelativePath(path + window.location.search + window.location.hash);
    window.location.replace(destination ? `/?__redirect=${encodeURIComponent(destination)}` : '/');
}
