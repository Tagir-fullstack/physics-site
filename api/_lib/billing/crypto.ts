import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
export const digest = (s: string) => createHash('sha256').update(s).digest('hex')
export const callbackSecret = (id: string, key: string) => createHmac('sha256', key).update(`epay-callback:${id}`).digest('hex')
export function secretMatches(value: unknown, hashed: string) {
  if (typeof value !== 'string' || value.length > 256 || !/^[a-f0-9]{64}$/.test(hashed)) return false
  return timingSafeEqual(Buffer.from(digest(value), 'hex'), Buffer.from(hashed, 'hex'))
}
export function sealCard(card: string, user: string, key: string) {
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(card) || !/^[a-f0-9]{64}$/i.test(key)) throw Error('Invalid card token/key')
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv)
  cipher.setAAD(Buffer.from(user))
  const encrypted = Buffer.concat([cipher.update(card, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}
export function openCard(value: string, user: string, key: string) {
  const [version, iv, tag, encrypted] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted) throw Error('Invalid card envelope')
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from(user)); decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}
