import { normalizeMonitorGroup } from './monitorGrading'

export type OberbeckListSort = 'newest' | 'oldest' | 'name' | 'group'
type Row = { id: string; code: string; createdAt: string; student: { lastName: string; firstName: string; group: string; variantNumber?: number } }
const compare = (a: string, b: string) => a.localeCompare(b, 'ru', { numeric: true, sensitivity: 'base' })
export const oberbeckGroup = (value: string) => (normalizeMonitorGroup(value) ?? value.trim()).replace(/^В(?=\d{3}$)/u, 'B')

export function oberbeckGroups(rows: readonly Row[]) {
  return [...new Set(rows.map(row => oberbeckGroup(row.student.group)).filter(Boolean))].sort(compare)
}

export function filterOberbeckVariants<T extends Row>(rows: readonly T[], query: string, group: string, sort: OberbeckListSort): T[] {
  const search = query.trim().toLocaleLowerCase('ru')
  const searchGroup = normalizeMonitorGroup(query)
  return rows.filter(row => {
    if (group && oberbeckGroup(row.student.group) !== oberbeckGroup(group)) return false
    return !search || `${row.student.lastName} ${row.student.firstName} ${row.student.group} ${row.student.variantNumber ?? ''} ${row.code}`.toLocaleLowerCase('ru').includes(search)
      || Boolean(searchGroup && oberbeckGroup(row.student.group) === oberbeckGroup(searchGroup))
  }).sort((a, b) => {
    const name = () => compare(`${a.student.lastName} ${a.student.firstName}`, `${b.student.lastName} ${b.student.firstName}`) || compare(a.id, b.id)
    if (sort === 'name') return name()
    if (sort === 'group') return compare(oberbeckGroup(a.student.group), oberbeckGroup(b.student.group)) || name()
    const difference = (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
    return (sort === 'oldest' ? difference : -difference) || name()
  })
}
