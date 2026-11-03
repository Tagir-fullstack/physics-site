import { readFile, writeFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL
if (!connection) throw Error('Database not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/teacher-verification.sql', import.meta.url), 'utf8')
const allowed = new Set(['B062','B063','B064','B076','B057'])
const normalized = value => { const m = /^[BВ]\s*(\d{3})$/iu.exec((value || '').trim()); return m && allowed.has('B'+m[1]) ? 'B'+m[1] : '' }
// Only current profile fields are touched. Historical answers, variants and scores stay intact.
const tables = [
 { table:'student_profiles', id:'id', field:'student_group', where:'' },
 { table:'education_profiles', id:'user_id', field:'group_name', where:" where role = 'student'" },
 { table:'class_students', id:'id', field:'group_name', where:'' },
]
const changes = []
for (const t of tables) {
 const rows = await sql.query(`select ${t.id} as id, ${t.field} as value from ${t.table}${t.where}`, [])
 for (const row of rows) { const value = normalized(row.value); if ((row.value || '') !== value) changes.push({...t,idValue:row.id,oldValue:row.value,newValue:value}) }
}
console.log(JSON.stringify({review: tables.map(t=>({table:t.table,clear:changes.filter(c=>c.table===t.table&&!c.newValue).length,normalize:changes.filter(c=>c.table===t.table&&c.newValue).length})),apply:process.argv.includes('--apply')}))
if (!process.argv.includes('--apply')) process.exit(0)
const backup = `/private/tmp/physez-op-reset-${new Date().toISOString().replaceAll(':','-')}.json`
await writeFile(backup,JSON.stringify(changes,null,2),{mode:0o600})
await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s,[])))
const trusted = new Set((process.env.OWNER_USER_IDS || '').split(',').map(s=>s.trim()).filter(Boolean))
try { const seed = JSON.parse(await readFile('/private/tmp/physez-education-owner.json','utf8')); if (seed.userId) trusted.add(seed.userId) } catch { /* Explicit environment owner IDs may be sufficient. */ }
const statements = changes.map(c=>sql.query(`update ${c.table} set ${c.field}=$1 where ${c.id}=$2 and ${c.field} is not distinct from $3`,[c.newValue,c.idValue,c.oldValue]))
for (const id of trusted) statements.push(sql`update education_profiles set teacher_status='approved',reviewed_by=${id},reviewed_at=now() where user_id=${id} and role='teacher'`)
if (statements.length) await sql.transaction(statements)
console.log(JSON.stringify({applied:changes.length,backup,teacherVerificationMigration:true,variantsAndResultsUnchanged:true}))
