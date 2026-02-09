import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/atom-models.css';

interface AtomModel {
  id: string;
  name: string;
  nickname: string;
  year: number;
  author: string;
  status: 'outdated' | 'partial' | 'current';
  statusText: string;
  duration?: number;
}

const models: AtomModel[] = [
  {
    id: 'dalton',
    name: 'Модель Дальтона',
    nickname: '«Бильярдный шар»',
    year: 1803,
    author: 'Джон Дальтон',
    status: 'outdated',
    statusText: 'Не является верной'
  },
  {
    id: 'thomson',
    name: 'Модель Томсона',
    nickname: '«Пудинг с изюмом»',
    year: 1904,
    author: 'Джозеф Томсон',
    status: 'outdated',
    statusText: 'Не является верной'
  },
  {
    id: 'rutherford',
    name: 'Модель Резерфорда',
    nickname: '«Планетарная модель»',
    year: 1911,
    author: 'Эрнест Резерфорд',
    status: 'outdated',
    statusText: 'Не является верной'
  },
  {
    id: 'bohr',
    name: 'Модель Бора',
    nickname: '«Квантовые орбиты»',
    year: 1913,
    author: 'Нильс Бор',
    status: 'partial',
    statusText: 'Почти верная — работает для водорода',
    duration: 10000
  },
  {
    id: 'sommerfeld',
    name: 'Модель Бора-Зоммерфельда',
    nickname: '«Эллиптические орбиты»',
    year: 1916,
    author: 'Арнольд Зоммерфельд',
    status: 'partial',
    statusText: 'Почти верная — уточнение модели Бора'
  },
  {
    id: 'quantum',
    name: 'Квантово-механическая модель',
    nickname: '«Электронное облако»',
    year: 1926,
    author: 'Эрвин Шрёдингер',
    status: 'current',
    statusText: 'Современная модель'
  }
];

// Quantum model: random dots around nucleus
function generateQuantumDots(count: number, maxR: number) {
  const dots: { x: number; y: number; delay: number; duration: number }[] = [];
  for (let i = 0; i < count; i++) {
    // Gaussian-like distribution: more dots closer to center
    const r = Math.sqrt(Math.random()) * maxR;
    const angle = Math.random() * Math.PI * 2;
    dots.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      delay: Math.random() * 3,
      duration: 1 + Math.random() * 2
    });
  }
  return dots;
}

function DaltonModel() {
  return (
    <div className="atom-model-container">
      <div className="dalton-sphere">
        <span className="dalton-label">Атом</span>
      </div>
    </div>
  );
}

