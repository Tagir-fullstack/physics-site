import { useState, useEffect } from 'react';
import '../styles/loading-screen.css';

// Крошечная модель атома Резерфорда
function RutherfordModelTiny() {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAngle(prev => prev + 2 * dt);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const size = 60;
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = 22;

  const ex = cx + orbitR * Math.cos(angle);
  const ey = cy + orbitR * Math.sin(angle);

  return (
    <div className="loading-atom-tiny">
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle
          cx={cx}
          cy={cy}
          r={orbitR}
          fill="none"
          stroke="rgba(74,144,226,0.35)"
          strokeWidth="0.8"
        />
      </svg>
      <div className="loading-nucleus-tiny" />
      <div className="loading-electron-tiny" style={{ left: ex, top: ey }} />
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
      <RutherfordModelTiny />
    </div>
  );
}
