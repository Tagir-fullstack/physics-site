import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../public/images/labs/',import.meta.url))
const browser=process.env.LAB_PREVIEW_CDP || 'http://127.0.0.1:9248'
const origin=process.env.LAB_PREVIEW_ORIGIN || 'http://127.0.0.1:5173'
await mkdir(root,{recursive:true})
const tab=await(await fetch(browser+'/json/new?about:blank',{method:'PUT'})).json()
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let seq=0;const pending=new Map()
const send=(method,params={})=>new Promise(r=>{const id=++seq;pending.set(id,r);ws.send(JSON.stringify({id,method,params}))})
ws.addEventListener('message',async e=>{const m=JSON.parse(String(e.data));if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}if(m.method==='Fetch.requestPaused'){const {requestId,request}=m.params;let source
 if(request.url.includes('AuthContext'))source='export function AuthProvider({children}){return children}export function useAuth(){return {user:null,isPremium:false,isLoading:false}}'
 else if(request.url.includes('apiClient'))source='export function useApiClient(){return {authFetch:window.fetch}}export function isEmailAdmin(){return false}'
 else source='import React from "/node_modules/.vite/deps/react.js";import Lab from "/src/pages/labs/OberbeckPendulum.tsx";export default function Preview(){return React.createElement(Lab)}'
 await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from(source).toString('base64')})}})
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.result.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result.result.value}
const delay=ms=>new Promise(r=>setTimeout(r,ms))
const until=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100)}throw Error('Timed out: '+expression)}
await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:['*/src/context/AuthContext.tsx*','*/src/lib/apiClient.ts*','*/src/pages/labs/OberbeckEntry.tsx*'].map(urlPattern=>({urlPattern}))})
await send('Page.addScriptToEvaluateOnNewDocument',{source:`sessionStorage.setItem('hasVisitedThisSession','true');localStorage.removeItem('physez-oberbeck-notebook-v2');const original=window.fetch;window.fetch=(input,init)=>{if(String(input).startsWith('/api/'))throw Error('No API calls allowed in lab previews');return original(input,init)}`})
await send('Emulation.setDeviceMetricsOverride',{width:1200,height:1500,deviceScaleFactor:1,mobile:false})
try {
 for(const id of ['atwood','ball-collision','oberbeck']) {
  await send('Page.navigate',{url:origin+'/labs/'+id})
  const grid=id==='ball-collision'?'.collision-grid':'.atwood-grid'
  const header=id==='ball-collision'?'.collision-header':'.atwood-header'
  await until(`!!document.querySelector('${grid}')`);await evaluate('document.fonts.ready');await delay(250)
  for(const theme of ['dark','light']) {
   await evaluate(`document.body.classList.toggle('a11y-light-theme',${theme==='light'});document.querySelectorAll('.cookie-notice').forEach(e=>e.remove())`)
   await delay(250)
   const rect=await evaluate(`(()=>{const r=document.querySelector('${grid}').getBoundingClientRect();const h=document.querySelector('${header}')?.getBoundingClientRect();const y=h?.top??r.top;return {x:r.left,y:y+scrollY,width:r.width,height:r.bottom-y,scale:.8}})()`)
   const shot=await send('Page.captureScreenshot',{format:'png',clip:rect,captureBeyondViewport:true})
   if(!shot.result?.data)throw Error(JSON.stringify(shot))
   await writeFile(root+'/'+id+'-'+theme+'.png',Buffer.from(shot.result.data,'base64'))
   console.log(id+'-'+theme,Math.round(rect.width)+'×'+Math.round(rect.height))
  }
 }
} finally {await send('Page.close');ws.close()}