function ThomsonModel() {
  const electrons = [
    { top: '15%', left: '38%' },
    { top: '22%', left: '68%' },
    { top: '43%', left: '82%' },
    { top: '74%', left: '73%' },
    { top: '83%', left: '42%' },
    { top: '67%', left: '18%' },
    { top: '33%', left: '20%' },
    { top: '55%', left: '55%' },
    { top: '38%', left: '48%' },
    { top: '58%', left: '35%' },
    { top: '28%', left: '52%' },
  ];

  return (
    <div className="atom-model-container">
      <div className="thomson-pudding">
        <span className="thomson-pudding-label">+ заряд</span>
        {electrons.map((pos, i) => (
          <div
            key={i}
            className="thomson-electron"
            style={{
              top: pos.top,
              left: pos.left,
              animation: `thomson-wobble ${2 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Rutherford: 3 orbits at ~60° angles, 2 electrons each (like classic atom symbol)
const rutherfordOrbits = [
  { a: 160, b: 65, rot: 30 },
  { a: 160, b: 65, rot: 90 },
  { a: 160, b: 65, rot: 150 },
];

const rutherfordElectrons = [
  { orbit: 0, startAngle: 0,    speed: 1.3 },
  { orbit: 0, startAngle: Math.PI, speed: 1.3 },
  { orbit: 1, startAngle: 1.2,  speed: 1.0 },
  { orbit: 1, startAngle: 1.2 + Math.PI, speed: 1.0 },
  { orbit: 2, startAngle: 0.5,  speed: 1.5 },
  { orbit: 2, startAngle: 0.5 + Math.PI, speed: 1.5 },
];

function RutherfordModel() {
  const [angles, setAngles] = useState(rutherfordElectrons.map(e => e.startAngle));
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAngles(prev => prev.map((angle, i) => angle + rutherfordElectrons[i].speed * dt));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="atom-model-container">
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {rutherfordOrbits.map((orb, i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={orb.a}
            ry={orb.b}
            transform={`rotate(${orb.rot} ${cx} ${cy})`}
            fill="none"
            stroke="rgba(74,144,226,0.25)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="rutherford-nucleus" />
      {rutherfordElectrons.map((el, i) => {
        const orb = rutherfordOrbits[el.orbit];
        const rotRad = (orb.rot * Math.PI) / 180;
        const ex = orb.a * Math.cos(angles[i]);
        const ey = orb.b * Math.sin(angles[i]);
        const rx = ex * Math.cos(rotRad) - ey * Math.sin(rotRad);
        const ry = ex * Math.sin(rotRad) + ey * Math.cos(rotRad);
        return (
          <div
            key={i}
            className="rutherford-e-dot"
            style={{ left: cx + rx, top: cy + ry }}
          />
        );
      })}
    </div>
  );
}

// Bohr: hydrogen atom with electron transitions and photon emission/absorption
const bohrOrbitRadii = [50, 90, 140, 180]; // n=1..4
const bohrTransitions = [
  { from: 0, to: 3 }, // absorb UV: n=1 → n=4
  { from: 3, to: 1 }, // emit blue: n=4 → n=2
  { from: 1, to: 0 }, // emit red:  n=2 → n=1
];

// Photon colors based on transition energy
function getPhotonColor(from: number, to: number) {
  const diff = Math.abs(from - to);
  if (diff >= 3) return '#9b59b6'; // UV - purple
  if (diff === 2) return '#3498db'; // blue
  return '#FC6255'; // red
}

function BohrModel() {
  const size = 400;
  const cx = size / 2;
  const cy = size / 2;

  const [angle, setAngle] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0); // start at n=1
  const [transitionIndex, setTransitionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [photon, setPhoton] = useState<{ x: number; y: number; color: string; opacity: number } | null>(null);

  const transition = bohrTransitions[transitionIndex];
  const isAbsorbing = transition.from < transition.to;
  const fromR = bohrOrbitRadii[transition.from];
  const toR = bohrOrbitRadii[transition.to];

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    let timer = 0;
    const ORBIT_TIME = 1.5; // seconds on orbit before transition

    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setAngle(prev => prev + 2.5 * dt);
      timer += dt;

      if (!isTransitioning) {
        if (timer > ORBIT_TIME) {
          timer = 0;
          setIsTransitioning(true);
          setTransitionProgress(0);
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isTransitioning]);

  // Handle transition animation
  useEffect(() => {
    if (!isTransitioning) return;
    let frameId: number;
    let last = performance.now();
    let phase: 'photon-in' | 'jump' | 'photon-out' = isAbsorbing ? 'photon-in' : 'jump';
    let phaseTime = 0;
    const PHOTON_FLY = 0.8;
    const JUMP_DURATION = 0.4;

    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      phaseTime += dt;

      if (phase === 'photon-in') {
        // Absorption: photon flies IN toward electron, then electron jumps up
        const p = Math.min(phaseTime / PHOTON_FLY, 1);
        setPhoton({
          x: (1 - p) * 120,
          y: (1 - p) * -60,
          color: getPhotonColor(transition.from, transition.to),
          opacity: 0.3 + p * 0.7
        });
        if (p >= 1) {
          setPhoton(null);
          phase = 'jump';
          phaseTime = 0;
        }
      } else if (phase === 'jump') {
        const p = Math.min(phaseTime / JUMP_DURATION, 1);
        setTransitionProgress(p);
        if (p >= 1) {
          setCurrentLevel(transition.to);
          if (!isAbsorbing) {
            // Emission: after jump down, photon flies OUT
            phase = 'photon-out';
            phaseTime = 0;
            setPhoton({ x: 0, y: 0, color: getPhotonColor(transition.from, transition.to), opacity: 1 });
          } else {
            // Absorption done
            setPhoton(null);
            setIsTransitioning(false);
            setTransitionProgress(0);
            setTransitionIndex(prev => (prev + 1) % bohrTransitions.length);
            return;
          }
        }
      } else if (phase === 'photon-out') {
        const p = Math.min(phaseTime / PHOTON_FLY, 1);
        setPhoton({
          x: p * 120,
          y: p * -60,
          color: getPhotonColor(transition.from, transition.to),
          opacity: 1 - p * 0.7
        });
        if (p >= 1) {
          setPhoton(null);
          setIsTransitioning(false);
          setTransitionProgress(0);
          setTransitionIndex(prev => (prev + 1) % bohrTransitions.length);
          return;
        }
      }

      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isTransitioning, transition, isAbsorbing]);

  // Electron radius during transition
  const electronR = isTransitioning
    ? fromR + (toR - fromR) * transitionProgress
    : bohrOrbitRadii[currentLevel];

  const ex = cx + electronR * Math.cos(angle);
  const ey = cy + electronR * Math.sin(angle);

  return (
    <div className="atom-model-container">
      <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {bohrOrbitRadii.map((r, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`rgba(74,144,226,${i === currentLevel ? 0.4 : 0.15})`}
            strokeWidth={i === currentLevel ? 2 : 1}
          />
        ))}
        {/* Energy level labels */}
        {bohrOrbitRadii.map((r, i) => (
          <text
            key={`label-${i}`}
            x={cx + r + 8}
            y={cy - 5}
            fill="rgba(255,255,255,0.3)"
            fontSize="11"
          >
            n={i + 1}
          </text>
        ))}
      </svg>

      {/* Nucleus: proton (H) */}
      <div className="bohr-nucleus" style={{ width: 24, height: 24 }}>
        <span style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          color: 'white', fontSize: '9px', fontWeight: 'bold'
        }}>H</span>
      </div>

      {/* Electron */}
      <div className="bohr-h-electron" style={{ left: ex, top: ey }} />

      {/* Photon */}
      {photon && (
        <div
          className="bohr-photon"
          style={{
            left: ex + photon.x,
            top: ey + photon.y,
            opacity: photon.opacity,
            backgroundColor: photon.color,
            boxShadow: `0 0 14px ${photon.color}, 0 0 28px ${photon.color}`,
          }}
        />
      )}

    </div>
  );
}

// Sommerfeld elliptical orbits for n=5: same semi-major axis, b = a*(ℓ+1)/n
const sommerfeldA = 130;
const sommerfeldOrbits = [
  { a: sommerfeldA, b: sommerfeldA * 1 / 5, rot: 0, speed: 2.5, color: '#e74c3c' },  // 5s ℓ=0
  { a: sommerfeldA, b: sommerfeldA * 2 / 5, rot: 0, speed: 1.8, color: '#f39c12' },  // 5p ℓ=1
  { a: sommerfeldA, b: sommerfeldA * 3 / 5, rot: 0, speed: 1.3, color: '#27ae60' },  // 5d ℓ=2
  { a: sommerfeldA, b: sommerfeldA * 4 / 5, rot: 0, speed: 0.9, color: '#2980b9' },  // 5f ℓ=3
  { a: sommerfeldA, b: sommerfeldA * 5 / 5, rot: 0, speed: 0.6, color: '#9b59b6' },  // 5g ℓ=4
];

function SommerfeldModel() {
  const [angles, setAngles] = useState(sommerfeldOrbits.map(() => Math.random() * Math.PI * 2));
  const containerSize = 400;
  const cx = containerSize * 0.35;
  const cy = containerSize / 2;

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAngles(prev => prev.map((angle, i) => angle + sommerfeldOrbits[i].speed * dt));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="atom-model-container">
      <svg width={containerSize} height={containerSize} style={{ position: 'absolute', top: 0, left: 0 }}>
        {sommerfeldOrbits.map((orb, i) => {
          const c = Math.sqrt(orb.a * orb.a - orb.b * orb.b);
          const rotRad = (orb.rot * Math.PI) / 180;
          const ecx = cx + c * Math.cos(rotRad);
          const ecy = cy + c * Math.sin(rotRad);
          return (
            <ellipse
              key={i}
              cx={ecx}
              cy={ecy}
              rx={orb.a}
              ry={orb.b}
              transform={`rotate(${orb.rot} ${ecx} ${ecy})`}
              fill="none"
              stroke={orb.color}
              strokeWidth="2"
              opacity={0.55}
            />
          );
        })}
      </svg>
      <div className="sommerfeld-nucleus" />
      {sommerfeldOrbits.map((orb, i) => {
        const c = Math.sqrt(orb.a * orb.a - orb.b * orb.b);
        const rotRad = (orb.rot * Math.PI) / 180;
        // Electron position on ellipse (parametric)
        const ex = orb.a * Math.cos(angles[i]);
        const ey = orb.b * Math.sin(angles[i]);
        // Rotate by orbit angle, then offset by ellipse center
        const rx = ex * Math.cos(rotRad) - ey * Math.sin(rotRad);
        const ry = ex * Math.sin(rotRad) + ey * Math.cos(rotRad);
        // Add focus offset + container center
        const px = cx + c * Math.cos(rotRad) + rx;
        const py = cy + c * Math.sin(rotRad) + ry;
        return (
          <div
            key={i}
            className="sommerfeld-e-dot"
            style={{
              left: px,
              top: py,
              background: `radial-gradient(circle, ${orb.color}, ${orb.color}dd)`,
              boxShadow: `0 0 10px ${orb.color}cc`,
            }}
          />
        );
      })}
    </div>
  );
}

function QuantumModel() {
  const dots = useMemo(() => generateQuantumDots(60, 170), []);

  return (
    <div className="atom-model-container">
      <div className="quantum-cloud quantum-cloud-4" />
      <div className="quantum-cloud quantum-cloud-3" />
      <div className="quantum-cloud quantum-cloud-2" />
      <div className="quantum-cloud quantum-cloud-1" />
      <div className="quantum-nucleus" />
      {dots.map((dot, i) => (
        <div
          key={i}
          className="quantum-dot"
          style={{
            top: `calc(50% + ${dot.y}px)`,
            left: `calc(50% + ${dot.x}px)`,
            animation: `quantum-flicker ${dot.duration}s ease-in-out infinite`,
            animationDelay: `${dot.delay}s`
          }}
        />
      ))}
    </div>
  );
}

const modelComponents: Record<string, () => ReturnType<typeof DaltonModel>> = {
  dalton: DaltonModel,
  thomson: ThomsonModel,
  rutherford: RutherfordModel,
  bohr: BohrModel,
  sommerfeld: SommerfeldModel,
  quantum: QuantumModel
};

const DEFAULT_INTERVAL = 8000;

export default function RandomAtomModel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const duration = models[index].duration ?? DEFAULT_INTERVAL;
    const timer = setTimeout(() => {
      setIndex(prev => (prev + 1) % models.length);
    }, duration);
    return () => clearTimeout(timer);
  }, [index]);

  const model = models[index];
  const ModelComponent = modelComponents[model.id];

  return (
    <div className="atom-model-wrapper">
      <AnimatePresence mode="wait">
        <motion.div
          key={model.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.5 }}
        >
          <ModelComponent />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={model.id + '-info'}
          className="atom-model-info"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          <div className="atom-model-name">{model.name}</div>
          <div className="atom-model-nickname">{model.nickname}</div>
          <div className="atom-model-year">{model.author}, {model.year} г.</div>
          <span className={`atom-model-status ${model.status}`}>
            {model.statusText}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
