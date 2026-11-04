import {readFile} from 'node:fs/promises'
import {neon} from '@neondatabase/serverless'
const connection=process.env.DATABASE_URL||process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL
if(!connection)throw Error('Database not configured')
const sql=neon(connection),migration=await readFile(new URL('./sql/profile-merge.sql',import.meta.url),'utf8')
await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s,[])))
console.log('Merge fields ready; existing profiles and assignments unchanged.')
