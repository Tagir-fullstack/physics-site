import { useEffect, useMemo, useState } from 'react'
import { contourPath, electrodes, fieldLines, potentialLevels, type ElectroVariant, type FieldGrid } from '../lib/electrostatics'
import Electrodes from './Electrodes'
import ElectroCoordinates from './ElectroCoordinates'
import '../styles/electrostatics.css'
const colours=['#2c78b5','#9a59ab','#2b9467','#c07827','#c64c56']
export default function ElectroExpectedField({variant}:{variant:ElectroVariant}) {
  const [grid,setGrid]=useState<FieldGrid|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  const [showField,setShowField]=useState(false)
  useEffect(()=>{
    const worker=new Worker(new URL('../workers/electrostatics.worker.ts',import.meta.url),{type:'module'})
    worker.onmessage=(event:MessageEvent<{grid?:FieldGrid;error?:string}>)=>{
      if(event.data.grid?.converged){setGrid(event.data.grid);setError('')}
      else setError(event.data.error||'Не удалось рассчитать картину поля.')
      worker.terminate()
    }
    worker.onerror=()=>{setError('Не удалось запустить расчёт поля.');worker.terminate()}
    worker.postMessage(variant)
    return()=>worker.terminate()
  },[variant,retry])
  const levels=useMemo(()=>potentialLevels(variant),[variant])
  const contours=useMemo(()=>grid?levels.map(level=>contourPath(grid,level)):[],[grid,levels])
  const lines=useMemo(()=>grid&&showField?fieldLines(grid,variant):[],[grid,showField,variant])
  return <div className="es-page es-monitor-preview"><section className="es-panel">
    <div className="es-panel-heading"><h2>Ожидаемая картина поля</h2><label className="es-expected-toggle"><input type="checkbox" checked={showField} onChange={e=>setShowField(e.target.checked)}/> Силовые линии</label></div>
    {!grid&&!error&&<p role="status">Рассчитываем поле варианта…</p>}{error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Повторить</button></p>}
    <div className="es-preview-map"><svg className="es-sheet es-expected-diagram" viewBox="-12 -12 264 204" role="img" aria-label={`Эталонные эквипотенциальные линии варианта ${variant.number}`}>
      <defs><marker id="es-expected-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6" fill="var(--es-field-colour,#52765c)"/></marker></defs>
      <g transform="matrix(0 1 1 0 0 0)"><rect width="180" height="240" className="es-sheet-bg"/>{Array.from({length:37},(_,i)=><path key={'x'+i} className="es-grid" d={`M${i*5} 0V240`}/>)}{Array.from({length:49},(_,i)=><path key={'y'+i} className="es-grid" d={`M0 ${i*5}H180`}/>)}
        {contours.map((path,i)=><path key={i} d={path} fill="none" stroke={colours[i%colours.length]} strokeWidth=".8"/>)}
        {lines.map((path,i)=><path key={i} d={path} className="es-field-line" markerEnd="url(#es-expected-arrow)"/>)}</g><ElectroCoordinates/><g transform="matrix(0 1 1 0 0 0)"><Electrodes variant={variant}/>
      </g>
      {electrodes(variant).map((e,i)=><text className="es-expected-potential" key={i} x={e.y+6} y={e.x-5}>{e.potential?`+${variant.voltage}`:'0'} В</text>)}
      <text x="240" y="190" textAnchor="end">x, мм → · y, мм ↑</text>
    </svg></div>
    <div className="es-preview-legend">{levels.map((level,i)=><span key={level} style={{color:colours[i%colours.length]}}>{level} В</span>)}</div>
    <p className="es-hint">Это эталон назначенного варианта, а не измерения студента. Число точек, их расположение и погрешность в работе студента могут отличаться.</p>
  </section></div>
}
