/**
 * shaunalonzo.com — Main JavaScript
 * Vanilla ES6+, no frameworks. Loaded with <script defer>.
 */

// ========== Theme Switcher ==========

const themeToggleBtn = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'light') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    setTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));
}

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    if (typeof gtag === 'function') {
        gtag('event', 'theme_change', {
            event_category: 'preferences',
            event_label: newTheme,
            value: 1
        });
    }
});

prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

// Run theme init immediately to minimize flash
initializeTheme();


// ========== Mobile Menu Toggle ==========

const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');

menuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = menuBtn.querySelector('i');
    if (navLinks.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        const icon = menuBtn.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    });
});


// ========== Smooth Scrolling for Anchor Links ==========

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetElement = document.querySelector(this.getAttribute('href'));
        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    });
});


// ========== Scroll Spy & Header Hide/Show ==========

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

let lastUpdatedSection = '';

const updateUrlAndAnalytics = debounce((sectionId, route) => {
    if (sectionId !== lastUpdatedSection) {
        lastUpdatedSection = sectionId;
        history.replaceState({}, '', route);

        if (typeof gtag === 'function') {
            const pageTitle = route === '/' ? 'About - Shaun Alonzo' :
                route.substring(1).charAt(0).toUpperCase() +
                route.substring(1).slice(1) + ' - Shaun Alonzo';

            gtag('event', 'page_view', {
                page_title: pageTitle,
                page_path: route,
                send_to: 'G-EG4TMY27NZ'
            });
        }
    }
}, 300);

window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    const navLinkElements = document.querySelectorAll('.nav-links a');

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    if (current) {
        navLinkElements.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
                const route = link.getAttribute('data-route');
                if (route) {
                    updateUrlAndAnalytics(current, route);
                }
            }
        });
    }
});

// Header hide/show on scroll
let lastScrollY = window.scrollY;
let ticking = false;
const scrollThreshold = 20;

function updateHeader() {
    const header = document.querySelector('header');
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY + scrollThreshold) {
        header.classList.add('hide');
        lastScrollY = currentScrollY;
    } else if (currentScrollY < lastScrollY - (scrollThreshold / 2)) {
        header.classList.remove('hide');
        lastScrollY = currentScrollY;
    }

    if (currentScrollY <= 0) {
        header.classList.remove('hide');
    }

    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
    }
}, { passive: true });


// ========== Client-Side Routing ==========

const routes = {
    '/': '#about',
    '/about': '#about',
    '/experience': '#experience',
    '/skills': '#skills',
    '/projects': '#projects',
    '/contact': '#contact'
};

function handleRouting() {
    let fullPath = window.location.pathname + window.location.search;

    if (window.location.search.startsWith('?/')) {
        const actualPath = window.location.search.substring(1);
        history.replaceState({}, '', actualPath);
        fullPath = actualPath;
    } else {
        fullPath = window.location.pathname;
    }

    let path = fullPath === '' || fullPath === '/' ? '/' : fullPath.replace(/\/$/, '');
    const targetId = routes[path] || routes['/'];
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        setTimeout(() => {
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }, 50);
    }

    if (typeof gtag === 'function') {
        const pagePath = path === '/' ? '/about' : path;
        const pageTitle = path === '/' ? 'About - Shaun Alonzo' :
            path.substring(1).charAt(0).toUpperCase() +
            path.substring(1).slice(1) + ' - Shaun Alonzo';

        gtag('event', 'page_view', {
            page_title: pageTitle,
            page_path: pagePath,
            send_to: 'G-EG4TMY27NZ'
        });
    }
}

function handleNavigation() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            const route = Object.keys(routes).find(key => routes[key] === href);
            if (route) {
                history.pushState({}, '', route);
                handleRouting();
            }
        });
    });
}

window.addEventListener('load', () => {
    handleRouting();
    handleNavigation();
});

window.addEventListener('popstate', handleRouting);


// ========== Copy Email to Clipboard ==========

