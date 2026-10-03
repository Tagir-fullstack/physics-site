import type { VercelRequest, VercelResponse } from '@vercel/node'
import busboy from 'busboy'
import { eq } from 'drizzle-orm'
import { db, hasDatabaseConfig, schema } from './_lib/db.js'
import { getClerkUser, hasPremiumAccess } from './_lib/auth.js'
import { parseTestWorkbook } from './_lib/testWorkbook.js'

export const config = { api: { bodyParser: false } }

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function uploadedFile(req: VercelRequest) {
  const raw = await readRawBody(req)
  return new Promise<{ buffer: Buffer; filename: string }>((resolve, reject) => {
    const chunks: Buffer[] = []
    let filename = ''
    let limitReached = false
    const parser = busboy({ headers: req.headers, defParamCharset: 'utf8', limits: { files: 1, fileSize: 2 * 1024 * 1024 } })
    parser.on('file', (_name, stream, info) => {
      filename = info.filename
      stream.on('limit', () => { limitReached = true })
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    })
    parser.on('error', reject)
    parser.on('close', () => {
      if (limitReached) return reject(new Error('Файл больше 2 МБ.'))
      if (!filename || !chunks.length) return reject(new Error('Выберите файл .xlsx.'))
      resolve({ buffer: Buffer.concat(chunks), filename })
    })
    parser.end(raw)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!hasDatabaseConfig) return res.status(503).json({ error: 'База данных не подключена.' })
  const user = await getClerkUser(req)
  if (!user) return res.status(401).json({ error: 'Войдите в аккаунт преподавателя.' })
  if (!hasPremiumAccess(user)) return res.status(403).json({ error: 'Загрузка тестов доступна только с PRO.' })

  try {
    const file = await uploadedFile(req)
    if (!file.filename.toLowerCase().endsWith('.xlsx')) return res.status(415).json({ error: 'Поддерживается только формат .xlsx.' })
    const parsed = await parseTestWorkbook(file.buffer)
    const [test] = await db.insert(schema.teacherTests).values({
      ownerClerkId: user.userId,
      title: parsed.title,
      description: parsed.description || null,
      language: parsed.language,
      durationMinutes: parsed.durationMinutes,
      calculatorAllowed: parsed.calculatorAllowed,
      shuffleQuestions: parsed.shuffleQuestions,
      sourceFilename: file.filename.slice(0, 255),
    }).returning()
    try {
      await db.insert(schema.testQuestions).values(parsed.questions.map((question) => ({
        testId: test.id,
        orderNo: question.orderNo,
        section: question.section,
        difficulty: question.difficulty,
        kind: question.kind,
        prompt: question.prompt,
        points: question.points,
        config: question.config,
      })))
    } catch (error) {
      await db.delete(schema.teacherTests).where(eq(schema.teacherTests.id, test.id))
      throw error
    }
    return res.status(201).json({ id: test.id, title: test.title, questions: parsed.questions.length })
  } catch (error) {
    console.error('[test-upload]', error)
    return res.status(422).json({ error: error instanceof Error ? error.message : 'Не удалось прочитать шаблон.' })
  }
}
