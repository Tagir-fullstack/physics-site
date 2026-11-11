/** Coordinates of the landscape sheet; the solver retains its original frame. */
export default function ElectroCoordinates() {
  return <g className="es-coordinate-frame" pointerEvents="none">
    {Array.from({ length: 13 }, (_, i) => <text key={`x${i}`} x={i * 20} y="-4" textAnchor="middle">{i * 20 - 120}</text>)}
    {Array.from({ length: 10 }, (_, i) => <text key={`y${i}`} x="-3" y={i * 20 + 1.5} textAnchor="end">{90 - i * 20}</text>)}
    <text x="-3" y="91.5" textAnchor="end">0</text>
  </g>
}
