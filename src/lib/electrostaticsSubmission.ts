import { electroVariant, electrodeAt, fieldEstimate, potentialLevels, type ElectroVariant } from './electrostatics.js'
import { validElectroNotebook, type ElectroNotebook } from './electrostaticsNotebook.js'
import type { StudentProfile } from './studentProfile.js'
export type ElectroReviewStatus = 'submitted' | 'accepted' | 'revision'
export type ElectroProgress = { points: number; lines: number; totalLines: number; axis: number; pairs: number; calculations: number; answered: number; conclusion: boolean }
export type ElectroSubmission = { id: string; studentId: string; variant: ElectroVariant; notebook: ElectroNotebook; status: ElectroReviewStatus; comment: string; createdAt: string; reviewedAt: string | null; reviewVersion: number; progress: ElectroProgress }
export type ElectroMonitorRow = StudentProfile & { submissionId: string | null; status: ElectroReviewStatus | 'not-started'; createdAt: string | null; progress: Pick<ElectroProgress, 'points' | 'lines' | 'totalLines' | 'axis'> | null }
export const ELECTRO_STATUS: Record<ElectroReviewStatus | 'not-started', string> = { submitted: 'Отправлено', accepted: 'Принято', revision: 'На доработку', 'not-started': 'Не отправлено' }
export function electroProgress(n: ElectroNotebook, v: ElectroVariant): ElectroProgress {
  return { points: n.points.length, lines: potentialLevels(v).filter(l => n.points.filter(p => p.level === l).length >= 7).length, totalLines: potentialLevels(v).length, axis: n.axis.length, pairs: n.pairs.length, calculations: n.pairs.filter(p => { const expected = fieldEstimate(p.a,p.b), value = Number(p.answer.replace(',','.')); return p.answer.trim() && expected && Number.isFinite(value) && Math.abs(value-expected.field)<=Math.max(1,expected.field*.05) }).length, answered: n.answers.filter(a=>a.trim()).length, conclusion: !!n.conclusion.trim() }
}
export function validateElectroSubmission(value: unknown, number: number): ElectroNotebook {
  const variant = electroVariant(number)
  if (!validElectroNotebook(value, variant)) throw Error('Некорректные или слишком большие данные работы.')
  const n = value
  const key = (p: {x:number;y:number;level:number;potential:number}) => [p.x,p.y,p.level,p.potential].join(':')
  if (n.points.some((p,i) => electrodeAt(variant,p)!==null || Math.abs(p.potential-p.level)>.100001 || n.points.slice(0,i).some(q=>q.level===p.level && Math.hypot(q.x-p.x,q.y-p.y)<3))) throw Error('Проверьте точки: они должны лежать вне электродов, соответствовать уровню и не дублироваться.')
  if (n.axis.some((p,i)=>Math.abs(p.x-90)>.5 || n.axis.slice(0,i).some(q=>Math.abs(q.y-p.y)<1))) throw Error('Проверьте отсчёты на центральной оси.')
  const points = new Set(n.points.map(key))
  if (n.pairs.some(p=>!points.has(key(p.a)) || !points.has(key(p.b)) || Math.abs(Math.abs(p.a.level-p.b.level)-variant.interval)>1e-8 || !fieldEstimate(p.a,p.b))) throw Error('Участки напряжённости должны соединять записанные точки соседних уровней.')
  if (!n.points.length && !n.axis.length && !n.pairs.length && !n.conclusion.trim() && !n.answers.some(a=>a.trim())) throw Error('Сначала запишите измерения или ответы. Пустую работу отправить нельзя.')
  return structuredClone(n)
}
