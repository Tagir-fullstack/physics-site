export const G = 9.81
export const HEIGHT = 0.5
export const BASE = 0.0927
export const SMALL = 0.05438
export const LARGE = 0.09885
export const TOTAL = BASE + SMALL + LARGE
export const RADII = [0.01, 0.0175] as const
// Educational bounds, not manufacturer specifications or confidence intervals.
export const TIME_SCATTER = 0.005
export const timeErrorBound = (time: number) => 0.01 + TIME_SCATTER * time
export function sampleTimeFactor(random: () => number = Math.random) {
  return 1 + (random() + random() - 1) * TIME_SCATTER
}
export const inertiaFromTime = (mass: number, radius: number, time: number) => mass * radius ** 2 * (G * time ** 2 / (2 * HEIGHT) - 1)
// The first reference measurement is assumed to have l = 10 cm.
const j10 = inertiaFromTime(BASE, RADII[0], 18.5)
const j12 = inertiaFromTime(TOTAL, RADII[1], 6.7)
export const CYLINDER_MASS = (j12 - j10) / (4 * (0.12 ** 2 - 0.1 ** 2))
export const CROSS_INERTIA = j10 - 4 * CYLINDER_MASS * 0.1 ** 2
export function experiment(mass: number, radius: number, length: number, timeFactor = 1) {
  const inertia = CROSS_INERTIA + 4 * CYLINDER_MASS * length ** 2
  const acceleration = mass * G / (mass + inertia / radius ** 2)
  const duration = Math.sqrt(2 * HEIGHT / acceleration) * timeFactor
  return { acceleration: 2 * HEIGHT / duration ** 2, duration }
}
export const numberFrom = (value: string) => value.trim() === '' ? NaN : Number(value.replace(',', '.'))