function showCopySuccess() {
    const tooltip = document.getElementById('copyTooltip');
    if (tooltip) {
        tooltip.classList.add('show');
        setTimeout(() => tooltip.classList.remove('show'), 2000);
    }

    if (typeof gtag === 'function') {
        gtag('event', 'copy_email', {
            event_category: 'engagement',
            event_label: 'email_copied',
            value: 1
        });
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    const selected = document.getSelection().rangeCount > 0
        ? document.getSelection().getRangeAt(0) : false;

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }

    document.body.removeChild(textarea);

    if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
    }

    if (success) showCopySuccess();
}

// Initial copy-email setup — will be replaced by populateContact with the JSON email
(function initCopyEmail() {
    const copyEmailBtn = document.getElementById('copyEmailBtn');
    if (copyEmailBtn) {
        copyEmailBtn.addEventListener('click', () => {
            const emailEl = document.getElementById('contactEmail');
            const email = emailEl ? emailEl.textContent.trim() : 'contact@shaunalonzo.com';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(showCopySuccess).catch(() => fallbackCopy(email));
            } else {
                fallbackCopy(email);
            }
        });
    }
})();


// ========== Analytics Event Tracking (Buttons & Social Links) ==========

const contactButton = document.querySelector('.contact .btn');
if (contactButton) {
    contactButton.addEventListener('click', () => {
        if (typeof gtag === 'function') {
            gtag('event', 'contact_click', {
                event_category: 'engagement',
                event_label: 'Email Contact',
                value: 1
            });
        }
    });
}

document.querySelectorAll('.social-links .social-link').forEach(link => {
    link.addEventListener('click', function () {
        if (typeof gtag === 'function') {
            const platform = this.querySelector('i').classList.contains('fa-linkedin') ? 'LinkedIn' : 'GitHub';
            gtag('event', 'social_click', {
                event_category: 'engagement',
                event_label: platform,
                value: 1
            });
        }
    });
});


// ========== Skill Tag Tooltips (Mobile Tap) — event delegation for dynamic content ==========

(function () {
    const skillsContainer = document.getElementById('skillsContainer');
    let currentActiveTag = null;

    if (skillsContainer) {
        skillsContainer.addEventListener('click', function (e) {
            const tag = e.target.closest('.skill-tag');
            if (!tag) {
                if (currentActiveTag) {
                    currentActiveTag.classList.remove('active');
                    currentActiveTag = null;
                }
                return;
            }
            e.stopPropagation();
            if (currentActiveTag === tag) {
                tag.classList.remove('active');
                currentActiveTag = null;
            } else {
                if (currentActiveTag) currentActiveTag.classList.remove('active');
                tag.classList.add('active');
                currentActiveTag = tag;
            }
        });
    }

    document.addEventListener('click', () => {
        if (currentActiveTag) {
            currentActiveTag.classList.remove('active');
            currentActiveTag = null;
        }
    });
})();


// ========== Chat Widget ==========

