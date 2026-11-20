import assert from 'node:assert/strict'
import { installElectroConsoleDecoy } from '../src/lib/electrostaticsConsoleDecoy.js'
import { electroVariant } from '../src/lib/electrostatics.js'
import { solveElectrostatic,voltmeter } from '../src/workers/electrostaticsModel.js'
const variant=electroVariant(24,'decoy-fixture'),original=JSON.stringify(variant),grid=solveElectrostatic(variant)
type Decoy={getGrid:()=>{potential:Float64Array};solve:()=>{potential:Float64Array}}
const host={} as {electrostatics:Decoy;showAllLines:()=>unknown},remove=installElectroConsoleDecoy(host,variant)
assert.equal(typeof host.showAllLines,'function')
const before=voltmeter(grid,variant,{x:90,y:120}),surface=host.electrostatics.getGrid()
surface.potential.fill(-100);host.electrostatics.solve().potential.fill(999);host.showAllLines()
assert.equal(voltmeter(grid,variant,{x:90,y:120}),before)
assert.equal(JSON.stringify(variant),original)
assert.ok(host.electrostatics.getGrid().potential[0]>=0,'Decoy returns independent arrays')
remove();assert.equal('showAllLines'in host,false);assert.equal('electrostatics'in host,false)
const keep=()=>42;host.showAllLines=keep
const cleanup=installElectroConsoleDecoy(host,variant);assert.equal(host.showAllLines,keep);cleanup();assert.equal(host.showAllLines,keep)
assert.doesNotThrow(()=>installElectroConsoleDecoy(Object.freeze({}),variant)())
console.log('PASS: console-only decoy isolated from actual physics and variant; independent arrays, existing globals preserved and unmount cleanup')
