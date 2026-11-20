import assert from 'node:assert/strict'
import { SHEET, type FieldGrid, type Point } from '../src/lib/electrostatics'
import { measuredNeighborEdges } from '../src/lib/electrostaticsNeighbors'
const grid = (fn: (x: number, y: number) => number): FieldGrid => {
  const nx = SHEET.width / 2 + 1, ny = SHEET.height / 2 + 1, potential = new Float64Array(nx * ny)
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) potential[y * nx + x] = fn(x * 2, y * 2)
  return { nx, ny, step: 2, potential, residual: 0, iterations: 0, converged: true }
}
const straight = grid((_x, y) => y)
const xs = [0, 180, 20, 160, 40, 140, 60, 120, 80, 100]
const points = xs.map(x => ({ x, y: 120 }))
const before = JSON.stringify(points)
const edges = measuredNeighborEdges(straight, 120, points)
assert.equal(edges.length, 9)
assert.ok(edges.every(([a, b]) => Math.abs(a.x - b.x) === 20), 'No zigzags or end-to-end closure')
const canonical = (edges: Array<[Point, Point]>) => edges.map(([a,b]) => [JSON.stringify(a), JSON.stringify(b)].sort().join('|')).sort()
assert.deepEqual(canonical(edges), canonical(measuredNeighborEdges(straight, 120, [...points].reverse())), 'Recording order does not affect connections')
assert.equal(JSON.stringify(points), before, 'Saved points are never reordered or changed')
const gaps = measuredNeighborEdges(straight, 120, [0,10,20,160,170,180].map(x => ({x,y:120})))
assert.equal(gaps.length, 4)
assert.ok(gaps.every(([a,b]) => Math.abs(a.x-b.x) === 10), 'Unmeasured large gaps stay disconnected')
const circles = grid((x,y) => Math.min(Math.hypot(x-45,y-120), Math.hypot(x-105,y-120)))
const ring = (cx: number) => Array.from({length:12},(_,i) => ({x:cx+20*Math.cos(i*Math.PI/6),y:120+20*Math.sin(i*Math.PI/6)}))
const left = ring(45), right = ring(105), mixed = [...left.filter((_,i)=>i%2===0), ...right, ...left.filter((_,i)=>i%2===1)]
const closed = measuredNeighborEdges(circles, 20, mixed)
assert.equal(closed.length, 24)
assert.ok(closed.every(([a,b]) => left.includes(a) === left.includes(b)), 'Disconnected equipotential loops are never bridged')
assert.ok(closed.every(([a,b]) => mixed.includes(a) && mixed.includes(b)), 'No reference points are drawn in place of measurements')
assert.deepEqual(measuredNeighborEdges(straight,120,[]), [])
assert.deepEqual(measuredNeighborEdges(straight,120,[points[0]]), [])
console.log('PASS: shuffled points, local neighbours, open curves, separate closed loops, gap handling, unchanged measurement data')
