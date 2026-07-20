import { useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Mousewheel } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import RandomAtomModel from '../components/RandomAtomModel';
import { sections } from '../data/topics';
import '../styles/home.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

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

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const topicsRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const nuclearTopics = sections.find(s => s.title === 'Физика Атомного ядра')?.topics ?? [];

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

  const scrollToTopics = () => {
    topicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.main
      className="home-v3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ===== HERO: text on top, atom below — scrolls naturally ===== */}
      <section className="hero-v3">
        <div className="hero-v3-text">
          <motion.div
            className="hero-v3-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span>Бесплатные</span>
          </motion.div>

          <motion.h1
            className="hero-v3-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.7 }}
          >
            {t('home.animations')}
            <span className="hero-v3-title-soft">{t('home.subtitle')}</span>
          </motion.h1>

          <motion.div
            className="hero-v3-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <button className="hero-v3-cta" onClick={scrollToTopics}>
              Начать
            </button>
          </motion.div>
        </div>

        <motion.div
          className="atom-stage"
          style={prefersReducedMotion ? { opacity: 0.6 } : undefined}
          aria-hidden={false}
        >
          <div className="atom-stage-inner">
            <RandomAtomModel />
          </div>
        </motion.div>

      </section>

      {/* ===== TOPICS ===== */}
      <section className="section-v3 topics-v3" ref={topicsRef}>
        <motion.div
          className="section-v3-head"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-v3-title">
            {t('home.topicsTitle')} <span>{t('home.topicsHighlight')}</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Swiper
            modules={[Navigation, Pagination, Mousewheel]}
            spaceBetween={30}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            mousewheel={{ forceToAxis: true, sensitivity: 1 }}
            speed={600}
            cssMode={false}
            grabCursor
            className="topics-swiper"
          >
            {nuclearTopics.map((topic, index) => {
              const topicKey = topic.path.split('/').pop() || '';
              return (
                <SwiperSlide key={topic.path}>
                  <div className="topic-slide-card">
                    <div className="topic-slide-image">
                      <img
                        src={topic.image}
                        alt={t(`topics.${topicKey}.title`)}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="topic-slide-info">
                      <div className="topic-slide-number">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="topic-slide-title">{t(`topics.${topicKey}.title`)}</div>
                      <p className="topic-slide-desc">{t(`topics.${topicKey}.description`)}</p>
                      <button
                        className="topic-slide-btn"
                        onClick={() => navigate(topic.path)}
                      >
                        {t('common.watch')}
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </motion.div>
      </section>

      {/* ===== PARTICLES ===== */}
      <section className="section-v3 particles-v3">
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
          <p className="section-v3-lead">
            Три частицы, из которых построена вся материя.
          </p>
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

      {/* ===== ABOUT + DIPLOMA ===== */}
      <section className="section-v3 about-v3">
        <motion.div
          className="about-v3-grid"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="about-v3-text">
            <h2 className="section-v3-title">
              {t('home.aboutTitle')} <span>{t('home.aboutHighlight')}</span>
            </h2>
            <p>{t('home.aboutText1')}</p>
            <p>{t('home.aboutText1_2')}</p>
          </div>

          <div className="about-v3-award" role="figure" aria-label="Диплом III степени Министерства Просвещения РК">
            <div className="about-v3-award-ribbon" />
            <div className="about-v3-award-body">
              <div className="about-v3-award-rank">III</div>
              <div className="about-v3-award-title">Диплом степени</div>
              <div className="about-v3-award-issuer">Министерство Просвещения<br />Республики Казахстан</div>
              <div className="about-v3-award-divider" />
              <div className="about-v3-award-note">За образовательный вклад в популяризацию физики</div>
            </div>
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}
