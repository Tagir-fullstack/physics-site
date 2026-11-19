import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from './apiClient'
import type { Point } from './electrostatics'
export const electroInstrumentEndpoint='/api/student-profile?lab=electrostatics'
export type ElectroDrawing={contours:string[];lines:string[]}
export type ElectroEdges=Array<Array<[Point,Point]>>
export function useElectroInstrument(practice: number | null, probe: Point, power: boolean) {
  const {authFetch}=useApiClient()
  const [retry,setRetry]=useState(0)
  const request=useCallback(async<T,>(action:string,parameters:Record<string,unknown>={},signal?:AbortSignal):Promise<T>=>{
    const response=await authFetch(electroInstrumentEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(practice===null?{}:{practice}),...parameters}),signal})
    const data=await response.json()
    if(!response.ok)throw Error(data.error||'Не удалось получить показание. Повторите запрос.')
    return data as T
  },[authFetch,practice])
  const key=`${probe.x}:${probe.y}:${power}:${retry}`
  const [result,setResult]=useState<{key:string;value?:number;error?:string}|null>(null)
  useEffect(()=>{
    if(!power)return
    const controller=new AbortController()
    // One request after movement pauses; cancelled/stale responses cannot become readings.
    const timer=window.setTimeout(()=>{
      void request<{point:Point;reading:number}>('probe',{point:probe},controller.signal).then(data=>{
        if(!Number.isFinite(data.reading)||data.point.x!==probe.x||data.point.y!==probe.y)throw Error('Некорректное показание прибора.')
        if(!controller.signal.aborted)setResult({key,value:data.reading})
      }).catch(e=>{if(!controller.signal.aborted)setResult({key,error:e instanceof Error?e.message:'Не удалось получить показание.'})})
    },300)
    return()=>{window.clearTimeout(timer);controller.abort()}
  },[key,power,probe,request])
  const current=result?.key===key?result:null
  return {request,reading:current?.value??0,ready:!power||current?.value!==undefined,error:current?.error??'',retry:()=>setRetry(n=>n+1)}
}
