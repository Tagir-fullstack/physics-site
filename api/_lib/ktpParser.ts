import mammoth from 'mammoth'
import { parse as parseHtml } from 'node-html-parser'

export type ParsedLesson = {
  orderNo: number
  quarter: number | null
  section: string | null
  topic: string | null
  objectives: string | null
  hours: number | null
  plannedDate: string | null
  notes: string | null
}

export type ParsedKtp = {
  language: 'ru' | 'kk'
  totalHours: number | null
  lessons: ParsedLesson[]
}

const QUARTER_ROMAN: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4,
  '1': 1, '2': 2, '3': 3, '4': 4,
}

function parseQuarterLabel(text: string): { quarter: number; hours: number | null } | null {
  const normalized = text.replace(/[Іі]/g, 'I').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  const m = normalized.match(/(IV|III|II|I|[1-4])\s*(?:четверть|тоқсан)\s*(?:\(?\s*(\d+)\s*(?:часов|сағат)?\s*\)?)?/i)
  if (!m) return null
  const q = QUARTER_ROMAN[m[1].toUpperCase()]
  if (!q) return null
  const hours = m[2] ? parseInt(m[2], 10) : null
  return { quarter: q, hours }
}

function detectLanguage(headerCells: string[]): 'ru' | 'kk' {
  const joined = headerCells.join(' ').toLowerCase()
  if (/тақырыпт|сабақт|мақсатт|сағат|мерзім|ескерт/.test(joined)) return 'kk'
  return 'ru'
}

