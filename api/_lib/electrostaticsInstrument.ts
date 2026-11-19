import { createHash } from 'node:crypto'
import { databaseSql } from './db.js'
import { electroVariant, potentialLevels, type ElectroVariant, type Point, type Reading } from '../../src/lib/electrostatics.js'
import { solveElectrostatic, voltmeter, contourPath, fieldLines, electricField, type FieldGrid } from './electrostaticsModel.js'
import { measuredNeighborEdges } from './electrostaticsNeighbors.js'

// Bounded warm-instance cache. It improves latency but never enforces access/quota.
const grids = new Map<string, FieldGrid>()
export function serverGrid(variant: ElectroVariant) {
  const key = JSON.stringify(variant)
  const cached = grids.get(key)
  if (cached) { grids.delete(key); grids.set(key, cached); return cached }
  const grid = solveElectrostatic(variant)
  if (!grid.converged) throw Error('FIELD_NOT_CONVERGED')
  if (grids.size >= 32) grids.delete(grids.keys().next().value!)
  grids.set(key, grid)
  return grid
}
export function referenceDrawing(variant: ElectroVariant) {
  const grid = serverGrid(variant)
  return { contours: potentialLevels(variant).map(level => contourPath(grid, level)), lines: fieldLines(grid, variant) }
}
export function measuredConnections(variant: ElectroVariant, points: Reading[]) {
  const grid = serverGrid(variant)
  return potentialLevels(variant).map(level => measuredNeighborEdges(grid, level, points.filter(p => p.level === level)))
}
export function normalPair(variant: ElectroVariant, a: Point, b: Point) {
  const length = Math.hypot(b.x-a.x,b.y-a.y)
  if (length < 1) return false
  const e = electricField(serverGrid(variant), {x:(a.x+b.x)/2,y:(a.y+b.y)/2})
  return e.magnitude >= .01 && Math.abs((b.x-a.x)*e.x+(b.y-a.y)*e.y)/(length*e.magnitude) >= .95
}
export function instrumentPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Point
  return Object.keys(p).every(k => k === 'x' || k === 'y') && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x>=0 && p.x<=180 && p.y>=0 && p.y<=240 && Number.isInteger(p.x*2) && Number.isInteger(p.y*2)
}
export function instrumentReading(value: unknown, variant: ElectroVariant): value is Reading {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Reading
  return Object.keys(p).every(k => ['x','y','potential','level'].includes(k)) && instrumentPoint({x:p.x,y:p.y}) && potentialLevels(variant).includes(p.level) && typeof p.potential === 'number' && Number.isFinite(p.potential) && Math.abs(p.potential-p.level)<=.10000001 && Math.abs(voltmeter(serverGrid(variant),variant,p)-p.potential)<1e-8
}
export const assignedElectroVariant = (number: number, studentId: string) => electroVariant(number,studentId)
export const probeReading = (variant: ElectroVariant, point: Point) => voltmeter(serverGrid(variant),variant,point)

/** Shared PostgreSQL token bucket: atomic across tabs and serverless instances.
 * 12 burst, 4 requests/s refill; at most 5000 measured/validated points per UTC day.
 * Hash account identity to avoid duplicating identifying strings in quota storage. */
export async function consumeElectroQuota(identity: string, cost: number): Promise<boolean> {
  if(!Number.isSafeInteger(cost)||cost<1||cost>200)throw Error('INVALID_MEASUREMENT_COST')
  const key = createHash('sha256').update(identity).digest('hex')
  const rows = await databaseSql`
    insert into electrostatics_instrument_quotas (identity_hash,tokens,updated_at,day,measurements)
    values (${key},11,clock_timestamp(),(now() at time zone 'UTC')::date,${cost})
    on conflict (identity_hash) do update set
      tokens=least(12,electrostatics_instrument_quotas.tokens+greatest(0,extract(epoch from (clock_timestamp()-electrostatics_instrument_quotas.updated_at)))*4)-1,
      updated_at=clock_timestamp(),day=(now() at time zone 'UTC')::date,
      measurements=case when electrostatics_instrument_quotas.day=(now() at time zone 'UTC')::date then electrostatics_instrument_quotas.measurements+${cost} else ${cost} end
    where least(12,electrostatics_instrument_quotas.tokens+greatest(0,extract(epoch from (clock_timestamp()-electrostatics_instrument_quotas.updated_at)))*4)>=1
      and (electrostatics_instrument_quotas.day<>(now() at time zone 'UTC')::date or electrostatics_instrument_quotas.measurements+${cost}<=5000)
    returning identity_hash`
  return rows.length === 1
}
