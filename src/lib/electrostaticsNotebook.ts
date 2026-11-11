import { SHEET, potentialLevels, type ElectroVariant, type Reading } from './electrostatics.js'
export type AxisReading = { x: number; y: number; potential: number }
export type FieldPair = { a: Reading; b: Reading; answer: string }
export type ElectroNotebook = { version: 1; points: Reading[]; axis: AxisReading[]; pairs: FieldPair[]; conclusion: string; answers: string[] }
export const emptyElectroNotebook = (): ElectroNotebook => ({ version: 1, points: [], axis: [], pairs: [], conclusion: '', answers: Array(9).fill('') })
export function validElectroNotebook(data: unknown, v: ElectroVariant): data is ElectroNotebook {
  if (!data || typeof data !== 'object') return false
  const d = data as ElectroNotebook, levels = potentialLevels(v)
  const reading = (p: AxisReading) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.potential) && p.x >= 0 && p.x <= SHEET.width && p.y >= 0 && p.y <= SHEET.height && p.potential >= 0 && p.potential <= v.voltage
  const point = (p: Reading) => reading(p) && levels.includes(p.level)
  return d.version === 1 && Array.isArray(d.points) && d.points.length <= 200 && d.points.every(point) && Array.isArray(d.axis) && d.axis.length <= 100 && d.axis.every(reading) && Array.isArray(d.pairs) && d.pairs.length <= 40 && d.pairs.every(p => p && point(p.a) && point(p.b) && typeof p.answer === 'string' && p.answer.length <= 30) && typeof d.conclusion === 'string' && d.conclusion.length <= 10000 && Array.isArray(d.answers) && d.answers.length === 9 && d.answers.every(s => typeof s === 'string' && s.length <= 3000)
}

export const ELECTRO_QUESTIONS = ['Сформулируйте закон Кулона.', 'Какими свойствами обладает электрический заряд?', 'Что такое напряжённость и силовая линия?', 'Сформулируйте принцип суперпозиции электрических полей.', 'Что называют потенциалом электрического поля?', 'Как связаны напряжённость и потенциал? Объясните знак минус.', 'Что такое эквипотенциальная поверхность?', 'Чему равна работа при перемещении заряда по эквипотенциальной линии?', 'Опишите метод зонда и порядок выполнения этого опыта.']
