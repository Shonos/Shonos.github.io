import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const required = ['index.html', '404.html', 'CNAME', 'favicon.ico'];

for (const file of required) {
    await access(resolve(root, file));
}

const cname = (await readFile(resolve(root, 'CNAME'), 'utf8')).trim();
if (cname !== 'shaunalonzo.com') {
    throw new Error(`Unexpected CNAME: ${cname}`);
}

const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const marker of ['{{', '__THEME_SCRIPT__', '/src/main.js', '/src/theme-init.js']) {
    if (html.includes(marker)) {
        throw new Error(`Build contains unresolved marker or source entry: ${marker}`);
    }
}
if (!html.includes('type="application/ld+json"') || !html.includes('id="site-config"')) {
    throw new Error('Generated index.html is missing embedded data');
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
console.log('Production artifact verified.');
