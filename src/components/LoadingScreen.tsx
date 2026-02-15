import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/loading-screen.css';

// Упрощенные модели атомов для экрана загрузки

function RutherfordModelSimple() {
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

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const orbitR = 70;

  const ex = cx + orbitR * Math.cos(angle);
  const ey = cy + orbitR * Math.sin(angle);

  return (
    <div className="loading-atom-container">
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="rgba(74,144,226,0.3)" strokeWidth="1.5" />
      </svg>
      <div className="loading-nucleus" />
      <div className="loading-electron" style={{ left: ex, top: ey }} />
    </div>
  );
}

function BohrModelSimple() {
  const [angle, setAngle] = useState(0);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const orbits = [40, 60, 80];

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setAngle(prev => prev + 2.5 * dt);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="loading-atom-container">
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        {orbits.map((r, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(74,144,226,0.25)" strokeWidth="1" />
        ))}
      </svg>
      <div className="loading-nucleus" />
      {orbits.map((r, i) => {
        const a = angle + (i * Math.PI * 2 / 3);
        return (
          <div
            key={i}
            className="loading-electron"
            style={{ left: cx + r * Math.cos(a), top: cy + r * Math.sin(a) }}
          />
        );
      })}
    </div>
  );
}

function DeBroglieModelSimple() {
  const [time, setTime] = useState(0);
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const orbits = [40, 60, 80];

  useEffect(() => {
    let frameId: number;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime(prev => prev + dt);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const generateWavePath = (r: number, n: number): string => {
    const amplitude = 8;
    const steps = 360;
    const parts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const wave = amplitude * Math.sin(n * theta + time * 3);
      const currentR = r + wave;
      const x = cx + currentR * Math.cos(theta);
      const y = cy + currentR * Math.sin(theta);
      parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    parts.push('Z');
    return parts.join(' ');
  };

  return (
    <div className="loading-atom-container">
      <svg width={size} height={size} style={{ position: 'absolute' }}>
        {orbits.map((r, i) => (
          <path
            key={i}
            d={generateWavePath(r, i + 1)}
            fill="none"
            stroke="rgba(74,144,226,0.5)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="loading-nucleus" />
    </div>
  );
}

const models = [
  { id: 'rutherford', Component: RutherfordModelSimple, name: 'Модель Резерфорда' },
  { id: 'bohr', Component: BohrModelSimple, name: 'Модель Бора' },
  { id: 'debroglie', Component: DeBroglieModelSimple, name: 'Модель де Бройля' },
];

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Имитация прогресса загрузки
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (loadingProgress >= 100 && onComplete) {
      const timer = setTimeout(() => onComplete(), 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, onComplete]);

  useEffect(() => {
    // Переключение моделей каждые 1.5 секунды
    const interval = setInterval(() => {
      setCurrentModelIndex(prev => (prev + 1) % models.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const currentModel = models[currentModelIndex];
  const ModelComponent = currentModel.Component;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <img src="/favicon.png" alt="Physez" style={{ width: 60, height: 60 }} />
          <h1 className="loading-title">
            <span style={{ color: '#fff' }}>Phys</span>
            <span style={{ color: '#FC6255' }}>ez</span>
          </h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentModel.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            className="loading-model-wrapper"
          >
            <ModelComponent />
            <div className="loading-model-name">{currentModel.name}</div>
          </motion.div>
        </AnimatePresence>

        <div className="loading-progress-container">
          <div className="loading-progress-bar">
            <div
              className="loading-progress-fill"
              style={{ width: `${Math.min(loadingProgress, 100)}%` }}
            />
          </div>
          <div className="loading-progress-text">
            {Math.round(Math.min(loadingProgress, 100))}%
          </div>
        </div>

        <div className="loading-subtitle">Загрузка анимаций...</div>
      </div>
    </div>
  );
}
