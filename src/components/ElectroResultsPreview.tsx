import { useEffect, useMemo, useState } from 'react'
import { type FieldGrid, type ElectroVariant, fieldEstimate, axisOrigin, toDisplayPoint } from '../lib/electrostatics'
import { measuredNeighborEdges } from '../lib/electrostaticsNeighbors'
import { potentialLevels } from '../lib/electrostatics'
import { ELECTRO_QUESTIONS, type ElectroNotebook } from '../lib/electrostaticsNotebook'
import Electrodes from './Electrodes'
import ElectroCoordinates from './ElectroCoordinates'
import ElectroAxisPlot from './ElectroAxisPlot'
import '../styles/electrostatics.css'
const f=(n:number)=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})
const colours=['#2c78b5','#9a59ab','#2b9467','#c07827','#c64c56']
export default function ElectroResultsPreview({variant,notebook}:{variant:ElectroVariant;notebook:ElectroNotebook}) {
  const [grid,setGrid]=useState<FieldGrid|null>(null)
  useEffect(()=>{const worker=new Worker(new URL('../workers/electrostatics.worker.ts',import.meta.url),{type:'module'});worker.onmessage=(e:MessageEvent<{grid?:FieldGrid}>)=>{if(e.data.grid?.converged)setGrid(e.data.grid)};worker.postMessage(variant);return()=>worker.terminate()},[variant])
  const levels=useMemo(()=>potentialLevels(variant),[variant])
  const edges=useMemo(()=>levels.map(l=>grid?measuredNeighborEdges(grid,l,notebook.points.filter(p=>p.level===l)):[]),[grid,levels,notebook.points])
  return <div className="es-page es-monitor-preview">
    <section className="es-panel"><h2>Картина поля студента</h2><div className="es-preview-map"><svg className="es-sheet" viewBox="-12 -12 264 204" role="img" aria-label="Измеренные точки студента и соседние соединения">
      <g transform="matrix(0 1 1 0 0 0)"><rect width="180" height="240" className="es-sheet-bg"/>{Array.from({length:37},(_,i)=><path key={'x'+i} className="es-grid" d={`M${i*5} 0V240`}/>)}{Array.from({length:49},(_,i)=><path key={'y'+i} className="es-grid" d={`M0 ${i*5}H180`}/>)}<Electrodes variant={variant}/>{levels.map((l,i)=><g key={l} fill={colours[i%colours.length]}>{edges[i].map(([a,b],k)=><line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colours[i%colours.length]} strokeWidth=".6"/>)}{notebook.points.filter(p=>p.level===l).map((p,k)=><circle key={k} cx={p.x} cy={p.y} r="1.3"><title>{p.level} В; x={f(toDisplayPoint(p).x)}, y={f(toDisplayPoint(p).y)} мм</title></circle>)}</g>)}</g>
      <ElectroCoordinates/>
    </svg></div><div className="es-preview-legend">{levels.map((l,i)=><span key={l} style={{color:colours[i%colours.length]}}>{l} В · {notebook.points.filter(p=>p.level===l).length} точек</span>)}</div></section>
    <details className="es-panel"><summary>Точки измерений ({notebook.points.length})</summary><div className="es-table-wrap"><table><thead><tr><th>φ заданное, В</th><th>x, мм</th><th>y, мм</th><th>φ измеренное, В</th></tr></thead><tbody>{notebook.points.map((p,i)=><tr key={i}><td>{f(p.level)}</td><td>{f(toDisplayPoint(p).x)}</td><td>{f(toDisplayPoint(p).y)}</td><td>{f(p.potential)}</td></tr>)}</tbody></table></div></details>
    <section className="es-panel"><h2>График φ(r)</h2><ElectroAxisPlot notebook={notebook} variant={variant}/><details><summary>Отсчёты ({notebook.axis.length})</summary><div className="es-table-wrap"><table><thead><tr><th>r, мм</th><th>φ, В</th></tr></thead><tbody>{notebook.axis.map((p,i)=><tr key={i}><td>{f(axisOrigin(variant)-p.y)}</td><td>{f(p.potential)}</td></tr>)}</tbody></table></div></details></section>
    <section className="es-panel"><h2>Расчёты напряжённости</h2><p className="es-hint">Проверка арифметики по данным студента. Корректность выбора участков оценивается отдельно.</p><div className="es-table-wrap"><table><thead><tr><th>φA → φB, В</th><th>Δl, мм</th><th>E студента, В/м</th><th>По формуле, В/м</th></tr></thead><tbody>{notebook.pairs.map((p,i)=>{const expected=fieldEstimate(p.a,p.b);return <tr key={i}><td>{p.a.potential} → {p.b.potential}</td><td>{expected?f(expected.distanceMm):'—'}</td><td>{p.answer||'—'}</td><td>{expected?f(expected.field):'—'}</td></tr>})}</tbody></table></div></section>
    <section className="es-panel"><h2>Вывод</h2><p className="es-student-text">{notebook.conclusion||'Не заполнен'}</p><details><summary>Ответы на контрольные вопросы</summary>{notebook.answers.map((answer,i)=><div key={i}><b>{i+1}. {ELECTRO_QUESTIONS[i]}</b><p className="es-student-text">{answer||'Нет ответа'}</p></div>)}</details></section>
  </div>
}
