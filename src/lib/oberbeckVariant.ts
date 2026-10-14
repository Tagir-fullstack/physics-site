import { BASE, SMALL, LARGE, HEIGHT, RADII, G, CROSS_INERTIA, CYLINDER_MASS, experiment, TIME_SCATTER } from '../pages/labs/oberbeckModel.js'

export type OberbeckVariant = { version: 1; height: number; base: number; small: number; large: number; radii: [number, number] }
export const referenceVariant: OberbeckVariant = { version: 1, height: HEIGHT, base: BASE, small: SMALL, large: LARGE, radii: [...RADII] }
export function createOberbeckVariant(random: () => number = Math.random): OberbeckVariant {
  const pick = (min: number, max: number, scale: number) => (min + Math.floor(random() * (max - min + 1))) / scale
  return { version: 1, height: pick(350, 700, 1000), base: pick(7500, 11500, 100000), small: pick(4000, 7000, 100000), large: pick(8500, 12500, 100000), radii: [pick(80, 125, 10000), pick(150, 220, 10000)] }
}
export const variantFingerprint = (variant: OberbeckVariant) => [variant.height, ...variant.radii, variant.base, variant.small, variant.large].join(':')
export function expectedOberbeckTables(v: OberbeckVariant) {
  const total = v.base + v.small + v.large
  const row = (mass: number, radius: number, length: number, index: number) => {
    const { duration: time } = experiment(mass, radius, length / 100, 1, v.height)
    const acceleration = 2 * v.height / time ** 2
    // Bounds include ±0.5% run scatter and rounding to a hundredth of a second.
    const minTime = Math.max(.01, time * (1 - TIME_SCATTER) - .005)
    const maxTime = time * (1 + TIME_SCATTER) + .005
    const calc = (t: number) => { const a = 2 * v.height / t ** 2; return { moment: mass * radius * (G - a), epsilon: a / radius, inertia: mass * radius ** 2 * (G * t ** 2 / (2 * v.height) - 1) } }
    return { index, mass, radius, length, time, minTime, maxTime, moment: mass * radius * (G - acceleration), epsilon: acceleration / radius, lengthSquared: length ** 2, inertia: CROSS_INERTIA + 4 * CYLINDER_MASS * (length / 100) ** 2, bounds: { minTime: calc(minTime), maxTime: calc(maxTime) } }
  }
  return {
    one: v.radii.flatMap((r, p) => [v.base, v.base + v.small, v.base + v.large, total].map((m, i) => row(m, r, 10, p * 4 + i + 1))),
    two: Array.from({ length: 7 }, (_, i) => row(total, v.radii[1], 10 + i * 2, i + 1)),
    crossInertia: CROSS_INERTIA, cylinderMass: CYLINDER_MASS, rotationSlope: 1 / (CROSS_INERTIA + 4 * CYLINDER_MASS * .1 ** 2), inertiaSlope: 4 * CYLINDER_MASS,
  }
}
