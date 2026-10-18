import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw new Error('Database connection is not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/student-recovery-links.sql', import.meta.url), 'utf8')
await sql.transaction(migration.split(';').map(s => s.trim()).filter(Boolean).map(statement => sql.query(statement, [])))
console.log('Student recovery storage ready; existing profiles and variants unchanged.')
