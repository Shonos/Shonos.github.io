export function getResponse(message = '', config = { responses: [], fallback: '' }) {
    const lower = message.toLowerCase();
    const responses = Array.isArray(config.responses) ? config.responses : [];
    const match = responses.find(response => response && typeof response.text === 'string' &&
        Array.isArray(response.keywords) && response.keywords.some(keyword =>
            typeof keyword === 'string' && keyword.trim() && lower.includes(keyword.toLowerCase().trim())));
    return match?.text || (typeof config.fallback === 'string' ? config.fallback : '');
}

export function initChat(config = { enabled: false, welcome: [], responses: [], fallback: '' }) {
    const widget = document.querySelector('.chat-widget');
    const button = document.getElementById('chatButton');
    const container = document.getElementById('chatContainer');
    const close = document.getElementById('chatClose');
    const input = document.getElementById('chatInput');
    const submit = document.getElementById('chatSubmit');
    const messages = document.getElementById('chatMessages');
    const enabled = config.enabled === true;

    if (widget instanceof HTMLElement) {
        widget.hidden = !enabled;
        widget.inert = !enabled;
        widget.setAttribute('aria-hidden', String(!enabled));
    }
    if (!enabled) {
        container?.classList.remove('active');
        if (container instanceof HTMLElement) {
            container.hidden = true;
        }
        [button, close, submit].forEach(control => {
            if (control instanceof HTMLButtonElement) {
                control.disabled = true;
            }
        });
        if (input instanceof HTMLInputElement) {
            input.disabled = true;
        }
        return;
    }

    if (!(button instanceof HTMLButtonElement) || !(container instanceof HTMLElement) ||
        !(close instanceof HTMLButtonElement) || !(input instanceof HTMLInputElement) ||
        !(submit instanceof HTMLButtonElement) || !(messages instanceof HTMLElement)) {
        return;
    }

    widget?.classList.remove('dev-feature');
    button.disabled = false;
    close.disabled = false;
    input.disabled = false;
    submit.disabled = true;
    container.hidden = true;
    container.classList.remove('active');
    button.setAttribute('aria-controls', container.id);
    button.setAttribute('aria-expanded', 'false');
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    let welcomed = false;
    let replying = false;

    function addMessage(text = '', type = 'received') {
        if (!text) {
            return;
        }
        const message = document.createElement('div');
        message.classList.add('message', type);
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        if (messages.querySelector('.typing-indicator')) {
            return;
        }
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        for (let index = 0; index < 3; index += 1) {
            indicator.appendChild(document.createElement('span'));
        }
        messages.appendChild(indicator);
        messages.scrollTop = messages.scrollHeight;
    }

    const updateSubmit = () => {
        submit.disabled = replying || input.value.trim() === '';
    };

    const sendMessage = () => {
        const text = input.value.trim();
        if (!text || replying || container.hidden) {
            return;
        }
        addMessage(text, 'sent');
        input.value = '';
        replying = true;
        updateSubmit();
        window.setTimeout(showTyping, 1000);
        window.setTimeout(() => {
            messages.querySelector('.typing-indicator')?.remove();
            addMessage(getResponse(text, config));
            replying = false;
            updateSubmit();
        }, 3000);
    };

    function closeChat() {
        container.classList.remove('active');
        container.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        button.focus({ preventScroll: true });
    }

    button.addEventListener('click', () => {
        container.hidden = false;
        container.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        if (!welcomed) {
            welcomed = true;
            const welcome = Array.isArray(config.welcome) ? config.welcome : [];
            welcome.forEach(message => {
                if (!message || typeof message.text !== 'string') {
                    return;
                }
                const delay = Number.isFinite(message.delay) ? Math.max(0, Math.min(message.delay, 60000)) : 0;
                window.setTimeout(() => addMessage(message.text), delay);
            });
        }
        input.focus({ preventScroll: true });
    });
    close.addEventListener('click', closeChat);
    container.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeChat();
        }
    });
    input.addEventListener('input', updateSubmit);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            sendMessage();
        }
    });
    submit.addEventListener('click', sendMessage);
}