(function () {
    const chatButton = document.getElementById('chatButton');
    const chatContainer = document.getElementById('chatContainer');
    const chatClose = document.getElementById('chatClose');
    const chatInput = document.getElementById('chatInput');
    const chatSubmit = document.getElementById('chatSubmit');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatButton || !chatContainer) return;

    const staticMessages = [
        { text: "Hi there! I'm Shaun's assistant. How can I help you today?", type: 'received', delay: 500 },
        { text: "I can tell you more about Shaun's skills, experience, or projects. Just let me know what you're interested in!", type: 'received', delay: 2000 }
    ];

    chatButton.addEventListener('click', () => {
        chatContainer.classList.add('active');
        if (chatMessages.childElementCount === 0) {
            displayStaticMessages();
        }
        setTimeout(() => chatInput.focus(), 300);
    });

    chatClose.addEventListener('click', () => {
        chatContainer.classList.remove('active');
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            sendMessage();
        }
    });

    chatSubmit.addEventListener('click', () => {
        if (chatInput.value.trim() !== '') {
            sendMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        chatSubmit.disabled = chatInput.value.trim() === '';
    });

    function displayStaticMessages() {
        staticMessages.forEach((msg, index) => {
            setTimeout(() => {
                if (index > 0) showTypingIndicator();
                setTimeout(() => {
                    hideTypingIndicator();
                    addMessage(msg.text, msg.type);
                }, index > 0 ? 1500 : 0);
            }, msg.delay);
        });
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        addMessage(text, 'sent');
        chatInput.value = '';
        chatSubmit.disabled = true;

        setTimeout(showTypingIndicator, 1000);
        setTimeout(() => {
            hideTypingIndicator();
            respondToMessage(text);
        }, 3000);
    }

    function addMessage(text, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        if (!document.querySelector('.typing-indicator')) {
            const indicator = document.createElement('div');
            indicator.classList.add('typing-indicator');
            indicator.innerHTML = '<span></span><span></span><span></span>';
            chatMessages.appendChild(indicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function hideTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function respondToMessage(message) {
        const lowerMessage = message.toLowerCase();
        let response;

        if (lowerMessage.includes('experience') || lowerMessage.includes('work')) {
            response = "Shaun has over 10 years of experience in .NET, AWS, and distributed systems — currently a Senior Engineer at Domain. Check out the Experience section for details!";
        } else if (lowerMessage.includes('skill') || lowerMessage.includes('tech')) {
            response = "Shaun specializes in .NET/C#, AWS, event-driven architecture, and distributed systems. You can find the full list in the Skills section of this page.";
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('hire') || lowerMessage.includes('email')) {
            response = "You can reach Shaun at contact@shaunalonzo.com or connect via LinkedIn. The contact section has quick-copy buttons!";
        } else if (lowerMessage.includes('project') || lowerMessage.includes('portfolio')) {
            response = "Shaun has built credit card comparison tools, .NET HTTP client libraries, and more. Check the Projects section for the full list!";
        } else if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
            response = "Shaun is based in the Philippines and works remotely with Australian teams.";
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            response = "Hello! How can I help you learn more about Shaun today?";
        } else {
            response = "That's an interesting question! For specific details, feel free to contact Shaun directly at contact@shaunalonzo.com.";
        }

        addMessage(response, 'received');
    }
})();


// ========== JSON-Driven Content Population ==========

/**
 * Fetches alonzo-principal-net-aws-engineer.json and populates all dynamic sections.
 * Falls back gracefully — if fetch fails, the existing HTML content remains visible.
 */
(async function populateFromJSON() {
    try {
        const response = await fetch('assets/alonzo-principal-net-aws-engineer.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        populateHero(data);
        populateContact(data);
        populateSkills(data);
        populateExperience(data);
        populateProjects(data);
        updateStructuredData(data);
        updateMeta(data);
        updateFooter(data);

        console.log('Site populated from JSON successfully.');
    } catch (err) {
        console.warn('Could not load JSON data — using fallback content:', err.message);
    }
})();

// --- Hero Section ---

function populateHero(data) {
    const basics = data.basics;
    if (!basics) return;

    const nameEl = document.getElementById('heroName');
    const roleEl = document.getElementById('heroRole');
    const descEl = document.getElementById('heroDescription');

    if (nameEl) nameEl.textContent = basics.name || nameEl.textContent;
    if (roleEl) roleEl.textContent = basics.headline || roleEl.textContent;

    if (descEl && data.summary && data.summary.content) {
        // Strip HTML tags for the hero description (plain text only)
        const plainText = data.summary.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        descEl.textContent = plainText || descEl.textContent;
    }
}

// --- Contact Section (phone hidden per user request) ---

function populateContact(data) {
    const basics = data.basics;
    if (!basics) return;

    const email = basics.email;
    const location = basics.location;

    const emailEl = document.getElementById('contactEmail');
    const emailLink = document.getElementById('emailLink');
    const locationEl = document.getElementById('contactLocation');

    if (emailEl && email) emailEl.textContent = email;
    if (emailLink && email) emailLink.href = `mailto:${email}`;
    if (locationEl && location) locationEl.textContent = location;

    // Update the copy-email button to use the dynamic email
    const copyBtn = document.getElementById('copyEmailBtn');
    if (copyBtn && email) {
        // Remove old listener by cloning (simple approach for dynamic email)
        const newBtn = copyBtn.cloneNode(true);
        copyBtn.parentNode.replaceChild(newBtn, copyBtn);
        newBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(email).then(showCopySuccess).catch(() => fallbackCopy(email));
            } else {
                fallbackCopy(email);
            }
        });
    }
}

