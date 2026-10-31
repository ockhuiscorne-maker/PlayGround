// Minimal static file server for the built site. No runtime dependencies.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(process.env.DIST_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'))
const port = Number(process.env.PORT || 3000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

function resolveFile(pathname) {
  const candidate = resolve(join(root, pathname))
  if (candidate !== root && !candidate.startsWith(root + sep)) return { forbidden: true }
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, 'index.html')
    return existsSync(index) ? { file: index } : { file: null }
  }
  return { file: existsSync(candidate) && statSync(candidate).isFile() ? candidate : null }
}

const server = createServer((request, response) => {
  const method = request.method || 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' })
    response.end('Method Not Allowed')
    return
  }

  let url
  try {
    url = new URL(request.url || '/', 'http://localhost')
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Bad Request')
    return
  }

  if (url.pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify({ ok: true }))
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Bad Request')
    return
  }

  const { file, forbidden } = resolveFile(pathname)
  if (forbidden) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Forbidden')
    return
  }

  let target = file
  if (!target && !extname(pathname)) target = resolveFile('/index.html').file

  if (!target) {
    const missingIndex = !existsSync(join(root, 'index.html'))
    response.writeHead(missingIndex ? 500 : 404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(missingIndex ? 'Build missing index.html' : 'Not Found')
    return
  }

  const stat = statSync(target)
  response.writeHead(200, {
    'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': 'no-cache'
  })
  if (method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(target).pipe(response)
})

server.on('error', error => {
  console.error(`Server error: ${error.message}`)
  process.exit(1)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root} on http://0.0.0.0:${port}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    server.closeAllConnections?.()
  })
}
