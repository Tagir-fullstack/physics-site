import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw new Error('Database connection is not configured')
const sql = neon(connection)
await sql`alter table assessment_periods add column if not exists max_points_tenths integer not null default 20`
console.log('Monitor grading setting ready; student attempts unchanged.')