type Cell = { text: string; carried: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRowsFromTable(table: any): Cell[][] {
  const trs = table.querySelectorAll('tr')
  const grid: (Cell | null)[][] = []
  type Carry = { col: number; text: string; colspan: number; remainingRows: number }
  const carries: Carry[] = []

  for (const tr of trs) {
    const row: (Cell | null)[] = []
    let col = 0
    const tds = tr.querySelectorAll('th, td')
    let tdIdx = 0

    const placeCarries = () => {
      while (true) {
        const carry = carries.find((c) => c.col === col && c.remainingRows > 0)
        if (!carry) break
        for (let k = 0; k < carry.colspan; k++) row[col + k] = { text: carry.text, carried: true }
        col += carry.colspan
        carry.remainingRows -= 1
      }
    }

    while (tdIdx < tds.length) {
      placeCarries()
      const td = tds[tdIdx++]
      const colspan = parseInt(td.getAttribute('colspan') || '1', 10)
      const rowspan = parseInt(td.getAttribute('rowspan') || '1', 10)
      const rawInner = td.innerHTML
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
      const text = rawInner.replace(/\s+/g, ' ').trim()
      for (let k = 0; k < colspan; k++) row[col + k] = { text, carried: false }
      if (rowspan > 1) {
        carries.push({ col, text, colspan, remainingRows: rowspan - 1 })
      }
      col += colspan
    }
    placeCarries()
    for (let i = carries.length - 1; i >= 0; i--) {
      if (carries[i].remainingRows <= 0) carries.splice(i, 1)
    }
    grid.push(row)
  }
  return grid.map((r) => r.map((c) => c ?? { text: '', carried: false }))
}

const CODE_RE = /\d+\.\d+\.\d+\.\d+/       // e.g. 11.4.1.1
const PURE_ORDER_RE = /^\s*\d{1,3}\s*$/    // 1..999
const PURE_HOURS_RE = /^\s*(\d{1,2})\s*$/  // 1..99

type Roles = {
  order: number | null
  orderCarried: boolean
  section: string | null
  sectionCarried: boolean
  topic: string | null
  topicCarried: boolean
  objectives: string | null
  objectivesCarried: boolean
  hours: number | null
  date: string | null
  notes: string | null
  notesCarried: boolean
}

// Extend an index across an adjacent run of cells with identical text (colspan expansion).
function spanRight(row: Cell[], i: number): number {
  while (i + 1 < row.length && row[i + 1].text === row[i].text) i++
  return i
}
function spanLeft(row: Cell[], i: number): number {
  while (i > 0 && row[i - 1].text === row[i].text) i--
  return i
}

// Map cells to roles by content, not by header column index. Word docs vary
// wildly in colspan/rowspan layouts — position-based mapping breaks the moment
// one row has objectives spanning 3 cells and another spans 4.
function classifyRow(row: Cell[]): Roles {
  // Order: first pure integer cell. Track its full colspan run.
  let orderIdx = -1
  for (let i = 0; i < row.length; i++) {
    if (PURE_ORDER_RE.test(row[i].text)) { orderIdx = i; break }
  }
  const order = orderIdx >= 0 ? parseInt(row[orderIdx].text.trim(), 10) : null
  const orderCarried = orderIdx >= 0 ? row[orderIdx].carried : false
  const orderEnd = orderIdx >= 0 ? spanRight(row, orderIdx) : -1

  // Hours: rightmost pure small integer strictly after order.
  let hoursIdx = -1
  for (let i = row.length - 1; i > orderEnd; i--) {
    if (PURE_HOURS_RE.test(row[i].text)) { hoursIdx = i; break }
  }
  const hours = hoursIdx >= 0 ? parseInt(row[hoursIdx].text.trim(), 10) : null
  const hoursStart = hoursIdx >= 0 ? spanLeft(row, hoursIdx) : -1
  const hoursEnd = hoursIdx >= 0 ? spanRight(row, hoursIdx) : -1

  // Objectives: first cell after order matching a curriculum code (e.g. 11.4.1.1).
  let objIdx = -1
  const searchObjEnd = hoursStart >= 0 ? hoursStart : row.length
  for (let i = orderEnd + 1; i < searchObjEnd; i++) {
    if (CODE_RE.test(row[i].text)) { objIdx = i; break }
  }
  const objStart = objIdx >= 0 ? spanLeft(row, objIdx) : -1

  // Middle cells: non-empty cells strictly between order and (objectives or hours),
  // with consecutive duplicates (colspan expansion) collapsed to one entry.
  const middleEnd = objStart >= 0 ? objStart : (hoursStart >= 0 ? hoursStart : row.length)
  const middle: { text: string; carried: boolean }[] = []
  for (let i = orderEnd + 1; i < middleEnd; i++) {
    const text = row[i].text.trim()
    if (!text) continue
    const prev = middle[middle.length - 1]
    if (prev && prev.text === text) continue
    middle.push({ text, carried: row[i].carried })
  }

  // A leading carried cell is almost always a section carry from a rowspan block.
  // Split it off so the rest of `middle` can be assigned as topic/objectives cleanly.
  let leadingCarry: { text: string; carried: boolean } | null = null
  if (middle.length > 0 && middle[0].carried) {
    leadingCarry = middle.shift()!
  }

  // Some KTPs use two № columns (global + per-quarter). Only the global one is
  // adjacent to `order` and gets absorbed via spanRight when values match. When
  // the values differ (e.g. global 33, per-quarter 1) the per-quarter cell
  // leaks into `middle` and would masquerade as the section. Strip it.
  if (
    middle.length >= 2 &&
    !middle[0].carried &&
    PURE_ORDER_RE.test(middle[0].text)
  ) {
    middle.shift()
  }

  let section: { text: string; carried: boolean } | null = leadingCarry
  let topic: { text: string; carried: boolean } | null = null
  let inlineObjectives: { text: string; carried: boolean } | null = null

  if (objIdx >= 0) {
    if (middle.length >= 2) {
      section = middle[0]
      topic = middle[middle.length - 1]
    } else if (middle.length === 1) {
      topic = middle[0]
    }
  } else {
    const allNonCarried = middle.length > 0 && middle.every((m) => !m.carried)
    if (allNonCarried && middle.length >= 2) {
      // Rightmost cell looks objective-like (e.g. "Определение западающих целей").
      inlineObjectives = middle[middle.length - 1]
      topic = middle[middle.length - 2]
      if (middle.length >= 3) section = middle[0]
    } else if (middle.length >= 2) {
      section = middle[0]
      topic = middle[middle.length - 1]
    } else if (middle.length === 1) {
      topic = middle[0]
    }
  }

  // Notes: rightmost non-empty cell strictly after the hours span.
  const notesFloor = hoursEnd >= 0 ? hoursEnd : (objIdx >= 0 ? spanRight(row, objIdx) : orderEnd)
  let notesIdx = -1
  for (let i = row.length - 1; i > notesFloor; i--) {
    if (row[i].text.trim()) { notesIdx = i; break }
  }
  if (notesIdx > 0) notesIdx = spanLeft(row, notesIdx)

  // Date: first non-empty cell between hours and notes.
  let dateIdx = -1
  if (hoursEnd >= 0) {
    const dateEnd = notesIdx >= 0 ? notesIdx : row.length
    for (let i = hoursEnd + 1; i < dateEnd; i++) {
      if (row[i].text.trim()) { dateIdx = i; break }
    }
  }

  return {
    order,
    orderCarried,
    section: section?.text ?? null,
    sectionCarried: section?.carried ?? false,
    topic: topic?.text ?? null,
    topicCarried: topic?.carried ?? false,
    objectives:
      objIdx >= 0
        ? row[objIdx].text.trim()
        : inlineObjectives?.text ?? null,
    objectivesCarried:
      objIdx >= 0 ? row[objIdx].carried : inlineObjectives?.carried ?? false,
    hours,
    date: dateIdx >= 0 ? row[dateIdx].text.trim() : null,
    notes: notesIdx >= 0 ? row[notesIdx].text.trim() : null,
    notesCarried: notesIdx >= 0 ? row[notesIdx].carried : false,
  }
}

function detectQuarterOnlyRow(row: Cell[]): { quarter: number; hours: number | null } | null {
  const nonEmpty = row.filter((c) => c.text.trim().length > 0)
  const uniqueTexts = new Set(nonEmpty.map((c) => c.text))
  const looksLikeSpan = uniqueTexts.size === 1 && nonEmpty.length >= 3
  if (!(looksLikeSpan || (nonEmpty.length >= 1 && nonEmpty.length <= 2))) return null
  for (const text of uniqueTexts) {
    const q = parseQuarterLabel(text)
    if (q) return q
  }
  return null
}

function isHeaderRow(row: Cell[]): boolean {
  const joined = row.map((c) => c.text).join(' ').toLowerCase()
  return /цел[иьяы]|мақсат/.test(joined) && /тем|сабақт/.test(joined)
}

export async function parseKtpDocx(buffer: Buffer): Promise<ParsedKtp> {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  const root = parseHtml(html)
  const tables = root.querySelectorAll('table')
  if (tables.length === 0) throw new Error('В docx нет таблиц')

  const allRows: Cell[][] = []
  for (const t of tables) {
    const grid = extractRowsFromTable(t)
    for (const r of grid) allRows.push(r)
  }

  let language: 'ru' | 'kk' = 'ru'
  const firstHeader = allRows.find(isHeaderRow)
  if (firstHeader) language = detectLanguage(firstHeader.map((c) => c.text))

  const lessons: ParsedLesson[] = []
  let currentQuarter: number | null = null
  let currentSection: string | null = null
  let totalHours: number | null = null

  for (const row of allRows) {
    if (isHeaderRow(row)) continue

    const q = detectQuarterOnlyRow(row)
    if (q) {
      currentQuarter = q.quarter
      if (q.hours) totalHours = (totalHours ?? 0) + q.hours
      continue
    }

    const roles = classifyRow(row)
    // Skip completely empty rows.
    if (
      roles.order === null &&
      !roles.section &&
      !roles.topic &&
      !roles.objectives &&
      !roles.notes
    ) continue

    // A continuation row inherits topic + objectives via rowspan carry, or has
    // neither at all. Fold its date/notes into the previous lesson instead of
    // creating a duplicate.
    const isCarryContinuation =
      lessons.length > 0 &&
      !!roles.topic && !!roles.objectives &&
      roles.topicCarried && roles.objectivesCarried
    const isEmptyContinuation =
      lessons.length > 0 && !roles.topic && !roles.objectives

    if (isCarryContinuation || isEmptyContinuation) {
      const prev = lessons[lessons.length - 1]
      if (roles.date) {
        if (!prev.plannedDate) prev.plannedDate = roles.date
        else prev.plannedDate = `${prev.plannedDate} ${roles.date}`.trim()
      }
      // Skip carried notes — they're the same value the block was created with.
      if (roles.notes && !roles.notesCarried) {
        if (!prev.notes) prev.notes = roles.notes
        else prev.notes = `${prev.notes}; ${roles.notes}`.trim()
      }
      continue
    }

    if (roles.section) currentSection = roles.section

    lessons.push({
      orderNo: roles.order ?? lessons.length + 1,
      quarter: currentQuarter,
      section: currentSection,
      topic: roles.topic,
      objectives: roles.objectives,
      hours: roles.hours,
      plannedDate: roles.date,
      notes: roles.notes,
    })
  }

  lessons.forEach((l, i) => { l.orderNo = i + 1 })

  // Fallback: not every docx has "(N сағат)" next to quarter labels. Sum
  // per-lesson hours so the meta bar shows a reasonable total.
  if (totalHours === null) {
    const sum = lessons.reduce((s, l) => s + (l.hours ?? 0), 0)
    if (sum > 0) totalHours = sum
  }

  return { language, totalHours, lessons }
}
