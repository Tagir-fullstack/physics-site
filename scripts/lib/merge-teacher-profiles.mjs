import {writeFile} from 'node:fs/promises'
export async function mergeTeacherProfiles(sql,primaryNumber,secondaryNumber,{apply=false,backupDirectory='/private/tmp'}={}) {
 if(!Number.isSafeInteger(primaryNumber)||!Number.isSafeInteger(secondaryNumber)||primaryNumber<1||secondaryNumber<1||primaryNumber===secondaryNumber)throw Error('Choose two different positive variant numbers')
 const profiles=await sql`select * from student_profiles where variant_number in (${primaryNumber},${secondaryNumber})`
 const primary=profiles.find(p=>p.variant_number===primaryNumber),secondary=profiles.find(p=>p.variant_number===secondaryNumber)
 if(!primary?.clerk_id||!secondary?.clerk_id||primary.clerk_id===secondary.clerk_id)throw Error('Two distinct account-linked profiles are required')
 const education=await sql`select * from education_profiles where user_id in (${primary.clerk_id},${secondary.clerk_id})`
 const target=education.find(e=>e.user_id===primary.clerk_id),source=education.find(e=>e.user_id===secondary.clerk_id)
 if(primary.merged_into||target?.merged_into_user_id)throw Error('Primary profile must not be merged')
 if(secondary.merged_into===primary.id&&source?.merged_into_user_id===primary.clerk_id)return {alreadyMerged:true,primaryNumber,secondaryNumber}
 if(secondary.merged_into||source?.merged_into_user_id||target?.role!=='teacher'||source?.role!=='teacher'||target.teacher_status!=='approved'||source.teacher_status!=='approved')throw Error('Only two unmerged approved teacher profiles can be consolidated')
 const classes=await sql`select * from teacher_classes where owner_clerk_id in (${primary.clerk_id},${secondary.clerk_id})`
 const tests=await sql`select * from teacher_tests where owner_clerk_id in (${primary.clerk_id},${secondary.clerk_id})`
 const assignments=await sql`select * from test_assignments where owner_clerk_id in (${primary.clerk_id},${secondary.clerk_id})`
 const students=await sql`select * from education_profiles where teacher_user_id in (${primary.clerk_id},${secondary.clerk_id})`
 const variants=await sql`select * from oberbeck_variants where student_id in (${primary.id}::uuid,${secondary.id}::uuid)`
 const [attempts]=await sql`select count(*)::int as count from teacher_test_attempts a join test_assignments t on t.id=a.assignment_id where t.owner_clerk_id in (${primary.clerk_id},${secondary.clerk_id})`
 const summary={primaryNumber,secondaryNumber,name:target.display_name,students:students.length,classes:classes.length,tests:tests.length,assignments:assignments.length,attempts:attempts.count,variants:variants.length}
 if(!apply)return {...summary,apply:false}
 const backup=`${backupDirectory}/physez-teacher-merge-${primaryNumber}-${secondaryNumber}-${Date.now()}.json`
 await writeFile(backup,JSON.stringify({profiles,education,classes,tests,assignments,students,variants,summary},null,2),{mode:0o600,flag:'wx'})
 await sql.transaction([
  sql`select id from student_profiles where id in (${primary.id}::uuid,${secondary.id}::uuid) order by id for update`,
  sql`select user_id from education_profiles where user_id in (${primary.clerk_id},${secondary.clerk_id}) order by user_id for update`,
  sql`select 1/(case when (select count(*) from student_profiles where id in (${primary.id}::uuid,${secondary.id}::uuid) and merged_into is null)=2 and (select count(*) from education_profiles where user_id in (${primary.clerk_id},${secondary.clerk_id}) and role='teacher' and teacher_status='approved' and merged_into_user_id is null)=2 then 1 else 0 end) as merge_guard`,
  sql`update student_profiles set merged_into=${primary.id}::uuid,updated_at=now() where id=${secondary.id}::uuid`,
  sql`update teacher_classes set owner_clerk_id=${primary.clerk_id},updated_at=now() where owner_clerk_id=${secondary.clerk_id}`,
  sql`update teacher_tests set owner_clerk_id=${primary.clerk_id},updated_at=now() where owner_clerk_id=${secondary.clerk_id}`,
  sql`update test_assignments set owner_clerk_id=${primary.clerk_id} where owner_clerk_id=${secondary.clerk_id}`,
  sql`update education_profiles set teacher_user_id=${primary.clerk_id},updated_at=now() where teacher_user_id=${secondary.clerk_id}`,
  sql`update education_profiles set merged_into_user_id=${primary.clerk_id},updated_at=now() where user_id=${secondary.clerk_id}`,
 ])
 return {...summary,apply:true,backup}
}
