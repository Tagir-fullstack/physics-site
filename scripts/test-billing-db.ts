import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { createBillingStore } from '../api/_lib/billing/store.js'
import { billingLegal } from '../src/config/billingLegal.js'
import { databaseSql } from '../api/_lib/db.js'

// Deliberately cannot use DATABASE_URL or connect to the site's database.
const socket = '/private/tmp/physez-billing-pg-20261027'
const namespace = `billing_test_${randomUUID().replaceAll('-', '')}`
async function psql(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const localEnv: NodeJS.ProcessEnv = { ...process.env, PGOPTIONS: '', PGDATABASE: 'postgres', PGUSER: process.env.USER || 'tagir' }
    delete localEnv.PGSERVICE
    const child = spawn('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', socket, '-p', '55437', '-d', 'postgres'], { env: localEnv })
    let output = '', error = ''
    child.stdout.on('data', d => { output += d }); child.stderr.on('data', d => { error += d })
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(output) : reject(Error(error)))
    child.stdin.end(input)
  })
}
type Query = { statement: string; then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown> }
const literal = (v: unknown) => v === null || v === undefined ? 'NULL' : typeof v === 'boolean' ? String(v) : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
function outputQuery(q: string) {
  if (/^\s*select/i.test(q)) return `select coalesce(jsonb_agg(t),'[]') from (${q}) t;`
  if (!/^\s*with/i.test(q) && /\breturning\b/i.test(q)) return `with t as (${q}) select coalesce(jsonb_agg(t),'[]') from t;`
  return `${q}; select '[]';`
}
async function run(queries: Query[]) {
  const text = await psql(`begin; set local search_path to ${namespace};\n${queries.map(q => outputQuery(q.statement)).join('\n')}\ncommit;`)
  return text.trim().split('\n').map(line => JSON.parse(line))
}
const adapter = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => {
  const statement = strings.reduce((text, part, i) => text + (i ? literal(values[i - 1]) : '') + part, '')
  const q: Query = { statement, then: (resolve, reject) => run([q]).then(result => resolve(result[0]), reject) }
  return q
}, { transaction: (queries: Query[]) => run(queries) }) as unknown as typeof databaseSql
const store = createBillingStore(adapter)
const env = { ...process.env }
const legalBefore = structuredClone(billingLegal)
await psql(`create schema ${namespace};`)
try {
  const migration = await readFile(new URL('./sql/billing-epay.sql', import.meta.url), 'utf8')
  await psql(`set search_path to ${namespace};\n${migration}`)
  Object.assign(process.env, { BILLING_MODE: 'sandbox', BILLING_STORAGE_READY: 'true', BILLING_CARD_KEY: '22'.repeat(32), BILLING_CALLBACK_KEY: 'k'.repeat(48), EPAY_TEST_CLIENT_ID: 'fixture', EPAY_TEST_CLIENT_SECRET: 'fixture', EPAY_TEST_TERMINAL_ID: 'test-terminal', BILLING_RECURRING_ENABLED: 'true' })
  const plan = { id: 'pro-month', name: 'Fixture', months: 1, amountMinor: 10000, currency: 'KZT' as const }
  const user = 'user_fixture'
  const key = randomUUID()
  const initial = await Promise.all([store.createOrder(user, plan, true, key), store.createOrder(user, plan, true, key)])
  assert.equal(initial[0].id, initial[1].id)
  const order = initial[0]
  await assert.rejects(store.createOrder(user, plan, true, randomUUID()), /PENDING_ORDER/)
  const claims = await Promise.all([store.checkoutReady(order.id), store.checkoutReady(order.id)])
  assert.equal(claims.filter(Boolean).length, 1)
  await store.applyBankPayment(order, { id: 'fixture-transaction-one', state: 'AUTH', cardId: 'fixture-card-token-one' })
  assert.equal((await store.billingSummary(user)).subscription?.active, false)
  await Promise.all(Array.from({ length: 4 }, () => store.applyBankPayment(order, { id: 'fixture-transaction-one', state: 'CHARGE', cardId: 'fixture-card-token-one' })))
  let summary = await store.billingSummary(user)
  assert.equal(summary.subscription?.active, true); assert.equal(summary.subscription?.autoRenew, true)
  const end = summary.subscription!.paidThrough
  assert.equal(summary.orders.length, 1)
  assert.equal(await store.billingHasPremium(user), false, 'Sandbox cannot unlock real content')
  await store.applyBankPayment(order, { id: 'fixture-transaction-one', state: 'CHARGE', cardId: 'fixture-card-token-one' })
  assert.equal((await store.billingSummary(user)).subscription?.paidThrough, end)
  await psql(`set search_path to ${namespace}; update billing_subscriptions set paid_through=now()-interval '1 second';`)
  const renewals = await Promise.all([store.claimRenewal(user), store.claimRenewal(user)])
  assert.equal(renewals.filter(Boolean).length, 1)
  const renewal = renewals.find(Boolean)!
  const dispatched = await Promise.all([store.dispatchRenewal(renewal), store.dispatchRenewal(renewal)])
  assert.equal(dispatched.filter(Boolean).length, 1)
  await store.markDispatch(renewal.id, 'unknown')
  assert.equal(await store.claimRenewal(user), null)
  assert.equal(await store.dispatchRenewal(renewal), undefined)
  await store.cancelRenewal(user)
  await store.applyBankPayment(renewal, { id: 'fixture-transaction-renewal', state: 'CHARGE', cardId: 'fixture-card-token-one' })
  summary = await store.billingSummary(user)
  assert.equal(summary.subscription?.autoRenew, false, 'Late bank callback cannot undo cancellation')
  assert.equal(summary.subscription?.hasCard, false)
  assert.equal(summary.subscription?.active, true, 'Cancellation preserves paid access')
  const cancelledCheckout = await store.createOrder('user_cancel_before_capture', plan, true, randomUUID())
  await store.cancelRenewal('user_cancel_before_capture')
  await store.applyBankPayment(cancelledCheckout, { id: 'fixture-late-first-charge', state: 'CHARGE', cardId: 'fixture-card-late' })
  const late = await store.billingSummary('user_cancel_before_capture')
  assert.equal(late.subscription?.autoRenew, false)
  assert.equal(late.subscription?.hasCard, false)
  assert.equal(late.subscription?.active, true)
  await store.applyBankPayment(renewal, { id: 'fixture-transaction-renewal', state: 'REFUND', cardId: null })
  assert.equal((await store.findOrder(renewal.id))?.status, 'refunded')
  const other = await store.createOrder('user_no_card', plan, true, randomUUID())
  await store.applyBankPayment(other, { id: 'fixture-transaction-nocard', state: 'CHARGE', cardId: null })
  assert.equal((await store.billingSummary('user_no_card')).subscription?.autoRenew, false)
  // Production gates are enabled only inside this isolated test process with fixture documents.
  billingLegal.approved = true; billingLegal.version = 'fixture-approved'
  for (const doc of Object.values(billingLegal.documents)) doc.text = 'Fixture document, never published'
  Object.assign(process.env, { BILLING_MODE: 'production', VERCEL_ENV: 'production', BILLING_LIVE_APPROVED: 'true', BILLING_HOSTING_APPROVED: 'true', BILLING_LEGAL_APPROVED: 'true', BILLING_FISCAL_APPROVED: 'true', BILLING_RECURRING_APPROVED: 'true', EPAY_LIVE_TERMINAL_ID: 'live-fixture', EPAY_LIVE_CLIENT_ID: 'fixture', EPAY_LIVE_CLIENT_SECRET: 'fixture' })
  const live = await store.createOrder(user, plan, true, randomUUID())
  await store.applyBankPayment(live, { id: 'fixture-transaction-production', state: 'CHARGE', cardId: 'fixture-token-live' })
  assert.equal(await store.billingHasPremium(user), true)
  assert.equal(await store.billingHasPremium('user_other'), false)
  const duplicate = await store.createOrder('user_duplicate_transaction', plan, false, randomUUID())
  await assert.rejects(store.applyBankPayment(duplicate, { id: 'fixture-transaction-production', state: 'CHARGE', cardId: null }))
  assert.equal(await store.billingHasPremium('user_duplicate_transaction'), false)
  process.env.BILLING_MODE = 'disabled'
  assert.equal((await store.billingSummary(user)).subscription?.autoRenew, true)
  await store.cancelRenewal(user)
  assert.equal((await store.billingSummary(user)).subscription?.autoRenew, false)
  assert.equal(await store.billingHasPremium(user), true)
  process.env.BILLING_MODE = 'production'
  await store.applyBankPayment(live, { id: 'fixture-transaction-production', state: 'REFUND', cardId: null })
  assert.equal(await store.billingHasPremium(user), false)
  console.log('PASS: real local PostgreSQL migration; concurrent checkout/idempotency; CHARGE-only grant; duplicate callbacks; sandbox isolation; once-per-cycle renewal/dispatch; timeout reconciliation; cancellation vs late callback; refund revocation; owner isolation; cancellation while billing disabled')
} finally {
  await psql(`drop schema ${namespace} cascade;`)
  Object.assign(billingLegal, legalBefore)
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]
  Object.assign(process.env, env)
}
