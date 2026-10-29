import { randomUUID } from 'node:crypto'
import { databaseSql } from '../db.js'
import { billingConfig, requireBilling, LEGAL_VERSION, type BillingMode } from './config.js'
import { callbackSecret, digest, sealCard } from './crypto.js'
import type { BankPayment } from './epay.js'
import type { BillingPlan } from '../../../src/lib/billing.js'

export type BillingOrder = { id: string; user_id: string; environment: BillingMode; invoice: string; terminal: string; plan_id: string; amount_minor: number; months: number; recurring: boolean; kind: 'checkout' | 'renewal'; status: string; callback_hash: string; cancel_version: number; transaction_id: string | null; checked_at: string | null; created_at: string }
export function createBillingStore(sql: typeof databaseSql) {
async function billingHasPremium(userId: string) {
  if (!billingConfig().ready) return false
  try {
    const [r] = await sql`select exists(select 1 from billing_orders where user_id=${userId} and environment='production' and status='paid' and grant_starts<=now() and grant_ends>now()) as active`
    return r?.active === true
  } catch { return false } // New billing tables cannot break existing free accounts or legacy grants.
}
async function billingSummary(userId: string) {
  const c = billingConfig()
  if (!c.ready) return { mode: c.mode, enabled: false, recurringEnabled: false, reason: c.reason, plans: c.plans, legalVersion: LEGAL_VERSION, subscription: null, orders: [] }
  const environment = c.mode === 'sandbox' ? 'sandbox' : 'production'
  const [s] = await sql`select *,exists(select 1 from billing_orders o where o.user_id=billing_subscriptions.user_id and o.environment=billing_subscriptions.environment and o.status='paid' and o.grant_starts<=now() and o.grant_ends>now()) as active from billing_subscriptions where user_id=${userId} and environment=${environment}`
  const orders = await sql`select id,invoice,plan_id,amount_minor,status,created_at,recurring from billing_orders where user_id=${userId} and environment=${environment} order by created_at desc limit 20`
  return { mode: c.mode, enabled: c.enabled, recurringEnabled: c.recurringEnabled, reason: c.reason, plans: c.plans, legalVersion: LEGAL_VERSION,
    subscription: s ? { active: s.active === true, paidThrough: s.paid_through, autoRenew: s.auto_renew, planId: s.plan_id, hasCard: Boolean(s.card_cipher) } : null,
    orders: orders.map(o => ({ id: o.id, invoice: o.invoice, planId: o.plan_id, amountMinor: o.amount_minor, status: o.status, createdAt: o.created_at, recurring: o.recurring })),
  }
}
async function findOrder(id: string) {
  const [order] = await sql`select * from billing_orders where id=${id}::uuid`
  return order as BillingOrder | undefined
}
async function findInvoice(invoice: string) {
  const [order] = await sql`select * from billing_orders where invoice=${invoice}`
  return order as BillingOrder | undefined
}
async function createOrder(userId: string, plan: BillingPlan, recurring: boolean, idempotencyKey: string) {
  const c = requireBilling(), id = randomUUID()
  const secretHash = digest(callbackSecret(id, c.callbackKey))
  const result = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'billing:' + userId}))`,
    sql`insert into billing_subscriptions(user_id,environment) values(${userId},${c.mode}) on conflict do nothing`,
    sql`insert into billing_orders(id,user_id,environment,terminal,plan_id,amount_minor,months,recurring,kind,cycle_key,idempotency_key,callback_hash,cancel_version,legal_version)
      select ${id}::uuid,user_id,environment,${c.terminal},${plan.id},${plan.amountMinor},${plan.months},${recurring},'checkout',${'checkout:' + idempotencyKey},${idempotencyKey}::uuid,${secretHash},cancel_version,${LEGAL_VERSION}
      from billing_subscriptions s where user_id=${userId} and environment=${c.mode} and not auto_renew
        and not exists(select 1 from billing_orders o where o.user_id=s.user_id and o.environment=s.environment and o.status in ('created','pending','dispatching','unknown','requires_action'))
      on conflict do nothing`,
    sql`select * from billing_orders where user_id=${userId} and environment=${c.mode} and idempotency_key=${idempotencyKey}::uuid`,
  ])
  const order = result[3][0] as BillingOrder | undefined
  if (!order) throw Error('PENDING_ORDER_OR_AUTORENEW')
  return order
}
async function checkoutReady(id: string) {
  const rows = await sql`update billing_orders set status='pending',updated_at=now() where id=${id}::uuid and status='created' returning id`
  return rows.length === 1
}
async function reserveCheck(id: string) {
  const rows = await sql`update billing_orders set checked_at=now() where id=${id}::uuid and (checked_at is null or checked_at<now()-interval '10 seconds') returning id`
  return rows.length > 0
}
async function applyBankPayment(order: BillingOrder, payment: BankPayment) {
  const c = requireBilling()
  if (order.environment !== c.mode || order.transaction_id && order.transaction_id !== payment.id) throw Error('PAYMENT_IDENTITY_MISMATCH')
  if (payment.state === 'CHARGE') {
    const cipher = order.recurring && payment.cardId ? sealCard(payment.cardId, order.user_id, c.cryptoKey) : null
    await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'billing:' + order.user_id}))`,
      sql`with granted as (
        update billing_orders o set status='paid',transaction_id=${payment.id},
          grant_starts=greatest(coalesce(s.paid_through,now()),now()),
          grant_ends=((greatest(coalesce(s.paid_through,now()),now()) at time zone 'UTC') + make_interval(months=>o.months)) at time zone 'UTC',updated_at=now()
        from billing_subscriptions s where o.id=${order.id}::uuid and o.status in ('created','pending','dispatching','unknown','requires_action') and s.user_id=o.user_id and s.environment=o.environment
        returning o.*
      ) update billing_subscriptions s set paid_through=g.grant_ends,plan_id=g.plan_id,amount_minor=g.amount_minor,months=g.months,
        auto_renew=case when g.kind='renewal' then s.auto_renew else g.recurring and g.cancel_version=s.cancel_version and ${cipher}::text is not null end,
        card_cipher=case when g.cancel_version=s.cancel_version and g.recurring then coalesce(${cipher}::text,s.card_cipher) else s.card_cipher end,
        consent_version=case when g.kind='checkout' and g.recurring then g.legal_version else s.consent_version end,
        consent_at=case when g.kind='checkout' and g.recurring then g.accepted_at else s.consent_at end,updated_at=now()
      from granted g where s.user_id=g.user_id and s.environment=g.environment`,
    ])
  } else if (payment.state === 'REFUND') {
    await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'billing:' + order.user_id}))`,
      sql`update billing_orders set status='refunded',updated_at=now() where id=${order.id}::uuid and transaction_id=${payment.id} and status='paid'`,
      sql`update billing_subscriptions set auto_renew=false,cancel_version=cancel_version+1,card_cipher=null,updated_at=now() where user_id=${order.user_id} and environment=${order.environment} and exists(select 1 from billing_orders where id=${order.id}::uuid and status='refunded')`,
    ])
  } else if (['FAILED', 'REJECT', 'CANCEL', 'CANCEL_OLD'].includes(payment.state)) {
    await sql.transaction([
      sql`select pg_advisory_xact_lock(hashtext(${'billing:' + order.user_id}))`,
      sql`with failed as (update billing_orders set status='failed',updated_at=now() where id=${order.id}::uuid and status in ('created','pending','dispatching','unknown','requires_action') returning user_id,environment,kind)
      update billing_subscriptions s set auto_renew=false,updated_at=now() from failed f where s.user_id=f.user_id and s.environment=f.environment and f.kind='renewal'`,
    ])
  }
  // AUTH, NEW, FINGERPRINT, 3D and VERIFIED never grant paid access.
}
async function cancelRenewal(userId: string) {
  const c = billingConfig()
  if (!c.ready) return
  const environment = c.mode === 'sandbox' ? 'sandbox' : 'production'
  await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'billing:' + userId}))`,
    sql`update billing_subscriptions set auto_renew=false,cancel_version=cancel_version+1,card_cipher=null,updated_at=now() where user_id=${userId} and environment=${environment}`,
    sql`update billing_orders set status='cancelled',updated_at=now() where user_id=${userId} and environment=${environment} and kind='renewal' and status='created'`,
  ])
}
async function claimRenewal(userId: string) {
  const c = requireBilling(), id = randomUUID(), key = randomUUID()
  if (!c.recurringEnabled) return null
  const result = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'billing:' + userId}))`,
    sql`insert into billing_orders(id,user_id,environment,terminal,plan_id,amount_minor,months,recurring,kind,cycle_key,idempotency_key,callback_hash,cancel_version,legal_version)
      select ${id}::uuid,user_id,environment,${c.terminal},plan_id,amount_minor,months,true,'renewal','renewal:'||paid_through::text,${key}::uuid,${digest(callbackSecret(id, c.callbackKey))},cancel_version,consent_version
      from billing_subscriptions s where user_id=${userId} and environment=${c.mode} and auto_renew and card_cipher is not null and paid_through<=now() and consent_at is not null
      and not exists(select 1 from billing_orders o where o.user_id=s.user_id and o.environment=s.environment and status in ('created','pending','dispatching','unknown','requires_action')) on conflict do nothing returning *`,
  ])
  return (result[1][0] as BillingOrder | undefined) ?? null
}
async function dispatchRenewal(order: BillingOrder) {
  const result = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtext(${'billing:' + order.user_id}))`,
    sql`update billing_orders o set status='dispatching',updated_at=now() from billing_subscriptions s where o.id=${order.id}::uuid and o.status='created' and s.user_id=o.user_id and s.environment=o.environment and s.auto_renew and s.cancel_version=o.cancel_version returning s.card_cipher`,
  ])
  return result[1][0]?.card_cipher as string | undefined
}
async function markDispatch(id: string, status: 'unknown' | 'requires_action' | 'pending') {
  await sql`update billing_orders set status=${status},updated_at=now() where id=${id}::uuid and status='dispatching'`
}
async function pendingOrders(mode: BillingMode) {
  return await sql`select * from billing_orders where environment=${mode} and (status in ('pending','dispatching','unknown','requires_action') or (status='paid' and grant_ends>now())) and (checked_at is null or checked_at<now()-interval '30 seconds') order by checked_at nulls first,created_at limit 3` as BillingOrder[]
}
async function dueSubscriptions(mode: BillingMode) {
  return await sql`select user_id from billing_subscriptions where environment=${mode} and auto_renew and paid_through<=now() and card_cipher is not null order by paid_through limit 1` as Array<{ user_id: string }>
}
return { billingHasPremium, billingSummary, findOrder, findInvoice, createOrder, checkoutReady, reserveCheck, applyBankPayment, cancelRenewal, claimRenewal, dispatchRenewal, markDispatch, pendingOrders, dueSubscriptions }
}
export const { billingHasPremium, billingSummary, findOrder, findInvoice, createOrder, checkoutReady, reserveCheck, applyBankPayment, cancelRenewal, claimRenewal, dispatchRenewal, markDispatch, pendingOrders, dueSubscriptions } = createBillingStore(databaseSql)
