import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import ExcelJS from 'exceljs'
import { createTestTemplate, parseTestWorkbook } from '../api/_lib/testWorkbook.js'
import { validateOfficeArchive } from '../api/_lib/officeArchive.js'

// Tiny ZIP fixtures; the guard inspects sizes/entries before OOXML parsers run.
function zip(entries: Array<[string, string]>) {
  const locals: Buffer[] = [], central: Buffer[] = []; let offset = 0
  for (const [name, value] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(value), compressed = deflateRawSync(data)
    const local = Buffer.alloc(30), record = Buffer.alloc(46)
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(8, 8); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26)
    record.writeUInt32LE(0x02014b50); record.writeUInt16LE(8, 10); record.writeUInt32LE(compressed.length, 20); record.writeUInt32LE(data.length, 24); record.writeUInt16LE(filename.length, 28); record.writeUInt32LE(offset, 42)
    locals.push(local, filename, compressed); central.push(record, filename); offset += local.length + filename.length + compressed.length
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
const content: [string, string] = ['[Content_Types].xml', '<Types/>']
const doc: [string, string] = ['word/document.xml', '<document/>']
validateOfficeArchive(zip([content, doc]), 'docx')
assert.throws(() => validateOfficeArchive(Buffer.from('<html>not a docx</html>'), 'docx'))
assert.throws(() => validateOfficeArchive(zip([content, doc]), 'xlsx'))
for (const name of ['../escape.xml', '/absolute.xml', 'word\\escape.xml', 'word/vbaProject.bin']) assert.throws(() => validateOfficeArchive(zip([content, doc, [name, 'x']]), 'docx'))
assert.throws(() => validateOfficeArchive(zip([content, doc, doc]), 'docx'))
assert.throws(() => validateOfficeArchive(zip([content, ['word/document.xml', '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x/>']]), 'docx'))
const bomb = zip([content, ['word/document.xml', 'x'.repeat(4096)]])
assert.throws(() => validateOfficeArchive(bomb, 'docx', { entry: 1024, total: 2048, files: 10 }))
const forged = Buffer.from(bomb), central = forged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), forged.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 4)
forged.writeUInt32LE(1, central + 24)
assert.throws(() => validateOfficeArchive(forged, 'docx', { entry: 1024, total: 2048, files: 10 }), 'Forged expanded size cannot bypass bounded inflation')
const workbook = new ExcelJS.Workbook(); workbook.addWorksheet('Test').addRow(['hello', 42])
validateOfficeArchive(Buffer.from(await workbook.xlsx.writeBuffer()), 'xlsx')
const template = await createTestTemplate()
assert.equal((await parseTestWorkbook(template)).questions.length, 4)
console.log('PASS: real ExcelJS workbook, DOCX container, invalid/mismatched archives, traversal, macros, duplicates, DTD, expanded size limits and forged ZIP bomb metadata')
