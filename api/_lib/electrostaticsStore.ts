import { databaseSql } from './db.js'
import { electroProgress, type ElectroSubmission } from '../../src/lib/electrostaticsSubmission.js'
import type { ElectroNotebook } from '../../src/lib/electrostaticsNotebook.js'
import type { ElectroVariant } from '../../src/lib/electrostatics.js'
export type ElectroScope = { teacherId: string | null; reviewerId: string }
type Raw = { id: string; student_id: string; parameters: ElectroVariant; notebook: ElectroNotebook; snapshot_hash: string; status: ElectroSubmission['status']; review_comment: string; reviewed_at: string | null; created_at: string; review_version: number }
export const electroRecord = (r: Raw) => ({ id:r.id, studentId:r.student_id, variant:r.parameters, notebook:r.notebook, status:r.status, comment:r.review_comment, createdAt:new Date(r.created_at).toISOString(), reviewedAt:r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null, reviewVersion:r.review_version, progress:electroProgress(r.notebook,r.parameters) })
export function createElectroStore(sql: typeof databaseSql) {
  return {
    async expectedStudent(scope: ElectroScope, id: string) {
      const [r]=await sql`select s.id,s.last_name,s.first_name,s.student_group,s.variant_number from student_profiles source join student_profiles s on s.id=coalesce(source.merged_into,source.id) where source.id=${id}::uuid
        and (${scope.teacherId===null} or exists(select 1 from education_profiles ep join student_profiles linked on linked.clerk_id=ep.user_id where coalesce(linked.merged_into,linked.id)=s.id and ep.role='student' and ep.teacher_user_id=${scope.teacherId}))`
      return r ? {id:r.id as string,lastName:r.last_name as string,firstName:r.first_name as string,group:r.student_group as string,variantNumber:r.variant_number as number}:null
    },
    async mine(studentId: string) {
      const [r] = await sql`select * from electrostatics_submissions where student_id in (select id from student_profiles where id=${studentId}::uuid or merged_into=${studentId}::uuid) order by created_at desc,id desc limit 1`
      return r ? electroRecord(r as Raw) : null
    },
    async save(id: string, studentId: string, variant: ElectroVariant, notebook: ElectroNotebook, hash: string) {
      await sql`insert into electrostatics_submissions(id,student_id,variant_number,parameters,notebook,snapshot_hash) values(${id}::uuid,${studentId}::uuid,${variant.number},${JSON.stringify(variant)}::jsonb,${JSON.stringify(notebook)}::jsonb,${hash}) on conflict(id) do nothing`
      const [r] = await sql`select * from electrostatics_submissions where id=${id}::uuid and student_id=${studentId}::uuid and snapshot_hash=${hash}`
      if (!r) throw Error('SNAPSHOT_CONFLICT')
      return electroRecord(r as Raw)
    },
    async list(scope: ElectroScope, page: number, query: string, group: string, status: string, sort: 'name' | 'variant' = 'name', direction: 'asc' | 'desc' = 'asc') {
      const rows = await sql`select s.id,s.last_name,s.first_name,s.student_group,s.variant_number,
        r.id as submission_id,r.status,r.created_at,
        jsonb_array_length(r.notebook->'points') as points_count,
        jsonb_array_length(r.notebook->'axis') as axis_count,
        (ceil((r.parameters->>'voltage')::numeric / (r.parameters->>'interval')::numeric)-1)::int as total_lines,
        (select count(*)::int from (select p->>'level' from jsonb_array_elements(r.notebook->'points') p group by p->>'level' having count(*)>=7) complete_lines) as lines_count
        from student_profiles s
        left join lateral (select * from electrostatics_submissions where student_id in (select id from student_profiles where id=s.id or merged_into=s.id) order by created_at desc,id desc limit 1) r on true
        where s.merged_into is null
        and (${scope.teacherId === null} or exists(select 1 from education_profiles ep join student_profiles linked on linked.clerk_id=ep.user_id where coalesce(linked.merged_into,linked.id)=s.id and ep.role='student' and ep.teacher_user_id=${scope.teacherId}))
        and (${!query} or strpos(lower(s.last_name || ' ' || s.first_name || ' ' || s.student_group || ' ' || s.variant_number::text),lower(${query}))>0)
        and (${!group} or s.student_group=${group})
        and (${!status} or coalesce(r.status,'not-started')=${status})
        order by
        case when ${sort==='variant' && direction==='asc'} then s.variant_number end asc,
        case when ${sort==='variant' && direction==='desc'} then s.variant_number end desc,
        case when ${sort==='name' && direction==='desc'} then lower(s.last_name) end desc,
        lower(s.last_name),lower(s.first_name),s.id limit 51 offset ${page*50}`
      return { hasMore:rows.length>50, students:rows.slice(0,50).map(r=>({ id:r.id, lastName:r.last_name, firstName:r.first_name, group:r.student_group, variantNumber:r.variant_number, submissionId:r.submission_id, status:r.status || 'not-started', createdAt:r.created_at ? new Date(r.created_at).toISOString():null, progress:r.submission_id ? {points:Number(r.points_count),axis:Number(r.axis_count),lines:Number(r.lines_count),totalLines:Number(r.total_lines)}:null })) }
    },
    async detail(scope: ElectroScope, id: string) {
      const [r] = await sql`select r.*,s.last_name,s.first_name,s.student_group,s.variant_number,s.id as canonical_id from electrostatics_submissions r join student_profiles source on source.id=r.student_id join student_profiles s on s.id=coalesce(source.merged_into,source.id) where r.id=${id}::uuid
        and (${scope.teacherId === null} or exists(select 1 from education_profiles ep join student_profiles linked on linked.clerk_id=ep.user_id where coalesce(linked.merged_into,linked.id)=s.id and ep.role='student' and ep.teacher_user_id=${scope.teacherId}))`
      if(!r)return null
      const history=await sql`select h.id,h.created_at,h.status from electrostatics_submissions h join student_profiles source on source.id=h.student_id join student_profiles s on s.id=coalesce(source.merged_into,source.id) where s.id=${r.canonical_id}::uuid and (${scope.teacherId===null} or exists(select 1 from education_profiles ep join student_profiles linked on linked.clerk_id=ep.user_id where coalesce(linked.merged_into,linked.id)=s.id and ep.role='student' and ep.teacher_user_id=${scope.teacherId})) order by h.created_at desc,h.id desc limit 20`
      return { submission:electroRecord(r as Raw), student:{ id:r.canonical_id, lastName:r.last_name, firstName:r.first_name, group:r.student_group, variantNumber:r.variant_number },history:history.map(h=>({id:h.id,createdAt:new Date(h.created_at).toISOString(),status:h.status})) }
    },
    async review(scope: ElectroScope, id: string, version: number, status: string, comment: string) {
      const [r] = await sql`update electrostatics_submissions r set status=${status},review_comment=${comment},reviewed_by=${scope.reviewerId},reviewed_at=now(),review_version=review_version+1
        where r.id=${id}::uuid and r.review_version=${version}
        and (${scope.teacherId === null} or exists(select 1 from student_profiles source join student_profiles s on s.id=coalesce(source.merged_into,source.id) join student_profiles linked on coalesce(linked.merged_into,linked.id)=s.id join education_profiles ep on ep.user_id=linked.clerk_id where source.id=r.student_id and ep.role='student' and ep.teacher_user_id=${scope.teacherId})) returning r.*`
      return r ? electroRecord(r as Raw):null
    },
  }
}
export const electroStore = createElectroStore(databaseSql)
