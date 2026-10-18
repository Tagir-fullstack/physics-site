export function monitorGrade(score: number | null, maxTasks: number, maxPoints: number, finalPercent?: number | null) {
  if (score === null) return { percent: null, points: null };
  const percent = Math.min(100, Math.max(0, finalPercent ?? score / maxTasks * 100));
  return { percent: Math.round(percent * 100) / 100, points: Math.round(maxPoints * percent / 100 * 10) / 10 };
}

export function normalizeMonitorGroup(value: string) {
  const match = /^[BВ]\s*(\d{3})$/iu.exec(value.trim());
  return match ? `В${match[1]}` : null;
}

export const DEFAULT_MONITOR_GROUPS = ['В062', 'В063', 'В064', 'В076'];
