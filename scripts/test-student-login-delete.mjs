import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
process.env.CLERK_SECRET_KEY='test-fixture-key'
process.env.ADMIN_EMAILS='owner@example.test'
process.env.OWNER_USER_IDS='owner'
delete process.env.VITE_CLERK_PUBLISHABLE_KEY
let mode='normal',disabled=0
globalThis.__revokedAccounts=new Set()
const removed=[]
globalThis.__loginDeleteFixture={
 createClerkClient:()=>({users:{getUser:async id=>{if(mode==='missing')throw {status:404};if(mode==='outage')throw {status:503};return {emailAddresses:[{id:'email',emailAddress:mode==='emailAdmin'?'owner@example.test':'student@example.test'}],primaryEmailAddressId:'email',publicMetadata:mode==='metadataAdmin'?{accessRole:'admin'}:{},privateMetadata:{}}},deleteUser:async id=>{removed.push(id)}}}),
 verifyToken:async token=>{if(token==='invalid')throw Error('Invalid signature');return {sub:'student'}}
}
await build({entryPoints:['api/_lib/auth.ts'],bundle:true,platform:'node',format:'cjs',outfile:'node_modules/.cache/student-login-delete.cjs',plugins:[{name:'fake-clerk',setup(b){
 b.onResolve({filter:/accountRevocation\.js$/},()=>({path:'revocation',namespace:'fixture'}))
 b.onResolve({filter:/@clerk\/backend/},()=>({path:'clerk',namespace:'fixture'}))
 b.onResolve({filter:/\/env\.js$/},()=>({path:'env',namespace:'fixture'}))
 b.onResolve({filter:/billing\/store\.js$/},()=>({path:'billing',namespace:'fixture'}))
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='revocation'?'export const isAccountRevoked=async id=>globalThis.__revokedAccounts.has(id)':a.path==='clerk'?'export const {createClerkClient,verifyToken}=globalThis.__loginDeleteFixture':a.path==='billing'?'export const billingHasPremium=async()=>false':'export {}'}))
}}]})
const {deleteStudentLogin,getClerkUser}=createRequire(import.meta.url)('../node_modules/.cache/student-login-delete.cjs')
const before=async()=>{disabled++}
assert.equal(await getClerkUser({headers:{}}),null,'Missing session stays unauthorized')
assert.equal(await getClerkUser({headers:{authorization:'Bearer invalid'}}),null,'Invalid signed session stays unauthorized')
for(const protectedId of ['owner'])await assert.rejects(()=>deleteStudentLogin(protectedId,before))
for(mode of ['emailAdmin','metadataAdmin','outage'])await assert.rejects(()=>deleteStudentLogin('student',before))
assert.equal(disabled,0,'Protected or unavailable target never has subscription changed')
mode='normal';await deleteStudentLogin('student',before);assert.deepEqual(removed,['student']);assert.equal(disabled,1)
mode='missing';await assert.rejects(()=>deleteStudentLogin('student',before),'Unknown 404 cannot confirm deletion');await deleteStudentLogin('student',before,true);assert.equal(disabled,2,'Retry requires recorded revocation')
assert.equal((await getClerkUser({headers:{authorization:'Bearer fixture'}})).userId,'student','Valid signed session survives unavailable metadata/404')
globalThis.__revokedAccounts.add('student')
assert.equal(await getClerkUser({headers:{authorization:'Bearer fixture'}}),null,'Explicitly revoked user cannot reuse a verified JWT')
console.log('PASS: missing/invalid JWT rejected, valid JWT survives metadata 404, explicit revocation blocks deleted JWT, safe deletion and recorded-revocation retry')
