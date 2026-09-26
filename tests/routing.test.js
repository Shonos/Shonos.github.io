import assert from 'node:assert/strict';
import test from 'node:test';
import { hashTarget, normalizePath, restoreRedirect, safeRelativePath } from '../src/routing.js';

const origin = 'https://shaunalonzo.com';

function browser(t, path = '/', elements = new Map()) {
    const replacements = [];
    const state = { retained: true };
    const window = {
        location: new URL(path, origin),
        history: {
            state,
            replaceState(nextState, title, destination) {
                const next = new URL(destination, window.location.href);
                assert.equal(next.origin, origin);
                replacements.push({ state: nextState, title, destination });
                window.location = next;
                this.state = nextState;
            }
        }
    };
    const document = { getElementById: id => elements.get(id) || null };
    for (const [name, value] of Object.entries({ window, document })) {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
        t.after(() => {
            if (descriptor) {
                Object.defineProperty(globalThis, name, descriptor);
            } else {
                delete globalThis[name];
            }
        });
    }
    return { window, document, replacements, state };
}

function relativeLocation(window) {
    return window.location.pathname + window.location.search + window.location.hash;
}

test('safeRelativePath preserves safe relative URLs byte for byte', t => {
    browser(t);
    const paths = [
        '/', '/about', '/services/', '/nested/missing/path/', '/a//b',
        '/skills?query=a+b&query=a%2Bb&encoded=%26%3D&empty=#skills-title',
        '/projects?literal=~and~&url=https%3A%2F%2Fexample.com%2F',
        '/caf%C3%A9?value=%252F%253F%2523#caf%C3%A9', '/café', '/a%20b',
        '/a%2Fb', '/%252Fexample.com', '/?query=one+two#about',
        '/contact?__redirect=%2Fabout', '/projects?value=%5C%00', '/#skills'
    ];
    for (const path of paths) {
        assert.equal(safeRelativePath(path), path, path);
    }
});

test('safeRelativePath rejects non-paths, external URLs, malformed escapes, and control characters', t => {
    browser(t);
    const paths = [
        undefined, null, false, 0, 1, {}, [], '', 'about', '#about', '?about',
        'https://shaunalonzo.com/about', 'https://example.com/',
        'javascript:alert(1)', 'data:text/html,test', '//example.com', '///example.com',
        '//user:password@example.com', '/\\example.com', '/about\\contact',
        '/has space', '/about\ncontact', '/about\rcontact', '/about\tcontact',
        '/about\u0000contact', '/about\u007fcontact',
        '/%2fexample.com', '/%2F%2Fexample.com', '/%5cexample.com', '/%5Cexample.com',
        '/about%00contact', '/about%0Acontact', '/about%0Dcontact', '/about%7Fcontact',
        '/%', '/%GG', '/%E0%A4%A',
        '/?__redirect=%2Fcontact', '/?keep=1&__redirect=', '/?/contact',
        '/./?__redirect=%2Fcontact', '/nested/../?__redirect=%2Fcontact'
    ];
    for (const path of paths) {
        assert.equal(safeRelativePath(path), '', String(path));
    }
});

for (const destination of [
    '/about', '/services/', '/nested/missing/path/',
    '/skills/?query=a+b&query=a%2Bb&encoded=%26%3D&empty=#skills-title',
    '/projects?literal=~and~&double=%2526&redirect=%3F%2Fcontact#projects',
    '/caf%C3%A9?name=%E6%97%A5%E6%9C%AC#caf%C3%A9', '/?keep=a%2Bb#about'
]) {
    test(`restoreRedirect restores the reserved redirect losslessly: ${destination}`, t => {
        const fixture = browser(t, `/?__redirect=${encodeURIComponent(destination)}#outer`);
        assert.equal(restoreRedirect(), true);
        assert.equal(relativeLocation(fixture.window), destination);
        assert.deepEqual(fixture.replacements, [{ state: fixture.state, title: '', destination }]);
        assert.strictEqual(fixture.window.history.state, fixture.state);
        assert.equal(restoreRedirect(), false);
        assert.equal(fixture.replacements.length, 1);
    });
}

for (const destination of [
    '/about', '/contact/',
    '/skills/?query=a+b&query=a%2Bb&encoded=%26%3D&empty=#skills-title',
    '/projects?literal=~and~&double=%2526#projects',
    '/nested/missing/path/?unicode=%E6%97%A5%E6%9C%AC#missing'
]) {
    test(`restoreRedirect restores the legacy redirect losslessly: ${destination}`, t => {
        const fixture = browser(t, `/?${destination}`);
        assert.equal(restoreRedirect(), true);
        assert.equal(relativeLocation(fixture.window), destination);
        assert.deepEqual(fixture.replacements, [{ state: fixture.state, title: '', destination }]);
    });
}

