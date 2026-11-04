import { clementExpected, type ClementVariant } from './clementDesormes'

export const CLEMENT_MANUAL_FIELDS = [
  ['targetHead', 'Начальная разность H, мм воды'],
  ['temperature', 'Температура комнаты, °C'],
  ['pressure', 'Атмосферное давление, кПа'],
  ['heatLeak', 'Коэффициент теплообмена a, с⁻¹'],
] as const
export type ClementManualField = typeof CLEMENT_MANUAL_FIELDS[number][0]
export type ClementManualValues = Record<ClementManualField, string>
export function clementManualValues(v: ClementVariant): ClementManualValues {
  return { targetHead: String(v.targetHead), temperature: String(Number((v.ambientK - 273.15).toFixed(6))), pressure: String(v.pressurePa / 1000), heatLeak: String(Number(v.heatLeak.toPrecision(12))) }
}
export function parseManualClement(values: ClementManualValues, number: number): { ok: true; variant: ClementVariant } | { ok: false; error: string } {
  const n = Object.fromEntries(CLEMENT_MANUAL_FIELDS.map(([key]) => [key, values[key].trim() ? Number(values[key].trim().replace(',', '.')) : NaN])) as Record<ClementManualField, number>
  if (!Number.isSafeInteger(number) || number < 1 || Object.values(n).some(value => !Number.isFinite(value))) return { ok: false, error: 'Введите числовые значения всех параметров. Десятичная запятая допускается.' }
  if (n.targetHead < 10 || n.targetHead > 400) return { ok: false, error: 'Разность H должна быть от 10 до 400 мм воды, чтобы уровни оставались в пределах манометра.' }
  if (n.temperature < 0 || n.temperature > 50) return { ok: false, error: 'Температура комнаты должна быть от 0 до 50 °C.' }
  if (n.pressure < 80 || n.pressure > 120) return { ok: false, error: 'Атмосферное давление должно быть от 80 до 120 кПа.' }
  if (n.heatLeak < .001 || n.heatLeak > .1) return { ok: false, error: 'Коэффициент a должен быть от 0,001 до 0,1 с⁻¹.' }
  const variant: ClementVariant = { version: 1, number, targetHead: n.targetHead, ambientK: n.temperature + 273.15, pressurePa: n.pressure * 1000, heatLeak: n.heatLeak }
  if (clementExpected(variant).trials.some(t => !Number.isFinite(t.log) || t.head <= 0)) return { ok: false, error: 'Проверьте параметры: расчётные уровни должны быть положительными.' }
  return { ok: true, variant }
}
export const clementVariantKey = (v: ClementVariant) => [v.number, v.targetHead, v.ambientK, v.pressurePa, v.heatLeak].join(':')
