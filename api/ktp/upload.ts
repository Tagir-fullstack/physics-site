import { sameRequestOrigin, readLimitedBody, RequestBodyError } from '../_lib/requestSecurity.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import busboy from 'busboy'
import { randomUUID } from 'node:crypto'
import { db, schema } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { putObject } from '../_lib/r2.js'
import { parseKtpDocx } from '../_lib/ktpParser.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

type UploadForm = {
  grade?: string
  academicYear?: string
  title?: string
  hoursPerWeek?: string
  fileBuffer?: Buffer
  fileName?: string
  contentType?: string
}

async function parseMultipart(req: VercelRequest): Promise<UploadForm> {
  const raw = await readLimitedBody(req, 20 * 1024 * 1024 + 64 * 1024)
  return new Promise((resolve, reject) => {
    const form: UploadForm = {}
    let limited = false
    const bb = busboy({
      headers: req.headers,
      defParamCharset: 'utf8',
      limits: { files: 1, fields: 8, parts: 9, fieldSize: 4096, fileSize: 20 * 1024 * 1024 },
    })
    const chunks: Buffer[] = []
    bb.on('field', (name, val) => {
      if (['grade','academicYear','title','hoursPerWeek'].includes(name)) (form as Record<string, string>)[name] = val
    })
    bb.on('file', (_name, stream, info) => {
      form.fileName = info.filename
      form.contentType = info.mimeType
      stream.on('limit', () => { limited = true })
      stream.on('data', (d) => chunks.push(d))
    })
    bb.on('filesLimit', () => { limited = true })
    bb.on('fieldsLimit', () => { limited = true })
    bb.on('partsLimit', () => { limited = true })
    bb.on('close', () => {
      if (limited) return reject(new RequestBodyError('Превышен лимит загрузки.', 413))
      form.fileBuffer = Buffer.concat(chunks)
      resolve(form)
    })
    bb.on('error', reject)
    bb.end(raw)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Cache-Control', 'no-store')
  if (!sameRequestOrigin(req)) return res.status(403).json({ error: 'Запрос с другого сайта запрещён.' })

  const { user, error } = await requireAdmin(req)
  if (error) return res.status(error.status).json({ error: error.message })

  let form: UploadForm
  try {
    form = await parseMultipart(req)
  } catch (e) {
    console.error('[ktp/upload] parse failed:', e)
    return res.status(e instanceof RequestBodyError ? e.status : 400).json({ error: 'Неверный формат или размер загрузки.' })
  }

  if (!form.fileBuffer || !form.fileName) {
    return res.status(400).json({ error: 'Missing file' })
  }
  if (!form.fileName.toLowerCase().endsWith('.docx')) return res.status(415).json({ error: 'Поддерживается только формат .docx.' })
  const grade = parseInt(form.grade || '0', 10)
  if (!grade || grade < 7 || grade > 11) {
    return res.status(400).json({ error: 'Invalid grade (7–11)' })
  }
  const title = form.title?.trim() || `КТП ${grade} класс`

  let parsed
  try {
    parsed = await parseKtpDocx(form.fileBuffer)
  } catch (e) {
    console.warn('[ktp/upload] document rejected', e instanceof Error ? e.name : 'InvalidDocument')
    return res.status(422).json({ error: 'Не удалось разобрать DOCX. Проверьте формат и размер документа.' })
  }

  const key = `ktp/${user!.userId}/${randomUUID()}-${encodeURIComponent(form.fileName)}`
  let sourceUrl: string | null = null
  try {
    sourceUrl = await putObject(key, form.fileBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  } catch (e) {
    console.warn('[ktp/upload] storage failed', e instanceof Error ? e.name : 'StorageError')
    return res.status(503).json({ error: 'Не удалось сохранить документ. Попробуйте позже.' })
  }

  const [inserted] = await db
    .insert(schema.ktp)
    .values({
      grade,
      language: parsed.language,
      academicYear: form.academicYear?.trim() || null,
      title,
      hoursPerWeek: form.hoursPerWeek ? parseInt(form.hoursPerWeek, 10) : null,
      totalHours: parsed.totalHours,
      sourceUrl,
      sourceFilename: form.fileName,
    })
    .returning()

  if (parsed.lessons.length > 0) {
    await db.insert(schema.ktpLessons).values(
      parsed.lessons.map((l) => ({
        ktpId: inserted.id,
        orderNo: l.orderNo,
        quarter: l.quarter,
        section: l.section,
        topic: l.topic,
        objectives: l.objectives,
        hours: l.hours,
        plannedDate: l.plannedDate,
        notes: l.notes,
      }))
    )
  }

  return res.status(201).json({ id: inserted.id, lessons: parsed.lessons.length })
}
