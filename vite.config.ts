import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'

type DevRequest = IncomingMessage & {
  query: Record<string, string>
  body?: unknown
}

type DevResponse = ServerResponse & {
  status(code: number): DevResponse
  json(value: unknown): DevResponse
}

function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        let modulePath: string | null = null
        const query: Record<string, string> = {}

        if (pathname === '/api/ktp') {
          modulePath = '/api/ktp/index.ts'
        } else if (pathname === '/api/ktp/upload') {
          modulePath = '/api/ktp/upload.ts'
        } else {
          const detailMatch = pathname.match(/^\/api\/ktp\/([^/]+)$/)
          if (detailMatch) {
            modulePath = '/api/ktp/[id].ts'
            query.id = decodeURIComponent(detailMatch[1])
          }
        }

        if (!modulePath) return next()

        const devReq = req as DevRequest
        const devRes = res as DevResponse
        devReq.query = query
        devRes.status = (code) => {
          devRes.statusCode = code
          return devRes
        }
        devRes.json = (value) => {
          if (!devRes.headersSent) devRes.setHeader('Content-Type', 'application/json; charset=utf-8')
          devRes.end(JSON.stringify(value))
          return devRes
        }

        try {
          const apiModule = await server.ssrLoadModule(modulePath)
          await apiModule.default(devReq, devRes)
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          console.error('[local api]', error)
          if (!devRes.headersSent) devRes.statusCode = 500
          if (!devRes.writableEnded) {
            devRes.json({ error: 'Local API error', detail: (error as Error).message })
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vercelApiDevPlugin(), react()],
})
