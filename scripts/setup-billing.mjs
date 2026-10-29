import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw Error('Database is not configured')
if (process.env.BILLING_MIGRATION_APPROVED !== 'true') throw Error('Review scripts/sql/billing-epay.sql and explicitly set BILLING_MIGRATION_APPROVED=true. No changes made.')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/billing-epay.sql', import.meta.url), 'utf8')
await sql.transaction(migration.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').split(';').map(q => q.trim()).filter(Boolean).map(q => sql.query(q)))
console.log('Billing tables prepared. No payment sent, no job enabled, no existing profile modified.')
