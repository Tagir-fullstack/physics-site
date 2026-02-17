import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

import Footer from './components/Footer';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { QuizModeProvider } from './context/QuizModeContext';
import './styles/global.css';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Terms = lazy(() => import('./pages/Terms'));
const Changelog = lazy(() => import('./pages/Changelog'));

// Nuclear Physics pages - lazy loaded
const Rutherford = lazy(() => import('./pages/nuclear/Rutherford'));
const Droplet = lazy(() => import('./pages/nuclear/Droplet'));
const Alpha = lazy(() => import('./pages/nuclear/Alpha'));
const Beta = lazy(() => import('./pages/nuclear/Beta'));
const Gamma = lazy(() => import('./pages/nuclear/Gamma'));
const HalfLife = lazy(() => import('./pages/nuclear/HalfLife'));
const Interactions = lazy(() => import('./pages/nuclear/Interactions'));
const Decay = lazy(() => import('./pages/nuclear/Decay'));
const Chain = lazy(() => import('./pages/nuclear/Chain'));
const Quiz = lazy(() => import('./pages/nuclear/Quiz'));

// Quantum Physics pages - lazy loaded
const PlanckHypothesis = lazy(() => import('./pages/quantum/PlanckHypothesis'));
const PhotoelectricEffect = lazy(() => import('./pages/quantum/PhotoelectricEffect'));
const ComptonEffect = lazy(() => import('./pages/quantum/ComptonEffect'));
const WaveParticleDuality = lazy(() => import('./pages/quantum/WaveParticleDuality'));
const BohrModel = lazy(() => import('./pages/quantum/BohrModel'));
const UncertaintyPrinciple = lazy(() => import('./pages/quantum/UncertaintyPrinciple'));
const WaveFunction = lazy(() => import('./pages/quantum/WaveFunction'));
const SchrodingerEquation = lazy(() => import('./pages/quantum/SchrodingerEquation'));
const QuantumNumbers = lazy(() => import('./pages/quantum/QuantumNumbers'));
const ElectronSpin = lazy(() => import('./pages/quantum/ElectronSpin'));

// Невидимый fallback - LoadingScreen уже показывает процесс загрузки
function PageLoadingFallback() {
  return <div style={{ minHeight: '50vh' }} />;
}

function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Проверяем, был ли пользователь на сайте в этой сессии
    const hasVisited = sessionStorage.getItem('hasVisitedThisSession');

    if (hasVisited) {
      // Если уже был, не показываем загрузочный экран
      setIsInitialLoading(false);
    } else {
      // Показываем LoadingScreen при первом визите
      sessionStorage.setItem('hasVisitedThisSession', 'true');
    }
  }, []);

  return (
    <AccessibilityProvider>
      <QuizModeProvider>
      {isInitialLoading && <LoadingScreen onComplete={() => setIsInitialLoading(false)} />}
      <Router>
        <ScrollToTop />
        <div style={{
          display: isInitialLoading ? 'none' : 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}>
          <Header />
          <div style={{ flex: 1 }}>
            <Suspense fallback={<PageLoadingFallback />}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/changelog" element={<Changelog />} />

                  {/* Nuclear Physics Routes */}
                  <Route path="/nuclear/rutherford" element={<Rutherford />} />
                  <Route path="/nuclear/droplet" element={<Droplet />} />
                  <Route path="/nuclear/alpha" element={<Alpha />} />
                  <Route path="/nuclear/beta" element={<Beta />} />
                  <Route path="/nuclear/gamma" element={<Gamma />} />
                  <Route path="/nuclear/halflife" element={<HalfLife />} />
                  <Route path="/nuclear/interactions" element={<Interactions />} />
                  <Route path="/nuclear/decay" element={<Decay />} />
                  <Route path="/nuclear/chain" element={<Chain />} />
                  <Route path="/nuclear/quiz" element={<Quiz />} />

                  {/* Quantum Physics Routes */}
                  <Route path="/quantum/planck" element={<PlanckHypothesis />} />
                  <Route path="/quantum/photoelectric" element={<PhotoelectricEffect />} />
                  <Route path="/quantum/compton" element={<ComptonEffect />} />
                  <Route path="/quantum/wave-particle" element={<WaveParticleDuality />} />
                  <Route path="/quantum/bohr" element={<BohrModel />} />
                  <Route path="/quantum/uncertainty" element={<UncertaintyPrinciple />} />
                  <Route path="/quantum/wave-function" element={<WaveFunction />} />
                  <Route path="/quantum/schrodinger" element={<SchrodingerEquation />} />
                  <Route path="/quantum/quantum-numbers" element={<QuantumNumbers />} />
                  <Route path="/quantum/electron-spin" element={<ElectronSpin />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>
          <Footer />
        </div>
      </Router>
      </QuizModeProvider>
    </AccessibilityProvider>
  );
}

export default App;
