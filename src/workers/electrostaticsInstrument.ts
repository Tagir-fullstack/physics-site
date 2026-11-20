import { SHEET, electrodes, potentialLevels, type ElectroVariant, type Point, type Reading } from '../lib/electrostatics.js'
import { solveElectrostatic, voltmeter, electricField, type FieldGrid } from './electrostaticsModel.js'
import { measuredNeighborEdges } from './electrostaticsNeighbors.js'
export type InstrumentData={ready?:boolean;point?:Point;value?:number;edges?:Array<Array<[Point,Point]>>;aligned?:boolean}
export type InstrumentReply={id:number;ok:boolean;data?:InstrumentData;error?:string}
const point=(v:unknown):v is Point=>{
  if(!v||typeof v!=='object'||Array.isArray(v))return false
  const p=v as Point
  return typeof p.x==='number'&&typeof p.y==='number'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=SHEET.width&&p.y>=0&&p.y<=SHEET.height
}
export function validInstrumentVariant(value:unknown):value is ElectroVariant {
  if(!value||typeof value!=='object')return false
  const v=value as ElectroVariant
  if(!Number.isSafeInteger(v.number)||v.number<1||v.number>1000000||!Number.isFinite(v.voltage)||v.voltage<=0||v.voltage>100||!Number.isFinite(v.interval)||v.interval<=0||v.voltage/v.interval>100)return false
  if(!['discs','disc-plate','plates'].includes(v.geometry))return false
  if(v.revision===3&&(!Array.isArray(v.conductors)||v.conductors.length<2||v.conductors.length>4))return false
  try{return electrodes(v).every(e=>point(e)&&[0,1].includes(e.potential)&&['disc','plate'].includes(e.shape)&&[e.radius,e.length,e.angle].every(Number.isFinite)&&e.radius>0&&e.radius<=100&&e.length>=0&&e.length<=300)}catch{return false}
}
export function createInstrumentSession() {
  let variant:ElectroVariant|null=null,grid:FieldGrid|null=null
  return {handle(input:unknown):InstrumentReply {
    const message=input&&typeof input==='object'?input as Record<string,unknown>:{}
    const id=Number.isSafeInteger(message.id)?Number(message.id):-1
    const fail=(error='Команда прибора недоступна.'):InstrumentReply=>({id,ok:false,error})
    const success=(data:InstrumentData):InstrumentReply=>({id,ok:true,data})
    try {
      if(id<0)return fail()
      if(message.op==='open') {
        if(grid||!validInstrumentVariant(message.variant))return fail()
        variant=message.variant;grid=solveElectrostatic(variant)
        if(!grid.converged){grid=null;return fail('Расчёт не сошёлся. Перезагрузите установку.')}
        return success({ready:true})
      }
      if(!grid||!variant)return fail('Прибор ещё не готов.')
      if(message.op==='read') {
        if(!point(message.point))return fail('Некорректная точка.')
        const p={x:message.point.x,y:message.point.y}
        return success({point:p,value:voltmeter(grid,variant,p)})
      }
      if(message.op!=='connect'&&message.op!=='pair')return fail()
      if(!Array.isArray(message.points)||message.points.length>200||(message.op==='pair'&&message.points.length!==2))return fail()
      const levels=potentialLevels(variant)
      const points=message.points as Reading[]
      if(!points.every(p=>point(p)&&Number.isFinite(p.potential)&&levels.includes(p.level)))return fail('Некорректные измерения.')
      if(message.op==='connect')return success({edges:levels.map(level=>measuredNeighborEdges(grid!,level,points.filter(p=>p.level===level)).map(([a,b])=>[{x:a.x,y:a.y},{x:b.x,y:b.y}]))})
      const [a,b]=points,length=Math.hypot(b.x-a.x,b.y-a.y)
      const e=electricField(grid,{x:(a.x+b.x)/2,y:(a.y+b.y)/2})
      return success({aligned:length>=1&&Math.abs(Math.abs(a.level-b.level)-variant.interval)<1e-8&&e.magnitude>=.01&&Math.abs((b.x-a.x)*e.x+(b.y-a.y)*e.y)/(length*e.magnitude)>=.95})
    }catch{return fail('Не удалось выполнить расчёт. Перезагрузите установку.')}
  }}
}
