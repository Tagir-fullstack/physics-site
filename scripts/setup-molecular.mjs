import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.NEON_DATABASE_URL
if (!connection) throw new Error('Database connection is not configured')
const sql = neon(connection)
await sql`insert into assessment_periods(key,test_id,name,active,max_points_tenths)
 values('molecular-cut-v1','molecular','Молекулярная физика · 2026–2027',true,40) on conflict do nothing`
await sql`insert into assessment_access_settings(period_key,sessions_required) values('molecular-cut-v1',true) on conflict do nothing`
console.log('Molecular physics period ready; waiting room required; existing schedules, attempts and release times unchanged.')
