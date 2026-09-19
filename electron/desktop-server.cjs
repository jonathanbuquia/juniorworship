const DESKTOP_ORIGIN = 'http://127.0.0.1:4177'

async function startDesktopServer(startLocalServer, { protocol, net, fetchLocal = globalThis.fetch }) {
  let server
  try {
    server = await startLocalServer({ open: false, port: 4177 })
  } catch (error) {
    if (!['EACCES', 'EADDRINUSE'].includes(error.code)) throw error
    server = await startLocalServer({ open: false, port: 0 })
  }

  const needsForwarding = server.url !== DESKTOP_ORIGIN
  if (needsForwarding) {
    try {
      // Keep the renderer's origin stable so existing localStorage stays available.
      protocol.handle('http', (request) => {
        const url = new URL(request.url)
        if (url.origin !== DESKTOP_ORIGIN) {
          return net.fetch(request, { bypassCustomProtocolHandlers: true })
        }
        const target = new URL(server.url)
        target.pathname = url.pathname
        target.search = url.search
        // Node's fetch forwards locally without Chromium applying cross-port CORS checks.
        return fetchLocal(new Request(target, request))
      })
    } catch (error) {
      await server.close()
      throw error
    }
  }

  return {
    url: DESKTOP_ORIGIN,
    async close() {
      if (needsForwarding) protocol.unhandle('http')
      await server.close()
    },
  }
}

module.exports = { DESKTOP_ORIGIN, startDesktopServer }
