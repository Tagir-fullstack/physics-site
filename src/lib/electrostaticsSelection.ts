export type ElectroPracticeSelection = { userId: string; studentId: string; number: number }
export function parseElectroVariantNumber(input: string): number | null {
  const value = input.trim()
  if (!/^\d+$/.test(value)) return null
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 1 && number <= 1_000_000 ? number : null
}
// Server-backed PRO status and both identities must still match on every render.
export function activeElectroPractice(selection: ElectroPracticeSelection | null, userId: string | null, studentId: string | null, premium: boolean): number | null {
  return premium && userId && studentId && selection?.userId === userId && selection.studentId === studentId ? selection.number : null
}