// --- Skills Section ---

function populateSkills(data) {
    const container = document.getElementById('skillsContainer');
    if (!container) return;

    const skillsData = data.sections && data.sections.skills;
    if (!skillsData || !skillsData.items || !skillsData.items.length) return;

    // Build skill tags from each category's keywords
    const tags = [];
    skillsData.items.forEach(category => {
        if (category.keywords && category.keywords.length) {
            category.keywords.forEach(keyword => {
                tags.push({ name: keyword, category: category.name });
            });
        }
    });

    if (!tags.length) return;

    container.innerHTML = tags.map(tag =>
        `<span class="skill-tag" data-tooltip="${escapeAttr(tag.category)}">${escapeHTML(tag.name)}</span>`
    ).join('');
}

// --- Experience Section ---

function populateExperience(data) {
    const container = document.getElementById('experienceTimeline');
    if (!container) return;

    // Collect experience from main section + custom sections with type "experience"
    const allExperience = [];

    const mainExp = data.sections && data.sections.experience;
    if (mainExp && mainExp.items) {
        allExperience.push(...mainExp.items.map(item => ({ ...item, _source: 'main' })));
    }

    if (data.customSections) {
        data.customSections.forEach(section => {
            if (section.type === 'experience' && section.items) {
                allExperience.push(...section.items.map(item => ({ ...item, _source: 'custom' })));
            }
        });
    }

    if (!allExperience.length) return;

    // Sort by period — most recent first (simple string comparison works for our format)
    // We'll just use the order as-is from JSON (already sorted newest-first in main section)

    container.innerHTML = allExperience.map(exp => {
        const companyName = exp.company || '';
        const position = exp.position || '';
        const period = exp.period || '';
        const websiteUrl = exp.website && exp.website.url ? exp.website.url : '';
        const description = exp.description || '';

        let rolesHTML = '';
        if (exp._source === 'custom' && exp.roles && exp.roles.length) {
            rolesHTML = exp.roles.map(role => `
                <div class="timeline-position">${escapeHTML(role.position)}</div>
                <div class="timeline-date">${escapeHTML(role.period)}</div>
                <div class="timeline-description">${role.description || ''}</div>
            `).join('');
        }

        const companyHTML = websiteUrl
            ? `<a href="${escapeAttr(websiteUrl)}" target="_blank" class="external-link" rel="noopener">${escapeHTML(companyName)} <i class="fas fa-external-link-alt"></i></a>`
            : escapeHTML(companyName);

        return `
            <div class="timeline-item">
                <div class="timeline-date">${escapeHTML(period)}</div>
                <div class="timeline-company">${companyHTML}</div>
                ${position ? `<div class="timeline-position">${escapeHTML(position)}</div>` : ''}
                ${rolesHTML}
                ${description ? `<div class="timeline-description">${description}</div>` : ''}
            </div>`;
    }).join('');
}

// --- Projects Section ---

