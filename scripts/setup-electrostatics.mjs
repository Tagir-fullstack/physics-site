import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw Error('Database connection is not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/electrostatics-submissions.sql', import.meta.url),'utf8')
await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s,[])))
console.log('Electrostatics submissions table and index are ready. Existing tables were not modified.')
