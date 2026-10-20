export function monitorGrade(score: number | null, maxTasks: number, maxPoints: number, finalPercent?: number | null) {
  if (score === null) return { percent: null, points: null };
  const percent = Math.min(100, Math.max(0, finalPercent ?? score / maxTasks * 100));
  return { percent: Math.round(percent * 100) / 100, points: Math.round(maxPoints * percent / 100 * 10) / 10 };
}

export function normalizeMonitorGroup(value: string) {
  const match = /^[BВ]\s*(\d{3})$/iu.exec(value.trim());
  return match ? `В${match[1]}` : null;
}

export const ASSESSMENT_GROUPS = ['B062', 'B063', 'B064', 'B076', 'B057'] as const;
export const DEFAULT_MONITOR_GROUPS = ASSESSMENT_GROUPS.map(group => group.replace('B', 'В'));

export function isAssessmentGroup(value: string) {
  const normalized = normalizeMonitorGroup(value);
  return normalized !== null && DEFAULT_MONITOR_GROUPS.includes(normalized);
}
