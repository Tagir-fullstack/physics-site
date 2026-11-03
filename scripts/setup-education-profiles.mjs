import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'
import { createHash, randomBytes } from 'node:crypto'
const connection = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL
if (!connection) throw Error('Database not configured')
const sql = neon(connection)
const migration = await readFile(new URL('./sql/education-profiles.sql', import.meta.url), 'utf8') + '\n' + await readFile(new URL('./sql/teacher-verification.sql', import.meta.url), 'utf8')
await sql.transaction(migration.split(';').map(s => s.trim()).filter(Boolean).map(s => sql.query(s, [])))
// Optional explicit owner seed. Never infer a teacher from a student's submitted name.
const userId = process.env.EDUCATION_SEED_TEACHER_ID
if (userId) {
 if (!/^user_[A-Za-z0-9]+$/.test(userId)) throw Error('Invalid teacher account ID')
 const hex = createHash('sha256').update('physez-education:' + userId).digest('hex')
 const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`
 await sql.transaction([
  sql`insert into teacher_classes(id,owner_clerk_id,name,subject,invite_code) values(${id},${userId},'Студенты · Аймұрза Тагир Айбекұлы','Физика',${randomBytes(6).toString('hex').toUpperCase()}) on conflict(id) do nothing`,
  sql`insert into education_profiles(user_id,role,university_id,institution,display_name,first_name,last_name,default_class_id,teacher_status) values(${userId},'teacher','satbayev','Satbayev University — университет имени К. И. Сатпаева','Аймұрза Тагир Айбекұлы','Тагир Айбекұлы','Аймұрза',${id},'approved') on conflict(user_id) do nothing`,
 ])
}
console.log(JSON.stringify({migration:'education-profiles',seededTeacher:Boolean(userId),existingClassesUnchanged:true}))
