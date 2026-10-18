export default function MoleculeDiagram() {
  return <svg className="assessment-molecule" viewBox="0 0 340 230" role="img" aria-label="АБ₂: x, y, z; O — центр масс / массалар центрі">
    <defs><marker id="molecule-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M45 118 H310" markerEnd="url(#molecule-arrow)" />
      <path d="M170 205 V15" markerEnd="url(#molecule-arrow)" />
      <path d="M70 185 L170 55 L270 185" strokeWidth="3" />
      <path d="M143 90 Q170 110 197 90" />
      <circle cx="170" cy="118" r="8" /><circle cx="170" cy="118" r="1.5" fill="currentColor" />
    </g>
    <g className="molecule-atoms" stroke="currentColor" strokeWidth="2"><circle cx="170" cy="55" r="13" /><circle cx="70" cy="185" r="11" /><circle cx="270" cy="185" r="11" /></g>
    <g fill="currentColor" fontSize="17" fontFamily="sans-serif"><text x="190" y="59">А</text><text x="45" y="214">Б</text><text x="280" y="212">Б</text><text x="316" y="124">x</text><text x="184" y="23">y</text><text x="181" y="141">O</text><text x="126" y="153">z ⊙</text><text x="151" y="87">α</text><text x="101" y="104" fontStyle="italic">l</text><text x="236" y="104" fontStyle="italic">l</text></g>
  </svg>
}
