import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import '../styles/particle-library.css';
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: .1 } } };
const particleIcons = {
  proton: (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="14" fill="url(#protonGrad)" />
      <defs>
        <radialGradient id="protonGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fd8a80" />
          <stop offset="100%" stopColor="#FC6255" />
        </radialGradient>
      </defs>
    </svg>
  ),
  neutron: (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="14" fill="url(#neutronGrad)" />
      <defs>
        <radialGradient id="neutronGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
      </defs>
    </svg>
  ),
  electron: (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="6" fill="url(#electronGrad)" />
      <defs>
        <radialGradient id="electronGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#a0c4f0" />
          <stop offset="100%" stopColor="#4a90e2" />
        </radialGradient>
      </defs>
    </svg>
  ),
};

export default function ParticleLibrary() {
  const { t } = useTranslation();
  const particles = useMemo(() => [
    {
      key: 'proton',
      symbol: 'p\u207A',
      charge: '+1e',
      mass: '1.6726 \u00D7 10\u207B\u00B2\u2077 kg',
      color: 'proton',
      icon: particleIcons.proton,
    },
    {
      key: 'neutron',
      symbol: 'n\u2070',
      charge: '0',
      mass: '1.6749 \u00D7 10\u207B\u00B2\u2077 kg',
      color: 'neutron',
      icon: particleIcons.neutron,
    },
    {
      key: 'electron',
      symbol: 'e\u207B',
      charge: '\u22121e',
      mass: '9.1094 \u00D7 10\u207B\u00B3\u00B9 kg',
      color: 'electron',
      icon: particleIcons.electron,
    },
  ], []);

  return (<>
      {/* ===== PARTICLES ===== */}
      <section className="particle-library particles-v3">
        <motion.div
          className="section-v3-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-v3-title">
            {t('home.subatomicTitle')} <span>{t('home.subatomicHighlight')}</span>
          </h2>

        </motion.div>

        <motion.div
          className="particles-grid-v3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {particles.map((p) => (
            <motion.div
              key={p.key}
              className={`particle-card-v3 particle-card-v3--${p.color}`}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <div className="particle-card-v3-icon">{p.icon}</div>
              <div className="particle-card-v3-name">
                {t(`particles.${p.key}.name`)}{' '}
                <span className="particle-card-v3-symbol">({p.symbol})</span>
              </div>
              <div className="particle-card-v3-props">
                <div><span>{t('particles.charge')}</span><strong>{p.charge}</strong></div>
                <div><span>{t('particles.mass')}</span><strong>{p.mass}</strong></div>
              </div>
              <p className="particle-card-v3-desc">{t(`particles.${p.key}.desc`)}</p>
              <p className="particle-card-v3-discovery">{t(`particles.${p.key}.discovery`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

  </>);
}
