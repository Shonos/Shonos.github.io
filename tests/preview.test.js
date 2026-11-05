import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('Pages preview serves native video ranges, HEAD, and media types', { timeout: 15000 }, async t => {
    const root = await mkdtemp('/tmp/opencode/site-preview-');
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'dist-review/assets'), { recursive: true });
    await writeFile(join(root, 'dist-review/404.html'), 'Not found');
    await writeFile(join(root, 'dist-review/index.html'), 'Review fixture');
    const bytes = '0123456789abcdef';
    for (const extension of ['mp4', 'webm', 'webp', 'avif', 'vtt']) {
        await writeFile(join(root, `dist-review/assets/test.${extension}`), bytes);
    }
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    const script = fileURLToPath(new URL('../scripts/preview-pages.js', import.meta.url));
    const server = spawn(process.execPath, [script, '--dir', 'dist-review', '--port', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    t.after(async () => {
        if (server.exitCode === null && server.signalCode === null) {
            const stopped = once(server, 'exit');
            server.kill();
            await stopped;
        }
    });
    await Promise.race([
        once(server.stdout, 'data'),
        once(server, 'exit').then(([code]) => { throw new Error(`Preview exited early: ${code}`); })
    ]);
    const base = `http://127.0.0.1:${port}`;
    assert.equal(await (await fetch(base)).text(), 'Review fixture');
    for (const extension of ['mp4', 'webm']) {
        const url = `${base}/assets/test.${extension}`;
        const full = await fetch(url);
        assert.equal(full.status, 200);
        assert.equal(full.headers.get('content-type'), `video/${extension}`);
        assert.equal(full.headers.get('accept-ranges'), 'bytes');
        assert.equal(full.headers.get('content-length'), '16');
        assert.equal(await full.text(), bytes);
        for (const [range, expected] of [['bytes=2-5', '2345'], ['bytes=12-', 'cdef'], ['bytes=-4', 'cdef'], ['bytes=14-99', 'ef']]) {
            const partial = await fetch(url, { headers: { Range: range } });
            assert.equal(partial.status, 206);
            assert.equal(Number(partial.headers.get('content-length')), expected.length);
            assert.match(partial.headers.get('content-range'), /^bytes \d+-\d+\/16$/);
            assert.equal(await partial.text(), expected);
        }
        for (const range of ['bytes=20-', 'bytes=4-2', 'bytes=-0', 'bytes=-', 'bytes=1-2,4-5']) {
            const invalid = await fetch(url, { headers: { Range: range } });
            assert.equal(invalid.status, 416);
            assert.equal(invalid.headers.get('content-range'), 'bytes */16');
        }
        const head = await fetch(url, { method: 'HEAD' });
        assert.equal(head.status, 200);
        assert.equal(head.headers.get('content-length'), '16');
        assert.equal(await head.text(), '');
        const rangeHead = await fetch(url, { method: 'HEAD', headers: { Range: 'bytes=2-5' } });
        assert.equal(rangeHead.status, 206);
        assert.equal(rangeHead.headers.get('content-length'), '4');
        assert.equal(await rangeHead.text(), '');
    }
    for (const [extension, type] of [['webp', 'image/webp'], ['avif', 'image/avif'], ['vtt', 'text/vtt; charset=utf-8']]) {
        assert.equal((await fetch(`${base}/assets/test.${extension}`)).headers.get('content-type'), type);
    }
    const missing = await fetch(`${base}/missing`);
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), 'Not found');
});
