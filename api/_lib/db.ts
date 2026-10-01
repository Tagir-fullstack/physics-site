import './env.js'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.NEON_DATABASE_URL

export const hasDatabaseConfig = Boolean(connectionString)

// Keep serverless functions loadable even when an environment was configured
// without Neon. API handlers can then return a useful JSON error instead of
// Vercel's opaque FUNCTION_INVOCATION_FAILED page.
const sql = neon(connectionString || 'postgresql://missing:missing@127.0.0.1:5432/missing')

export const db = drizzle(sql, { schema })
export { schema }
