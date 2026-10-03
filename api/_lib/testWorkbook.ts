import ExcelJS from 'exceljs'
import { evaluateFormula, generateVariables } from './safeFormula.js'

export type ParsedTestQuestion = {
  orderNo: number
  section: string | null
  difficulty: string | null
  kind: 'single' | 'multiple' | 'number' | 'text'
  prompt: string
  points: number
  config: {
    options?: string[]
    answer: string | string[] | number
    unit?: string
    tolerance?: number
    explanation?: string
    variables?: string
    formula?: string
  }
}

export type ParsedTestWorkbook = {
  title: string
  description: string
  language: 'ru' | 'kk' | 'both'
  durationMinutes: number
  calculatorAllowed: boolean
  shuffleQuestions: boolean
  questions: ParsedTestQuestion[]
}

const textOf = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('formula' in value) throw new Error('Формулы Excel запрещены. Используйте обычный текст в ячейках.')
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part: { text?: string }) => part.text || '').join('').trim()
    }
  }
  return String(value).trim()
}

const boolOf = (value: string, fallback: boolean) => {
  if (!value) return fallback
  return ['да', 'yes', 'true', '1'].includes(value.toLocaleLowerCase('ru-RU'))
}

const numberOf = (value: string) => Number(value.replace(',', '.'))

export async function parseTestWorkbook(buffer: Buffer): Promise<ParsedTestWorkbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  const settingsSheet = workbook.getWorksheet('Настройки') || workbook.worksheets[0]
  const questionsSheet = workbook.getWorksheet('Вопросы') || workbook.worksheets[1]
  if (!settingsSheet || !questionsSheet) throw new Error('Нужны листы «Настройки» и «Вопросы».')

  const settings = new Map<string, string>()
  settingsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const key = textOf(row.getCell(1).value).toLocaleLowerCase('ru-RU')
    if (key) settings.set(key, textOf(row.getCell(2).value))
  })

  const title = settings.get('название') || settings.get('title') || ''
  if (title.length < 3) throw new Error('В настройках укажите название теста.')
  const durationMinutes = Math.round(numberOf(settings.get('время, мин') || '30'))
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
    throw new Error('Время теста должно быть от 5 до 240 минут.')
  }
  const rawLanguage = (settings.get('язык') || 'ru').toLowerCase()
  const language = (['ru', 'kk', 'both'].includes(rawLanguage) ? rawLanguage : 'ru') as ParsedTestWorkbook['language']

  const header = new Map<string, number>()
  questionsSheet.getRow(1).eachCell((cell, column) => {
    header.set(textOf(cell.value).toLocaleLowerCase('ru-RU'), column)
  })
  const required = ['тип', 'вопрос', 'правильный ответ']
  for (const name of required) if (!header.has(name)) throw new Error(`Нет обязательного столбца «${name}».`)

  const cell = (row: ExcelJS.Row, name: string) => textOf(row.getCell(header.get(name) || 0).value)
  const questions: ParsedTestQuestion[] = []
  questionsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const prompt = cell(row, 'вопрос')
    if (!prompt) return
    const rawKind = cell(row, 'тип').toLowerCase()
    const aliases: Record<string, ParsedTestQuestion['kind']> = {
      single: 'single', 'один ответ': 'single', multiple: 'multiple', 'несколько ответов': 'multiple',
      number: 'number', 'число': 'number', text: 'text', 'текст': 'text',
    }
    const kind = aliases[rawKind]
    if (!kind) throw new Error(`Строка ${rowNumber}: неизвестный тип «${rawKind}».`)
    const options = cell(row, 'варианты').split('|').map((item) => item.trim()).filter(Boolean)
    const rawAnswer = cell(row, 'правильный ответ')
    const variables = cell(row, 'переменные')
    const formula = cell(row, 'формула ответа')
    if (!rawAnswer && !formula) throw new Error(`Строка ${rowNumber}: не указан правильный ответ.`)
    if (variables || formula) {
      if (kind !== 'number' || !variables || !formula) throw new Error(`Строка ${rowNumber}: переменные и формула поддерживаются только вместе для типа «число».`)
      try { evaluateFormula(formula, generateVariables(variables)) } catch (error) { throw new Error(`Строка ${rowNumber}: ${(error as Error).message}`) }
    }
    if ((kind === 'single' || kind === 'multiple') && options.length < 2) {
      throw new Error(`Строка ${rowNumber}: для выбора нужны минимум два варианта через |.`)
    }
    const numericAnswer = numberOf(rawAnswer)
    const points = Math.round(numberOf(cell(row, 'баллы') || '1'))
    const tolerance = numberOf(cell(row, 'погрешность') || '0')
    questions.push({
      orderNo: questions.length + 1,
      section: cell(row, 'раздел') || null,
      difficulty: cell(row, 'сложность') || null,
      kind,
      prompt: prompt.slice(0, 4000),
      points: Number.isFinite(points) && points > 0 && points <= 100 ? points : 1,
      config: {
        ...(options.length ? { options } : {}),
        answer: kind === 'number'
          ? (Number.isFinite(numericAnswer) ? numericAnswer : 0)
          : kind === 'multiple' ? rawAnswer.split('|').map((item) => item.trim()) : rawAnswer,
        ...(cell(row, 'единица') ? { unit: cell(row, 'единица') } : {}),
        ...(Number.isFinite(tolerance) && tolerance > 0 ? { tolerance } : {}),
        ...(cell(row, 'пояснение') ? { explanation: cell(row, 'пояснение') } : {}),
        ...(variables ? { variables } : {}),
        ...(formula ? { formula } : {}),
      },
    })
  })
  if (!questions.length) throw new Error('В шаблоне нет вопросов.')
  if (questions.length > 200) throw new Error('Максимум 200 вопросов в одном тесте.')
  return {
    title: title.slice(0, 255),
    description: (settings.get('описание') || '').slice(0, 4000),
    language,
    durationMinutes,
    calculatorAllowed: boolOf(settings.get('калькулятор') || '', true),
    shuffleQuestions: boolOf(settings.get('перемешивать вопросы') || '', false),
    questions,
  }
}

