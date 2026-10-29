import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

// Uses a separate, already running test Chrome. All account/bank traffic is mocked.
const debug = 'http://127.0.0.1:9252'
const tab = await (await fetch(`${debug}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
const pending = new Map(), errors = []
let seq = 0
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
ws.addEventListener('message', async event => {
  const msg = JSON.parse(String(event.data))
  if (pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); if (msg.error) p.reject(Error(JSON.stringify(msg.error))); else p.resolve(msg.result) }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text)
  if (msg.method === 'Fetch.requestPaused') {
    const { requestId, request } = msg.params
    let source
    if (request.url.includes('AuthContext.tsx')) source = 'export function AuthProvider({children}){return children}export function useAuth(){return window.fixtureAuth}'
    else if (request.url.includes('apiClient.ts')) source = 'export function useApiClient(){return {authFetch:window.fetch}}export function isEmailAdmin(){return false}'
    else source = 'window.halyk={pay:payment=>{window.paymentCalls.push(payment)}}'
    await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(source).toString('base64') })
  }
})
const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value }
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(`Boolean(${expression})`)) return; await wait(100) } throw Error('Timeout: ' + expression) }
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
async function navigate(path, fixture = 'disabled') {
  await send('Page.navigate', { url: `http://127.0.0.1:5173${path}${path.includes('?') ? '&' : '?'}fixture=${fixture}` })
  await until('document.querySelector(".premium-page, .billing-info-page") && document.body.innerText.includes("Physez")')
}
try {
  await send('Runtime.enable'); await send('Page.enable')
  await send('Fetch.enable', { patterns: [{ urlPattern: '*AuthContext.tsx*' }, { urlPattern: '*apiClient.ts*' }, { urlPattern: 'https://test-epay.epayment.kz/*' }, { urlPattern: 'https://epay.homebank.kz/*' }] })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    sessionStorage.setItem('hasVisitedThisSession','true'); window.confirm=()=>true;
    window.fixtureAuth={user:{id:'user_fixture',email:'fixture@example.invalid'},isLoading:false,isPremium:false,profile:null};
    window.paymentCalls=[];window.apiCalls=[];
    const mode=new URL(location.href).searchParams.get('fixture')||'disabled';
    window.fixtureBilling={mode:mode==='renewal'?'production':mode,enabled:mode!=='disabled',recurringEnabled:mode!=='disabled',reason:'Тест интерфейса без платежей',legalVersion:'fixture-version',plans:[{id:'pro-month',name:'PRO на месяц',months:1,amountMinor:mode==='disabled'?null:10000,currency:'KZT'},{id:'pro-year',name:'PRO на год',months:12,amountMinor:mode==='disabled'?null:100000,currency:'KZT'}],subscription:mode==='renewal'?{active:true,paidThrough:'2027-01-31T12:00:00Z',autoRenew:true,hasCard:true,planId:'pro-month'}:null,orders:[]};
    const original=window.fetch.bind(window);window.fetch=async(input,init)=>{
      const path=String(input);if(!path.includes('/api/'))return original(input,init);
      const body=init?.body?JSON.parse(init.body):null;window.apiCalls.push({path,body});
      if(body?.action==='cancelRenewal'){window.fixtureBilling.subscription.autoRenew=false;window.fixtureBilling.subscription.hasCard=false;}
      if(body?.action==='checkout')return Response.json({script:'https://test-epay.epayment.kz/payform/payment-api.js',orderId:'00000000-0000-4000-8000-000000000001',mode:'sandbox',payment:{invoiceId:'123456',amount:body.planId==='pro-year'?1000:100,currency:'KZT',cardSave:body.autoRenew,auth:{access_token:'fixture'}}},{status:201});
      if(path.includes('billing=')){if(mode==='loading')await new Promise(resolve=>{window.releaseBilling=resolve});return Response.json(window.fixtureBilling);}
      if(path.includes('/api/account'))return Response.json({userId:'user_fixture',role:'user',isPremium:false,paymentsEnabled:false});
      return Response.json({error:'Not needed in UI fixture'},{status:404});
    };
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/premium?fixture=loading' })
  await until('document.querySelector(".premium-loading") && typeof window.releaseBilling==="function"')
  assert(await evaluate('document.querySelectorAll(".premium-loading-card").length===2 && !document.querySelector(".pricing-card, .premium-legal")'))
  assert(await evaluate('!document.body.innerText.includes("Загружаем условия")'))
  await writeFile('/private/tmp/premium-loading-dark.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await evaluate('document.documentElement.classList.add("a11y-light-theme")')
  await wait(400)
  await writeFile('/private/tmp/premium-loading-light.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  await evaluate('window.releaseBilling()')
  await until('document.querySelectorAll(".pricing-card").length===2 && !document.querySelector(".premium-loading")')
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false })
  await navigate('/premium')
  await until('document.querySelectorAll(".pricing-card").length===2')
  assert(await evaluate('!document.querySelector("header.navbar, header.header, body > header, footer")'))
  assert.equal(await evaluate('document.querySelector("#premium-checkout")===null'), true)
  assert(await evaluate('document.querySelector(".pricing-cta-free").getAttribute("href")==="/labs"'))
  for (const viewport of [{ width: 1365, height: 768 }, { width: 1280, height: 720 }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: false })
    assert(await evaluate('Array.from(document.querySelectorAll(".pricing-card")).every(card => card.getBoundingClientRect().bottom <= innerHeight)'), 'Both pricing cards must fit on the first screen')
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false })
  await click('.pricing-cta-pro')
  await until('document.querySelector(".premium-primary")')
  assert(await evaluate('!document.querySelector(".pricing-grid, .pricing-features, .pricing-period, .premium-legal")'), 'Checkout must replace the pricing screen')
  assert(await evaluate('window.scrollY===0'))
  await click('button.pricing-back')
  await until('document.querySelectorAll(".pricing-card").length===2')
  assert(await evaluate('!document.querySelector("#premium-checkout")'))
  await click('.pricing-cta-pro')
  await until('document.querySelector(".premium-primary")')
  assert(await evaluate('document.querySelector(".premium-primary").disabled'))
  assert(await evaluate('document.body.innerText.includes("Цена согласовывается")'))
  await navigate('/premium', 'sandbox')
  await until('document.querySelectorAll(".premium-plans label").length===2')
  await click('.premium-plans label:nth-of-type(2) input')
  assert(await evaluate('document.querySelector(".pricing-card-pro .pricing-price").innerText.includes("1 000") || document.querySelector(".pricing-card-pro .pricing-price").innerText.includes("1 000")'))
  await click('.premium-plans label:first-of-type input')
  await click('.pricing-cta-pro')
  await until('document.querySelector(".premium-primary")')
  assert(await evaluate('document.querySelector("input[name=renewal]").checked'))
  await click('.premium-check input')
  await click('.premium-check:nth-of-type(2) input')
  assert.equal(await evaluate('document.querySelector(".premium-primary").disabled'), false)
  await writeFile('/private/tmp/premium-checkout-desktop.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await click('.premium-primary')
  await until('window.paymentCalls.length===1')
  assert.equal(await evaluate('window.apiCalls.find(c=>c.body?.action==="checkout").body.autoRenew'), false)
  assert.equal(await evaluate('window.paymentCalls[0].cardSave'), false)
  await navigate('/premium', 'sandbox')
  await until('document.querySelector(".pricing-cta-pro")')
  await click('.pricing-cta-pro')
  await until('document.querySelectorAll(".premium-modes input").length===2')
  await click('.premium-modes label:nth-of-type(2) input')
  await click('.premium-check input')
  await click('.premium-check:nth-of-type(2) input')
  assert(await evaluate('document.querySelector(".premium-primary").disabled'))
  await click('.premium-check:nth-of-type(3) input')
  await click('.premium-primary')
  await until('window.paymentCalls.length===1')
  assert.equal(await evaluate('window.apiCalls.find(c=>c.body?.action==="checkout").body.recurringConsent'), true)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  await writeFile('/private/tmp/premium-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await evaluate('document.documentElement.classList.add("a11y-light-theme")')
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".premium-panel")).backgroundColor'), 'rgb(255, 255, 255)')
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 1000, deviceScaleFactor: 1, mobile: false })
  await navigate('/premium', 'renewal')
  await until('document.body.innerText.includes("Отключить автопродление")')
  await evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent==="Отключить автопродление").click()')
  await until('document.body.innerText.includes("Будущие списания отключены")')
  assert(await evaluate('document.body.innerText.includes("Оплаченный PRO активен")'))
  await navigate('/premium')
  await until('document.querySelectorAll(".pricing-card").length===2')
  await evaluate('localStorage.setItem("physez-cookie-notice-v1","accepted"); document.querySelector(".cookie-notice")?.remove(); window.scrollTo(0,0)')
  await writeFile('/private/tmp/premium-desktop.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await evaluate('document.documentElement.classList.add("a11y-light-theme")')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".pricing-card")).backgroundColor'), 'rgb(255, 255, 255)')
  await wait(500)
  await writeFile('/private/tmp/premium-pricing-light.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  await writeFile('/private/tmp/premium-pricing-mobile.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await navigate('/premium?order=00000000-0000-4000-8000-000000000001', 'sandbox')
  await until('window.apiCalls.some(c=>c.body?.action==="verify")')
  assert.equal(await evaluate('window.fixtureAuth.isPremium'), false)
  await navigate('/legal/offer')
  await until('document.body.innerText.includes("не опубликованы")')
  assert.equal(await evaluate('document.body.innerText.includes("[ИИН/БИН]")'), false)
  await navigate('/payments')
  await until('document.body.innerText.includes("Оплата и безопасность")')
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate('document.documentElement.classList.add("a11y-light-theme")')
  await wait(400)
  await writeFile('/private/tmp/billing-info-light.png', Buffer.from((await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  for (const path of ['/payments', '/legal/offer', '/legal/refunds', '/legal/recurring', '/legal/privacy', '/legal/seller']) {
    await navigate(path)
    await until('document.querySelector(".billing-info-nav a.active")')
    assert.equal(await evaluate('document.querySelector(".billing-info-nav a.active").getAttribute("href")'), path)
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), path + ' must fit mobile width')
    await evaluate('document.documentElement.classList.add("a11y-light-theme")')
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  }
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log('PASS: disabled/unknown prices, one-off default, separate recurring consent, mocked bank redirect, mobile overflow, cancellation preserves access, return does not grant, legal drafts hidden, payment info routes, no JS exceptions')
} finally {
  ws.close()
  await fetch(`${debug}/json/close/${tab.id}`)
}
