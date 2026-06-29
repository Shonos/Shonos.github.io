#!/usr/bin/env node
/**
 * build.js — Generates index.html from template.html + alonzo-principal-net-aws-engineer.json
 *
 * Usage:  node scripts/build.js
 *
 * Reads the JSON resume data and bakes all content into index.html statically.
 * No frameworks, no npm install — just Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'template.html');
const JSON_PATH = path.join(ROOT, 'assets', 'alonzo-principal-net-aws-engineer.json');
const OUTPUT_PATH = path.join(ROOT, 'index.html');

// ── Load data ──────────────────────────────────────────────

const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const basics = data.basics || {};
const summary = data.summary || {};
const sections = data.sections || {};
const customSections = data.customSections || [];

// ── Helper: escape for safe HTML insertion ─────────────────

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function plainText(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ── Generate sections ─────────────────────────────────────

function buildSkills() {
    const skillsData = sections.skills;
    if (!skillsData || !skillsData.items) return '';

    const tags = [];
    skillsData.items.forEach(cat => {
        if (cat.keywords) {
            cat.keywords.forEach(kw => {
                tags.push(`<span class="skill-tag" data-tooltip="${escAttr(cat.name)}">${esc(kw)}</span>`);
            });
        }
    });
    return tags.join('\n                    ');
}

function buildExperience() {
    const allExp = [];

    // Main experience section
    if (sections.experience && sections.experience.items) {
        allExp.push(...sections.experience.items.map(item => ({ ...item, _source: 'main' })));
    }

    // Custom sections with type "experience" (past work, continued, etc.)
    customSections.forEach(section => {
        if (section.type === 'experience' && section.items) {
            allExp.push(...section.items.map(item => ({ ...item, _source: 'custom' })));
        }
    });

    if (!allExp.length) return '';

    return allExp.map(exp => {
        const companyHTML = exp.website && exp.website.url
            ? `<a href="${escAttr(exp.website.url)}" target="_blank" class="external-link" rel="noopener">${esc(exp.company)} <i class="fas fa-external-link-alt"></i></a>`
            : esc(exp.company || '');

        let rolesHTML = '';
        if (exp._source === 'custom' && exp.roles && exp.roles.length) {
            rolesHTML = exp.roles.map(role => `
                        <div class="timeline-position">${esc(role.position || '')}</div>
                        <div class="timeline-date">${esc(role.period || '')}</div>
                        <div class="timeline-description">${role.description || ''}</div>`).join('');
        }

        return `
                    <div class="timeline-item">
                        <div class="timeline-date">${esc(exp.period || '')}</div>
                        <div class="timeline-company">${companyHTML}</div>
                        ${exp.position ? `<div class="timeline-position">${esc(exp.position)}</div>` : ''}
                        ${rolesHTML}
                        ${exp.description ? `<div class="timeline-description">${exp.description}</div>` : ''}
                    </div>`;
    }).join('');
}

function buildProjects() {
    const allProjects = [];

    if (sections.projects && sections.projects.items) {
        allProjects.push(...sections.projects.items);
    }

    customSections.forEach(section => {
        if (section.type === 'projects' && section.items) {
            allProjects.push(...section.items);
        }
    });

    if (!allProjects.length) return '';

    return allProjects.map(proj => {
        const titleHTML = proj.website && proj.website.url
            ? `<a href="${escAttr(proj.website.url)}" target="_blank" class="external-link" rel="noopener">${esc(proj.name)} <i class="fas fa-external-link-alt"></i></a>`
            : esc(proj.name || '');

        // Extract tech stack
        const desc = proj.description || '';
        const techMatch = desc.match(/Tech Stack:?\s*(.+?)(?:<\/p>|$)/);
        let techTags = '';
        if (techMatch) {
            techTags = techMatch[1]
                .split(',')
                .map(t => t.trim())
                .filter(Boolean)
                .map(t => `<span>${esc(t.replace(/<[^>]*>/g, ''))}</span>`)
                .join('');
        }

        let cleanDesc = desc.replace(/<p>Tech Stack:?.+?<\/p>/g, '').replace(/Tech Stack:?.+$/, '').trim();
        const isHTML = /<[a-z][\s\S]*>/i.test(cleanDesc);
        const descHTML = isHTML ? cleanDesc : `<p>${esc(cleanDesc)}</p>`;

        return `
                    <div class="project-card">
                        <div class="project-content">
                            <h3 class="project-title">${titleHTML}</h3>
                            ${proj.period ? `<div class="timeline-date">${esc(proj.period)}</div>` : ''}
                            <div class="project-description">${descHTML}</div>
                            ${techTags ? `<div class="project-tech">${techTags}</div>` : ''}
                        </div>
                    </div>`;
    }).join('');
}

function buildJSONLD() {
    const sameAs = [];
    if (sections.profiles && sections.profiles.items) {
        sections.profiles.items.forEach(p => {
            if (p.website && p.website.url) sameAs.push(p.website.url);
        });
    }
    sameAs.push('https://github.com/Shonos');

    const knowsAbout = [];
    if (sections.skills && sections.skills.items) {
        sections.skills.items.forEach(cat => {
            if (cat.keywords) knowsAbout.push(...cat.keywords);
        });
    }

    const currentJob = (sections.experience && sections.experience.items && sections.experience.items.length)
        ? sections.experience.items[0] : null;

    const ld = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: basics.name,
        url: basics.website ? basics.website.url : 'https://shaunalonzo.com',
        email: basics.email,
        jobTitle: basics.headline,
        sameAs,
        knowsAbout: knowsAbout.slice(0, 15)
    };

    if (currentJob && currentJob.company) {
        ld.worksFor = { '@type': 'Organization', name: currentJob.company };
    }

    return JSON.stringify(ld, null, 6);
}

// ── Build replacements map ────────────────────────────────

const heroDescPlain = summary.content ? plainText(summary.content) : '';
const headlineShort = (basics.headline || '').split('|')[0].trim();

const replacements = {
    'META_TITLE': `${basics.name} | ${headlineShort}`,
    'META_DESC': summary.content ? plainText(summary.content).substring(0, 160) : '',
    'HERO_NAME': basics.name || '',
    'HERO_ROLE': basics.headline || '',
    'HERO_DESC': heroDescPlain,
    'CONTACT_EMAIL': basics.email || '',
    'CONTACT_LOCATION': basics.location || '',
    'SKILLS': buildSkills(),
    'EXPERIENCE': buildExperience(),
    'PROJECTS': buildProjects(),
    'JSONLD': buildJSONLD(),
    'FOOTER_NAME': basics.name || '',
    'FOOTER_YEAR': String(new Date().getFullYear())
};

// ── Replace all markers ───────────────────────────────────

let output = template;
for (const [key, value] of Object.entries(replacements)) {
    const marker = `<!-- BUILD:${key} -->`;
    const endMarker = `<!-- /BUILD:${key} -->`;
    const regex = new RegExp(
        marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + endMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g'
    );
    output = output.replace(regex, value);
}

// ── Write output ──────────────────────────────────────────

fs.writeFileSync(OUTPUT_PATH, output, 'utf8');

console.log(`✅ Built index.html from template + JSON (${(output.length / 1024).toFixed(1)} KB)`);