export async function createTestTemplate() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Physez'
  const settings = workbook.addWorksheet('Настройки')
  settings.addRows([
    ['Параметр', 'Значение', 'Подсказка'],
    ['Название', 'Контрольная работа по физике', 'Обязательное поле'],
    ['Описание', 'Введите краткое описание', 'Показывается ученикам'],
    ['Язык', 'ru', 'ru, kk или both'],
    ['Время, мин', 30, 'От 5 до 240'],
    ['Калькулятор', 'да', 'да или нет'],
    ['Перемешивать вопросы', 'да', 'да или нет'],
  ])
  const questions = workbook.addWorksheet('Вопросы')
  questions.addRow(['№', 'Раздел', 'Сложность', 'Тип', 'Вопрос', 'Баллы', 'Варианты', 'Правильный ответ', 'Единица', 'Погрешность', 'Пояснение', 'Переменные', 'Формула ответа'])
  questions.addRow([1, 'Механика', 'легко', 'один ответ', 'Единица измерения силы?', 1, 'Н|Дж|Па|Вт', 'Н', '', '', 'Сила измеряется в ньютонах.', '', ''])
  questions.addRow([2, 'Механика', 'средне', 'число', 'Тело прошло 100 м за 20 с. Найдите скорость.', 2, '', 5, 'м/с', 0.05, '', '', ''])
  questions.addRow([3, 'Теория', 'средне', 'несколько ответов', 'Выберите векторные величины.', 2, 'скорость|масса|сила|температура', 'скорость|сила', '', '', '', '', ''])
  questions.addRow([4, 'Механика', 'средне', 'число', 'Тело прошло {s} м за {t} с. Найдите скорость.', 2, '', '', 'м/с', 0.05, 'Числа генерируются отдельно для каждого ученика.', 's=80:140:10;t=10:25:5', 's/t'])
  const instructions = workbook.addWorksheet('Инструкция')
  instructions.addRows([
    ['Как заполнить шаблон'],
    ['Не переименовывайте листы и заголовки столбцов. Одна строка — один вопрос.'],
    ['Типы: один ответ, несколько ответов, число, текст. Варианты разделяйте символом |.'],
    ['Для числового ответа можно задать единицу и абсолютную погрешность.'],
    ['Индивидуальный вариант: в «Переменные» напишите v=10:20:1;t=2:5:0.5, в вопросе используйте {v}, а в «Формула ответа» — v/t.'],
    ['В формулах разрешены +, -, *, /, ^, скобки, sqrt, abs, sin, cos, tan. Углы для sin/cos/tan задаются в градусах.'],
    ['Не используйте формулы Excel, макросы и внешние ссылки — файл будет отклонён.'],
  ])
  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFC6255' } }
    sheet.columns.forEach((column) => { column.width = 22 })
  }
  questions.getColumn(5).width = 54
  questions.getColumn(7).width = 42
  questions.getColumn(11).width = 42
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
