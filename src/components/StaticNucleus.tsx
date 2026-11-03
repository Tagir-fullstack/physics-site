// Stable spherical packing with a rounded silhouette.
const noise = (seed: number) => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const nucleons: Array<{ x: number; y: number; z: number; light: boolean }> = []
// Overlapping circles around the rim keep the whole cluster circular.
for (let i = 0; i < 24; i++) {
  const angle = i * Math.PI * 2 / 24
  nucleons.push({ x: 150 + 98 * Math.cos(angle), y: 150 + 98 * Math.sin(angle), z: -110, light: false })
}
// Spread the larger circles over a sphere, then draw from back to front.
for (let i = 0; i < 100; i++) {
  const depth = 1 - 2 * (i + .5) / 100
  const radius = 94 * Math.sqrt(1 - depth * depth)
  const angle = i * Math.PI * (3 - Math.sqrt(5))
  nucleons.push({ x: 150 + radius * Math.cos(angle), y: 150 + radius * Math.sin(angle), z: depth * 94, light: false })
}
// Shuffle the colors deterministically with more light circles than dark ones.
const colorOrder = nucleons.map((ball, index) => ({ ball, rank: noise(index + 500) })).sort((a, b) => a.rank - b.rank)
colorOrder.forEach(({ ball }, index) => { ball.light = index < Math.round(nucleons.length * 2 / 3) })
nucleons.sort((a, b) => a.z - b.z)

export default function StaticNucleus() {
  return <svg className="home-about-nucleus" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
    {nucleons.map((ball, index) => <circle key={index} cx={ball.x} cy={ball.y} r="18.5" fill={ball.light ? '#dedede' : '#454545'} stroke={ball.light ? '#454545' : '#bcbcbc'} strokeWidth=".65"/>)}
  </svg>
}
