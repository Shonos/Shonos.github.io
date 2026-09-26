import { trackEvent } from './analytics.js';

export function fallbackCopy(text = '') {
    if (!text || !document.body) {
        return false;
    }

    const active = document.activeElement;
    const selection = document.getSelection();
    const ranges = [];
    for (let index = 0; index < (selection?.rangeCount || 0); index += 1) {
        ranges.push(selection.getRangeAt(index).cloneRange());
    }
    const field = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement ? active : null;
    const start = field?.selectionStart;
    const end = field?.selectionEnd;
    const direction = field?.selectionDirection;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    function restoreSelection() {
        try {
            if (active instanceof HTMLElement && active.isConnected) {
                active.focus({ preventScroll: true });
            }
            selection?.removeAllRanges();
            ranges.forEach(range => selection?.addRange(range));
            if (field && start !== null && start !== undefined && end !== null && end !== undefined) {
                field.setSelectionRange(start, end, direction || 'none');
            }
        } catch {
            return;
        }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.tabIndex = -1;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);

    let success = false;
    try {
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        success = typeof document.execCommand === 'function' && document.execCommand('copy') === true;
    } catch {
        success = false;
    } finally {
        textarea.remove();
        restoreSelection();
        if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
            window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
        }
    }
    return success;
}

export async function copyText(text = '') {
    if (!text) {
        return false;
    }
    try {
        if (typeof navigator.clipboard?.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        return fallbackCopy(text);
    }
    return fallbackCopy(text);
}

export function initContact(email = '') {
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
        if (!(link instanceof HTMLAnchorElement)) {
            return;
        }
        link.addEventListener('click', () => {
            trackEvent('contact_click', {
                event_category: 'engagement',
                event_label: 'Email Contact',
                value: 1
            });
        });
    });

    document.querySelectorAll('.social-links .social-link').forEach(link => {
        if (!(link instanceof HTMLAnchorElement)) {
            return;
        }
        link.addEventListener('click', () => {
            const label = link.querySelector('.social-label')?.textContent?.trim();
            if (label) {
                trackEvent('social_click', {
                    event_category: 'engagement',
                    event_label: label,
                    value: 1
                });
            }
        });
    });

    const button = document.getElementById('copyEmailBtn');
    const tooltip = document.getElementById('copyTooltip');
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }
    tooltip?.setAttribute('role', 'status');
    tooltip?.setAttribute('aria-live', 'polite');
    let busy = false;
    let timeout = 0;
    button.addEventListener('click', async () => {
        if (busy) {
            return;
        }
        busy = true;
        button.setAttribute('aria-busy', 'true');
        window.clearTimeout(timeout);
        tooltip?.classList.remove('show');
        const address = document.querySelector('.email-address')?.textContent?.trim() || email;
        let success = false;
        try {
            success = await copyText(address);
        } catch {
            success = false;
        } finally {
            busy = false;
            button.removeAttribute('aria-busy');
        }
        if (tooltip instanceof HTMLElement) {
            tooltip.textContent = success ? tooltip.dataset.success || 'Copied!' :
                tooltip.dataset.error || 'Could not copy. Please select and copy the email address.';
            tooltip.classList.add('show');
            timeout = window.setTimeout(() => tooltip.classList.remove('show'), success ? 2000 : 4000);
        }
        if (success) {
            trackEvent('copy_email', {
                event_category: 'engagement',
                event_label: 'email_copied',
                value: 1
            });
        }
    });
}
