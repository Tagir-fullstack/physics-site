import type { VercelRequest } from '@vercel/node'

export class RequestBodyError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = 'RequestBodyError' }
}

export function sameRequestOrigin(req: Pick<VercelRequest, 'headers'>) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (!origin) return true // Non-browser clients still need their session or private token.
  if (typeof origin !== 'string' || typeof req.headers.host !== 'string') return false
  try {
    const protocol = process.env.VERCEL_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https' ? 'https:' : 'http:'
    return new URL(origin).origin === `${protocol}//${req.headers.host}` && origin === new URL(origin).origin
  } catch { return false }
}

export async function readLimitedBody(req: VercelRequest, maxBytes: number): Promise<Buffer> {
  const declared = req.headers['content-length']
  if (typeof declared === 'string' && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new RequestBodyError('Тело запроса слишком большое.', 413)
  if (req.body !== undefined) {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body), 'utf8')
    if (raw.length > maxBytes) throw new RequestBodyError('Тело запроса слишком большое.', 413)
    return raw
  }
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += part.length
    if (size > maxBytes) throw new RequestBodyError('Тело запроса слишком большое.', 413)
    chunks.push(part)
  }
  return Buffer.concat(chunks)
}

export async function readLimitedJson(req: VercelRequest, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const raw = await readLimitedBody(req, maxBytes)
  if (!raw.length) return {}
  try {
    const value: unknown = JSON.parse(raw.toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
    return value as Record<string, unknown>
  } catch { throw new RequestBodyError('Неверный формат JSON.') }
}
