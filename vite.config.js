import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { contentPlugins } from './scripts/content-plugin.js';

const root = fileURLToPath(new URL('.', import.meta.url));

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
                notFound: fileURLToPath(new URL('./404.html', import.meta.url))
            }
        }
    }
});
