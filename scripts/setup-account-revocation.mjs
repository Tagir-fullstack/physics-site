import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw Error('Database connection is not configured')
const sql = neon(connection)
await sql.query(await readFile(new URL('./sql/account-revocation.sql', import.meta.url), 'utf8'), [])
console.log('Account revocation table ready; existing profiles and assignments unchanged.')
