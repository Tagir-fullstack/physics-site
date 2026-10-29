export type BillingPlan = { id: string; name: string; months: number; amountMinor: number | null; currency: 'KZT' }
export type BillingSummary = {
  mode: 'disabled' | 'sandbox' | 'production'; enabled: boolean; recurringEnabled: boolean; reason: string;
  plans: BillingPlan[]; legalVersion: string; subscription: { active: boolean; paidThrough: string | null; autoRenew: boolean; planId: string | null; hasCard: boolean } | null;
  orders: Array<{ id: string; invoice: string; planId: string; amountMinor: number; status: string; createdAt: string; recurring: boolean }>;
}
export function addBillingMonths(date: Date, months: number): Date {
  if (!Number.isInteger(months) || months < 1 || months > 12 || !Number.isFinite(date.getTime())) throw Error('Invalid billing period')
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months)
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, last))
  return result
}
export function moneyMinor(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value)) return null
  const n = Number(value), cents = Math.round(n * 100)
  return Number.isFinite(n) && cents > 0 && Number.isSafeInteger(cents) && Math.abs(cents / 100 - n) < 1e-8 ? cents : null
}
