import assert from 'node:assert/strict'
import { THEORY, createMidtermVariant, midtermTasks, midtermExpected, midtermFingerprint, gradeMidterm, reviewMidterm, type MidtermAnswers, type MidtermVariant } from '../api/_lib/midtermAssessment.js'
import { assessmentPenalty } from '../src/lib/assessmentPolicy.js'
import { createVariant, gradeVariant } from '../api/_lib/mechanicsAssessment.js'
import { canRestartAssessment } from '../api/_lib/assessmentAccess.js'

function answerSet(v: MidtermVariant): MidtermAnswers {
  const answers: MidtermAnswers = Object.fromEntries(Object.entries(midtermExpected(v)).map(([task, fields]) => [task, Object.fromEntries(Object.entries(fields).map(([id, f]) => [id, f.value.toFixed(2).replace('.', ',')]))]))
  // The bank stores a/b as true statements, but public choice IDs are shuffled positions.
  v.theory.forEach((entry, i) => { answers[`theory${i + 1}`] = { selection: ['a', 'b'].map(id => `choice${entry.order.indexOf(id) + 1}`).sort().join(',') } })
  return answers
}
const fingerprints = new Set<string>()
const seenQuestions = new Set<string>()
assert.deepEqual(THEORY.map(bank => bank.length), [10, 10, 10])
assert.equal(new Set(THEORY.flat().map(q => q.id)).size, 30)
for (const [bankIndex, bank] of THEORY.entries()) for (const question of bank) {
  assert.equal(question.options.length, 4)
  assert.equal(new Set(question.options.map(o => o.id)).size, 4)
  assert.ok(question.correct.length >= 2 && question.correct.length < 4)
  for (const language of ['ru', 'kk'] as const) {
    assert.ok(question.text[language].trim())
    assert.equal(new Set(question.options.map(o => o.text[language])).size, 4)
    assert.ok(question.options.every(o => o.text[language].trim()))
  }
  const v = createMidtermVariant()
  const order = [...question.options.map(o => o.id)].reverse()
  v.theory[bankIndex] = { bankId: question.id, order }
  const taskId = `theory${bankIndex + 1}`
  // Exercise every possible subset, not only the expected selection.
  for (let mask = 0; mask < 16; mask++) {
    const selected = order.map((id, i) => ({ id, i })).filter(({ i }) => mask & (1 << i))
    const correct = selected.length === question.correct.length && selected.every(({ id }) => question.correct.includes(id))
    const answers = { [taskId]: { selection: selected.map(({ i }) => `choice${i + 1}`).join(',') } }
    assert.equal(gradeMidterm(v, answers).score, correct ? 1 : 0, `${question.id}: subset ${mask}`)
    for (const language of ['ru', 'kk'] as const) {
      const task = midtermTasks(v, language).find(t => t.id === taskId)!
      assert.ok(task.text.includes(question.text[language]))
      const field = reviewMidterm(v, answers, language).fields.find(f => f.taskId === taskId)!
      assert.equal(field.correct, correct)
      assert.ok(question.correct.every(id => String(field.expected).includes(question.options.find(o => o.id === id)!.text[language])))
    }
  }
}
assert.ok(['newton-first', 'newton-second', 'newton-third'].every(id => THEORY[0].some(q => q.id === id)))
for (let n = 0; n < 1000; n++) {
  const v = createMidtermVariant(), expected = midtermExpected(v), answers = answerSet(v)
  v.theory.forEach(entry => seenQuestions.add(entry.bankId))
  const fingerprint = midtermFingerprint(v)
  assert.ok(fingerprint.length <= 255)
  assert.ok(!fingerprints.has(fingerprint)); fingerprints.add(fingerprint)
  for (const lang of ['ru', 'kk'] as const) {
    const tasks = midtermTasks(v, lang)
    assert.equal(tasks.length, 7)
    assert.equal(tasks.filter(t => t.kind === 'numeric').length, 4)
    assert.equal(tasks.filter(t => t.kind === 'multiple').length, 3)
    assert.equal(tasks.reduce((sum, t) => sum + t.points, 0), 8)
    assert.equal(tasks[6].diagram, 'molecule')
    assert.deepEqual(tasks.map(t => t.points), [1, 1, 1, 1, 1, 1, 2])
    assert.ok(!tasks.some(t => t.id === 'circle'))
    assert.ok(tasks.slice(0, 3).every(t => t.kind === 'multiple' && t.options?.length === 4 && t.fields.length === 1))
    assert.ok(tasks.slice(3).every(t => t.kind === 'numeric'))
    assert.ok(!/expected|correct|bankId/.test(JSON.stringify(tasks)), 'Student payload cannot include answer keys')
    assert.equal(reviewMidterm(v, answers, lang).fields.length, 14)
  }
  assert.equal(gradeMidterm(v, answers).score, 8)
  assert.ok(gradeMidterm(v, answers).correctness.every(Boolean))
  assert.equal(gradeMidterm(v, {}).score, 0)
  assert.equal(gradeMidterm(v, { throw: { t1: '', t2: ' ', height: '' } }).score, 0)
  assert.equal(gradeMidterm(v, { throw: { t1: answers.throw.t1 } }).score, .25)
  assert.equal(gradeMidterm(v, { theory1: { selection: 'choice1,choice2,choice3,choice4' } }).score, 0)
  const right = String(answers.theory1.selection)
  assert.equal(gradeMidterm(v, { theory1: { selection: right + ',' + right } }).score, 0)
  assert.equal(gradeMidterm(v, { theory1: { selection: right } }).score, 1)
  const times = [expected.throw.t1.value, expected.throw.t2.value]
  times.forEach(t => assert.ok(Math.abs(v.throw.v * t - 9.81 * t * t / 2 - v.throw.h) < 1e-9))
  assert.ok(times[0] > 0 && times[1] > times[0])
  const b = v.blocks, acceleration = expected.blocks.acceleration.value
  assert.ok('mass' in b)
  const tension1 = expected.blocks.tension1.value, tension2 = expected.blocks.tension2.value
  assert.ok(Math.abs(tension2 - tension1 - b.mass * acceleration) < 1e-10)
  assert.ok(Math.abs(tension1 - b.m1 * 9.81 - b.m1 * acceleration) < 1e-10)
  assert.ok(Math.abs(b.m2 * 9.81 - tension2 - b.m2 * acceleration) < 1e-10)
  const d = v.collision, speed = expected.collision.velocity.value
  assert.ok(Math.abs(d.m1 * d.v1 + d.m2 * d.v2 - (d.m1 + d.m2) * speed) < 1e-9)
  assert.ok(Math.abs(expected.collision.loss.value - d.m1 * d.m2 / (2 * (d.m1 + d.m2)) * (d.v1 - d.v2) ** 2) < 1e-8)
  // Independently sum the tensor from atom coordinates relative to the actual centre of mass.
  const m = v.molecule, l = m.length * 1e-9, half = m.angle * Math.PI / 360
  const atoms = [{ mass: m.a * 1.67e-27, x: 0, y: 0 }, ...[-1, 1].map(sign => ({ mass: m.b * 1.67e-27, x: sign * l * Math.sin(half), y: -l * Math.cos(half) }))]
  const cm = atoms.reduce((sum, a) => sum + a.mass * a.y, 0) / atoms.reduce((sum, a) => sum + a.mass, 0)
  const jx = atoms.reduce((sum, a) => sum + a.mass * (a.y - cm) ** 2, 0) / 1e-47
  const jy = atoms.reduce((sum, a) => sum + a.mass * a.x ** 2, 0) / 1e-47
  assert.ok(Math.abs(expected.molecule.jx.value - jx) < 1e-9)
  assert.ok(Math.abs(expected.molecule.jy.value - jy) < 1e-9)
  assert.ok(Math.abs(expected.molecule.jz.value - jx - jy) < 1e-9)
}
assert.equal(seenQuestions.size, 30, 'Random issuance reaches every question in the expanded bank')
assert.equal(assessmentPenalty({ version: 1 }, [], 8, 8).finalPercent, 100)
assert.equal(assessmentPenalty({ version: 1 }, [], 4, 8).finalPercent, 50)
assert.equal(assessmentPenalty({ version: 1 }, [], 1.3, 8).finalPercent, 16.25)
assert.equal(assessmentPenalty(undefined, [], 1).finalPercent, 33.33)
assert.equal(gradeVariant(createVariant(), {}).score, 0)
const legacy = { ...createMidtermVariant(), revision: undefined, blocks: { m1: 2, m2: 6, force: 20 } }
assert.equal(midtermExpected(legacy).blocks.acceleration.value, 2.5)
assert.equal(midtermExpected(legacy).blocks.tension.value, 15)
assert.equal(midtermTasks(legacy).find(t => t.id === 'blocks')!.fields.length, 2)
assert.equal(gradeMidterm(legacy, { blocks: { acceleration: '2,5', tension: '15' } }).score, 1)
assert.equal(midtermTasks(legacy).length, 8)
assert.equal(gradeMidterm(legacy, answerSet(legacy)).score, 8)
assert.deepEqual(midtermTasks(legacy).map(t => t.points), [.5, .5, .5, .8, 1, 1.2, 1.5, 2])
const book = { ...createMidtermVariant(), blocks: { mass: 4, m1: 1, m2: 2 } }
assert.ok(Math.abs(midtermExpected(book).blocks.acceleration.value - 9.81 / 7) < 1e-12)
for (const user of [null, { userId: 'fixture', email: '', isPremium: false }, { userId: 'fixture', email: '', isPremium: true }]) assert.equal(canRestartAssessment('midterm', user), false)
assert.equal(canRestartAssessment('midterm', { userId: 'fixture', email: '', isPremium: false, accessRole: 'admin' }), true)
assert.equal(canRestartAssessment('mechanics', { userId: 'fixture', email: '', isPremium: true }), true)
console.log('PASS: all 30 bilingual theory questions, every answer subset, Newton I/II/III, random coverage; 1000 unique variants; 8-point grading; physics checks; no answer leakage; legacy scoring preserved')
