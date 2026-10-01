import { randomBytes, randomInt } from 'node:crypto'

export const ASSESSMENT_KEY = 'mechanics-cut-v2'
export const ASSESSMENT_DURATION_MS = 30 * 60 * 1000

export type StudentIdentity = {
  lastName: string
  firstName: string
  group: string
}

export type MechanicsVariant = {
  student?: StudentIdentity
  relativeMotion: {
    v1: number
    v2: number
    angle: number
    expectedAcute: number
    expectedObtuse: number
  }
  incline: { length: number; time: number; angle: number; expected: number }
  skaters: { m1: number; m2: number; ropeSpeed: number; expected1: number; expected2: number }
}

export type PublicTask = {
  id: 'relativeMotion' | 'incline' | 'skaters'
  order: number
  title: string
  text: string
  fields: Array<{ id: string; label: string; unit: string; step: string }>
}

const pick = <T>(items: readonly T[]): T => items[randomInt(items.length)]
const round = (value: number, digits = 4) => Number(value.toFixed(digits))

export function createVariant(): MechanicsVariant {
  const angle = pick([30, 45, 60, 75] as const)
  const v1 = randomInt(9, 23) * 5
  let v2 = randomInt(8, 22) * 5
  if (v2 === v1) v2 += 5
  const angleRad = (angle * Math.PI) / 180
  const relativeExpectedAcute = Math.sqrt(
    v1 ** 2 + v2 ** 2 - 2 * v1 * v2 * Math.cos(angleRad)
  )
  const relativeExpectedObtuse = Math.sqrt(
    v1 ** 2 + v2 ** 2 + 2 * v1 * v2 * Math.cos(angleRad)
  )

  const inclineAngle = randomInt(18, 34)
  const length = randomInt(15, 41) / 10
  const inclineRad = (inclineAngle * Math.PI) / 180
  const maxTargetFriction = Math.min(0.35, Math.tan(inclineRad) - 0.04)
  const targetFriction = randomInt(8, Math.floor(maxTargetFriction * 100)) / 100
  const targetAcceleration = 9.81 * (
    Math.sin(inclineRad) - targetFriction * Math.cos(inclineRad)
  )
  const time = Math.round(Math.sqrt((2 * length) / targetAcceleration) * 100) / 100
  const acceleration = (2 * length) / time ** 2
  const friction = (9.81 * Math.sin(inclineRad) - acceleration) / (9.81 * Math.cos(inclineRad))

  const m1 = randomInt(9, 20) * 5
  let m2 = randomInt(8, 19) * 5
  if (m2 === m1) m2 += 5
  const ropeSpeed = randomInt(6, 16) / 10
  const skater1Expected = (m2 * ropeSpeed) / (m1 + m2)
  const skater2Expected = (m1 * ropeSpeed) / (m1 + m2)

  return {
    relativeMotion: {
      v1,
      v2,
      angle,
      expectedAcute: round(relativeExpectedAcute),
      expectedObtuse: round(relativeExpectedObtuse),
    },
    incline: { length, time, angle: inclineAngle, expected: round(friction) },
    skaters: {
      m1,
      m2,
      ropeSpeed,
      expected1: round(skater1Expected),
      expected2: round(skater2Expected),
    },
  }
}

export function variantFingerprint(variant: MechanicsVariant): string {
  const a = variant.relativeMotion
  const b = variant.incline
  const c = variant.skaters
  return [a.v1, a.v2, a.angle, b.length, b.time, b.angle, c.m1, c.m2, c.ropeSpeed].join('-')
}

export function createVariantCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

export function publicTasks(variant: MechanicsVariant): PublicTask[] {
  const a = variant.relativeMotion
  const b = variant.incline
  const c = variant.skaters
  return [
    {
      id: 'relativeMotion',
      order: 1,
      title: 'Относительное движение',
      text: `Две прямые дороги пересекаются под углом ${a.angle}°. От перекрёстка одновременно удаляются два автомобиля: первый со скоростью ${a.v1} км/ч, второй — ${a.v2} км/ч. Найдите скорости удаления автомобилей для двух возможных направлений движения: когда угол между их скоростями равен ${a.angle}° и когда он равен ${180 - a.angle}°.`,
      fields: [
        { id: 'speedAcute', label: `Скорость при угле ${a.angle}°`, unit: 'км/ч', step: '0.1' },
        { id: 'speedObtuse', label: `Скорость при угле ${180 - a.angle}°`, unit: 'км/ч', step: '0.1' },
      ],
    },
    {
      id: 'incline',
      order: 2,
      title: 'Наклонная плоскость',
      text: `Тело скользит из состояния покоя по наклонной плоскости с углом наклона ${b.angle}°. Длина пути равна ${b.length.toFixed(1)} м, время движения — ${b.time.toFixed(2)} с. Найдите коэффициент трения. Примите g = 9,81 м/с². Для расчётов: sin ${b.angle}° ≈ ${Math.sin((b.angle * Math.PI) / 180).toFixed(4).replace('.', ',')}; cos ${b.angle}° ≈ ${Math.cos((b.angle * Math.PI) / 180).toFixed(4).replace('.', ',')}.`,
      fields: [{ id: 'friction', label: 'Коэффициент трения', unit: '', step: '0.01' }],
    },
    {
      id: 'skaters',
      order: 3,
      title: 'Закон сохранения импульса',
      text: `Два конькобежца массами ${c.m1} кг и ${c.m2} кг неподвижно стоят на льду и держат концы длинного натянутого шнура. Один из них укорачивает шнур со скоростью ${c.ropeSpeed.toFixed(1)} м/с. С какими скоростями будут двигаться конькобежцы? Трением пренебречь.`,
      fields: [
        { id: 'speed1', label: `Скорость конькобежца ${c.m1} кг`, unit: 'м/с', step: '0.01' },
        { id: 'speed2', label: `Скорость конькобежца ${c.m2} кг`, unit: 'м/с', step: '0.01' },
      ],
    },
  ]
}

type SubmittedAnswers = Record<string, Record<string, string | number>>

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function closeEnough(actual: number | null, expected: number, absolute: number, relative: number) {
  if (actual === null) return false
  return Math.abs(actual - expected) <= Math.max(absolute, Math.abs(expected) * relative)
}

export function gradeVariant(variant: MechanicsVariant, answers: SubmittedAnswers) {
  const task1 =
    closeEnough(
      numeric(answers.relativeMotion?.speedAcute),
      variant.relativeMotion.expectedAcute,
      0.2,
      0.01
    ) &&
    closeEnough(
      numeric(answers.relativeMotion?.speedObtuse),
      variant.relativeMotion.expectedObtuse,
      0.2,
      0.01
    )
  const task2 = closeEnough(
    numeric(answers.incline?.friction),
    variant.incline.expected,
    0.01,
    0.03
  )
  const task3 =
    closeEnough(numeric(answers.skaters?.speed1), variant.skaters.expected1, 0.02, 0.02) &&
    closeEnough(numeric(answers.skaters?.speed2), variant.skaters.expected2, 0.02, 0.02)
  const correctness = [task1, task2, task3]
  return { score: correctness.filter(Boolean).length, correctness }
}
