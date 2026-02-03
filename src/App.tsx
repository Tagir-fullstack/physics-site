import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Terms from './pages/Terms';
import Changelog from './pages/Changelog';

// Nuclear Physics pages
import Rutherford from './pages/nuclear/Rutherford';
import Droplet from './pages/nuclear/Droplet';
import Alpha from './pages/nuclear/Alpha';
import Beta from './pages/nuclear/Beta';
import Gamma from './pages/nuclear/Gamma';
import HalfLife from './pages/nuclear/HalfLife';
import Interactions from './pages/nuclear/Interactions';
import Decay from './pages/nuclear/Decay';
import Chain from './pages/nuclear/Chain';
import Quiz from './pages/nuclear/Quiz';

// Quantum Physics pages
import PlanckHypothesis from './pages/quantum/PlanckHypothesis';
import PhotoelectricEffect from './pages/quantum/PhotoelectricEffect';
import ComptonEffect from './pages/quantum/ComptonEffect';
import WaveParticleDuality from './pages/quantum/WaveParticleDuality';
import BohrModel from './pages/quantum/BohrModel';
import UncertaintyPrinciple from './pages/quantum/UncertaintyPrinciple';
import WaveFunction from './pages/quantum/WaveFunction';
import SchrodingerEquation from './pages/quantum/SchrodingerEquation';
import QuantumNumbers from './pages/quantum/QuantumNumbers';
import ElectronSpin from './pages/quantum/ElectronSpin';

import './styles/global.css';

function App() {
  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ flex: 1 }}>
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
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
