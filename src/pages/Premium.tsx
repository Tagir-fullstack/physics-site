import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import type { BillingSummary } from '../lib/billing'
import '../styles/premium.css'

type Checkout = { script: string; mode: string; orderId: string; payment: Record<string, unknown> }
declare global { interface Window { halyk?: { pay: (payment: Record<string, unknown>) => void } } }
const scripts = new Set(['https://test-epay.epayment.kz/payform/payment-api.js', 'https://epay.homebank.kz/payform/payment-api.js'])
async function loadPaymentScript(url: string) {
  if (!scripts.has(url)) throw Error('Неизвестный адрес платёжной формы.')
  const existing = document.querySelector<HTMLScriptElement>('script[data-epay]')
  if (existing?.src === url && window.halyk) return
  if (existing && existing.src !== url) throw Error('Режим оплаты изменился. Обновите страницу.')
  existing?.remove()
  await new Promise<void>((resolve, reject) => {
    const node = document.createElement('script'); node.src = url; node.dataset.epay = 'true'; node.async = true; node.referrerPolicy = 'no-referrer'
    const timer = window.setTimeout(() => { node.remove(); reject(Error('Форма банка не загрузилась. Проверьте статус заказа перед повторной оплатой.')) }, 15000)
    node.onload = () => { clearTimeout(timer); if (window.halyk) resolve(); else reject(Error('Форма банка недоступна.')) }
    node.onerror = () => { clearTimeout(timer); node.remove(); reject(Error('Не удалось загрузить форму банка.')) }
    document.head.appendChild(node)
  })
}
const price = (minor: number | null) => minor === null ? 'Цена согласовывается' : `${(minor / 100).toLocaleString('ru-KZ')} ₸`
const orderLabels: Record<string, string> = { created: 'Заказ создан', pending: 'Ожидает проверки', dispatching: 'Отправлен в банк', unknown: 'Результат уточняется — не оплачивайте повторно', requires_action: 'Нужна проверка банком/3-D Secure', paid: 'Оплата подтверждена', failed: 'Оплата не прошла', cancelled: 'Отменён', refunded: 'Возвращён' }
function PremiumSkeleton() {
  return <div className="premium-loading" role="status" aria-label="Загрузка тарифов" aria-busy="true">
    <div className="premium-loading-heading" aria-hidden="true"><span className="premium-skeleton skeleton-title"/><span className="premium-skeleton skeleton-period"/></div>
    <div className="pricing-grid" aria-hidden="true">{[0, 1].map(card => <div className="premium-loading-card" key={card}>
      <span className="premium-skeleton skeleton-icon"/><span className="premium-skeleton skeleton-name"/><span className="premium-skeleton skeleton-price"/><span className="premium-skeleton skeleton-button"/>
      <div className="premium-loading-lines">{[0, 1, 2, 3, 4].map(line => <span className={`premium-skeleton${line % 2 ? ' skeleton-line-short' : ''}`} key={line}/>)}</div>
    </div>)}</div>
  </div>
}
function PlanSymbol({ pro = false }: { pro?: boolean }) {
  return <svg className={`pricing-symbol${pro ? ' pricing-symbol-pro' : ''}`} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {pro ? <><path d="M10 56h44M27 10v46M9 29h39M27 29h25v12"/><circle cx="27" cy="29" r="7"/><circle cx="27" cy="29" r="2"/><rect x="23.5" y="13" width="7" height="8" rx="1"/><rect x="23.5" y="37" width="7" height="8" rx="1"/><rect x="11" y="25.5" width="8" height="7" rx="1"/><rect x="35" y="25.5" width="8" height="7" rx="1"/><circle cx="52" cy="29" r="2.5"/><rect x="47" y="41" width="10" height="7" rx="1"/></> : <><ellipse cx="32" cy="32" rx="26" ry="10"/><ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(120 32 32)"/><circle cx="32" cy="32" r="3.5" fill="currentColor" stroke="none"/><circle cx="54" cy="27" r="2.5" fill="currentColor" stroke="none"/></>}
  </svg>
}
export default function Premium() {
  const { user, isLoading, isPremium } = useAuth()
  const { authFetch } = useApiClient()
  const [params] = useSearchParams()
  const returnOrder = params.get('order')
  const [data, setData] = useState<BillingSummary | null>(null)
  const [planId, setPlanId] = useState('pro-month')
  const [automatic, setAutomatic] = useState(false)
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCheckout, setShowCheckout] = useState(false)
  const checkoutKey = useRef<string | null>(null)
  useEffect(() => {
    if (isLoading) return
    let live = true
    const path = user ? '/api/account?billing=summary' : '/api/account?billing=catalog'
    void authFetch(path).then(async response => {
      const body = await response.json(); if (!response.ok) throw Error(body.error || 'Не удалось загрузить подписку.')
      if (live) { setData({ subscription: null, orders: [], ...body }); setError('') }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Ошибка загрузки.') })
    return () => { live = false; checkoutKey.current = null }
  }, [authFetch, isLoading, user])
  useEffect(() => {
    if (!user || !returnOrder || !/^[a-f0-9-]{36}$/i.test(returnOrder)) return
    let live = true
    void authFetch('/api/account?billing=verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', orderId: returnOrder }) }).then(async response => {
      const body = await response.json(); if (!response.ok) throw Error(body.error || 'Не удалось проверить платёж.')
      if (live) { setData(body); setNotice('Статус запрошен у банка. Возврат на сайт сам по себе не подтверждает оплату.'); window.dispatchEvent(new Event('billing-access-changed')) }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Ошибка проверки.') })
    return () => { live = false }
  }, [user, returnOrder, authFetch])
  const action = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await authFetch('/api/account?billing=manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await response.json(); if (!response.ok) throw Error(body.error || 'Не удалось выполнить действие.')
      setData(body); window.dispatchEvent(new Event('billing-access-changed'))
      if (payload.action === 'cancelRenewal') setNotice('Будущие списания отключены. Оплаченный доступ сохраняется до конца периода. Уже отправленная в банк операция может завершиться.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка запроса.') }
    finally { setBusy(false) }
  }
  const checkout = async () => {
    if (!user || !data?.enabled || !terms || !privacy || automatic && !consent) return
    setBusy(true); setError('')
    try {
      checkoutKey.current ??= crypto.randomUUID()
      const response = await authFetch('/api/account?billing=checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'checkout', planId, autoRenew: automatic, termsAccepted: terms, privacyAccepted: privacy, recurringConsent: consent, legalVersion: data.legalVersion, idempotencyKey: checkoutKey.current }) })
      const body = await response.json() as Checkout & { error?: string }
      if (!response.ok) throw Error(body.error || 'Не удалось создать заказ.')
      await loadPaymentScript(body.script)
      window.halyk!.pay(body.payment)
      setNotice('Открывается платёжная страница Halyk ePay. Данные карты вводятся только на стороне банка.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка оплаты. Не создавайте повторный платёж без проверки статуса.') }
    finally { setBusy(false) }
  }
  const selected = data?.plans.find(p => p.id === planId)
  const sub = data?.subscription
  const pending = data?.orders.some(o => ['created', 'pending', 'dispatching', 'unknown', 'requires_action'].includes(o.status))
  const monthly = data?.plans.find(p => p.months === 1)?.amountMinor
  const yearly = data?.plans.find(p => p.months === 12)?.amountMinor
  const saving = monthly && yearly && yearly < monthly * 12 ? Math.floor((1 - yearly / (monthly * 12)) * 100) : 0
  const proActive = isPremium || sub?.active && data?.mode !== 'sandbox'
  const backIcon = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>
  if ((!data || isLoading) && !error) return <main className="premium-page premium-pricing"><div className="premium-container"><Link className="pricing-back" to="/account" aria-label="Вернуться в личный кабинет">{backIcon}</Link><PremiumSkeleton/></div></main>
  return <main className={`premium-page premium-pricing${showCheckout ? ' premium-checkout-view' : ''}`}><div className="premium-container">
    {showCheckout ? <button className="pricing-back" disabled={busy} aria-label="Вернуться к тарифам" onClick={() => { setShowCheckout(false); requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelector<HTMLButtonElement>('.pricing-cta-pro')?.focus({ preventScroll: true }) }) }}>{backIcon}</button> : <Link className="pricing-back" to="/account" aria-label="Вернуться в личный кабинет">{backIcon}</Link>}
    <header className="premium-heading pricing-heading"><h1>{showCheckout ? 'Оформление PRO' : 'Тарифы Physez'}</h1></header>
    {error && <p className="premium-notice error" role="alert">{error}</p>}{notice && <p className="premium-notice" role="status">{notice}</p>}
    {data && <>
      {!showCheckout && <>
      <fieldset className="premium-plans pricing-period"><legend className="pricing-sr-only">Период PRO</legend>{data.plans.map(plan => <label key={plan.id} className={planId === plan.id ? 'selected' : ''}><input type="radio" name="plan" checked={planId === plan.id} disabled={busy} onChange={() => { setPlanId(plan.id); setConsent(false); checkoutKey.current = null }}/><span>{plan.months === 12 ? 'За год' : 'За месяц'}{plan.months === 12 && saving > 0 && <small>−{saving}%</small>}</span></label>)}</fieldset>
      <div className="pricing-grid">
        <section className="pricing-card" aria-labelledby="free-title"><PlanSymbol/><div className="pricing-card-intro"><h2 id="free-title">Базовый</h2></div><div className="pricing-price"><strong>0 ₸</strong><span>Всегда бесплатно</span></div><Link to="/labs" className="pricing-cta pricing-cta-free">Продолжить бесплатно <span aria-hidden="true">↗</span></Link><div className="pricing-features"><ul><li>Учебные материалы по физике</li><li>Лабораторные и проведение опытов</li><li>Прохождение контрольных срезов</li><li>Личный профиль и постоянный вариант</li></ul></div></section>
        <section className="pricing-card pricing-card-pro" aria-labelledby="pro-title"><div className="pricing-card-top"><PlanSymbol pro/>{proActive && <span className="pricing-plan-tag">Ваш тариф</span>}</div><div className="pricing-card-intro"><h2 id="pro-title">Physez PRO</h2></div><div className={`pricing-price${selected?.amountMinor ? '' : ' pricing-price-soon'}`}><strong>{selected?.amountMinor ? price(selected.amountMinor) : 'Скоро'}</strong><span>{selected?.amountMinor ? <>{selected.months === 12 ? 'за 12 месяцев' : 'за месяц'}<br/>оплата в тенге</> : <>Цена перед запуском</>}</span></div><button className="pricing-cta pricing-cta-pro" disabled={busy} onClick={() => { setShowCheckout(true); requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelector<HTMLHeadingElement>('#premium-checkout-title')?.focus({ preventScroll: true }) }) }}>{proActive ? 'Управлять подпиской' : data.enabled ? 'Выбрать PRO' : 'Подробнее о PRO'}<span aria-hidden="true">↗</span></button><div className="pricing-features"><p>Всё из базового и ещё:</p><ul><li>Таблицы и графики лабораторных</li><li>Анализ опытов и проверка знаний</li><li>Экспорт результатов</li><li>Создание тестов и классов</li><li>Мониторинг студентов</li></ul></div></section>
      </div>
      {(data.mode !== 'production' || !data.enabled) && <aside className="pricing-availability"><span className="pricing-status-dot" aria-hidden="true"/><p>{data.mode === 'sandbox' ? <><b>Тестовая среда ePay.</b> Только тестовые карты. Операции не выдают реальный PRO.</> : <>Приём оплаты PRO пока не открыт.</>}</p></aside>}
      {sub && <section className="premium-panel"><h2>{sub.active ? data.mode === 'sandbox' ? 'Тестовый доступ подтверждён' : 'Оплаченный PRO активен' : 'Ваша подписка'}</h2><p>{sub.paidThrough ? `Оплаченный период до ${new Date(sub.paidThrough).toLocaleString('ru-KZ')}.` : 'Оплаченного периода пока нет.'} Автопродление: {sub.autoRenew ? 'включено' : 'выключено'}.</p>{sub.autoRenew && <><p>Отмена прекращает будущие списания, но не отменяет уже переданную в банк операцию.</p><button disabled={busy} onClick={() => { if (window.confirm('Отключить будущие автоматические списания? Оплаченный доступ сохранится.')) void action({ action: 'cancelRenewal' }) }}>Отключить автопродление</button></>}</section>}
      </>}
      {showCheckout && <div className="checkout-layout" id="premium-checkout"><div className="checkout-options"><fieldset className="premium-plans checkout-period"><legend>Период доступа</legend>{data.plans.map(plan => <label key={plan.id} className={planId === plan.id ? 'selected' : ''}><input type="radio" name="checkout-plan" checked={planId === plan.id} disabled={busy} onChange={() => { setPlanId(plan.id); setConsent(false); checkoutKey.current = null }}/><span><b>{plan.months === 12 ? 'На год' : 'На месяц'}</b><strong>{plan.amountMinor === null ? 'Цена скоро' : price(plan.amountMinor)}</strong><small>{plan.months === 12 ? '12 календарных месяцев' : '1 календарный месяц'}</small></span></label>)}</fieldset>
        <fieldset className="premium-modes"><legend>Способ продления</legend><label><input type="radio" name="renewal" checked={!automatic} disabled={busy} onChange={() => { setAutomatic(false); setConsent(false); checkoutKey.current = null }}/><span>Разовая оплата<small>Без будущих списаний</small></span></label><label><input type="radio" name="renewal" checked={automatic} disabled={busy || !data.recurringEnabled} onChange={() => { setAutomatic(true); checkoutKey.current = null }}/><span>Автоматическое продление{!data.recurringEnabled && <small>Пока не запущено</small>}</span></label></fieldset>
        <div className="checkout-bank"><h2>Способ оплаты</h2><div><b>Halyk ePay</b><span>Данные карты вводятся на странице банка</span></div></div>
      </div><section className="premium-panel checkout-summary" aria-labelledby="premium-checkout-title"><h2 id="premium-checkout-title" tabIndex={-1}>Physez PRO</h2><dl className="checkout-total"><div><dt>{selected?.months === 12 ? 'Доступ на год' : 'Доступ на месяц'}</dt><dd>{price(selected?.amountMinor ?? null)}</dd></div><div><dt>К оплате</dt><dd>{price(selected?.amountMinor ?? null)}</dd></div></dl>
        <p className="checkout-renewal-note">{automatic ? 'Продление в конце оплаченного периода. Будущие списания можно отключить в кабинете.' : 'Разовая оплата. Автоматических списаний не будет.'}</p>
        {sub?.autoRenew && <div className="checkout-renewal-note"><p>У вас включено автопродление. Оплаченный период сохраняется после отмены.</p><button disabled={busy} onClick={() => { if (window.confirm('Отключить будущие автоматические списания? Оплаченный доступ сохранится.')) void action({ action: 'cancelRenewal' }) }}>Отключить автопродление</button></div>}
        <label className="premium-check"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} disabled={busy}/><span>{data.mode === 'sandbox' ? 'Тестовое подтверждение условий (не заключение договора и не реальная оплата).' : <>Принимаю <Link to="/legal/offer">оферту</Link> и <Link to="/legal/refunds">условия оплаты и возврата</Link>.</>}</span></label>
        <label className="premium-check"><input type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} disabled={busy}/><span>{data.mode === 'sandbox' ? 'Тестовое подтверждение обработки платёжных данных.' : <>Соглашаюсь с <Link to="/legal/privacy">обработкой и передачей данных для оплаты</Link>.</>}</span></label>
        {automatic && <label className="premium-check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)}/><span>Отдельно разрешаю сохранять карту у банка и списывать {price(selected?.amountMinor ?? null)} каждые {selected?.months === 12 ? '12 месяцев' : '1 месяц'} до отключения в кабинете. <Link to="/legal/recurring">Условия автопродления</Link>.</span></label>}
        {!data.enabled && <p className="premium-muted">Приём оплаты пока не открыт.</p>}
        {data.mode === 'sandbox' && <p className="premium-muted">Тестовая среда. Используйте только тестовые карты ePay.</p>}
        {pending && <p className="premium-notice">Есть незавершённый заказ. Вернитесь к тарифам и проверьте его статус перед повторной оплатой.</p>}
        <button className="premium-primary" disabled={busy || !user || !data.enabled || !selected?.amountMinor || !terms || !privacy || automatic && !consent || pending || sub?.autoRenew} onClick={() => void checkout()}>{busy ? 'Подождите…' : !user ? 'Для оплаты войдите в аккаунт' : !data.enabled ? 'Оплата пока недоступна' : data.mode === 'sandbox' ? 'Перейти к тестовой оплате' : `Оплатить ${price(selected?.amountMinor ?? null)}`}</button>
      </section></div>}
      {!showCheckout && data.orders.length > 0 && <section className="premium-panel"><h2>История заказов</h2><div className="premium-orders">{data.orders.map(order => <article key={order.id}><div><b>Заказ № {order.invoice} · {price(order.amountMinor)}</b><p>{orderLabels[order.status] ?? 'Проверяем статус'}</p><small>{new Date(order.createdAt).toLocaleString('ru-KZ')} · {order.recurring ? 'С автопродлением' : 'Разовый'}</small></div><button disabled={busy || !data.enabled} onClick={() => void action({ action: 'verify', orderId: order.id })}>Проверить у банка</button></article>)}</div></section>}
    </>}
    {!showCheckout && <nav className="premium-legal"><Link to="/payments">Об оплате и безопасности</Link><Link to="/legal/seller">Реквизиты продавца</Link><Link to="/privacy">Конфиденциальность</Link></nav>}
  </div></main>
}
