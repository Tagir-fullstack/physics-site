export type AssessmentEvent = { type: string; at: string }
export type AssessmentPolicy = {
  version: 1
  waiver?: { reason: string; at: string; actor: string }
}
export type PenaltySummary = {
  policyVersion: number | null
  penaltyPoints: number
  calculatedPenaltyPoints: number
  finalPercent: number | null
  waiverReason: string | null
}

// Separate categories have one free warning each. Related signals within
// ten seconds of the first signal count as one episode (not a sliding window).
export function assessmentPenalty(policy: AssessmentPolicy | undefined, events: AssessmentEvent[], score: number | null, maxScore = 3): PenaltySummary {
  const groups = new Map<string, { at: number; count: number }>()
  let points = 0
  if (policy?.version === 1) {
    const ordered = events.map(e => ({ ...e, time: Date.parse(e.at) })).filter(e => Number.isFinite(e.time)).sort((a, b) => a.time - b.time)
    for (const event of ordered) {
      const category = ['tab-hidden', 'fullscreen-exit'].includes(event.type) ? 'visibility'
        : ['copy', 'cut', 'paste', 'print-shortcut'].includes(event.type) ? 'clipboard' : null
      if (!category) continue
      const previous = groups.get(category)
      if (previous && event.time - previous.at <= 10_000) continue
      const count = (previous?.count ?? 0) + 1
      groups.set(category, { at: event.time, count })
      if (count > 1) points += category === 'visibility' ? 1 : 2
    }
  }
  const calculatedPenaltyPoints = Math.min(10, points)
  const penaltyPoints = policy?.waiver ? 0 : calculatedPenaltyPoints
  return {
    policyVersion: policy?.version ?? null,
    penaltyPoints,
    calculatedPenaltyPoints,
    finalPercent: score === null ? null : Math.round(Math.max(0, score / maxScore * 100 - penaltyPoints) * 100) / 100,
    waiverReason: policy?.waiver?.reason ?? null,
  }
}
