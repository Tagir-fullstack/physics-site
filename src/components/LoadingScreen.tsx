import { useState, useEffect } from 'react';
import '../styles/loading-screen.css';

// Миниатюрная модель атома Резерфорда
function RutherfordModelMini() {
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

  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = 30;

  const ex = cx + orbitR * Math.cos(angle);
  const ey = cy + orbitR * Math.sin(angle);

  return (
    <div className="loading-atom-mini">
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="rgba(74,144,226,0.4)" strokeWidth="1" />
      </svg>
      <div className="loading-nucleus-mini" />
      <div className="loading-electron-mini" style={{ left: ex, top: ey }} />
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
      <RutherfordModelMini />
    </div>
  );
}
