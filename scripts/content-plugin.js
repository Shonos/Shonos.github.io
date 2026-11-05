import { readFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { renderContent } from './render-content.js';

const watchedFiles = ['index.html', 'content/site.json', 'content/site.schema.json'];

export function contentPlugins() {
    let review = false;
    let outputRoot = resolve('dist');
    return [{
        name: 'site-content',
        enforce: 'pre',
        configResolved(config) {
            review = config.mode === 'review';
            outputRoot = resolve(config.root, config.build.outDir);
        },
        transformIndexHtml: {
            order: 'pre',
            async handler(html, context) {
                if (context.filename?.endsWith('404.html')) return html;
                const entry = context.filename ? relative(process.cwd(), context.filename) : '/';
                const rendered = await renderContent(html, process.cwd(), '/', entry, { review });
                return rendered.replace('__THEME_SCRIPT__', '/theme-init.js');
            }
        },
        async closeBundle() {
            if (this.meta.watchMode) return;
            const { minify } = await import('terser');
            const { minify: minifyHtml } = await import('html-minifier-terser');
            const { mkdir, readFile, readdir, rm, writeFile } = await import('node:fs/promises');
            const source = await readFile(resolve(process.cwd(), 'src/theme-init.js'), 'utf8');
            const result = await minify(source);
            await mkdir(resolve(outputRoot, 'assets'), { recursive: true });
            await writeFile(resolve(outputRoot, 'assets/theme-init.js'), result.code, 'utf8');
            await rm(resolve(outputRoot, 'theme-init.js'), { force: true });
            async function htmlFiles(directory) {
                const entries = await readdir(directory, { withFileTypes: true });
                return (await Promise.all(entries.map(entry => entry.isDirectory() ?
                    htmlFiles(join(directory, entry.name)) : entry.name.endsWith('.html') ? [join(directory, entry.name)] : []))).flat();
            }
            for (const file of await htmlFiles(outputRoot)) {
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
                if (watchedFiles.includes(relative) || relative.startsWith('templates/')) {
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
