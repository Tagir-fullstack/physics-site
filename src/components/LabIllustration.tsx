type Lab = 'atwood' | 'ball-collision' | 'oberbeck' | 'clement-desormes'
const titles: Record<Lab, string> = { atwood: 'Машина Атвуда: блок, два груза и стойка', 'ball-collision': 'Подвешенные шары и две угловые шкалы', oberbeck: 'Маятник Обербека: крестовина, шкив и подвешенный груз', 'clement-desormes': 'Баллон, компрессор, краны К и К₀ и водяной манометр' }

export default function LabIllustration({ id }: { id: Lab }) {
  return <svg className="labs-illustration" viewBox="0 0 360 240" role="img" aria-label={titles[id]} fill="none">
    {id === 'clement-desormes' ? <>
      <g stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M130 73V58H150V73Q190 78 188 103L180 210Q140 223 100 210L92 103Q90 78 130 73Z" fill="currentColor" fillOpacity=".06"/>
        <path d="M140 58V34H270V55M140 34H50V18M140 53H50V160"/>
        <rect x="29" y="160" width="42" height="45" rx="7" fill="currentColor" fillOpacity=".12"/>
        <path d="M270 55V196Q290 225 310 196V55" strokeWidth="8" opacity=".4"/>
        <path d="M270 126V196Q290 225 310 196V103" stroke="#5aa9ed" strokeWidth="5"/>
        <path d="M288 65V196M284 90H292M284 110H292M284 130H292M284 150H292M284 170H292M284 190H292" opacity=".5"/>
        <circle cx="83" cy="34" r="6"/><path d="M83 23V45" strokeWidth="3"/>
        <circle cx="92" cy="53" r="6"/><path d="M92 42V64" strokeWidth="3"/>
      </g><g fill="currentColor" className="labs-illustration-labels"><text x="80" y="16">К₀</text><text x="102" y="57">К</text><text x="135" y="167">Б</text><text x="43" y="189">Н</text><text x="321" y="153">h′</text></g>
    </> : id === 'atwood' ? <>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M166 53V218M174 53V218M117 218H223M104 224H236" opacity=".35" />
        <circle cx="170" cy="53" r="33" /><circle cx="170" cy="53" r="4" />
        <path d="M170 26V44M170 62V80M143 53H161M179 53H197" opacity=".4" />
        <path d="M137 173V53A33 33 0 0 1 203 53V105" strokeWidth="2" />
        <path d="M243 125H253M248 125V197M243 197H253" opacity=".6" />
        <path d="M224 125H239M158 197H239" opacity=".35" strokeDasharray="3 4" />
      </g>
      <rect x="124" y="173" width="26" height="24" rx="1" fill="#8796a8" stroke="#c3ced8" />
      {[99, 103].map(y => <ellipse key={y} cx="203" cy={y} rx="11" ry="2" stroke="currentColor" strokeWidth="1.5" />)}
      <rect x="190" y="105" width="26" height="24" rx="1" fill="#c84d4a" stroke="#ff7166" />
      <g className="labs-illustration-labels" fill="currentColor"><text x="104" y="188">m₁</text><text x="224" y="119">m₂</text><text x="259" y="165">s</text></g>
    </> : id === 'ball-collision' ? <>
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M154 19H206V31H154ZM168 31V39M192 31V39" />
        <circle cx="168" cy="42" r="3" /><circle cx="192" cy="42" r="3" />
        <path d="M168 45V157M192 45L215 154" />
        <path d="M96 167A144 144 0 0 0 168 186M192 186A144 144 0 0 0 264 167" opacity=".65" />
        <path d="M168 186V210H192V186M96 167V210M264 167V210M118 221H242M108 228H252" opacity=".3" />
        {([-1, 1] as const).flatMap(side => Array.from({ length: 16 }, (_, i) => {
          const degrees = i * 2, radians = side * degrees * Math.PI / 180, pivot = side < 0 ? 168 : 192
          const length = degrees % 10 === 0 ? 9 : 4
          return <line key={`${side}-${i}`} x1={pivot + 144 * Math.sin(radians)} y1={42 + 144 * Math.cos(radians)} x2={pivot + (144 + length) * Math.sin(radians)} y2={42 + (144 + length) * Math.cos(radians)} opacity=".65" />
        }))}
      </g>
      <g className="labs-illustration-labels" fill="currentColor" textAnchor="middle">{([-1, 1] as const).flatMap(side => [0, 10, 20, 30].map(degrees => {
        const radians = side * degrees * Math.PI / 180, pivot = side < 0 ? 168 : 192
        return <text key={`${side}-${degrees}`} x={pivot + 164 * Math.sin(radians)} y={46 + 164 * Math.cos(radians)}>{degrees}°</text>
      }))}</g>
      <circle cx="168" cy="157" r="11" fill="#8796a8" stroke="#c3ced8" />
      <circle cx="215" cy="154" r="11" fill="#c84d4a" stroke="#ff7166" />
      <g fill="#fff" opacity=".4"><circle cx="165" cy="154" r="2" /><circle cx="212" cy="151" r="2" /></g>
      <g fill="currentColor"><path d="M164 174H172L168 180Z" /><path d="M215 170L222 168L220 177Z" /></g>
    </> : <>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M136 100V213M144 100V213M99 213H296M90 220H306" opacity=".35" />
        <path d="M56 100H224M140 16V184" strokeWidth="2" />
        <circle cx="140" cy="100" r="12" /><circle cx="140" cy="100" r="8" opacity=".6" /><circle cx="140" cy="100" r="3" />
        <path d="M140 88H260A8 8 0 0 1 268 96V151" /><circle cx="260" cy="96" r="8" />
        <path d="M292 159H321M292 213H321M316 159V213" opacity=".45" strokeDasharray="3 3" />
        <path d="M311 159H321M311 213H321" opacity=".6" />
      </g>
      {[[96, 94, 8, 13], [176, 94, 8, 13], [133, 56, 14, 8], [133, 136, 14, 8]].map(([x, y, width, height]) => <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} fill="#8796a8" stroke="#c3ced8" />)}
      <path d="M253 156H283V162H253Z" fill="#8796a8" stroke="#c3ced8" />
      <rect x="257" y="150" width="22" height="6" fill="#c84d4a" stroke="#ff7166" />
      <g className="labs-illustration-labels" fill="currentColor"><text x="286" y="154">m</text><text x="326" y="190">h</text></g>
    </>}
  </svg>
}
