import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { DESKTOP_ORIGIN, startDesktopServer } = require('../electron/desktop-server.cjs')

for (const code of ['EACCES', 'EADDRINUSE']) {
  test(`desktop recovers from ${code} without changing its storage origin`, async () => {
    const ports = []
    let handler
    let closed = false
    let unhandled = false
    let forwarded
    const server = await startDesktopServer(async ({ port }) => {
      ports.push(port)
      if (port === 4177) throw Object.assign(new Error(code), { code })
      return { url: 'http://127.0.0.1:12345', close: async () => { closed = true } }
    }, {
      protocol: {
        handle: (scheme, callback) => { assert.equal(scheme, 'http'); handler = callback },
        unhandle: (scheme) => { assert.equal(scheme, 'http'); unhandled = true },
      },
      net: { fetch: async (request, options) => { forwarded = { request, options }; return new Response('ok') } },
      fetchLocal: async (request) => { forwarded = { request }; return new Response('ok') },
    })
    assert.deepEqual(ports, [4177, 0])
    assert.equal(server.url, DESKTOP_ORIGIN)
    await handler(new Request(`${DESKTOP_ORIGIN}/api/example?playerId=sample`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' }, body: '{"amount":100}',
    }))
    assert.equal(forwarded.request.url, 'http://127.0.0.1:12345/api/example?playerId=sample')
    assert.equal(forwarded.request.method, 'POST')
    assert.equal(forwarded.request.headers.get('Authorization'), 'Bearer test')
    assert.deepEqual(await forwarded.request.json(), { amount: 100 })

    await handler(new Request(`${DESKTOP_ORIGIN}/media/books-of-the-bible`, { headers: { Range: 'bytes=0-99' } }))
    assert.equal(forwarded.request.headers.get('Range'), 'bytes=0-99')
    await handler(new Request('http://example.com/reference'))
    assert.equal(forwarded.request.url, 'http://example.com/reference')
    assert.equal(forwarded.options.bypassCustomProtocolHandlers, true)
    await server.close()
    assert.ok(closed && unhandled)
  })
}

test('desktop uses the normal port when available and surfaces unrelated errors', async () => {
  const server = await startDesktopServer(async ({ port }) => {
    assert.equal(port, 4177)
    return { url: DESKTOP_ORIGIN, close: async () => {} }
  }, {})
  assert.equal(server.url, DESKTOP_ORIGIN)
  await server.close()
  await assert.rejects(startDesktopServer(async () => { throw new Error('Unrelated failure') }, {}), /Unrelated failure/)
})
