import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dirIndex = process.argv.indexOf('--dir');
const root = resolve(process.cwd(), dirIndex >= 0 ? process.argv[dirIndex + 1] : 'dist');
const review = process.argv.includes('--review');
const required = ['index.html', '404.html', 'CNAME', 'favicon.ico'];
const content = JSON.parse(await readFile(resolve('content/site.json'), 'utf8'));
required.push('profile/index.html', 'assets/fonts/manrope-latin.woff2', ...content.work.cases.map(study => `work/${study.slug}/index.html`));

for (const file of required) {
    await access(resolve(root, file));
}

const cname = (await readFile(resolve(root, 'CNAME'), 'utf8')).trim();
if (cname !== 'shaunalonzo.com') {
    throw new Error(`Unexpected CNAME: ${cname}`);
}

for (const file of required.filter(file => file.endsWith('.html') && file !== '404.html')) {
    const html = await readFile(resolve(root, file), 'utf8');
    if (!review && (/data-review-[a-z-]+/.test(html) || [content.ui.reviewAction, content.ui.reviewBanner, content.ui.reviewLocalOnly].some(note => html.includes(note)))) throw new Error(`${file}: review notes must not ship in a production build`);
    for (const marker of ['{{', '__THEME_SCRIPT__', '/src/main.js', '/src/theme-init.js', 'user-confirmations/', 'knowledge_id']) {
        if (html.includes(marker)) {
            throw new Error(`${file}: unresolved marker, source entry, or private evidence: ${marker}`);
        }
    }
    if (!html.includes('type="application/ld+json"') || !html.includes('id="site-config"') || !html.includes('rel="canonical"')) {
        throw new Error(`${file} is missing embedded data or canonical URL`);
    }
}

const sourceMaps = [];
const { readdir } = await import('node:fs/promises');
async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) await scan(path);
        else if (entry.name.endsWith('.map')) sourceMaps.push(path);
    }
}
await scan(root);
if (sourceMaps.length) throw new Error(`Source maps found in dist: ${sourceMaps.join(', ')}`);
console.log(`${review ? 'Local review' : 'Production'} artifact verified.`);
