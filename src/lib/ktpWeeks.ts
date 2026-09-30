export type WeekLesson = {
  orderNo: number
  quarter: number | null
  section: string | null
  topic: string | null
  objectives: string | null
  hours: number | null
}

export type WeekEntry = {
  lessonOrderNo: number
  topic: string | null
  section: string | null
  objectives: string | null
  fullHours: number
  hoursThisWeek: number
  isStart: boolean
  isEnd: boolean
  quarter: number | null
}

export type WeekBucket = {
  weekIndex: number
  entries: WeekEntry[]
}

const DEFAULT_HOURS_PER_LESSON = 1

export function computeWeeklyBuckets(
  lessons: WeekLesson[],
  hoursPerWeek: number,
): WeekBucket[] {
  if (hoursPerWeek <= 0) return []
  const buckets: WeekBucket[] = []
  let curr: WeekBucket = { weekIndex: 0, entries: [] }
  let filled = 0

  const flush = () => {
    buckets.push(curr)
    curr = { weekIndex: curr.weekIndex + 1, entries: [] }
    filled = 0
  }

  for (const lesson of lessons) {
    const fullHours = Math.max(1, lesson.hours ?? DEFAULT_HOURS_PER_LESSON)
    let remaining = fullHours
    let isStart = true
    while (remaining > 0) {
      if (filled >= hoursPerWeek) flush()
      const take = Math.min(remaining, hoursPerWeek - filled)
      const willEnd = remaining - take === 0
      curr.entries.push({
        lessonOrderNo: lesson.orderNo,
        topic: lesson.topic,
        section: lesson.section,
        objectives: lesson.objectives,
        fullHours,
        hoursThisWeek: take,
        isStart,
        isEnd: willEnd,
        quarter: lesson.quarter,
      })
      filled += take
      remaining -= take
      isStart = false
    }
  }
  if (curr.entries.length > 0) buckets.push(curr)
  return buckets
}

export function parseAcademicYearStart(
  academicYear: string | null,
  now: Date = new Date(),
): Date {
  if (academicYear) {
    const m = academicYear.match(/(\d{4})/)
    if (m) return new Date(parseInt(m[1], 10), 8, 1)
  }
  const yr = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return new Date(yr, 8, 1)
}

export function getCurrentWeekIndex(
  academicYear: string | null,
  now: Date = new Date(),
): number {
  const start = parseAcademicYearStart(academicYear, now)
  const ms = now.getTime() - start.getTime()
  if (ms < 0) return 0
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000))
}

export function isWeekendUpcoming(now: Date = new Date()): boolean {
  const day = now.getDay()
  return day === 6 || day === 0
}
