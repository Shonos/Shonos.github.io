import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderContent } from './render-content.js';

const watchedFiles = ['index.html', 'content/site.json', 'content/site.schema.json'];

export function contentPlugins() {
    return [{
        name: 'site-content',
        enforce: 'pre',
        async transformIndexHtml(html) {
            const rendered = await renderContent(html, process.cwd(), '/');
            return rendered.replace('__THEME_SCRIPT__', '/theme-init.js');
        },
        async closeBundle() {
            if (this.meta.watchMode) return;
            const { minify } = await import('terser');
            const { minify: minifyHtml } = await import('html-minifier-terser');
            const { mkdir, readFile, rm, writeFile } = await import('node:fs/promises');
            const source = await readFile(resolve(process.cwd(), 'src/theme-init.js'), 'utf8');
            const result = await minify(source);
            await mkdir(resolve(process.cwd(), 'dist/assets'), { recursive: true });
            await writeFile(resolve(process.cwd(), 'dist/assets/theme-init.js'), result.code, 'utf8');
            await rm(resolve(process.cwd(), 'dist/theme-init.js'), { force: true });
            for (const file of ['dist/index.html', 'dist/404.html']) {
                const path = resolve(process.cwd(), file);
                const output = await readFile(path, 'utf8');
                const rewritten = output.replaceAll('/theme-init.js', '/assets/theme-init.js');
                const compact = await minifyHtml(rewritten, {
                    collapseWhitespace: true,
                    conservativeCollapse: true,
                    removeComments: true,
                    removeRedundantAttributes: true,
                    removeScriptTypeAttributes: false,
                    removeStyleLinkTypeAttributes: true,
                    useShortDoctype: true
                });
                await writeFile(path, compact, 'utf8');
            }
        },
        configureServer(server) {
            const reload = file => {
                const relative = file.replace(`${process.cwd()}/`, '');
                if (watchedFiles.includes(relative)) {
                    server.ws.send({ type: 'full-reload' });
                }
            };
            server.watcher.on('change', reload);
        }
    }];
}

export async function renderEntry(file = 'index.html') {
    const html = await readFile(resolve(process.cwd(), file), 'utf8');
    return (await renderContent(html, process.cwd(), '/')).replace('__THEME_SCRIPT__', '/theme-init.js');
}
