// Deterministic samples of a spherical electron cloud; no motion or random re-renders.
const cloud = Array.from({ length: 850 }, (_, index) => {
  const fraction = (index + .5) / 850
  const radius = Math.min(228, 68 * Math.sqrt(-2 * Math.log(fraction)))
  const angle = index * 2.399963229728653
  return { x: 250 + radius * Math.cos(angle), y: 250 + radius * Math.sin(angle), r: .7 + (index % 5) * .18, opacity: .25 + fraction * .75 }
})

export default function StaticSchrodinger() {
  return <svg className="home-results-atom" viewBox="0 0 500 500" aria-hidden="true" focusable="false">
    <defs><radialGradient id="home-schrodinger-cloud"><stop stopColor="currentColor" stopOpacity=".35"/><stop offset=".5" stopColor="currentColor" stopOpacity=".12"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
    <circle cx="250" cy="250" r="230" fill="url(#home-schrodinger-cloud)"/>
    <g fill="currentColor">{cloud.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={point.r} opacity={point.opacity}/>)}<circle cx="250" cy="250" r="8"/></g>
  </svg>
}
