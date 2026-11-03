const orbits = [55, 100, 145, 190].map((radius, index) => {
  const points = Array.from({ length: 181 }, (_, step) => {
    const angle = step / 180 * Math.PI * 2
    const r = radius + 14 * Math.sin((index + 1) * angle)
    return `${step ? 'L' : 'M'}${(250 + r * Math.cos(angle)).toFixed(2)} ${(250 + r * Math.sin(angle)).toFixed(2)}`
  })
  return points.join(' ') + 'Z'
})

export default function StaticDeBroglie() {
  return <svg className="home-course-atom" viewBox="0 0 500 500" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth=".8">{orbits.map(path => <path key={path} d={path}/>)}</g>
    <circle cx="250" cy="250" r="9" fill="currentColor"/>
  </svg>
}
