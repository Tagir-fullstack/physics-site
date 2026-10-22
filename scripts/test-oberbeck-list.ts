import assert from 'node:assert/strict'
import { filterOberbeckVariants, oberbeckGroups, oberbeckGroup } from '../src/lib/oberbeckVariantList.ts'

const rows = [
  { id: 'a', code: 'OB-AA', createdAt: '2026-10-18T00:00:00Z', student: { lastName: 'Яковлев', firstName: 'Антон', group: 'В062' } },
  { id: 'b', code: 'OB-BB', createdAt: '2026-10-20T00:00:00Z', student: { lastName: 'Абилов', firstName: 'Бек', group: 'B076' } },
  { id: 'c', code: 'OB-CC', createdAt: '2026-10-19T00:00:00Z', student: { lastName: 'Беков', firstName: 'Иван', group: 'b062' } },
  { id: 'd', code: 'OB-DD', createdAt: '2026-10-20T01:00:00Z', student: { lastName: 'Айтбаев', firstName: 'Ерлан', group: 'B057' } },
]
const snapshot = structuredClone(rows)
const ids = (query = '', group = '', sort: Parameters<typeof filterOberbeckVariants>[3] = 'newest') => filterOberbeckVariants(rows, query, group, sort).map(row => row.id)
assert.deepEqual(ids(), ['d', 'b', 'c', 'a'])
assert.deepEqual(ids('', '', 'oldest'), ['a', 'c', 'b', 'd'])
assert.deepEqual(ids('', '', 'name'), ['b', 'd', 'c', 'a'])
assert.deepEqual(ids('', '', 'group'), ['d', 'c', 'a', 'b'])
assert.deepEqual(oberbeckGroups(rows), ['B057', 'B062', 'B076'])
assert.equal(oberbeckGroup('в 062'), 'B062')
assert.equal(oberbeckGroup('Другая ОП'), 'Другая ОП')
assert.deepEqual(ids('', 'B062'), ['c', 'a'])
assert.deepEqual(ids('', 'В062', 'name'), ['c', 'a'])
assert.deepEqual(ids(' b 062 '), ['c', 'a'])
assert.deepEqual(ids('яКоВлЕв', 'B062'), ['a'])
assert.deepEqual(ids('яковлев', 'B076'), [])
assert.deepEqual(ids('ob-cc'), ['c'])
assert.deepEqual(ids('Ерлан'), ['d'])
assert.deepEqual(ids('несуществующий'), [])
assert.deepEqual(filterOberbeckVariants([], '', '', 'name'), [])
assert.deepEqual(rows, snapshot, 'Sorting must not mutate loaded records')
console.log('PASS: four sort orders, combined search/group filter, B/В normalization, unique groups, empty results and original data preserved')
