import type { VercelRequest, VercelResponse } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'
import type { ClerkUser } from '../auth.js'
import { sameOrigin } from '../studentProfile.js'
import { billingConfig, requireBilling, LEGAL_VERSION } from './config.js'
import { callbackSecret, digest, openCard, secretMatches } from './crypto.js'
import { chargeSavedCard, epayToken, readBankPayment } from './epay.js'
import { applyBankPayment, billingSummary, cancelRenewal, checkoutReady, claimRenewal, createOrder, dispatchRenewal, dueSubscriptions, findInvoice, findOrder, markDispatch, pendingOrders, reserveCheck, type BillingOrder } from './store.js'

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
async function bodyOf(req: VercelRequest) {
  if (req.body !== undefined) {
    if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > 16384) throw Error('BODY_LIMIT')
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('BAD_BODY')
    return body as Record<string, unknown>
  }
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > 16384) throw Error('BODY_LIMIT'); chunks.push(Buffer.from(chunk)) }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('BAD_BODY')
  return body as Record<string, unknown>
}
export async function reconcileOrder(order: BillingOrder) {
  const c = requireBilling()
  if (c.mode !== order.environment) throw Error('PAYMENT_ENVIRONMENT_MISMATCH')
  if (!await reserveCheck(order.id)) return
  const result = await readBankPayment(order)
  if (result.payment) await applyBankPayment(order, result.payment)
}
function jobAuthenticated(req: VercelRequest) {
  const expected = process.env.BILLING_SCHEDULER_SECRET || '', actual = req.headers.authorization?.replace(/^Bearer /, '') || ''
  return expected.length >= 32 && timingSafeEqual(Buffer.from(digest(expected), 'hex'), Buffer.from(digest(actual), 'hex'))
}
async function worker() {
  const c = requireBilling()
  let verified = 0, dispatched = 0
  for (const order of await pendingOrders(c.mode)) { try { await reconcileOrder(order); verified++ } catch { console.warn('Billing reconciliation pending', { orderId: order.id }) } }
  if (c.recurringEnabled) for (const s of await dueSubscriptions(c.mode)) {
    const order = await claimRenewal(s.user_id)
    if (!order) continue
    const cipher = await dispatchRenewal(order)
    if (!cipher) continue
    try {
      const raw = await chargeSavedCard({ ...order, secret: callbackSecret(order.id, c.callbackKey), postLink: `${c.origin}/api/account?billing=callback` }, openCard(cipher, order.user_id, c.cryptoKey))
      await markDispatch(order.id, raw.status === '3D' ? 'requires_action' : 'pending')
      dispatched++
      await reconcileOrder({ ...order, status: 'pending' })
    } catch { await markDispatch(order.id, 'unknown'); console.warn('Billing dispatch outcome unknown', { orderId: order.id }) }
  }
  return { verified, dispatched }
}
// Reuse /api/account to stay within the existing Vercel function architecture.
export async function handleBilling(req: VercelRequest, res: VercelResponse, getUser: () => Promise<ClerkUser | null>) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  try {
    if (req.query.billing === 'callback') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      const c = requireBilling(), body = await bodyOf(req)
      const invoice = body.invoiceId ?? body.invoiceID
      if (typeof invoice !== 'string' || !/^\d{6}$/.test(invoice)) return res.status(400).json({ error: 'Invalid callback' })
      const order = await findInvoice(invoice)
      if (!order || order.environment !== c.mode || !secretMatches(body.secret_hash, order.callback_hash)) return res.status(401).json({ error: 'Invalid callback' })
      // All amount/status/card fields in the callback are untrusted. Only bank status API may grant access.
      await reconcileOrder(order)
      return res.status(200).json({ received: true })
    }
    if (req.query.billing === 'worker') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      if (!jobAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' })
      return res.status(200).json(await worker())
    }
    if (req.query.billing === 'catalog' && req.method === 'GET') {
      const c = billingConfig()
      return res.status(200).json({ mode: c.mode, enabled: c.enabled, recurringEnabled: c.recurringEnabled, plans: c.plans, reason: c.reason, legalVersion: LEGAL_VERSION })
    }
    const user = await getUser()
    if (!user) return res.status(401).json({ error: 'Войдите в аккаунт, чтобы управлять подпиской.' })
    if (req.method === 'GET') return res.status(200).json(await billingSummary(user.userId))
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    if (!sameOrigin(req) || !req.headers.authorization?.startsWith('Bearer ')) return res.status(403).json({ error: 'Нужна подтверждённая сессия этого сайта.' })
    const body = await bodyOf(req)
    if (body.action === 'cancelRenewal') { await cancelRenewal(user.userId); return res.status(200).json(await billingSummary(user.userId)) }
    if (body.action === 'verify') {
      if (typeof body.orderId !== 'string' || !uuid.test(body.orderId)) return res.status(400).json({ error: 'Укажите заказ.' })
      const order = await findOrder(body.orderId)
      if (!order || order.user_id !== user.userId) return res.status(404).json({ error: 'Заказ не найден.' })
      await reconcileOrder(order)
      return res.status(200).json(await billingSummary(user.userId))
    }
    if (body.action !== 'checkout') return res.status(400).json({ error: 'Неизвестное действие.' })
    const c = requireBilling(), plan = c.plans.find(p => p.id === body.planId)
    if (!plan?.amountMinor || typeof body.idempotencyKey !== 'string' || !uuid.test(body.idempotencyKey) || typeof body.autoRenew !== 'boolean') return res.status(400).json({ error: 'Выберите настроенный тариф и способ оплаты.' })
    if (body.termsAccepted !== true || body.privacyAccepted !== true || body.legalVersion !== LEGAL_VERSION || body.autoRenew && (body.recurringConsent !== true || !c.recurringEnabled)) return res.status(400).json({ error: 'Нужны согласия с условиями и обработкой данных; для автопродления — отдельное согласие.' })
    const order = await createOrder(user.userId, plan, body.autoRenew, body.idempotencyKey)
    if (order.plan_id !== plan.id || order.amount_minor !== plan.amountMinor || order.recurring !== body.autoRenew) return res.status(409).json({ error: 'Условия заказа уже зафиксированы. Проверьте существующий заказ.' })
    if (order.status !== 'created') return res.status(409).json({ error: 'Заказ уже создан. Проверьте его статус; не создавайте повторную оплату.' })
    if (!await checkoutReady(order.id)) return res.status(409).json({ error: 'Заказ уже передаётся в банк. Проверьте его статус.' })
    const postLink = `${c.origin}/api/account?billing=callback`
    const auth = await epayToken({ ...order, secret: callbackSecret(order.id, c.callbackKey), postLink })
    return res.status(201).json({ orderId: order.id, script: c.endpoints.script, mode: c.mode, payment: { auth, invoiceId: order.invoice, amount: order.amount_minor / 100, currency: 'KZT', terminal: order.terminal, accountId: order.user_id, language: 'rus', description: 'Physez PRO', backLink: `${c.origin}/premium?order=${order.id}`, failureBackLink: `${c.origin}/premium?order=${order.id}`, autoBackLink: true, postLink, failurePostLink: postLink, cardSave: order.recurring, recurrent: order.recurring } })
  } catch (e) {
    const code = e instanceof Error ? e.message : ''
    if (['BODY_LIMIT', 'BAD_BODY'].includes(code) || e instanceof SyntaxError) return res.status(400).json({ error: 'Некорректный запрос.' })
    if (code === 'PENDING_ORDER_OR_AUTORENEW') return res.status(409).json({ error: 'Есть незавершённый заказ или включено автопродление. Проверьте заказ или сначала отключите продление.' })
    return res.status(503).json({ error: code === 'BILLING_DISABLED' ? 'Оплата ещё не запущена. Реальные списания отключены.' : 'Не удалось проверить платёж. Не оплачивайте повторно; повторите проверку статуса позже.' })
  }
}
