import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw new Error('Database connection is not configured')
const sql = neon(connection)
await sql`insert into assessment_periods (key, test_id, name, active, max_points_tenths)
  values ('midterm-cut-v1', 'midterm', 'Рубежный срез · 2026–2027', true, 80) on conflict do nothing`
console.log('Midterm period ready; existing periods, profiles and attempts unchanged.')
