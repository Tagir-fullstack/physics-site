import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

// Run with: node --env-file=.env.local scripts/setup-assessment-periods.mjs
// Additive only: does not archive, delete or change any student attempt.
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw new Error('Database connection is not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/assessment-periods.sql', import.meta.url), 'utf8')
const before = await sql`select count(*)::int as count from assessment_attempts`
await sql.transaction(migration.split(';').map(part => part.trim()).filter(Boolean).map(statement => sql.query(statement, [])))
const after = await sql`select count(*)::int as count from assessment_attempts`
const periods = await sql`select key, test_id, name, active from assessment_periods order by created_at`
console.log(JSON.stringify({ attemptsBefore: before[0].count, attemptsAfter: after[0].count, periods }))
