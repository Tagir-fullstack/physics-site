import { UNIVERSITIES } from '../data/universities.js'
import { ASSESSMENT_GROUPS, normalizeMonitorGroup } from './monitorGrading.js'

export type EducationDraft = {
  role: 'student' | 'teacher'; universityId: string; institution: string
  firstName: string; lastName: string; group: string; teacherId: string; department?: string
}
export type EducationProfile = EducationDraft & { userId: string; displayName: string; teacherName?: string; className?: string; teacherStatus?: 'pending' | 'approved' | 'rejected'; verificationNote?: string; needsTeacher?: boolean }
export type DirectoryTeacher = { id: string; name: string }
const clean = (v: unknown, max: number) => typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
export function validateEducation(input: Record<string, unknown>): EducationDraft {
  if (!['student', 'teacher'].includes(String(input.role))) throw Error('Выберите роль.')
  const role = input.role as EducationDraft['role']
  const universityId = clean(input.universityId, 80)
  const university = UNIVERSITIES.find(u => u.id === universityId)
  if (!university && universityId !== 'other') throw Error('Выберите вуз из списка или укажите другой.')
  const institution = university?.name || clean(input.institution, 255)
  if (institution.length < 3) throw Error('Введите название учебного заведения.')
  const firstName = clean(input.firstName, 60), lastName = clean(input.lastName, 60)
  if (firstName.length < 2 || lastName.length < 2 || ![firstName,lastName].every(name => /^[\p{L}\p{M} '’.-]+$/u.test(name))) throw Error('Укажите фамилию и имя.')
  const group = normalizeMonitorGroup(clean(input.group, 40))?.replace('В', 'B') || '', teacherId = clean(input.teacherId, 128)
  if (role === 'student' && !ASSESSMENT_GROUPS.includes(group as typeof ASSESSMENT_GROUPS[number])) throw Error('Выберите ОП из списка: B062, B063, B064, B076 или B057.')
  const department = clean(input.department, 160)
  if (role === 'teacher' && department.length < 3) throw Error('Укажите кафедру или подразделение для подтверждения преподавателя.')
  return { role, universityId, institution, firstName, lastName, group: role === 'student' ? group : '', teacherId: role === 'student' ? teacherId : '', department: role === 'teacher' ? department : '' }
}
