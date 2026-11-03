import '../styles/lab-illustration.css'

type Lab = 'atwood' | 'ball-collision' | 'oberbeck' | 'clement-desormes'
const titles: Record<Lab, string> = { atwood: 'Машина Атвуда: блок, два груза и стойка', 'ball-collision': 'Подвешенные шары и две угловые шкалы', oberbeck: 'Маятник Обербека: крестовина, шкив и подвешенный груз', 'clement-desormes': 'Баллон, компрессор, краны К и К₀ и водяной манометр' }

export default function LabIllustration({ id }: { id: Lab }) {
  return <svg className="labs-illustration" viewBox={id === 'clement-desormes' ? '35 35 690 485' : '0 0 360 240'} role="img" aria-label={titles[id]} fill="none">
    {id === 'clement-desormes' ? <>
      <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M302 132H338V160H382Q412 160 412 190V432Q412 450 394 450H246Q228 450 228 432V190Q228 160 258 160H302Z"/>
        <rect x="285" y="119" width="70" height="13"/>
        <rect x="145" y="230" width="50" height="85" fill="#8796a8" stroke="#c3ced8"/>
        <rect x="535" y="98" width="150" height="392"/>
        <path d="M70 77H540Q567 77 567 100V430C567 454 586 473 610 473S653 454 653 430V100M70 83H540Q553 83 553 100V430C553 462 578 487 610 487S667 462 667 430V100M167 83V230M173 83V230M317 83V119M323 83V119"/>
        <path d="M560 280V430C560 458 582 480 610 480S660 458 660 430V260" stroke="#4b9cdf" strokeWidth="10"/>
        <path className="lab-motion lab-water-left" d="M560 260V281" stroke="#4b9cdf" strokeWidth="10"/>
        <path className="lab-motion lab-water-right" d="M660 240V261" stroke="#4b9cdf" strokeWidth="10"/>
        {Array.from({ length: 51 }, (_, i) => <path key={i} d={`M${i % 5 === 0 ? 594 : 605} ${440 - i * 6.5}H616`} opacity={i % 5 === 0 ? '.7' : '.4'}/>)}
        <path d="M160 152H180L177 176H163ZM97 66H113L109 95H101Z" fill="currentColor"/>
        <path d="M181 164H190M190 144V184M91 54H119M105 54V66"/>
      </g>
    </> : id === 'atwood' ? <>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M166 53V218M174 53V218M117 218H223M104 224H236" opacity=".35" />
        <circle cx="170" cy="53" r="33" /><circle cx="170" cy="53" r="4" />
        <path className="lab-motion lab-atwood-wheel" d="M170 26V44M170 62V80M143 53H161M179 53H197" opacity=".4" />
        <path d="M137 53A33 33 0 0 1 203 53" strokeWidth="2" />
        <path className="lab-motion lab-atwood-rope-left" d="M137 53V173" strokeWidth="2" />
        <path className="lab-motion lab-atwood-rope-right" d="M203 53V105" strokeWidth="2" />
      </g>
      <rect className="lab-motion lab-atwood-weight-left" x="124" y="173" width="26" height="24" rx="1" fill="#8796a8" stroke="#c3ced8" />
      <g className="lab-motion lab-atwood-weight-right">
      {[99, 103].map(y => <ellipse key={y} cx="203" cy={y} rx="11" ry="2" stroke="currentColor" strokeWidth="1.5" />)}
      <rect x="190" y="105" width="26" height="24" rx="1" fill="#4b9cdf" stroke="#79bdf2" />
      </g>
    </> : id === 'ball-collision' ? <>
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M154 19H206V31H154ZM168 31V39M192 31V39" />
        <circle cx="168" cy="42" r="3" /><circle cx="192" cy="42" r="3" />
        <path d="M96 167A144 144 0 0 0 168 186M192 186A144 144 0 0 0 264 167" opacity=".65" />
        <path d="M168 186V210H192V186M96 167V210M264 167V210M118 221H242M108 228H252" opacity=".3" />
        {([-1, 1] as const).flatMap(side => Array.from({ length: 16 }, (_, i) => {
          const degrees = i * 2, radians = side * degrees * Math.PI / 180, pivot = side < 0 ? 168 : 192
          const length = degrees % 10 === 0 ? 9 : 4
          return <line key={`${side}-${i}`} x1={pivot + 144 * Math.sin(radians)} y1={42 + 144 * Math.cos(radians)} x2={pivot + (144 + length) * Math.sin(radians)} y2={42 + (144 + length) * Math.cos(radians)} opacity=".65" />
        }))}
      </g>
      <g className="lab-motion lab-ball-left">
        <path d="M168 45V157" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="168" cy="157" r="12" fill="#8796a8" stroke="#c3ced8" />
        <circle cx="165" cy="154" r="2" fill="#fff" opacity=".4"/>
        <path d="M164 174H172L168 180Z" fill="currentColor"/>
      </g>
      <g className="lab-motion lab-ball-right">
        <path d="M192 45V157" stroke="currentColor" strokeWidth="1.2"/>
        <circle cx="192" cy="157" r="12" fill="#fc6255" stroke="#ff9a90" />
        <circle cx="189" cy="154" r="2" fill="#fff" opacity=".4"/>
        <path d="M188 174H196L192 180Z" fill="currentColor"/>
      </g>
    </> : <>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M136 100V213M144 100V213M99 213H296M90 220H306" opacity=".35" />
        <circle cx="140" cy="100" r="12" /><circle cx="140" cy="100" r="8" opacity=".6" /><circle cx="140" cy="100" r="3" />
        <path d="M140 88H260A8 8 0 0 1 268 96" /><circle cx="260" cy="96" r="8" />
        <path className="lab-motion lab-oberbeck-rope" d="M268 96V150"/>
      </g>
      <g className="lab-motion lab-oberbeck-rotor">
      <path d="M56 100H224M140 16V184" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {[[96, 94, 8, 13], [176, 94, 8, 13], [133, 56, 14, 8], [133, 136, 14, 8]].map(([x, y, width, height]) => <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} fill="#8796a8" stroke="#c3ced8" />)}
      </g>
      <g className="lab-motion lab-oberbeck-weight">
        <path d="M253 156H283V162H253Z" fill="#8796a8" stroke="#c3ced8" />
        <rect x="257" y="150" width="22" height="6" fill="#4b9cdf" stroke="#79bdf2" />
      </g>
    </>}
  </svg>
}
