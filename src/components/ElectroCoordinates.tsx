/** Axes in centimetres at 1 cm intervals; geometry remains in millimetres. */
export default function ElectroCoordinates() {
  return <g className="es-coordinate-frame" pointerEvents="none">
    {Array.from({ length: 25 }, (_, i) => <text key={`x${i}`} x={i * 10} y="-4" textAnchor="middle">{i - 12}</text>)}
    {Array.from({ length: 19 }, (_, i) => <text key={`y${i}`} x="-3" y={i * 10 + 1.5} textAnchor="end">{9 - i}</text>)}
    <text x="240" y="190" textAnchor="end">x, см → · y, см ↑</text>
  </g>
}
