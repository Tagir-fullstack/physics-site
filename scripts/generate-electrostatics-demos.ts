// These three fixed fictional profiles cannot be used to request a student's drawing.
import {writeFile} from 'node:fs/promises'
import {electroVariant} from '../src/lib/electrostatics.js'
import {referenceDrawing} from '../api/_lib/electrostaticsReference.js'
for(let i=0;i<3;i++){
  const variant=electroVariant(24,`competition-example-${i}`)
  await writeFile(new URL(`../public/demos/electrostatics-${i}.json`,import.meta.url),JSON.stringify({variant,drawing:referenceDrawing(variant)}))
}
console.log('Generated three fixed fictional presentation fields.')
