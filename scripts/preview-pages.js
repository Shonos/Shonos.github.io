import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4174;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

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
        if (info?.isDirectory()) file = join(file, 'index.html');
        await access(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
        createReadStream(file).pipe(response);
    } catch {
        const fallback = join(root, '404.html');
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        createReadStream(fallback).pipe(response);
    }
});

server.listen(port, '127.0.0.1', () => console.log(`Pages preview at http://127.0.0.1:${port}`));
