import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

// Keep native ESM resolution: tsx/Vite otherwise hide missing .js extensions.
const directory = await mkdtemp(join(tmpdir(), 'physez-electro-esm-'))
try {
  await writeFile(join(directory, 'package.json'), '{"type":"module"}')
  for (const name of ['electrostatics', 'electrostaticsNotebook', 'electrostaticsSubmission']) {
    const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), 'utf8')
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } })
    await writeFile(join(directory, `${name}.js`), result.outputText)
  }
  const { electroProgress } = await import(pathToFileURL(join(directory, 'electrostaticsSubmission.js')).href)
  const { emptyElectroNotebook } = await import(pathToFileURL(join(directory, 'electrostaticsNotebook.js')).href)
  const { electroVariant } = await import(pathToFileURL(join(directory, 'electrostatics.js')).href)
  const progress = electroProgress(emptyElectroNotebook(), electroVariant(24, 'runtime-fixture'))
  assert.equal(progress.points, 0)
  assert.ok(progress.totalLines >= 11)
  console.log('PASS: electrostatics server modules load with native Node ESM resolution and calculate notebook progress')
} finally {
  await rm(directory, { recursive: true, force: true })
}
