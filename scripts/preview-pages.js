import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const dirIndex = process.argv.indexOf('--dir');
const directory = dirIndex >= 0 ? process.argv[dirIndex + 1] : 'dist';
if (!['dist', 'dist-review'].includes(directory)) throw new Error('Preview directory must be dist or dist-review');
const root = resolve(process.cwd(), directory);
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4174;
const hostIndex = process.argv.indexOf('--host');
const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

function safePath(urlPath) {
    const pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
    const path = normalize(join(root, pathname));
    return path === root || path.startsWith(`${root}/`) ? path : '';
}

const server = createServer(async (request, response) => {
    try {
        const path = safePath(request.url || '/');
        if (!path) {
            response.writeHead(400); response.end('Bad request'); return;
        }
        let file = path;
        const info = await stat(file).catch(() => null);
        if (info?.isDirectory()) {
            const url = new URL(request.url, 'http://localhost');
            if (!url.pathname.endsWith('/')) {
                response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
                response.end();
                return;
            }
            file = join(file, 'index.html');
        }
        await access(file);
        const size = (await stat(file)).size;
        const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': size };
        if (['.mp4', '.webm'].includes(extname(file))) {
            headers['Accept-Ranges'] = 'bytes';
            const range = request.headers.range;
            if (range) {
                const match = /^bytes=(\d*)-(\d*)$/.exec(range);
                const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, size - Number(match[2])) : NaN;
                const end = match?.[1] && match?.[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
                if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
                    response.writeHead(416, { 'Content-Range': `bytes */${size}` });
                    response.end();
                    return;
                }
                response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
                if (request.method === 'HEAD') response.end();
                else createReadStream(file, { start, end }).pipe(response);
                return;
            }
        }
        response.writeHead(200, headers);
        if (request.method === 'HEAD') response.end();
        else createReadStream(file).pipe(response);
    } catch {
        const fallback = join(root, '404.html');
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        createReadStream(fallback).pipe(response);
    }
});

server.listen(port, host, () => console.log(`Pages preview at http://${host}:${port}`));
