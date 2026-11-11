import assert from 'node:assert/strict'
import { activeElectroPractice, parseElectroVariantNumber } from '../src/lib/electrostaticsSelection'

for (const [text, expected] of [['1', 1], [' 24 ', 24], ['600', 600], ['1000000', 1_000_000]] as const) assert.equal(parseElectroVariantNumber(text), expected)
for (const text of ['', '0', '-1', '1.5', '1,5', '1e3', 'Infinity', 'NaN', '1000001', 'номер 24']) assert.equal(parseElectroVariantNumber(text), null)
const selected = { userId: 'account-a', studentId: 'student-a', number: 315 }
assert.equal(activeElectroPractice(selected, 'account-a', 'student-a', true), 315)
assert.equal(activeElectroPractice(selected, 'account-a', 'student-a', false), null, 'Loss of PRO immediately restores assigned mode')
assert.equal(activeElectroPractice(selected, 'account-b', 'student-a', true), null, 'Account changes cannot inherit a previous custom choice')
assert.equal(activeElectroPractice(selected, 'account-a', 'student-b', true), null, 'Student changes cannot inherit a previous custom choice')
assert.equal(activeElectroPractice(selected, null, 'student-a', true), null)
assert.equal(activeElectroPractice(null, 'account-a', 'student-a', true), null)
assert.equal(selected.number, 315, 'Restoring assigned mode leaves the previous selection untouched')
console.log('PASS: variant number boundaries, PRO loss, account/profile isolation and assigned-mode reset')
