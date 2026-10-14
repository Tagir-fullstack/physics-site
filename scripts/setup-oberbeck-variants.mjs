import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw Error('Database connection is not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/oberbeck-student-variants.sql', import.meta.url), 'utf8')
const before = await sql`select count(*)::int as count from assessment_attempts`
await sql.transaction(migration.split(';').map(s => s.trim()).filter(Boolean).map(s => sql.query(s, [])))
const after = await sql`select count(*)::int as count from assessment_attempts`
console.log(JSON.stringify({ existingAttemptsBefore: before[0].count, existingAttemptsAfter: after[0].count, newTables: ['student_profiles', 'oberbeck_variants'] }))