function populateProjects(data) {
    const container = document.getElementById('projectGrid');
    if (!container) return;

    const allProjects = [];

    // Main projects section
    const mainProjects = data.sections && data.sections.projects;
    if (mainProjects && mainProjects.items) {
        allProjects.push(...mainProjects.items);
    }

    // Custom "Select Projects" section (id: 019ecae5-7851-72fa-a582-862219c76170)
    if (data.customSections) {
        data.customSections.forEach(section => {
            if (section.type === 'projects' && section.items) {
                allProjects.push(...section.items);
            }
        });
    }

    if (!allProjects.length) return;

    container.innerHTML = allProjects.map(project => {
        const name = project.name || '';
        const description = project.description || '';
        const websiteUrl = project.website && project.website.url ? project.website.url : '';
        const period = project.period || '';

        const titleHTML = websiteUrl
            ? `<a href="${escapeAttr(websiteUrl)}" target="_blank" class="external-link" rel="noopener">${escapeHTML(name)} <i class="fas fa-external-link-alt"></i></a>`
            : escapeHTML(name);

        // Extract tech stack from description (looks for "Tech Stack:" pattern)
        const techMatch = description.match(/Tech Stack:?\s*(.+?)(?:<\/p>|$)/);
        let techTags = '';
        if (techMatch) {
            const techs = techMatch[1].split(',').map(t => t.trim()).filter(Boolean);
            techTags = techs.map(t => `<span>${escapeHTML(t.replace(/<[^>]*>/g, ''))}</span>`).join('');
        }

        // Clean description (remove Tech Stack line for the card text)
        let cleanDesc = description.replace(/<p>Tech Stack:?.+?<\/p>/g, '').replace(/Tech Stack:?.+$/, '').trim();
        // Strip HTML if it came from JSON (some descriptions have HTML, some plain text)
        const isHTML = /<[a-z][\s\S]*>/i.test(cleanDesc);
        const descHTML = isHTML ? cleanDesc : `<p>${escapeHTML(cleanDesc)}</p>`;

        return `
            <div class="project-card">
                <div class="project-content">
                    <h3 class="project-title">${titleHTML}</h3>
                    ${period ? `<div class="timeline-date">${escapeHTML(period)}</div>` : ''}
                    <div class="project-description">${descHTML}</div>
                    ${techTags ? `<div class="project-tech">${techTags}</div>` : ''}
                </div>
            </div>`;
    }).join('');
}

// --- Structured Data (JSON-LD) ---

function updateStructuredData(data) {
    const scriptEl = document.getElementById('structuredData');
    if (!scriptEl) return;

    const basics = data.basics;
    if (!basics) return;

    const sameAs = [];
    if (data.sections && data.sections.profiles && data.sections.profiles.items) {
        data.sections.profiles.items.forEach(p => {
            if (p.website && p.website.url) sameAs.push(p.website.url);
        });
    }
    // Always include GitHub
    sameAs.push('https://github.com/Shonos');

    const skills = data.sections && data.sections.skills;
    const knowsAbout = [];
    if (skills && skills.items) {
        skills.items.forEach(cat => {
            if (cat.keywords) knowsAbout.push(...cat.keywords);
        });
    }

    const mainExp = data.sections && data.sections.experience;
    const currentJob = mainExp && mainExp.items && mainExp.items.length
        ? mainExp.items[0] : null;

    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: basics.name,
        url: basics.website ? basics.website.url : 'https://shaunalonzo.com',
        email: basics.email,
        jobTitle: basics.headline,
        sameAs: sameAs,
        knowsAbout: knowsAbout.slice(0, 15)
    };

    if (currentJob && currentJob.company) {
        ld.worksFor = {
            '@type': 'Organization',
            name: currentJob.company
        };
    }

    scriptEl.textContent = JSON.stringify(ld, null, 2);
}

// --- Page Meta (title, description) ---

function updateMeta(data) {
    const basics = data.basics;
    if (!basics) return;

    if (basics.name && basics.headline) {
        document.title = `${basics.name} | ${basics.headline.split('|')[0].trim()}`;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && data.summary && data.summary.content) {
        const plainText = data.summary.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        metaDesc.setAttribute('content', plainText.substring(0, 160));
    }
}

// --- Footer ---

function updateFooter(data) {
    const footerHighlight = document.querySelector('.footer-text .highlight');
    if (footerHighlight && data.basics && data.basics.name) {
        footerHighlight.textContent = data.basics.name;
    }
    // Update copyright year
    const footerText = document.querySelector('.footer-text');
    if (footerText) {
        footerText.innerHTML = footerText.innerHTML.replace(/© \d{4}/, `© ${new Date().getFullYear()}`);
    }
}

// --- Utility helpers ---

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
