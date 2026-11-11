import { axisOrigin, type ElectroVariant, type Point } from '../lib/electrostatics'
import type { ElectroNotebook } from '../lib/electrostaticsNotebook'
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
export default function ElectroAxisPlot({ notebook, variant: v }: { notebook: ElectroNotebook; variant: ElectroVariant }) {
  const points = [...notebook.axis].sort((a, b) => a.y - b.y), origin = axisOrigin(v)
  const x = (p: Point) => 50 + (240 - p.y) / 240 * 470, y = (p: { potential: number }) => 225 - p.potential / v.voltage * 190
  return <svg viewBox="0 0 560 275" className="es-plot" role="img" aria-label="График потенциала по измерениям на центральной оси; горизонтальное смещение от проекции нулевого электрода">
    {[0, .25, .5, .75, 1].map(t => <g key={t}><path d={`M50 ${225 - t * 190}H520`} stroke="currentColor" opacity=".12"/><text x="43" y={230 - t * 190} textAnchor="end">{fmt(t * v.voltage)}</text></g>)}
    <path d="M50 25V225H530" fill="none" stroke="currentColor"/><text x="50" y="17">φ, В</text><text x="525" y="266" textAnchor="end">r, мм (от проекции электрода 0 В влево)</text>
    {[0, 60, 120, 180, 240].map(py => <text key={py} x={50 + (240 - py) / 240 * 470} y="245" textAnchor="middle">{origin - py}</text>)}
    <polyline points={points.map(p => `${x(p)},${y(p)}`).join(' ')} fill="none" stroke="#518cc2" strokeWidth="2"/>{points.map((p, i) => <circle key={i} cx={x(p)} cy={y(p)} r="4" fill="#d4873c"><title>{fmt(origin - p.y)} мм; {fmt(p.potential)} В</title></circle>)}
  </svg>
}
