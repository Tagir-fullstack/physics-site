import type { VercelRequest, VercelResponse } from '@vercel/node'
import { databaseSql } from './db.js'
import { getClerkUser, hasPremiumAccess, isAdmin, type ClerkUser } from './auth.js'
import { educationOwner } from './educationOwner.js'
import { currentStudent, sameOrigin } from './studentProfile.js'
import { electroVariant } from '../../src/lib/electrostatics.js'
import { electroStore, type ElectroScope } from './electrostaticsStore.js'
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
async function monitorScope(account: ClerkUser | null): Promise<ElectroScope | null> {
  if (!account) return null
  if (isAdmin(account)) return { teacherId:null, reviewerId:account.userId }
  if (!hasPremiumAccess(account)) return null
  const owner = await educationOwner(account)
  const [teacher] = await databaseSql`select user_id from education_profiles where user_id=${owner.userId} and role='teacher' and teacher_status='approved' and merged_into_user_id is null`
  return teacher ? { teacherId:owner.userId,reviewerId:account.userId }:null
}
async function readBody(req: VercelRequest): Promise<Record<string,unknown>> {
  let raw = req.body
  if (raw === undefined) { const chunks:Buffer[]=[];let size=0;for await (const chunk of req) { const b=Buffer.from(chunk);size+=b.length;if(size>256000)throw Error('BAD_BODY');chunks.push(b) } raw=Buffer.concat(chunks).toString('utf8') }
  if (Buffer.byteLength(typeof raw==='string'?raw:JSON.stringify(raw ?? null))>256000) throw Error('BAD_BODY')
  const value=typeof raw==='string'?JSON.parse(raw):raw
  if(!value || typeof value!=='object' || Array.isArray(value))throw Error('BAD_BODY')
  return value
}
const defaults = { account:getClerkUser, profile:currentStudent, scope:monitorScope, store:electroStore }
export function createElectrostaticsHandler(deps = defaults) {
  return async (req:VercelRequest,res:VercelResponse) => {
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer')
    try {
      if (!['GET','POST'].includes(req.method || '')) return res.status(405).json({error:'Method not allowed'})
      const account=await deps.account(req)
      if(!account)return res.status(401).json({error:'Войдите в аккаунт.'})
      if(req.method==='GET' && (req.query.view==='list' || req.query.view==='detail' || req.query.view==='expected')) {
        const scope=await deps.scope(account)
        if(!scope)return res.status(403).json({error:'Мониторинг доступен администратору и подтверждённому преподавателю с PRO.'})
        if(req.query.view==='expected') {
          if(typeof req.query.id!=='string' || !uuid.test(req.query.id))return res.status(400).json({error:'Выберите студента.'})
          const student=await deps.store.expectedStudent(scope,req.query.id)
          return student ? res.status(200).json({student,variant:electroVariant(student.variantNumber,student.id)}):res.status(404).json({error:'Студент не найден или недоступен.'})
        }
        if(req.query.view==='detail') {
          if(typeof req.query.id!=='string' || !uuid.test(req.query.id))return res.status(400).json({error:'Выберите работу.'})
          const detail=await deps.store.detail(scope,req.query.id)
          return detail ? res.status(200).json(detail):res.status(404).json({error:'Работа не найдена или недоступна.'})
        }
        const page=Number(req.query.page ?? 0)
        if(!Number.isSafeInteger(page)||page<0||page>10000)return res.status(400).json({error:'Некорректная страница.'})
        const query=typeof req.query.q==='string'?req.query.q.trim().slice(0,120):'',group=typeof req.query.group==='string'?req.query.group.trim().slice(0,60):'',status=typeof req.query.status==='string'?req.query.status:''
        if(status && !['not-started','submitted','accepted','revision'].includes(status))return res.status(400).json({error:'Некорректный статус.'})
        const sort=req.query.sort ?? 'name',direction=req.query.direction ?? 'asc'
        if((sort!=='name'&&sort!=='variant')||(direction!=='asc'&&direction!=='desc'))return res.status(400).json({error:'Некорректная сортировка.'})
        return res.status(200).json(await deps.store.list(scope,page,query,group,status,sort,direction))
      }
      if(req.method==='POST') {
        if(!sameOrigin(req) || !req.headers.authorization?.startsWith('Bearer '))return res.status(403).json({error:'Нужна подтверждённая сессия этого сайта.'})
        let body:Record<string,unknown>
        try { body=await readBody(req) } catch { return res.status(400).json({error:'Неверный формат или слишком большой объём данных.'}) }
        if(body.action==='review') {
          const scope=await deps.scope(account)
          if(!scope)return res.status(403).json({error:'Нет доступа к проверке работ.'})
          if(typeof body.id!=='string'||!uuid.test(body.id)||!Number.isSafeInteger(body.reviewVersion)||Number(body.reviewVersion)<0||!['submitted','accepted','revision'].includes(String(body.status))||typeof body.comment!=='string'||body.comment.length>5000)return res.status(400).json({error:'Проверьте статус и комментарий.'})
          if(body.status==='revision' && body.comment.trim().length<3)return res.status(400).json({error:'Укажите, что студенту нужно доработать.'})
          const work=await deps.store.review(scope,body.id,Number(body.reviewVersion),String(body.status),body.comment.trim())
          return work ? res.status(200).json({submission:work}):res.status(409).json({error:'Работа уже изменена или недоступна. Обновите страницу перед проверкой.'})
        }
        if(body.action!=='submit')return res.status(400).json({error:'Неизвестное действие.'})
        return res.status(403).json({error:'Отправка этой лабораторной отключена. Оформляйте работу на миллиметровой бумаге.'})
      }
      if(req.query.view && req.query.view!=='mine')return res.status(400).json({error:'Неизвестный вид данных.'})
      const profile=await deps.profile(req,account)
      if(!profile)return res.status(401).json({error:'Откройте свой профиль студента.'})
      const scope=await deps.scope(account)
      return res.status(200).json({submission:await deps.store.mine(profile.id),monitorPath:scope ? scope.teacherId===null?'/admin/electrostatics-monitor':'/teacher/electrostatics-monitor':null})
    } catch(e) {
      if((e as Error).message==='SNAPSHOT_CONFLICT')return res.status(409).json({error:'Эта отправка уже использована. Обновите страницу.'})
      return res.status(503).json({error:(e as {code?:string}).code==='42P01'?'Хранилище результатов ещё не настроено. Черновик остаётся в браузере.':'Сервис результатов временно недоступен. Черновик остаётся в браузере.'})
    }
  }
}
export const electrostaticsLab=createElectrostaticsHandler()
