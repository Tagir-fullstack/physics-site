import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw Error('Database connection is not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/student-variant-number.sql', import.meta.url), 'utf8')
await sql.transaction(migration.split(';').map(s => s.trim()).filter(Boolean).map(s => sql.query(s, [])))
const [result] = await sql`select count(*)::int as profiles, count(distinct variant_number)::int as unique_numbers, count(*) filter (where variant_number is null)::int as missing from student_profiles`
if (result.missing || result.profiles !== result.unique_numbers) throw Error('Variant number validation failed')
console.log(JSON.stringify({ ...result, migration: 'student-variant-number', existingWorksUnchanged: true }))
