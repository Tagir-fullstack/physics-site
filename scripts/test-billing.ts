import assert from 'node:assert/strict'
import { billingConfig } from '../api/_lib/billing/config.js'
import { callbackSecret, digest, secretMatches, sealCard, openCard } from '../api/_lib/billing/crypto.js'
import { verifiedPayment, epayToken, readBankPayment, chargeSavedCard } from '../api/_lib/billing/epay.js'
import { addBillingMonths, moneyMinor } from '../src/lib/billing.js'
import { handleBilling } from '../api/_lib/billing/handler.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// No credentials, card numbers, external network or database writes in this suite.
const previous = { ...process.env }
try {
  for (const name of Object.keys(process.env)) if (name.startsWith('BILLING_') || name.startsWith('EPAY_')) delete process.env[name]
  assert.equal(billingConfig().enabled, false)
  const sandbox = { BILLING_MODE: 'sandbox', BILLING_STORAGE_READY: 'true', BILLING_CARD_KEY: '11'.repeat(32), BILLING_CALLBACK_KEY: 'c'.repeat(48), EPAY_TEST_CLIENT_ID: 'fixture-client', EPAY_TEST_CLIENT_SECRET: 'fixture-secret', EPAY_TEST_TERMINAL_ID: 'fixture-terminal', EPAY_TEST_MONTH_PRICE_KZT: '100', BILLING_RECURRING_ENABLED: 'true' }
  assert.equal(billingConfig(sandbox).enabled, true)
  for (const key of ['BILLING_STORAGE_READY', 'BILLING_CARD_KEY', 'BILLING_CALLBACK_KEY', 'EPAY_TEST_CLIENT_SECRET']) assert.equal(billingConfig({ ...sandbox, [key]: '' }).enabled, false)
  assert.equal(billingConfig({ ...sandbox, EPAY_PUBLIC_ORIGIN: 'http://evil.example' }).enabled, false)
  assert.equal(billingConfig({ ...sandbox, EPAY_TEST_MONTH_PRICE_KZT: '1.5' }).plans[0].amountMinor, null)
  assert.equal(billingConfig({ ...sandbox, BILLING_MODE: 'production', BILLING_LIVE_APPROVED: 'true' }).enabled, false)
  assert.equal(moneyMinor('12.22'), 1222)
  for (const invalid of ['1e2', '', '-1', '1.001', NaN, null]) assert.equal(moneyMinor(invalid), null)
  assert.equal(addBillingMonths(new Date('2028-01-31T12:00:00Z'), 1).toISOString(), '2028-02-29T12:00:00.000Z')
  assert.equal(addBillingMonths(new Date('2028-02-29T12:00:00Z'), 12).toISOString(), '2029-02-28T12:00:00.000Z')
  const secret = callbackSecret('order-fixture', sandbox.BILLING_CALLBACK_KEY)
  assert(secretMatches(secret, digest(secret)))
  assert(!secretMatches('spoofed', digest(secret)))
  const card = 'fixture-token-123456', encrypted = sealCard(card, 'user_one', sandbox.BILLING_CARD_KEY)
  assert(!encrypted.includes(card))
  assert.equal(openCard(encrypted, 'user_one', sandbox.BILLING_CARD_KEY), card)
  assert.throws(() => openCard(encrypted, 'user_two', sandbox.BILLING_CARD_KEY))
  assert.throws(() => openCard(encrypted.slice(0, -4), 'user_one', sandbox.BILLING_CARD_KEY))
  const order = { invoice: '123456', amount_minor: 10000, terminal: 'fixture-terminal', user_id: 'user_one' }
  const transaction = { id: 'fixture-transaction-123', invoiceID: '123456', amount: 100, currency: 'KZT', terminalID: 'fixture-terminal', accountID: 'user_one', cardID: card, statusName: 'CHARGE' }
  const raw = { resultCode: '100', transaction }
  assert.equal(verifiedPayment(raw, order)?.state, 'CHARGE')
  assert.equal(verifiedPayment({ resultCode: '102' }, order), null)
  for (const [key, value] of Object.entries({ invoiceID: '654321', amount: 101, currency: 'USD', terminalID: 'other-terminal', accountID: 'user_other' })) assert.throws(() => verifiedPayment({ ...raw, transaction: { ...transaction, [key]: value } }, order))
  assert.equal(verifiedPayment({ ...raw, transaction: { ...transaction, accountID: '' } }, order)?.cardId, null)
  Object.assign(process.env, sandbox)
  let oauthCalls = 0, paymentCalls = 0
  const transport: typeof fetch = async (input, init) => {
    const url = String(input)
    assert(url.startsWith('https://test-'))
    assert.equal(init?.redirect, 'error')
    if (url.includes('oauth2/token')) {
      oauthCalls++
      const body = init!.body as FormData
      assert.equal(body.get('client_secret'), 'fixture-secret')
      return Response.json({ access_token: 'fixture-access', expires_in: 7200, token_type: 'Bearer', client_secret: 'must-never-leak' })
    }
    if (url.includes('/payments/cards/auth')) {
      paymentCalls++
      const body = JSON.parse(String(init?.body))
      assert.equal(body.cardId.id, card); assert.equal(body.amount, 100); assert.equal(body.recurrent, true)
      throw Error('Simulated response lost after bank accepted request')
    }
    return Response.json(raw)
  }
  const token = await epayToken({ ...order, secret, postLink: 'https://physez.com/api/account?billing=callback' }, transport)
  assert(!JSON.stringify(token).includes('secret'))
  assert.equal((await readBankPayment(order, transport)).payment?.cardId, card)
  await assert.rejects(chargeSavedCard({ ...order, secret, postLink: 'https://physez.com/api/account?billing=callback' }, card, transport))
  assert.equal(paymentCalls, 1); assert.equal(oauthCalls, 3)
  process.env.BILLING_MODE = 'disabled'
  async function endpoint(query: string, method: string, user = false, body: unknown = {}) {
    let status = 200, result: Record<string, unknown> = {}
    const req = { query: { billing: query }, method, headers: { host: 'physez.com', origin: 'https://physez.com', authorization: 'Bearer fixture-session' }, body } as unknown as VercelRequest
    const res = { setHeader() {}, status(code: number) { status = code; return this }, json(data: Record<string, unknown>) { result = data; return this } } as unknown as VercelResponse
    await handleBilling(req, res, async () => user ? { userId: 'user_one', email: '', isPremium: false } : null)
    return { status, result }
  }
  assert.equal((await endpoint('callback', 'POST')).status, 503)
  assert.equal((await endpoint('callback', 'GET')).status, 405)
  assert.equal((await endpoint('worker', 'POST')).status, 401)
  assert.equal((await endpoint('summary', 'GET')).status, 401)
  assert.equal((await endpoint('catalog', 'GET')).result.enabled, false)
  assert.equal((await endpoint('checkout', 'POST', true, { action: 'checkout' })).status, 503)
  assert.equal((await endpoint('manage', 'POST', true, { action: 'verify', orderId: '../../etc' })).status, 400)
  Object.assign(process.env, sandbox)
  const checkout = { action: 'checkout', planId: 'pro-month', idempotencyKey: '00000000-0000-4000-8000-000000000001', autoRenew: false, termsAccepted: true, legalVersion: billingConfig().mode === 'sandbox' ? (await endpoint('catalog', 'GET')).result.legalVersion : '' }
  assert.equal((await endpoint('checkout', 'POST', true, checkout)).status, 400, 'Privacy consent is required independently')
  assert.equal((await endpoint('checkout', 'POST', true, { ...checkout, privacyAccepted: true, autoRenew: true, recurringConsent: false })).status, 400)
  assert.equal((await endpoint('checkout', 'POST', true, { ...checkout, privacyAccepted: true, legalVersion: 'stale' })).status, 400)
  assert.equal((await endpoint('checkout', 'POST', false, { ...checkout, privacyAccepted: true })).status, 401)
  console.log('PASS: billing configuration, money/calendar, card encryption/owner binding, callback secret, transaction identity, sandbox transport, timeout without retry, disabled API/auth guards')
} finally {
  for (const name of Object.keys(process.env)) if (!(name in previous)) delete process.env[name]
  Object.assign(process.env, previous)
}