for (const destination of [
    '', 'https://example.com/contact', '//example.com/contact', '/\\example.com',
    '/%2Fexample.com', '/%5Cexample.com', '/contact%0Ainjected', '/%',
    '/?__redirect=%2Fcontact', '/?/contact'
]) {
    test(`restoreRedirect removes an unsafe reserved redirect without losing unrelated state: ${JSON.stringify(destination)}`, t => {
        const fixture = browser(t, `/?keep=one+two&__redirect=${encodeURIComponent(destination)}&keep=a%2Bb#skills`);
        assert.equal(restoreRedirect(), false);
        assert.equal(relativeLocation(fixture.window), '/?keep=one+two&keep=a%2Bb#skills');
        assert.deepEqual(fixture.replacements, [{
            state: fixture.state, title: '', destination: '/?keep=one+two&keep=a%2Bb#skills'
        }]);
        assert.equal(restoreRedirect(), false);
        assert.equal(fixture.replacements.length, 1);
    });
}

test('restoreRedirect removes every reserved parameter rather than accepting a later duplicate', t => {
    const fixture = browser(t, '/?__redirect=%2F%2Fevil.example&keep=1&__redirect=%2Fcontact#about');
    assert.equal(restoreRedirect(), false);
    assert.equal(relativeLocation(fixture.window), '/?keep=1#about');
    assert.equal(fixture.replacements.length, 1);
});

test('restoreRedirect prefers the reserved format when both formats are present', t => {
    const fixture = browser(t, '/?/about&__redirect=%2Fcontact%3Fkeep%3Da%252Bb%23contact');
    assert.equal(restoreRedirect(), true);
    assert.equal(relativeLocation(fixture.window), '/contact?keep=a%2Bb#contact');
});

for (const path of ['/?//evil.example#about', '/?/%5Cevil.example#about', '/?/%GG#about']) {
    test(`restoreRedirect rejects an unsafe legacy redirect: ${path}`, t => {
        const fixture = browser(t, path);
        assert.equal(restoreRedirect(), false);
        assert.equal(relativeLocation(fixture.window), '/#about');
        assert.equal(fixture.replacements.length, 1);
    });
}

for (const path of ['/', '/?query=a%2Bb#skills', '/about?__redirect=%2Fcontact', '/nested/?/contact', '/404.html']) {
    test(`restoreRedirect leaves ordinary and non-root locations untouched: ${path}`, t => {
        const fixture = browser(t, path);
        assert.equal(restoreRedirect(), false);
        assert.equal(relativeLocation(fixture.window), path);
        assert.deepEqual(fixture.replacements, []);
    });
}

test('restoreRedirect tolerates unavailable history without throwing or reporting success', t => {
    const path = '/?__redirect=%2Fcontact';
    const fixture = browser(t, path);
    t.mock.method(fixture.window.history, 'replaceState', () => {
        throw new DOMException('History is blocked', 'SecurityError');
    });
    assert.equal(restoreRedirect(), false);
    assert.equal(relativeLocation(fixture.window), path);
    assert.deepEqual(fixture.replacements, []);
});

test('normalizePath strips only trailing slashes and retains the root', () => {
    assert.equal(normalizePath(), '/');
    for (const [input, expected] of [
        ['', '/'], ['/', '/'], ['////', '/'], ['/about', '/about'],
        ['/about/', '/about'], ['/about///', '/about'],
        ['/nested//path///', '/nested//path'], ['/caf%C3%A9/', '/caf%C3%A9']
    ]) {
        assert.equal(normalizePath(input), expected);
    }
});

test('hashTarget resolves decoded IDs without treating them as CSS selectors', t => {
    const elements = new Map([
        ['skills-title', { id: 'skills-title' }],
        ['café', { id: 'café' }],
        ['a b/[c]', { id: 'a b/[c]' }],
        ['%2F', { id: '%2F' }]
    ]);
    const fixture = browser(t, '/', elements);
    const lookup = t.mock.method(fixture.document, 'getElementById');
    for (const [hash, id] of [
        ['#skills-title', 'skills-title'], ['#caf%C3%A9', 'café'],
        ['#a%20b%2F%5Bc%5D', 'a b/[c]'], ['#%252F', '%2F']
    ]) {
        assert.strictEqual(hashTarget(hash), elements.get(id));
    }
    assert.equal(lookup.mock.callCount(), 4);
    assert.equal(hashTarget('#missing'), null);
});

test('hashTarget ignores empty, non-hash, and malformed values safely', t => {
    const fixture = browser(t);
    const lookup = t.mock.method(fixture.document, 'getElementById');
    for (const hash of [undefined, '', '#', 'skills', '/skills#skills', '#%', '#%GG', '#%E0%A4%A']) {
        assert.equal(hashTarget(hash), null);
    }
    assert.equal(lookup.mock.callCount(), 0);
});
