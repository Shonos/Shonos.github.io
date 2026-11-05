import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { contentPlugins } from './scripts/content-plugin.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const content = JSON.parse(readFileSync(new URL('./content/site.json', import.meta.url), 'utf8'));

export default defineConfig({
    root,
    base: '/',
    plugins: contentPlugins(),
    server: { host: '127.0.0.1' },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        minify: true,
        cssMinify: true,
        rolldownOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                notFound: fileURLToPath(new URL('./404.html', import.meta.url)),
                profile: fileURLToPath(new URL('./profile/index.html', import.meta.url)),
                ...Object.fromEntries(content.work.cases.map(study => [study.slug,
                    fileURLToPath(new URL(`./work/${study.slug}/index.html`, import.meta.url))]))
            }
        }
    }
});
