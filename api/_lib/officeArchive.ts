import { inflateRawSync } from 'node:zlib'

/** Inspect and bounded-inflate entries before passing untrusted OOXML to a parser. */
export function validateOfficeArchive(buffer: Buffer, format: 'docx' | 'xlsx', budget = { entry: 16 * 1024 * 1024, total: 64 * 1024 * 1024, files: 1024 }) {
  const invalid = () => { throw new Error('Некорректный или слишком большой документ Office.') }
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) invalid()
  let end = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50 && i + 22 + buffer.readUInt16LE(i + 20) === buffer.length) { end = i; break }
  }
  if (end < 0) invalid()
  const count = buffer.readUInt16LE(end + 10), directorySize = buffer.readUInt32LE(end + 12), directory = buffer.readUInt32LE(end + 16)
  // Multi-disk and ZIP64 documents are unnecessary for these bounded uploads.
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || buffer.readUInt16LE(end + 8) !== count || count > budget.files || directory + directorySize !== end) invalid()
  const names = new Set<string>(); let cursor = directory, total = 0
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || buffer.readUInt32LE(cursor) !== 0x02014b50) invalid()
    const flags = buffer.readUInt16LE(cursor + 8), method = buffer.readUInt16LE(cursor + 10)
    const compressed = buffer.readUInt32LE(cursor + 20), expanded = buffer.readUInt32LE(cursor + 24)
    const length = buffer.readUInt16LE(cursor + 28), extra = buffer.readUInt16LE(cursor + 30), comment = buffer.readUInt16LE(cursor + 32), local = buffer.readUInt32LE(cursor + 42)
    if (cursor + 46 + length + extra + comment > end || local + 30 > directory || expanded > budget.entry || expanded > budget.total - total || flags & 1 || ![0, 8].includes(method)) invalid()
    const nameBytes = buffer.subarray(cursor + 46, cursor + 46 + length), name = nameBytes.toString('utf8')
    if (!name || names.has(name) || name.includes('\\') || name.includes('\0') || name.startsWith('/') || name.split('/').includes('..') || /vbaproject\.bin$/i.test(name)) invalid()
    names.add(name)
    if (buffer.readUInt32LE(local) !== 0x04034b50 || buffer.readUInt16LE(local + 8) !== method || buffer.readUInt16LE(local + 6) !== flags) invalid()
    const localNameLength = buffer.readUInt16LE(local + 26), data = local + 30 + localNameLength + buffer.readUInt16LE(local + 28)
    if (!nameBytes.equals(buffer.subarray(local + 30, local + 30 + localNameLength)) || data + compressed > directory) invalid()
    const payload = buffer.subarray(data, data + compressed)
    let output: Buffer
    try { output = method === 0 ? payload : inflateRawSync(payload, { maxOutputLength: Math.max(1, Math.min(budget.entry, budget.total - total)) }) }
    catch { return invalid() }
    if (output.length !== expanded || output.length > budget.entry || output.length > budget.total - total) invalid()
    if (/\.(xml|rels)$/i.test(name) && /<!\s*(DOCTYPE|ENTITY)\b/i.test(output.toString('utf8'))) invalid()
    total += output.length
    cursor += 46 + length + extra + comment
  }
  if (cursor !== end || !names.has('[Content_Types].xml') || !names.has(format === 'docx' ? 'word/document.xml' : 'xl/workbook.xml')) invalid()
}
