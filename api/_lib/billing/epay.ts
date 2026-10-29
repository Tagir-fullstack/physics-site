import { moneyMinor } from '../../../src/lib/billing.js'
import { requireBilling } from './config.js'
export type PaymentIdentity = { invoice: string; amount_minor: number; terminal: string; user_id: string }
export type BankPayment = { state: string; id: string; cardId: string | null }
type Transport = typeof fetch
async function request(url: string, init: RequestInit, transport: Transport) {
  const response = await transport(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw Error('EPAY_UNAVAILABLE')
  return await response.json() as Record<string, unknown>
}
export async function epayToken(order?: PaymentIdentity & { secret: string; postLink: string }, transport: Transport = fetch) {
  const c = requireBilling()
  const body = new FormData()
  for (const [key, value] of Object.entries({ grant_type: 'client_credentials', scope: 'webapi usermanagement email_send verification statement statistics payment', client_id: c.clientId, client_secret: c.clientSecret, terminal: c.terminal,
    ...(order ? { invoiceID: order.invoice, amount: String(order.amount_minor / 100), currency: 'KZT', secret_hash: order.secret, postLink: order.postLink, failurePostLink: order.postLink } : {}) })) body.set(key, value)
  const auth = await request(c.endpoints.oauth, { method: 'POST', body }, transport)
  if (typeof auth.access_token !== 'string' || typeof auth.expires_in !== 'number' || auth.token_type !== 'Bearer') throw Error('EPAY_BAD_TOKEN')
  // Never return client credentials, callback secrets or unknown bank response fields.
  return { access_token: auth.access_token, expires_in: auth.expires_in, refresh_token: '', token_type: 'Bearer', scope: typeof auth.scope === 'string' ? auth.scope : 'payment' }
}
export function verifiedPayment(raw: Record<string, unknown>, order: PaymentIdentity): BankPayment | null {
  if (String(raw.resultCode) !== '100' || !raw.transaction || typeof raw.transaction !== 'object') return null
  const t = raw.transaction as Record<string, unknown>
  if (String(t.invoiceID ?? t.invoiceId) !== order.invoice || moneyMinor(t.amount) !== order.amount_minor || t.currency !== 'KZT' || (t.terminalID ?? t.terminalId ?? t.terminal) !== order.terminal || typeof t.id !== 'string' || !/^[a-zA-Z0-9-]{8,128}$/.test(t.id)) throw Error('EPAY_TRANSACTION_MISMATCH')
  const account = t.accountID ?? t.accountId
  if (account && account !== order.user_id) throw Error('EPAY_ACCOUNT_MISMATCH')
  const card = t.cardID ?? t.cardId
  return { state: String(t.statusName), id: t.id, cardId: account === order.user_id && typeof card === 'string' && /^[a-zA-Z0-9-]{8,128}$/.test(card) ? card : null }
}
export async function readBankPayment(order: PaymentIdentity, transport: Transport = fetch) {
  const c = requireBilling()
  if (order.terminal !== c.terminal) throw Error('EPAY_TERMINAL_CHANGED')
  const auth = await epayToken(undefined, transport)
  const raw = await request(`${c.endpoints.api}/check-status/payment/transaction/${encodeURIComponent(order.invoice)}`, { headers: { Authorization: `Bearer ${auth.access_token}` } }, transport)
  return { resultCode: String(raw.resultCode), payment: verifiedPayment(raw, order) }
}
export async function chargeSavedCard(order: PaymentIdentity & { secret: string; postLink: string }, cardId: string, transport: Transport = fetch) {
  const c = requireBilling()
  if (!c.recurringEnabled) throw Error('RECURRING_DISABLED')
  const auth = await epayToken(order, transport)
  // Exactly one dispatch per persisted order. A timeout must only lead to status reconciliation.
  return request(`${c.endpoints.api}/payments/cards/auth`, { method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: order.amount_minor / 100, currency: 'KZT', terminalId: order.terminal, invoiceId: order.invoice, accountId: order.user_id, description: 'Physez PRO', paymentType: 'cardId', recurrent: true, cardId: { id: cardId }, postLink: order.postLink, failurePostLink: order.postLink, backLink: `${c.origin}/premium`, failureBackLink: `${c.origin}/premium`, language: 'rus' }) }, transport)
}
