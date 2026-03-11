import { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
          <stop offset="0%" stopColor="#6fadeb" />
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
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 1]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1]);

  const nuclearTopics = sections.find(s => s.title === "Физика Атомного ядра")?.topics ?? [];

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
    topicsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', position: 'relative' }}
    >
      {/* ===== HERO SECTION ===== */}
      <motion.div
        ref={heroRef}
        className="home-hero"
        style={{ opacity: heroOpacity, scale: heroScale, position: 'relative' }}
      >
        {/* Left: Text */}
        <div className="home-hero-text">
          <motion.p
            className="home-hero-free"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {t('home.free')}
          </motion.p>

          <motion.h1
            className="home-hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {t('home.animations')}
          </motion.h1>

          <motion.p
            className="home-hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.button
            className="home-hero-cta"
            onClick={scrollToTopics}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            {t('common.startLearning')}
          </motion.button>
        </div>

        {/* Right: Atom */}
        <motion.div
          className="home-hero-atom"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <RandomAtomModel />
        </motion.div>
      </motion.div>

      {/* ===== SUBATOMIC PARTICLES ===== */}
      <section className="home-section">
        <motion.h2
          className="home-section-title"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t('home.subatomicTitle')} <span>{t('home.subatomicHighlight')}</span>
        </motion.h2>

        <motion.div
          className="particles-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {particles.map((p) => (
            <motion.div
              key={p.key}
              className={`particle-card particle-card--${p.color}`}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <div className="particle-header">
                <div className="particle-icon">{p.icon}</div>
                <div>
                  <div className="particle-name">
                    {t(`particles.${p.key}.name`)} <span className="particle-symbol">({p.symbol})</span>
                  </div>
                  <div className="particle-prop">{t('particles.charge')}: <strong>{p.charge}</strong></div>
                  <div className="particle-prop">{t('particles.mass')}: <strong>{p.mass}</strong></div>
                </div>
              </div>
              <p className="particle-desc">{t(`particles.${p.key}.desc`)}</p>
              <p className="particle-discovery">{t(`particles.${p.key}.discovery`)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ===== TOPICS ===== */}
      <section className="home-section topics-section" ref={topicsRef}>
        <motion.h2
          className="home-section-title"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {t('home.topicsTitle')} <span>{t('home.topicsHighlight')}</span>
        </motion.h2>

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
                      <img src={topic.image} alt={t(`topics.${topicKey}.title`)} />
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

      {/* ===== ABOUT ===== */}
      <section className="about-section">
        <motion.div
          className="about-content"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="home-section-title">
            {t('home.aboutTitle')} <span>{t('home.aboutHighlight')}</span>
          </h2>
          <p>{t('home.aboutText1')}</p>
          <p>{t('home.aboutText1_2')}</p>
          <p>{t('home.aboutText2')}</p>

          <div className="about-tags">
            <span className="about-tag red">{t('home.tagFree')}</span>
            <span className="about-tag blue">{t('home.tagAnimations')}</span>
            <span className="about-tag">{t('home.tagTeachers')}</span>
            <span className="about-tag">{t('home.tagStudents')}</span>
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}
