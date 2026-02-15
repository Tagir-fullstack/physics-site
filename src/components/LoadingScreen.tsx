import { useState, useEffect } from 'react';
import '../styles/loading-screen.css';

// Точная копия модели Резерфорда с главной страницы, только меньше
// 3 эллиптические орбиты под углами 60°, по 2 электрона на каждой
const rutherfordOrbits = [
  { a: 48, b: 20, rot: 30 },   // уменьшено в 3.3 раза от оригинала (160 -> 48)
  { a: 48, b: 20, rot: 90 },
  { a: 48, b: 20, rot: 150 },
];

const rutherfordElectrons = [
  { orbit: 0, startAngle: 0,    speed: 1.3 },
  { orbit: 0, startAngle: Math.PI, speed: 1.3 },
  { orbit: 1, startAngle: 1.2,  speed: 1.0 },
  { orbit: 1, startAngle: 1.2 + Math.PI, speed: 1.0 },
  { orbit: 2, startAngle: 0.5,  speed: 1.5 },
  { orbit: 2, startAngle: 0.5 + Math.PI, speed: 1.5 },
];

function RutherfordModelLoading() {
  const [angles, setAngles] = useState(rutherfordElectrons.map(e => e.startAngle));
  const size = 120;
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
    <div className="loading-atom-rutherford">
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
      <div className="loading-rutherford-nucleus" />
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
            className="loading-rutherford-electron"
            style={{ left: cx + rx, top: cy + ry }}
          />
        );
      })}
    </div>
  );
}

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  useEffect(() => {
    // Автоматически завершаем загрузку через минимальное время
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="loading-screen">
      <RutherfordModelLoading />
    </div>
  );
}
