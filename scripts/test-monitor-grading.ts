import assert from 'node:assert/strict'
import { monitorGrade, normalizeMonitorGroup, ASSESSMENT_GROUPS, isAssessmentGroup } from '../src/lib/monitorGrading.ts'
assert.deepEqual(monitorGrade(1, 3, 2), { points: 0.7, percent: 33.33 })
assert.equal(monitorGrade(2, 3, 2).points, 1.3)
assert.equal(monitorGrade(3, 3, 2).points, 2)
assert.equal(monitorGrade(0, 3, 2).points, 0)
assert.deepEqual(monitorGrade(null, 3, 2), { points: null, percent: null })
assert.equal(monitorGrade(3, 3, 2, 90).points, 1.8)
assert.equal(monitorGrade(1, 3, 5).points, 1.7)
assert.equal(normalizeMonitorGroup('B062'), 'В062')
assert.equal(normalizeMonitorGroup('в 064'), 'В064')
assert.equal(normalizeMonitorGroup('Физика'), null)
assert.deepEqual(ASSESSMENT_GROUPS, ['B062', 'B063', 'B064', 'B076', 'B057'])
for (const group of ASSESSMENT_GROUPS) { assert.equal(isAssessmentGroup(group), true); assert.equal(isAssessmentGroup(group.replace('B', 'В')), true) }
for (const group of ['', 'B999', 'B056', 'Физика']) assert.equal(isAssessmentGroup(group), false)
console.log('PASS: grading, tenths rounding, penalties, configurable maximum, active attempts, group normalization')
