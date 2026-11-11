import { electrodes, type ElectroVariant } from '../lib/electrostatics'
export default function Electrodes({ variant: v }: { variant: ElectroVariant }) {
  return <>{electrodes(v).map((e, i) => <g key={i} className="es-electrode">
    <g transform={`rotate(${e.angle} ${e.x} ${e.y})`}>{e.shape === 'disc' ? <circle cx={e.x} cy={e.y} r={e.radius}/> : <rect x={e.x - e.length / 2} y={e.y - 3} width={e.length} height="6" rx="1"/>}</g>
  </g>)}</>
}
