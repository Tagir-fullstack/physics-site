import { experiment, numberFrom } from '../pages/labs/oberbeckModel'
import type { OberbeckVariant } from './oberbeckVariant'

export type ManualOberbeckSetup = { variant: OberbeckVariant; length: number }
export const OBERBECK_SPEEDS = [1, 2, 5, 10] as const
export const MANUAL_OBERBECK_FIELDS = [
  ['height', 'Высота h, см'], ['r1', 'Радиус R₁, мм'], ['r2', 'Радиус R₂, мм'],
  ['base', 'Платформа, г'], ['small', 'Малый груз, г'], ['large', 'Большой груз, г'],
  ['length', 'Расстояние цилиндров l, см'],
] as const
export type ManualOberbeckField = typeof MANUAL_OBERBECK_FIELDS[number][0]
export function manualOberbeckValues(setup: ManualOberbeckSetup): Record<ManualOberbeckField, string> {
  const v = setup.variant
  return Object.fromEntries(Object.entries({ height: v.height * 100, r1: v.radii[0] * 1000, r2: v.radii[1] * 1000, base: v.base * 1000, small: v.small * 1000, large: v.large * 1000, length: setup.length }).map(([key, value]) => [key, String(Number(value.toPrecision(12)))])) as Record<ManualOberbeckField, string>
}
export function parseManualOberbeck(values: Record<ManualOberbeckField, string>): { ok: true; setup: ManualOberbeckSetup } | { ok: false; error: string } {
  const n = Object.fromEntries(MANUAL_OBERBECK_FIELDS.map(([key]) => [key, numberFrom(values[key])])) as Record<ManualOberbeckField, number>
  if (Object.values(n).some(value => !Number.isFinite(value)) || [n.height, n.r1, n.r2, n.base, n.length].some(value => value <= 0) || n.small < 0 || n.large < 0) return { ok: false, error: 'Введите конечные положительные числа. Массы дополнительных грузов могут быть равны нулю; десятичная запятая допускается.' }
  if (n.r2 <= n.r1) return { ok: false, error: 'Радиус R₂ должен быть больше R₁.' }
  const variant: OberbeckVariant = { version: 1, height: n.height / 100, radii: [n.r1 / 1000, n.r2 / 1000], base: n.base / 1000, small: n.small / 1000, large: n.large / 1000 }
  for (const radius of variant.radii) for (const mass of [variant.base, variant.base + variant.small + variant.large]) {
    const result = experiment(mass, radius, n.length / 100, 1, variant.height)
    if (![result.acceleration, result.duration].every(value => Number.isFinite(value) && value > 0)) return { ok: false, error: 'Значения слишком велики или малы для устойчивого расчёта. Проверьте числа и единицы измерения.' }
  }
  return { ok: true, setup: { variant, length: n.length } }
}
