import {neon} from '@neondatabase/serverless'
import {mergeTeacherProfiles} from './lib/merge-teacher-profiles.mjs'
const connection=process.env.DATABASE_URL||process.env.DATABASE_URL_UNPOOLED||process.env.POSTGRES_URL
if(!connection)throw Error('Database not configured')
const primary=Number(process.argv[process.argv.indexOf('--primary')+1]),secondary=Number(process.argv[process.argv.indexOf('--secondary')+1])
console.log(JSON.stringify(await mergeTeacherProfiles(neon(connection),primary,secondary,{apply:process.argv.includes('--apply')})))
