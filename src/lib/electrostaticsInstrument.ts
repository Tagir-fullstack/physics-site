import { useCallback, useEffect, useRef, useState } from 'react'
import type { ElectroVariant, Point } from './electrostatics'
import type { InstrumentData, InstrumentReply } from '../workers/electrostaticsInstrument'
export type ElectroDrawing={contours:string[];lines:string[]}
export type ElectroEdges=Array<Array<[Point,Point]>>
class InstrumentClient {
  private worker=new Worker(new URL('../workers/electrostatics.worker.ts',import.meta.url),{type:'module'})
  private sequence=0
  private closed=false
  private pending=new Map<number,{resolve:(v:InstrumentData)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
  constructor(){
    this.worker.onmessage=(event:MessageEvent<InstrumentReply>)=>{
      const reply=event.data,pending=this.pending.get(reply.id)
      if(!pending)return
      this.pending.delete(reply.id);clearTimeout(pending.timer)
      if(reply.ok&&reply.data)pending.resolve(reply.data)
      else pending.reject(Error(reply.error||'Ошибка прибора.'))
    }
    this.worker.onerror=()=>this.close('Не удалось запустить расчёт поля. Перезагрузите страницу.')
  }
  request(op:string,parameters:Record<string,unknown>={}):Promise<InstrumentData>{
    if(this.closed)return Promise.reject(Error('Прибор закрыт.'))
    const id=++this.sequence
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Расчёт занял слишком много времени. Перезагрузите установку.'))},20000)
      this.pending.set(id,{resolve,reject,timer})
      this.worker.postMessage({id,op,...parameters})
    })
  }
  close(message='Прибор закрыт.'){
    this.closed=true;this.worker.terminate()
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error(message))}
    this.pending.clear()
  }
}
export function useLocalElectroInstrument(variant:ElectroVariant,probe:Point){
  const client=useRef<InstrumentClient|null>(null)
  const variantKey=JSON.stringify(variant)
  const [status,setStatus]=useState<{key:string;ready:boolean;error:string}>({key:'',ready:false,error:''})
  const ready=status.key===variantKey&&status.ready
  const [reading,setReading]=useState<{key:string;value:number}|null>(null)
  const request=useCallback((op:string,parameters:Record<string,unknown>={})=>client.current?client.current.request(op,parameters):Promise.reject(Error('Прибор ещё не готов.')),[])
  useEffect(()=>{
    const instance=new InstrumentClient();client.current=instance;let active=true
    void instance.request('open',{variant}).then(()=>{if(active)setStatus({key:variantKey,ready:true,error:''})}).catch(e=>{if(active)setStatus({key:variantKey,ready:false,error:e instanceof Error?e.message:'Не удалось рассчитать поле.'})})
    return()=>{active=false;if(client.current===instance)client.current=null;instance.close()}
  },[variant,variantKey])
  const pointKey=`${variantKey}:${probe.x}:${probe.y}`
  useEffect(()=>{
    if(!ready)return
    let active=true
    void request('read',{point:probe}).then(data=>{
      if(active&&data.point?.x===probe.x&&data.point.y===probe.y&&Number.isFinite(data.value))setReading({key:pointKey,value:data.value!})
    }).catch(e=>{if(active)setStatus({key:variantKey,ready:false,error:e instanceof Error?e.message:'Не удалось прочитать прибор.'})})
    return()=>{active=false}
  },[request,ready,probe,pointKey,variantKey])
  return {request,ready,error:status.key===variantKey?status.error:'',value:reading?.key.startsWith(variantKey+':')?reading.value:0,current:ready&&reading?.key===pointKey}
}
