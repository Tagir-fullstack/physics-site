import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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

const particles = [
  {
    name: 'Протон',
    symbol: 'p\u207A',
    charge: '+1e',
    mass: '1.6726 \u00D7 10\u207B\u00B2\u2077 кг',
    desc: 'Положительно заряженная частица в ядре. Число протонов определяет атомный номер элемента.',
    discovery: 'Эрнест Резерфорд, 1919 г. — эксперименты по расщеплению ядра азота альфа-частицами.',
    color: 'proton',
    icon: (
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
  },
  {
    name: 'Нейтрон',
    symbol: 'n\u2070',
    charge: '0',
    mass: '1.6749 \u00D7 10\u207B\u00B2\u2077 кг',
    desc: 'Нейтральная частица в ядре. Нейтроны добавляют массу атому и влияют на стабильность ядра.',
    discovery: 'Джеймс Чедвик, 1932 г. — бомбардировка бериллия альфа-частицами, обнаружение незаряженного излучения.',
    color: 'neutron',
    icon: (
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
  },
  {
    name: 'Электрон',
    symbol: 'e\u207B',
    charge: '\u22121e',
    mass: '9.1094 \u00D7 10\u207B\u00B3\u00B9 кг',
    desc: 'Отрицательно заряженная частица, движущаяся вокруг ядра. Электроны определяют химические свойства.',
    discovery: 'Джозеф Томсон, 1897 г. — эксперименты с катодными лучами, отклонение в электрическом и магнитном полях.',
    color: 'electron',
    icon: (
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
  },
];

export default function Home() {
  const navigate = useNavigate();
  const topicsRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const nuclearTopics = sections.find(s => s.title === "Физика Атомного ядра")?.topics ?? [];

  const scrollToTopics = () => {
    topicsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}
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
            Бесплатные
          </motion.p>

          <motion.h1
            className="home-hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            АНИМАЦИИ
          </motion.h1>

          <motion.p
            className="home-hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            по Физике Атомного ядра
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
            Начать изучение
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
          Субатомные <span>частицы</span>
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
              key={p.name}
              className={`particle-card particle-card--${p.color}`}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <div className="particle-header">
                <div className="particle-icon">{p.icon}</div>
                <div>
                  <div className="particle-name">
                    {p.name} <span className="particle-symbol">({p.symbol})</span>
                  </div>
                  <div className="particle-prop">Заряд: <strong>{p.charge}</strong></div>
                  <div className="particle-prop">Масса: <strong>{p.mass}</strong></div>
                </div>
              </div>
              <p className="particle-desc">{p.desc}</p>
              <p className="particle-discovery">{p.discovery}</p>
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
          Темы <span>курса</span>
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
            {nuclearTopics.map((topic, index) => (
              <SwiperSlide key={topic.path}>
                <div className="topic-slide-card">
                  <div className="topic-slide-image">
                    <img src={topic.image} alt={topic.title} />
                  </div>
                  <div className="topic-slide-info">
                    <div className="topic-slide-number">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="topic-slide-title">{topic.title}</div>
                    <p className="topic-slide-desc">{topic.description}</p>
                    <button
                      className="topic-slide-btn"
                      onClick={() => navigate(topic.path)}
                    >
                      Смотреть
                    </button>
                  </div>
                </div>
              </SwiperSlide>
            ))}
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
            О <span>проекте</span>
          </h2>
          <p>
            Physez создан в рамках диссертационного исследования с целью повышения эффективности
            образовательного процесса при изучении физики атомного ядра.
          </p>
          <p>
            Все видео-анимации созданы на Python с использованием библиотеки Manim
            и доступны совершенно бесплатно для учеников и преподавателей.
          </p>

          <div className="about-tags">
            <span className="about-tag red">Бесплатно</span>
            <span className="about-tag blue">Manim-анимации</span>
            <span className="about-tag">Для учеников</span>
            <span className="about-tag">Диссертация</span>
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}
