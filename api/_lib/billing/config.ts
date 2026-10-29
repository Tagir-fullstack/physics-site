import type { BillingPlan } from '../../../src/lib/billing.js'
import { billingLegal, billingLegalPublished } from '../../../src/config/billingLegal.js'
export type BillingMode = 'sandbox' | 'production'
export const EPAY_ENDPOINTS = {
  sandbox: { oauth: 'https://test-epay-oauth.epayment.kz/oauth2/token', api: 'https://test-epay-api.epayment.kz', script: 'https://test-epay.epayment.kz/payform/payment-api.js' },
  production: { oauth: 'https://epay-oauth.homebank.kz/oauth2/token', api: 'https://epay-api.homebank.kz', script: 'https://epay.homebank.kz/payform/payment-api.js' },
} as const
export const LEGAL_VERSION = billingLegal.version
export function billingConfig(env = process.env) {
  const mode = env.BILLING_MODE === 'sandbox' || env.BILLING_MODE === 'production' ? env.BILLING_MODE : 'disabled'
  const prefix = mode === 'production' ? 'EPAY_LIVE_' : 'EPAY_TEST_'
  const integerPrice = (raw: string | undefined) => raw && /^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 10_000_000 ? Number(raw) * 100 : null
  const plans: BillingPlan[] = [
    { id: 'pro-month', name: 'PRO на месяц', months: 1, amountMinor: integerPrice(env[`${prefix}MONTH_PRICE_KZT`]), currency: 'KZT' },
    { id: 'pro-year', name: 'PRO на год', months: 12, amountMinor: integerPrice(env[`${prefix}YEAR_PRICE_KZT`]), currency: 'KZT' },
  ]
  let origin = ''
  try { const url = new URL(env.EPAY_PUBLIC_ORIGIN || 'https://physez.com'); if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash && (mode !== 'production' || url.origin === 'https://physez.com')) origin = url.origin } catch { /* Fail closed. */ }
  const terminal = env[`${prefix}TERMINAL_ID`] || '', clientId = env[`${prefix}CLIENT_ID`] || '', clientSecret = env[`${prefix}CLIENT_SECRET`] || ''
  const cryptoKey = env.BILLING_CARD_KEY || '', callbackKey = env.BILLING_CALLBACK_KEY || ''
  const ready = env.BILLING_STORAGE_READY === 'true'
  const liveApproved = env.BILLING_LIVE_APPROVED === 'true' && env.BILLING_HOSTING_APPROVED === 'true' && env.BILLING_LEGAL_APPROVED === 'true' && env.BILLING_FISCAL_APPROVED === 'true' && env.VERCEL_ENV === 'production' && billingLegalPublished()
  const enabled = mode !== 'disabled' && ready && Boolean(origin && terminal && clientId && clientSecret && /^[a-f0-9]{64}$/i.test(cryptoKey) && callbackKey.length >= 32) && (mode === 'sandbox' || liveApproved)
  const recurringEnabled = enabled && env.BILLING_RECURRING_ENABLED === 'true' && (mode === 'sandbox' || env.BILLING_RECURRING_APPROVED === 'true')
  return { mode, plans, origin, terminal, clientId, clientSecret, cryptoKey, callbackKey, ready, enabled, recurringEnabled,
    reason: mode === 'disabled' ? 'Приём платежей пока не запущен.' : !enabled ? 'Интеграция ещё не настроена или не согласована для запуска.' : mode === 'sandbox' ? 'Тестовый режим: только тестовые карты ePay. Реальный PRO не активируется.' : '',
    endpoints: EPAY_ENDPOINTS[mode === 'production' ? 'production' : 'sandbox'],
  }
}
export function requireBilling() {
  const config = billingConfig()
  if (!config.enabled || config.mode === 'disabled') throw Error('BILLING_DISABLED')
  return { ...config, mode: config.mode as BillingMode }
}
