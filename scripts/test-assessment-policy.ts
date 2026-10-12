import assert from 'node:assert/strict'
import { assessmentPenalty, type AssessmentEvent, type AssessmentPolicy } from '../src/lib/assessmentPolicy.ts'

const policy: AssessmentPolicy = { version: 1 }
const event = (type: string, seconds: number): AssessmentEvent => ({ type, at: new Date(1_700_000_000_000 + seconds * 1000).toISOString() })
const penalty = (events: AssessmentEvent[]) => assessmentPenalty(policy, events, 3)
assert.equal(assessmentPenalty(undefined, [event('copy', 0), event('copy', 20)], 3).finalPercent, 100)
assert.equal(penalty([event('tab-hidden', 0), event('fullscreen-exit', 1)]).penaltyPoints, 0)
assert.equal(penalty([event('tab-hidden', 0), event('fullscreen-exit', 11)]).penaltyPoints, 1)
assert.equal(penalty([event('copy', 0), event('paste', 1), event('copy', 20)]).penaltyPoints, 2)
assert.equal(penalty([event('tab-hidden', 0), event('copy', 12)]).penaltyPoints, 0)
assert.equal(penalty([event('tab-hidden', 0), event('fullscreen-exit', 8), event('tab-hidden', 16)]).penaltyPoints, 1)
assert.equal(penalty([event('selection', 0), event('screenshot', 20), event('context-menu', 40)]).penaltyPoints, 0)
assert.equal(penalty(Array.from({ length: 20 }, (_, i) => event('copy', i * 11))).penaltyPoints, 10)
const mixed = [event('tab-hidden', 0), event('copy', 0), event('tab-hidden', 20), event('paste', 20)]
assert.equal(penalty(mixed).finalPercent, 97)
assert.equal(penalty(mixed.reverse()).finalPercent, 97)
assert.equal(assessmentPenalty(policy, mixed, 0).finalPercent, 0)
assert.equal(assessmentPenalty(policy, mixed, null).finalPercent, null)
assert.equal(assessmentPenalty(policy, mixed, 2).finalPercent, 63.67)
const waived = assessmentPenalty({ version: 1, waiver: { reason: 'Технический сбой', actor: 'user_test', at: new Date().toISOString() } }, mixed, 3)
assert.equal(waived.penaltyPoints, 0)
assert.equal(waived.calculatedPenaltyPoints, 3)
assert.equal(waived.finalPercent, 100)
console.log('PASS: legacy attempts, warnings, episode grouping, category separation, cap, score floor, waiver and final percentage')
