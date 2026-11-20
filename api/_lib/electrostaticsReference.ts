import { potentialLevels, type ElectroVariant } from '../../src/lib/electrostatics.js'
import { solveElectrostatic, contourPath, fieldLines } from '../../src/workers/electrostaticsModel.js'
// Called only after the existing teacher/admin ownership checks. No probe endpoint.
const drawings=new Map<string,{contours:string[];lines:string[]}>()
export function referenceDrawing(variant:ElectroVariant){
  const key=JSON.stringify(variant),previous=drawings.get(key)
  if(previous){drawings.delete(key);drawings.set(key,previous);return previous}
  const grid=solveElectrostatic(variant)
  if(!grid.converged)throw Error('FIELD_NOT_CONVERGED')
  const drawing={contours:potentialLevels(variant).map(level=>contourPath(grid,level)),lines:fieldLines(grid,variant)}
  if(drawings.size>=32)drawings.delete(drawings.keys().next().value!)
  drawings.set(key,drawing)
  return drawing
}
