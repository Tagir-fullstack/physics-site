import type { ElectroDrawing } from '../lib/electrostaticsInstrument'
import { useMemo, useState } from 'react'
import { electrodes, potentialLevels, type ElectroVariant } from '../lib/electrostatics'
import Electrodes from './Electrodes'
import ElectroCoordinates from './ElectroCoordinates'
import '../styles/electrostatics.css'
const colours=['#2c78b5','#9a59ab','#2b9467','#c07827','#c64c56']
export default function ElectroExpectedField({variant,drawing}:{variant:ElectroVariant;drawing:ElectroDrawing}) {
  const [showField,setShowField]=useState(false)
  const levels=useMemo(()=>potentialLevels(variant),[variant])
  const contours=drawing.contours,lines=showField?drawing.lines:[]
  return <div className="es-page es-monitor-preview"><section className="es-panel">
    <div className="es-panel-heading"><h2>Ожидаемая картина поля</h2><label className="es-expected-toggle"><input type="checkbox" checked={showField} onChange={e=>setShowField(e.target.checked)}/> Силовые линии</label></div>
    <div className="es-preview-map"><svg className="es-sheet es-expected-diagram" viewBox="-12 -12 264 204" role="img" aria-label={`Эталонные эквипотенциальные линии варианта ${variant.number}`}>
      <defs><marker id="es-expected-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6" fill="var(--es-field-colour,#52765c)"/></marker></defs>
      <g transform="matrix(0 1 1 0 0 0)"><rect width="180" height="240" className="es-sheet-bg"/>{Array.from({length:37},(_,i)=><path key={'x'+i} className="es-grid" d={`M${i*5} 0V240`}/>)}{Array.from({length:49},(_,i)=><path key={'y'+i} className="es-grid" d={`M0 ${i*5}H180`}/>)}
        {contours.map((path,i)=><path key={i} d={path} fill="none" stroke={colours[i%colours.length]} strokeWidth=".8"/>)}
        {lines.map((path,i)=><path key={i} d={path} className="es-field-line" markerEnd="url(#es-expected-arrow)"/>)}</g><ElectroCoordinates/><g transform="matrix(0 1 1 0 0 0)"><Electrodes variant={variant}/>
      </g>
      {electrodes(variant).map((e,i)=><text className="es-expected-potential" key={i} x={e.y+6} y={e.x-5}>{e.potential?`+${variant.voltage}`:'0'} В</text>)}
    </svg></div>
    <div className="es-preview-legend">{levels.map((level,i)=><span key={level} style={{color:colours[i%colours.length]}}>{level} В</span>)}</div>
    <p className="es-hint">Это эталон назначенного варианта, а не измерения студента. Число точек, их расположение и погрешность в работе студента могут отличаться.</p>
  </section></div>
}
