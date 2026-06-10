import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useAccessibility } from '../context/AccessibilityContext';
import AccessibilityPanel from '../components/AccessibilityPanel';
import '../styles/thesis.css';
import '../styles/header.css';
import '../styles/accessibility.css';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' },
  }),
};

const slideVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: 80 * dir }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -80 * dir }),
};

function AnimatedNumber({ value, suffix = '', duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const display = Number.isInteger(value) ? Math.round(n).toString() : n.toFixed(1);
  return <>{display}{suffix}</>;
}

/* ============== SLIDES ============== */

const Slide1 = () => (
  <div className="thesis-slide title-slide">
    <motion.img
      className="title-kaznu-logo"
      src="/thesis/kaznu-logo.png"
      alt="КазНУ им. Аль-Фараби"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    />
    <motion.div className="title-uni" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
      КазНУ им. Аль-Фараби · Физико-технический факультет
    </motion.div>
    <motion.h1 className="title-main" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}>
      Подготовка визуальных материалов по разделу{' '}
      <span className="accent">«Физика Атомного ядра»</span> на языке Python для учащихся 11 класса
    </motion.h1>
    <motion.div className="title-meta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
      <div className="title-meta-block">
        <div className="label">Магистрант</div>
        <div className="name">Аймұрза Тагир Айбекұлы</div>
      </div>
      <div className="title-meta-block">
        <div className="label">Научный руководитель</div>
        <div className="name">Амренова А. У.</div>
        <div className="desc">к.ф.-м.н., ассистент-профессор</div>
      </div>
    </motion.div>
  </div>
);

const Slide2 = () => {
  const rows = [
    ['1', 'Проведение обзора литературы по теме магистерской диссертации', 'Сентябрь – декабрь 2024'],
    ['2', 'Создание визуальных материалов с использованием библиотеки Python Manim', 'Сентябрь – декабрь 2024'],
    ['3', 'Визуализация тем «Естественная радиоактивность. Закон радиоактивного распада. Атомное ядро»', 'Январь – март 2025'],
    ['4', 'Визуализация тем «Ядерные реакции. Деление тяжёлых ядер. Цепная ядерная реакция. Критическая масса. Ядерный реактор. Ядерная энергетика. Термоядерные реакции»', 'Сентябрь – декабрь 2025'],
    ['5', 'Составление материалов магистерской диссертации в соответствии с условиями ее оформления, 100% подготовка', 'Январь – март 2026'],
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">План работы</span>
      <h1>Этапы магистерского исследования</h1>
      <motion.table className="thesis-table thesis-table--plan" initial="hidden" animate="visible">
        <colgroup>
          <col style={{ width: '56px' }} />
          <col />
          <col style={{ width: '260px' }} />
        </colgroup>
        <thead>
          <tr><th>№</th><th>Вид работы</th><th>Крайний срок</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={i} custom={i + 1} initial="hidden" animate="visible" variants={fadeUp}>
              <td className="num">{r[0]}</td>
              <td>{r[1]}</td>
              <td className="deadline">{r[2]}</td>
            </motion.tr>
          ))}
        </tbody>
      </motion.table>
    </div>
  );
};

const Slide3 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Актуальность</span>
    <h1>Почему это важно сейчас</h1>
    <div className="thesis-two-col">
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <h3>Требование Типового учебного плана</h3>
        <p>
          В <strong>Типовом учебном плане Республики Казахстан</strong> для 11 класса раздел
          <strong> «Физика атомного ядра»</strong> прописан как обязательный — с конкретными целями обучения
          <strong> 11.7.2.1 – 11.7.2.7</strong> (радиоактивность, период полураспада, ядерные реакции,
          защита от радиации, реактор, ядерная энергетика).
        </p>
        <p style={{ marginTop: 12 }}>
          Эти цели требуют не заучивания формул, а <strong>понимания процессов</strong> — что без качественной
          визуализации в школьных условиях практически недостижимо.
        </p>
      </motion.div>
      <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
        <h3>Нет аналогов под казахстанскую программу</h3>
        <p>
          Существующие платформы (<strong>PhET, Khan Academy, YouTube-каналы</strong>) покрывают раздел
          лишь фрагментарно и <strong>не привязаны к ЦО Типового учебного плана РК</strong> — учителю приходится
          собирать материал по кусочкам и переводить.
        </p>
        <p style={{ marginTop: 12 }}>
          Разработанные анимации <span className="thesis-accent-blue">впервые покрывают весь раздел
          «Физика атомного ядра» учебника 11 класса РК</span> и привязаны к каждой цели обучения —
          это и составляет научно-практическую новизну работы.
        </p>
      </motion.div>
    </div>
  </div>
);

const SlideENT = () => {
  const data = [
    { year: 2018, n: 1 },
    { year: 2020, n: 2 },
    { year: 2021, n: 3 },
    { year: 2023, n: 5 },
    { year: 2025, n: 8 },
  ];

  const W = 1200, H = 340;
  const M = { top: 20, right: 36, bottom: 44, left: 56 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const xMin = 2018, xMax = 2025;
  const yMax = 10;
  const xScale = (year: number) => M.left + ((year - xMin) / (xMax - xMin)) * innerW;
  const yScale = (n: number) => M.top + innerH - (n / yMax) * innerH;

  const pts = data.map(d => ({ x: xScale(d.year), y: yScale(d.n) }));
  const path = pts.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');
  const areaPath = `${path} L ${pts[pts.length - 1].x} ${M.top + innerH} L ${pts[0].x} ${M.top + innerH} Z`;

  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="thesis-slide compact">
      <span className="section-kicker">Актуальность</span>
      <h1>Рост доли ядерной физики в ЕНТ</h1>
      <p style={{ maxWidth: 1000 }}>
        С <strong>2018</strong> по <strong>2025</strong> число вопросов по разделу «Физика атомного ядра»
        в ЕНТ растёт экспоненциально — с <span className="thesis-accent">1</span> до{' '}
        <span className="thesis-accent-blue">7–8</span> на вариант.
      </p>

      <div className="ent-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Рост числа вопросов по ядерной физике в ЕНТ">
          <defs>
            <linearGradient id="ent-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--t-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--t-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="grid">
            {yTicks.map(t => (
              <line key={t} x1={M.left} x2={W - M.right} y1={yScale(t)} y2={yScale(t)} />
            ))}
          </g>

          <g className="axis">
            <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + innerH} />
            <line x1={M.left} y1={M.top + innerH} x2={W - M.right} y2={M.top + innerH} />
          </g>

          {yTicks.map(t => (
            <text key={t} className="tick-label" x={M.left - 12} y={yScale(t) + 5} textAnchor="end">
              {t}
            </text>
          ))}

          {data.map(d => (
            <text key={d.year} className="tick-label" x={xScale(d.year)} y={M.top + innerH + 26} textAnchor="middle">
              {d.year}
            </text>
          ))}

          <text className="axis-label" x={M.left} y={M.top - 8}>вопросы</text>
          <text className="axis-label" x={W - M.right} y={H - 8} textAnchor="end">год</text>

          <motion.path
            className="area"
            d={areaPath}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          />

          <motion.path
            className="curve"
            d={path}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />

          {pts.map((p, i) => (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.18, duration: 0.4 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            >
              <circle className="pt-outer" cx={p.x} cy={p.y} r="9" />
              <circle className="pt-inner" cx={p.x} cy={p.y} r="4" />
              <text className="pt-value" x={p.x} y={p.y - 18}>{data[i].n}</text>
            </motion.g>
          ))}
        </svg>
      </div>

      <div className="ent-stats">
        <motion.div className="ent-stat" custom={0} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="v">×<AnimatedNumber value={8} /></div>
          <div className="l">рост за 7 лет</div>
        </motion.div>
        <motion.div className="ent-stat" custom={1} initial="hidden" animate="visible" variants={fadeUp}>
          <div className="v">~<AnimatedNumber value={20} suffix="%" /></div>
          <div className="l">от всех заданий по физике в ЕНТ&nbsp;2025</div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide4 = () => {
  const theories = [
    {
      author: 'Ричард Майер',
      name: 'Теория мультимедийного обучения',
      year: '1990–2000-е',
      key: 'Двухканальная обработка: вербальный + визуальный канал',
      principles: ['множественность представлений', 'смежность во времени и в пространстве', 'сигнализация', 'деление на части', 'модальность'],
      color: 'var(--t-accent)',
    },
    {
      author: 'Алан Пайвио',
      name: 'Теория двойного кодирования',
      year: '1986',
      key: 'Логогены + имагены создают два независимых следа в долговременной памяти',
      principles: ['эффект конкретности', 'референциальное кодирование', 'ассоциативное кодирование'],
      color: 'var(--electron-blue)',
    },
    {
      author: 'Джон Свеллер',
      name: 'Теория когнитивной нагрузки',
      year: '1988–2011',
      key: 'Рабочая память — 4 ± 1 элементов. Минимизировать постороннюю, максимизировать полезную нагрузку',
      principles: ['эффект проработанного примера', 'эффект разделённого внимания', 'обратное развитие опыта'],
      color: '#f0a020',
    },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Теоретические основания</span>
      <h1>Три теории, обосновывающие анимации</h1>
      <p style={{ maxWidth: 1100, marginBottom: 18 }}>
        На основе этих концепций сформулированы методические требования к сценариям, темпу,
        цветовому кодированию и тексту анимаций.
      </p>
      <div className="theory-grid">
        {theories.map((th, i) => (
          <motion.div key={th.author} className="theory-card" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="theory-card__bar" style={{ background: th.color }} />
            <div className="theory-card__year">{th.year}</div>
            <div className="theory-card__author" style={{ color: th.color }}>{th.author}</div>
            <div className="theory-card__name">{th.name}</div>
            <div className="theory-card__key">{th.key}</div>
            <ul className="theory-card__principles">
              {th.principles.map(p => <li key={p}>{p}</li>)}
            </ul>
          </motion.div>
        ))}
      </div>
      <motion.div className="theory-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <strong>Мета-анализ Хёффлера и Лейтнера (2007):</strong> анимации против статичных изображений —
        средний эффект <strong className="thesis-accent">d = 0,37</strong>, для процедурных знаний —{' '}
        <strong className="thesis-accent-blue">d = 1,06</strong>.
      </motion.div>
    </div>
  );
};

const Slide5 = () => {
  const goals = [
    {
      n: 1,
      t: 'Анализ литературы',
      d: 'Изучить методические подходы к преподаванию ядерной физики и выявить трудности учащихся.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      n: 2,
      t: 'Ключевые темы',
      d: 'Выделить концепции раздела, требующие графического представления.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      ),
    },
    {
      n: 3,
      t: 'Реализация в Python',
      d: 'Создать динамические и интерактивные визуализации с помощью библиотеки Manim.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 3 12 9 6" /><polyline points="15 6 21 12 15 18" />
        </svg>
      ),
    },
    {
      n: 4,
      t: 'Оценка эффективности',
      d: 'Провести тестирование визуализаций на учащихся, определить влияние на понимание.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><polyline points="7 14 11 10 14 13 20 7" />
        </svg>
      ),
    },
    {
      n: 5,
      t: 'Рекомендации',
      d: 'Подготовить методические рекомендации для учителей по интеграции визуализаций.',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      ),
    },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Цель и задачи</span>
      <h1>Помочь школьникам усвоить ядерную физику</h1>

      <div className="goal-layout">
        <motion.aside className="goal-hero" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <div className="goal-hero__label">Цель исследования</div>
          <div className="goal-hero__text">
            Разработка <span className="thesis-accent">визуальных материалов</span> по разделу{' '}
            <strong>«Физика Атомного ядра»</strong> с использованием <strong>Python</strong>{' '}
            для учащихся <strong>11 класса</strong>.
          </div>
          <div className="goal-hero__stats">
            <div className="goal-stat"><div className="goal-stat__num">7</div><div className="goal-stat__label">целей обучения ТУП</div></div>
            <div className="goal-stat"><div className="goal-stat__num">11</div><div className="goal-stat__label">класс</div></div>
            <div className="goal-stat"><div className="goal-stat__num">9</div><div className="goal-stat__label">анимаций</div></div>
            <div className="goal-stat"><div className="goal-stat__num">Manim</div><div className="goal-stat__label">библиотека Python</div></div>
          </div>
        </motion.aside>

        <div className="goal-stepper">
          <div className="goal-stepper__label">Задачи</div>
          <ol className="goal-steps">
            {goals.map((g, i) => (
              <motion.li
                key={g.n}
                className="goal-step"
                custom={i + 1}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <div className="goal-step__marker">
                  <span className="goal-step__num">{String(g.n).padStart(2, '0')}</span>
                  <span className="goal-step__icon">{g.icon}</span>
                </div>
                <div className="goal-step__body">
                  <div className="goal-step__title">{g.t}</div>
                  <div className="goal-step__desc">{g.d}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

const Slide6 = () => {
  const rows = [
    ['11.7.2.1', 'Объяснять природу радиоактивности и виды излучений', 'α-, β-, γ-распад'],
    ['11.7.2.2', 'Описывать состав ядра и свойства нуклонов', 'строение ядра'],
    ['11.7.2.3', 'Применять закон радиоактивного распада, понятие T½', 'лаб. работа №5'],
    ['11.7.2.4', 'Описывать энергию связи ядра и дефект массы', 'E = Δmc²'],
    ['11.7.2.5', 'Составлять уравнения ядерных реакций', 'законы сохранения'],
    ['11.7.2.6', 'Объяснять деление, синтез и цепную реакцию', 'реактор, АЭС'],
    ['11.7.2.7', 'Оценивать биологическое действие радиации', 'правила безопасности'],
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Учебная программа</span>
      <h1>Цели обучения · ТУП РК (приказ № 399, 2022)</h1>
      <p className="slide-subtitle--sm" style={{ maxWidth: 1100, marginBottom: 14 }}>
        Раздел «Квантовая физика» / подраздел «Физика атомного ядра» — 11 класс ЕМН, 4 четверть.
      </p>
      <table className="thesis-table thesis-table--plan thesis-table--co">
        <colgroup>
          <col style={{ width: '180px' }} />
          <col />
          <col style={{ width: '260px' }} />
        </colgroup>
        <thead>
          <tr><th>Код ЦО</th><th>Что должен уметь ученик</th><th>Соответствие</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <motion.tr key={i} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <td className="num">{r[0]}</td>
              <td>{r[1]}</td>
              <td className="deadline">{r[2]}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Slide7 = () => {
  const animations = [
    { n: 1, t: 'Опыт Резерфорда', co: '11.7.2.2', coText: 'Описывать состав ядра и свойства нуклонов', s: 'final' },
    { n: 2, t: 'Альфа-распад', co: '11.7.2.1 + 11.7.2.7', coText: 'Виды излучений и их биологическое действие', s: 'final' },
    { n: 3, t: 'Бета-распад (β⁻ и β⁺)', co: '11.7.2.1 + 11.7.2.7', coText: 'Виды излучений и их биологическое действие', s: 'final' },
    { n: 4, t: 'Гамма-излучение', co: '11.7.2.1 + 11.7.2.7', coText: 'Виды излучений и их биологическое действие', s: 'final' },
    { n: 5, t: 'Период полураспада', co: '11.7.2.3', coText: 'Применять закон радиоактивного распада, понятие T½', s: 'final' },
    { n: 6, t: 'Ядерные взаимодействия', co: '11.7.2.4', coText: 'Описывать энергию связи ядра и дефект массы', s: 'final' },
    { n: 7, t: 'Капельная модель ядра', co: '11.7.2.2', coText: 'Описывать состав ядра и свойства нуклонов', s: 'final' },
    { n: 8, t: 'Деление ядра', co: '11.7.2.5–6', coText: 'Составлять уравнения ядерных реакций; объяснять деление', s: 'final' },
    { n: 9, t: 'Цепная ядерная реакция', co: '11.7.2.6', coText: 'Объяснять деление, синтез и цепную реакцию', s: 'final' },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Контент-ядро</span>
      <h1><span className="thesis-accent">9 анимаций</span> на <span className="thesis-accent-blue">Manim Community Edition v0.18</span></h1>
      <p style={{ maxWidth: 1100, marginBottom: 14 }}>
        Все <span className="thesis-accent">9 модулей</span> разработаны и доступны в финальной редакции на платформе <span className="thesis-accent">Physez</span> —
        полностью покрывают <span className="thesis-accent-blue">ЦО 11.7.2.1–11.7.2.6</span> раздела «Физика атомного ядра».
      </p>
      <div className="anim-grid">
        {animations.map((a, i) => (
          <motion.div key={a.n} className={`anim-card anim-card--${a.s} anim-card--${i % 2 === 0 ? 'red' : 'blue'}`} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="anim-card__head">
              <span className="anim-card__num">{String(a.n).padStart(2, '0')}</span>
              <span className="anim-card__title">{a.t}</span>
            </div>
            <div className="anim-card__co"><span className="anim-card__co-code">ЦО {a.co}</span> · <span className="anim-card__co-text">{a.coText}</span></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Slide8 = () => {
  const rivals = [
    { name: 'PhET (Колорадо)', lang: 'EN', cov: 'Частично', anim: 'Интерактив', gap: 'Не привязан к ТУП РК; нет русской версии большинства симуляций' },
    { name: 'GeoGebra', lang: 'Мульти', cov: 'Нет', anim: 'Геометрия', gap: 'Ориентирована на математику; дискретные квантовые явления плохо ложатся' },
    { name: 'Khan Academy', lang: 'EN (RU частично)', cov: 'Базово', anim: 'Линейное видео', gap: 'Нет интерактива; не согласован с программой РК' },
    { name: 'РЭШ', lang: 'RU', cov: 'Базово', anim: 'Статика + видео', gap: 'Программа РФ, не РК; нет программно-генерируемых анимаций' },
    { name: 'ЯКласс / Bilimland', lang: 'RU / KZ', cov: 'Тренажёры', anim: 'Статика', gap: 'Контроль знаний, а не первичная подача; нет анимаций' },
    { name: 'Фоксфорд', lang: 'RU', cov: 'Базово', anim: 'Видеолекции', gap: 'Линейные, пассивные; не программа РК' },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Анализ ниши</span>
      <h1>Почему существующие платформы не закрывают задачу</h1>
      <table className="thesis-table thesis-table--plan">
        <colgroup>
          <col style={{ width: '180px' }} />
          <col style={{ width: '110px' }} />
          <col style={{ width: '110px' }} />
          <col style={{ width: '130px' }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>Платформа</th>
            <th>Язык</th>
            <th>Покрытие</th>
            <th>Тип</th>
            <th>Главный пробел</th>
          </tr>
        </thead>
        <tbody>
          {rivals.map((r, i) => (
            <motion.tr key={r.name} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <td><strong>{r.name}</strong></td>
              <td className="deadline">{r.lang}</td>
              <td className="deadline">{r.cov}</td>
              <td className="deadline">{r.anim}</td>
              <td>{r.gap}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      <motion.div className="theory-meta theory-meta--featured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        Опрос <strong>5 учителей физики РК</strong> подтвердил: специализированной русскоязычной платформы
        по разделу «Физика атомного ядра» под казахстанскую программу не существует.
        Это и определило <strong className="thesis-accent">научно-практическую новизну</strong> работы.
      </motion.div>
    </div>
  );
};

const Slide9 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Реализация · Manim</span>
    <h1>Создание анимаций на Python</h1>
    <motion.div className="image-single" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
      <img src="/thesis/image42.png" alt="Manim — Spectral Analysis" />
    </motion.div>
    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
      Скриншот разработки: <strong>SpectraAndAnalysis</strong> — пример Manim-сцены и предпросмотра.
    </p>
  </div>
);

const Slide10 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Платформа Physez</span>
    <h1>Сайт-агрегатор анимаций по физике</h1>
    <motion.div
      className="physez-qr-row"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.55 }}
    >
      <motion.img
        src="/thesis/physez-qr.png"
        alt="QR на Physez"
        className="physez-qr"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="physez-qr-text">
        <div className="physez-qr-cta">Откройте Physez</div>
        <p className="physez-qr-hint">Наведите камеру на QR-код</p>
      </div>
    </motion.div>
    <div className="image-pair image-pair--compact">
      <motion.img src="/thesis/image43.png" alt="Physez dark" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.35 }} />
      <motion.img src="/thesis/image44.png" alt="Physez light" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }} />
    </div>
  </div>
);

const Donut = ({ value, gradId, c1, c2, label, sub, delay }: { value: number; gradId: string; c1: string; c2: string; label: string; sub: string; delay: number }) => {
  const R = 78;
  const C = 2 * Math.PI * R;
  const target = C - (value / 100) * C;
  return (
    <div className="donut-card">
      <div className="donut-wrap">
        <svg viewBox="0 0 200 200" className="donut-svg">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={c1} />
              <stop offset="100%" stopColor={c2} />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={R} className="donut-track" />
          <motion.circle
            cx="100"
            cy="100"
            r={R}
            className="donut-arc"
            stroke={`url(#${gradId})`}
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: target }}
            transition={{ duration: 1.4, delay, ease: 'easeOut' }}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="donut-center" style={{ color: c2 }}>
          <AnimatedNumber value={value} suffix="%" duration={1400} />
        </div>
      </div>
      <div className="donut-label">{label}</div>
      <div className="donut-sub">{sub}</div>
    </div>
  );
};

const Slide11 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Результаты эксперимента</span>
    <h1>Сравнение контрольной и экспериментальной групп</h1>
    <div className="donut-grid">
      <Donut
        gradId="donut-control"
        value={60}
        c1="#7E9BD8"
        c2="#4E6FBA"
        label="Контрольная группа"
        sub="n = 9"
        delay={0}
      />
      <Donut
        gradId="donut-exp"
        value={86}
        c1="#F08584"
        c2="#D85555"
        label="Экспериментальная группа"
        sub="с использованием анимаций · n = 10"
        delay={0.25}
      />
    </div>
    <motion.div className="bar-delta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.5 }}>
      Прирост среднего балла: <strong>Δ = +26,0 п.&nbsp;п.</strong>{' '}
      · Коэн <strong className="thesis-accent">d ≈ 1,59</strong> — очень большой эффект (d &gt; 0,8)
    </motion.div>
    <div className="counter-grid" style={{ marginTop: 18 }}>
      <motion.div className="counter-card" custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Эксп. — «отлично» + «хорошо»</div>
        <div className="value">90%</div>
        <div className="sub">vs 22% в контрольной</div>
      </motion.div>
      <motion.div className="counter-card" custom={1} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">«Неудовл.» в эксп. группе</div>
        <div className="value">0</div>
        <div className="sub">vs 33% в контрольной</div>
      </motion.div>
      <motion.div className="counter-card" custom={2} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Сравнение с мета-анализом</div>
        <div className="value">×4,3</div>
        <div className="sub">от среднего d = 0,37 (Хёффлер 2007)</div>
      </motion.div>
    </div>
  </div>
);

const Slide12 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Эффективность платформы</span>
    <h1>Пре- и пост-тестирование пользователей</h1>
    <div className="counter-grid">
      <motion.div className="counter-card" custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Пре-тест</div>
        <div className="value"><AnimatedNumber value={42.7} suffix="%" /></div>
        <div className="sub">n = 11, начало обучения</div>
      </motion.div>
      <motion.div className="counter-card" custom={1} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Пост-тест</div>
        <div className="value"><AnimatedNumber value={88.1} suffix="%" /></div>
        <div className="sub">n = 9, после 4–5 недель</div>
      </motion.div>
      <motion.div className="counter-card" custom={2} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Прирост знаний</div>
        <div className="value">+<AnimatedNumber value={45.4} suffix=" п.п." /></div>
        <div className="sub">по сравнению с пре-тестом</div>
      </motion.div>
    </div>
    <motion.div style={{ marginTop: 24 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
      <table className="thesis-table prepost-table">
        <thead>
          <tr>
            <th>Код пользователя</th>
            <th>Пре-тест</th>
            <th>Пост-тест</th>
            <th>Δ, п.&nbsp;п.</th>
          </tr>
        </thead>
        <tbody>
          {[
            { code: 'PHY-TH69A', pre: 20, post: 67 },
            { code: 'PHY-5SC44', pre: 40, post: 93 },
            { code: 'PHY-ANJ3T', pre: 80, post: 100 },
            { code: 'PHY-ZRKRH', pre: 70, post: 100 },
            { code: 'PHY-TFFKM', pre: 30, post: 100 },
            { code: 'PHY-TRYT2', pre: 30, post: 73 },
            { code: 'PHY-BMLHD', pre: 80, post: 100 },
          ].map((r) => (
            <tr key={r.code}>
              <td><strong>{r.code}</strong></td>
              <td>{r.pre}%</td>
              <td className="post-cell">{r.post}%</td>
              <td className="delta-cell">+{r.post - r.pre}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  </div>
);

const Slide14 = () => {
  const questions = [
    ['Общее впечатление от платформы', 4.67],
    ['Качество визуализации', 4.28],
    ['Научная точность', 4.28],
    ['Лёгкость понимания', 4.22],
    ['Помогает в обучении', 4.44],
    ['Повышает вовлечённость учащихся', 4.44],
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Анкетирование учителей · n = 18</span>
      <h1>Средние оценки по вопросам</h1>
      <div className="q-list">
        {questions.map(([q, v], i) => (
          <motion.div key={i} className="q-row" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="q-text">{q}</div>
            <div className="q-bar-track">
              <motion.div className="q-bar-fill" initial={{ width: 0 }} animate={{ width: `${(Number(v) / 5) * 100}%` }} transition={{ duration: 1.2, delay: 0.2 + i * 0.08 }} />
            </div>
            <div className="q-value">{v} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>/ 5</span></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Slide15 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Обобщающие метрики · n = 18</span>
    <h1>Готовность учителей внедрить платформу</h1>
    <div className="counter-grid">
      <motion.div className="counter-card" custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Готовы использовать в классе</div>
        <div className="value"><AnimatedNumber value={94.4} suffix="%" /></div>
        <div className="sub">17 из 18 учителей</div>
      </motion.div>
      <motion.div className="counter-card" custom={1} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Рекомендуют коллегам</div>
        <div className="value"><AnimatedNumber value={88.9} suffix="%" /></div>
        <div className="sub">16 из 18 учителей</div>
      </motion.div>
      <motion.div className="counter-card" custom={2} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Средний балл рекомендации</div>
        <div className="value"><AnimatedNumber value={8.5} /> <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>/ 10</span></div>
        <div className="sub">шкала q14</div>
      </motion.div>
      <motion.div className="counter-card" custom={3} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="label">Net Promoter Score</div>
        <div className="value"><AnimatedNumber value={38.9} /></div>
        <div className="sub">положительный NPS</div>
      </motion.div>
    </div>
  </div>
);

const SlideSurveyQuestions = () => {
  const questions: { q: string; tag: string }[] = [
    { q: 'Оцените общее впечатление от анимаций', tag: '1–5' },
    { q: 'Оцените качество визуализации', tag: '1–5' },
    { q: 'Оцените научную точность анимаций', tag: '1–5' },
    { q: 'Насколько понятны анимации для учеников?', tag: '1–5' },
    { q: 'Использовали бы вы эти анимации на уроках?', tag: 'да/нет' },
    { q: 'Помогают ли анимации в понимании материала?', tag: '1–5' },
    { q: 'Оцените уровень вовлечённости учеников при просмотре', tag: '1–5' },
    { q: 'Хотели бы вы видеть анимации по другим разделам физики?', tag: 'да/нет' },
    { q: 'Какие разделы физики вы бы хотели видеть?', tag: 'открытый' },
    { q: 'Как вы оцениваете длительность анимаций?', tag: 'выбор' },
    { q: 'Сравните с другими образовательными ресурсами', tag: '1–5' },
    { q: 'Что бы вы улучшили в анимациях?', tag: 'открытый' },
    { q: 'Рекомендовали бы вы эти анимации коллегам?', tag: 'да/нет' },
    { q: 'Оцените вероятность рекомендации', tag: '0–10 · NPS' },
    { q: 'Дополнительные комментарии', tag: 'открытый' },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Анкетирование учителей · n = 18</span>
      <h1>Вопросы анкеты</h1>
      <div className="survey-q-grid">
        {questions.map((item, i) => (
          <motion.div
            key={i}
            className="survey-q-item"
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <span className="survey-q-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="survey-q-body">
              <span className="survey-q-text">{item.q}</span>
              <span className="survey-q-tag">{item.tag}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Slide16 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Апробация в школе</span>
    <h1>Проведение урока с использованием платформы</h1>
    <div className="image-pair">
      <motion.img src="/thesis/teacher1.png" alt="Урок 1" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} />
      <motion.img src="/thesis/teacher2.png" alt="Урок 2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
    </div>
  </div>
);

const Slide17 = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Апробация в школе</span>
    <h1>Работа учащихся с анимациями</h1>
    <div className="collage" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <motion.img src="/thesis/student1.png" alt="" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} />
      <motion.img src="/thesis/student2.png" alt="" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} />
      <motion.img src="/thesis/student3.png" alt="" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} />
    </div>
  </div>
);

const Slide18 = () => {
  const refs = [
    { a: 'Manim Community Developers', m: 'Manim — Mathematical Animation Engine: Documentation, 2024', url: 'https://docs.manim.community' },
    { a: 'Python Software Foundation', m: 'The Python Language Reference, version 3.12', url: 'https://docs.python.org/3' },
    { a: 'Министр просвещения РК', m: 'Приказ № 399 от 16.09.2022. Приложение 113 — Типовая учебная программа по физике для 10–11 классов ЕМН' },
    { a: 'Сивухин Д. В.', m: 'Общий курс физики. Т. 5. Атомная и ядерная физика. — М.: Физматлит, 2008. — 784 с.' },
    { a: 'Ландау Л. Д., Лифшиц Е. М.', m: 'Теоретическая физика. Т. III. Квантовая механика. — 6-е изд. — Физматлит, 2004. — 800 с.' },
    { a: 'Закирова Н. А., Аширов Р. Р.', m: 'Физика: учебник для 11 класса ЕМН. — Нур-Султан: Арман-ПВ, 2020. — 336 с.' },
    { a: 'Mayer R. E.', m: 'Multimedia Learning. — 2nd ed. — Cambridge University Press, 2009. — 304 p.' },
    { a: 'Paivio A.', m: 'Mental Representations: A Dual Coding Approach. — Oxford University Press, 1986. — 322 p.' },
    { a: 'Sweller J., Ayres P., Kalyuga S.', m: 'Cognitive Load Theory. — Springer, 2011. — 274 p.' },
    { a: 'Höffler T. N., Leutner D.', m: 'Instructional animation versus static pictures: A meta-analysis // Learning and Instruction. — 2007. — Vol. 17, No. 6. — P. 722–738' },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Список литературы · ключевые источники</span>
      <h1>Использованные источники</h1>
      <ol className="refs-grid">
        {refs.map((r, i) => (
          <motion.li key={i} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="ref-num">{i + 1}</div>
            <div className="ref-body">
              <div className="ref-author">{r.a}</div>
              <div className="ref-meta">
                {r.m}
                {r.url && <> · <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a></>}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
      <motion.p style={{ textAlign: 'center', marginTop: 28, color: 'var(--t-text-muted)', fontSize: 16 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        Спасибо за внимание!
      </motion.p>
    </div>
  );
};

const SlideArchitecture = () => {
  const layers = [
    { layer: 'Frontend', tech: 'React 19 + TypeScript + Vite', role: 'Интерактивный интерфейс, видеоплеер, тесты' },
    { layer: 'Backend', tech: 'Node.js + Express.js', role: 'Маршрутизация, аутентификация, бизнес-логика' },
    { layer: 'Database', tech: 'PostgreSQL · Supabase', role: 'users, Quiz_responses, teacher_surveys, RLS' },
    { layer: 'Hosting', tech: 'Vercel · CI/CD из GitHub', role: 'Автоматический деплой при push в main' },
    { layer: 'Контент', tech: 'Manim CE v0.18 (Python)', role: 'Сцены 1920×1080@60fps, исходники в Git' },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Архитектура Physez</span>
      <h1>Технологический стек платформы</h1>
      <p style={{ maxWidth: 1100, marginBottom: 14 }}>
        Трёхслойная архитектура: frontend, backend и база данных. Все компоненты разделены —
        тестирование, замена и масштабирование возможны без переработки системы.
      </p>
      <div className="topic-list">
        {layers.map((l, i) => (
          <motion.div key={l.layer} className="topic-row arch-row" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="arch-row__layer">{l.layer}</div>
            <div className="arch-row__tech">{l.tech}</div>
            <div className="arch-row__role">{l.role}</div>
          </motion.div>
        ))}
      </div>
      <motion.div className="theory-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <strong>Безопасность:</strong> JWT-аутентификация, bcrypt-хеширование паролей, Row-Level Security в Postgres.
        <strong> Доступность:</strong> WCAG, ARIA, клавиатурная навигация, минимум 44×44 px для интерактивных элементов.
      </motion.div>
    </div>
  );
};

const SlidePerQuestion = () => {
  const qs = [
    { n: '№1', t: 'Ядерные силы + α-распад', e: 86, c: 67, d: 19 },
    { n: '№2', t: 'Изменение Z при α-распаде', e: 90, c: 89, d: 1 },
    { n: '№3', t: 'Поглощение нейтрона U-235', e: 100, c: 67, d: 33 },
    { n: '№4', t: 'E = mc² при Δm = 0,001 кг', e: 90, c: 67, d: 23 },
    { n: '№5', t: 'Зачем замедлять нейтроны', e: 90, c: 33, d: 57 },
  ];
  return (
    <div className="thesis-slide thesis-slide--pq">
      <span className="section-kicker section-kicker--sm">Поэлементный разбор</span>
      <h1 className="thesis-h1--sm">Где именно анимации дают эффект</h1>
      <p className="slide-subtitle--sm" style={{ maxWidth: 1100, marginBottom: 10 }}>
        Эффект неравномерен. Максимум — на динамике процесса (№3, №5). Минимум — на правиле (№2).
      </p>
      <div className="q-list q-list--pq">
        {qs.map((q, i) => (
          <motion.div key={q.n} className="q-row pq-row" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="q-text pq-q-text">
              <strong className="thesis-accent">{q.n}</strong> · {q.t}
            </div>
            <div className="pq-bars">
              <div className="pq-bar">
                <div className="pq-bar__label">Контр.</div>
                <div className="pq-bar__track">
                  <motion.div className="pq-bar__fill pq-bar__fill--ctrl" initial={{ width: 0 }} animate={{ width: `${q.c}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.08 }} />
                </div>
                <div className="pq-bar__val">{q.c}%</div>
              </div>
              <div className="pq-bar">
                <div className="pq-bar__label">Эксп.</div>
                <div className="pq-bar__track">
                  <motion.div className="pq-bar__fill pq-bar__fill--exp" initial={{ width: 0 }} animate={{ width: `${q.e}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.08 }} />
                </div>
                <div className="pq-bar__val">{q.e}%</div>
              </div>
            </div>
            <div className={`pq-delta ${q.d >= 30 ? 'pq-delta--strong' : q.d >= 15 ? 'pq-delta--mid' : 'pq-delta--low'}`}>
              +{q.d} п.п.
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SlideMethodology = () => {
  const testQuestions = [
    {
      n: 1,
      q: 'Выберите верные утверждения (возможно несколько верных ответов)',
      options: [
        { t: 'Ядерные силы действуют только на очень коротких расстояниях', ok: true },
        { t: 'Протоны удерживаются в ядре электромагнитными силами', ok: false },
        { t: 'Масса ядра всегда больше массы составляющих его нуклонов', ok: false },
        { t: 'При α-распаде вылетает частица из 2 протонов и 2 нейтронов', ok: true },
      ],
    },
    {
      n: 2,
      q: 'При α-распаде число протонов в ядре:',
      options: [
        { t: 'Уменьшается на 2', ok: true },
        { t: 'Увеличивается на 4', ok: false },
        { t: 'Увеличивается на 2', ok: false },
        { t: 'Уменьшается на 4', ok: false },
      ],
    },
    {
      n: 3,
      q: 'Что происходит, когда ядро урана-235 поглощает нейтрон?',
      options: [
        { t: 'Ядро остаётся стабильным', ok: false },
        { t: 'Происходит α-распад', ok: false },
        { t: 'Ядро делится на два, выделяются энергия и несколько нейтронов', ok: true },
        { t: 'Ядро испускает электрон', ok: false },
      ],
    },
    {
      n: 4,
      q: 'Если в результате распада масса уменьшилась на 0,001 кг, рассчитайте выделившуюся энергию (E = mc²)',
      options: [{ t: '9 · 10¹³ Дж', ok: true }],
    },
    {
      n: 5,
      q: 'Почему важно замедлять нейтроны в цепной ядерной реакции?',
      options: [
        { t: 'Медленные нейтроны выделяют больше энергии', ok: false },
        { t: 'Быстрые нейтроны не могут проникнуть в ядро', ok: false },
        { t: 'У медленных нейтронов выше вероятность вызвать деление ядра', ok: true },
        { t: 'Замедление нейтронов снижает радиацию', ok: false },
      ],
    },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Методика сравнительного эксперимента</span>
      <h1>5 вопросов теста</h1>
      <div className="method-meta">
        <span><strong className="ctrl-color">Контрольная</strong> n = 9</span>
        <span className="dot">·</span>
        <span><strong className="exp-color">Экспериментальная</strong> n = 10</span>
        <span className="dot">·</span>
        <span>Тест проводился на казахском языке</span>
      </div>
      <div className="thesis-scrollable">
        <div className="test-q-grid">
          {testQuestions.map((tq, i) => (
            <motion.div key={tq.n} className="test-q-card" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <div className="test-q-head">
                <span className="test-q-num">№{tq.n}</span>
                <span className="test-q-text">{tq.q}</span>
              </div>
              <ul className="test-q-opts">
                {tq.options.map((o, j) => (
                  <li key={j} className={o.ok ? 'opt opt--ok' : 'opt'}>
                    <span className="opt-mark">{o.ok ? '✓' : '○'}</span>
                    <span>{o.t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <div className="thesis-scroll-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>прокрутка вниз ↓</span>
        </div>
      </div>
    </div>
  );
};

const SlideQ5 = () => (
  <div className="thesis-slide deepdive deepdive--exp">
    <span className="section-kicker">Педагогическая интерпретация · §3.6</span>
    <h1><span className="thesis-accent-blue">№5</span> · Замедление нейтронов <span className="delta-big">+57 п.п.</span></h1>
    <div className="deepdive-grid">
      <motion.div className="deepdive-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="deepdive-card__label">Что показывает анимация</div>
        <div className="deepdive-card__title">«Цепная ядерная реакция»</div>
        <p>
          На экране два нейтрона приближаются к ядру U-235: медленный (синий) и быстрый (красный).
          Под каждым выведено сечение деления — <strong>~580 барн</strong> у медленного и <strong>~1 барн</strong> у быстрого.
          Вокруг нейтронов показана «область захвата» — визуальный аналог поперечного сечения.
        </p>
        <p>Учащийся видит: медленный нейтрон не «слабее», а наоборот — у него на два порядка больше шансов вызвать деление.</p>
      </motion.div>
      <motion.div className="deepdive-card deepdive-card--result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="deepdive-card__label">Результат</div>
        <div className="deepdive-bars">
          <div className="dd-bar">
            <span className="dd-bar__lbl ctrl-color">Контрольная</span>
            <div className="dd-bar__track"><motion.div className="dd-bar__fill dd-bar__fill--ctrl" initial={{ width: 0 }} animate={{ width: '33%' }} transition={{ duration: 1.1, delay: 0.5 }} /></div>
            <span className="dd-bar__val">33%</span>
          </div>
          <div className="dd-bar">
            <span className="dd-bar__lbl exp-color">Экспериментальная</span>
            <div className="dd-bar__track"><motion.div className="dd-bar__fill dd-bar__fill--exp" initial={{ width: 0 }} animate={{ width: '90%' }} transition={{ duration: 1.1, delay: 0.7 }} /></div>
            <span className="dd-bar__val">90%</span>
          </div>
        </div>
        <div className="deepdive-quote">
          В контрольной 6 из 9 выбрали «быстрые нейтроны не могут проникнуть в ядро» —
          классическая ошибочная ментальная модель из макромеханики.
        </div>
        <div className="deepdive-cite">
          Эффект соответствует мета-анализу <em>Хёффлера и Лейтнера</em> (d ≈ 1,06) и категории «сильный эффект» по <em>Хетти</em> (d &gt; 0,8).
        </div>
      </motion.div>
    </div>
  </div>
);

const SlideQ3 = () => (
  <div className="thesis-slide deepdive deepdive--exp">
    <span className="section-kicker">Педагогическая интерпретация · §3.6</span>
    <h1><span className="thesis-accent-blue">№3</span> · Деление U-235 <span className="delta-big">100% в эксп. группе</span></h1>
    <div className="deepdive-grid">
      <motion.div className="deepdive-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="deepdive-card__label">Что показывает анимация</div>
        <div className="deepdive-card__title">«Деление ядра»</div>
        <p>Шесть стадий с микропаузами между кадрами:</p>
        <ol className="deepdive-steps">
          <li>Приближение нейтрона к ядру ²³⁵U</li>
          <li>Поглощение и образование ²³⁶U*</li>
          <li>Коллективные колебания (капельная модель)</li>
          <li>Разделение на осколки (A ≈ 95 и 140)</li>
          <li>Вылет 2–3 нейтронов</li>
          <li>Выделение ~200 МэВ кинетической энергии</li>
        </ol>
        <p className="deepdive-card__support">
          Связка с соседней анимацией «Цепная реакция» даёт учащемуся целостную картину единичного и каскадного делений.
        </p>
      </motion.div>
      <motion.div className="deepdive-card deepdive-card--result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="deepdive-card__label">Результат</div>
        <div className="deepdive-bars">
          <div className="dd-bar">
            <span className="dd-bar__lbl ctrl-color">Контрольная</span>
            <div className="dd-bar__track"><motion.div className="dd-bar__fill dd-bar__fill--ctrl" initial={{ width: 0 }} animate={{ width: '67%' }} transition={{ duration: 1.1, delay: 0.5 }} /></div>
            <span className="dd-bar__val">67%</span>
          </div>
          <div className="dd-bar">
            <span className="dd-bar__lbl exp-color">Экспериментальная</span>
            <div className="dd-bar__track"><motion.div className="dd-bar__fill dd-bar__fill--exp" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.1, delay: 0.7 }} /></div>
            <span className="dd-bar__val">100%</span>
          </div>
        </div>
        <div className="deepdive-quote">
          В контрольной: 1 учащийся выбрал «α-распад», 2 — «ядро остаётся стабильным».
          В экспериментальной — 10/10 правильно.
        </div>
        <div className="deepdive-cite">
          Принцип сегментирования <em>Майера</em> + двойное кодирование <em>Пайвио</em>: анимация создаёт визуальный имаген «делящегося ядра».
        </div>
      </motion.div>
    </div>
  </div>
);

const SlideQ124 = () => {
  const items = [
    {
      n: '№1',
      t: 'Ядерные силы + α-распад',
      delta: '+19 п.п.',
      anim: ['Ядерные взаимодействия', 'Альфа-распад'],
      why: 'Декларативное знание — текст и анимация работают почти одинаково. Хёффлер–Лейтнер: умеренный эффект для «знания утверждений».',
    },
    {
      n: '№2',
      t: 'Δ протонов при α-распаде',
      delta: '+1 п.п.',
      anim: ['Альфа-распад'],
      why: 'Механическое правило «Z уменьшается на 2» — отлично запоминается из учебника. Принцип redundancy Майера: анимация не нужна везде подряд.',
    },
    {
      n: '№4',
      t: 'E = mc² при Δm = 0,001 кг',
      delta: '+23 п.п.',
      anim: ['Деление ядра'],
      why: 'Комбинированный вопрос: концепт + формула. Анимация делает наглядным превращение массы в энергию — формула «прикрепляется» к визуальному образу.',
    },
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Педагогическая интерпретация · §3.6</span>
      <h1>Остальные вопросы: где анимация даёт меньше</h1>
      <p style={{ maxWidth: 1100, marginBottom: 18 }}>
        Анимация не везде одинаково полезна. Это методический результат, который согласуется с
        дифференциацией <strong>Хёффлера–Лейтнера</strong> между декларативным и процедурным знанием.
      </p>
      <div className="q124-grid">
        {items.map((it, i) => (
          <motion.div key={it.n} className="q124-card" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
            <div className="q124-head">
              <span className="q124-num">{it.n}</span>
              <span className="q124-delta">{it.delta}</span>
            </div>
            <div className="q124-title">{it.t}</div>
            <div className="q124-anim">
              <span className="q124-anim__label">Анимация(ии):</span>
              {it.anim.map((a) => <span key={a} className="q124-chip">{a}</span>)}
            </div>
            <p className="q124-why">{it.why}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SlideSummaryNumbers = () => (
  <div className="thesis-slide">
    <span className="section-kicker">Итоговые цифры</span>
    <h1>Что показала работа в числах</h1>
    <div className="summary-grid">
      <motion.div className="summary-card summary-card--exp" custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Эксперимент vs контроль</div>
        <div className="summary-card__big">
          <span className="exp-color"><AnimatedNumber value={86} suffix="%" /></span>
          <span className="summary-card__vs">vs</span>
          <span className="ctrl-color"><AnimatedNumber value={60} suffix="%" /></span>
        </div>
        <div className="summary-card__sub">Δ = +26 п.п. · d ≈ 1,59 («сильный эффект» по Хетти)</div>
      </motion.div>
      <motion.div className="summary-card summary-card--exp" custom={1} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Пре- → пост-тест</div>
        <div className="summary-card__big">
          <span className="ctrl-color"><AnimatedNumber value={42.7} suffix="%" /></span>
          <span className="summary-card__vs">→</span>
          <span className="exp-color"><AnimatedNumber value={88.1} suffix="%" /></span>
        </div>
        <div className="summary-card__sub">+45,4 п.п. прироста понимания</div>
      </motion.div>
      <motion.div className="summary-card" custom={2} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Самый драматичный разрыв</div>
        <div className="summary-card__big">
          <span className="exp-color"><AnimatedNumber value={57} /></span>
          <span className="summary-card__unit">п.п.</span>
        </div>
        <div className="summary-card__sub">№5 (замедление нейтронов): 90% vs 33%</div>
      </motion.div>
      <motion.div className="summary-card" custom={3} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Учителя · общее впечатление</div>
        <div className="summary-card__big">
          <AnimatedNumber value={4.67} />
          <span className="summary-card__unit">/ 5</span>
        </div>
        <div className="summary-card__sub">Cronbach α = 0,789 («приемлемая надёжность»)</div>
      </motion.div>
      <motion.div className="summary-card" custom={4} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Готовы внедрить в классе</div>
        <div className="summary-card__big">
          <AnimatedNumber value={94.4} suffix="%" />
        </div>
        <div className="summary-card__sub">17 из 18 учителей</div>
      </motion.div>
      <motion.div className="summary-card" custom={5} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="summary-card__label">Net Promoter Score</div>
        <div className="summary-card__big">
          <AnimatedNumber value={38.9} />
        </div>
        <div className="summary-card__sub">Категория «хорошо» (NPS &gt; 30)</div>
      </motion.div>
    </div>
  </div>
);

const SlideConclusion = () => {
  const conclusions = [
    { t: 'Разработан комплекс', d: '9 анимаций на Manim CE v0.18, согласованных с ТУП РК (11.7.2.1–7) и учебником Закировой–Аширова' },
    { t: 'Эксперимент подтверждает гипотезу', d: '86,0% vs 60,0% (Δ = +26 п.п., d ≈ 1,59). Пре/пост: 42,7% → 88,1% (+45,4 п.п.)' },
    { t: 'Педагоги признали ценность', d: 'Общее впечатление 4,67/5. NPS = 38,9 («хорошо»). 94,4% готовы внедрять в классе' },
    { t: 'Открытая инфраструктура', d: 'physez.com — бесплатно, без регистрации. Исходный код анимаций в Git, расширяем сторонними авторами' },
  ];
  const future = [
    'Расширение на другие разделы физики и смежные предметы',
    'Долгосрочные исследования с большими выборками',
    'Анализ внимания с помощью айтрекинга',
    'Мобильное приложение и казахская локализация',
    'Персонализация через AI',
  ];
  return (
    <div className="thesis-slide">
      <span className="section-kicker">Заключение</span>
      <h1>Что сделано и куда движется работа</h1>
      <div className="conclusion-grid">
        <div>
          <div className="conclusion-label">Основные результаты</div>
          <div className="conclusion-list">
            {conclusions.map((c, i) => (
              <motion.div key={c.t} className="conclusion-item" custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                <div className="conclusion-item__num">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div className="conclusion-item__title">{c.t}</div>
                  <div className="conclusion-item__desc">{c.d}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div>
          <div className="conclusion-label">Направления развития</div>
          <ul className="future-list">
            {future.map((f, i) => (
              <motion.li key={f} custom={i + 4} initial="hidden" animate="visible" variants={fadeUp}>{f}</motion.li>
            ))}
          </ul>
          <motion.div className="conclusion-quote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            «Гипотеза исследования подтверждена: использование интерактивных анимаций является
            эффективным методом обучения ядерной физике в старшей школе.»
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ============== PRESENTATION SHELL ============== */

const slides = [
  { C: Slide1, kicker: '', title: 'Титульный слайд' },
  { C: Slide2, kicker: 'План работы', title: 'Этапы исследования' },
  { C: Slide3, kicker: 'Актуальность', title: 'Почему это важно сейчас' },
  { C: SlideENT, kicker: 'Актуальность', title: 'Рост доли ядерной физики в ЕНТ' },
  { C: Slide4, kicker: 'Теория', title: 'Три теории мультимедиа' },
  { C: Slide5, kicker: 'Цель и задачи', title: 'Помочь школьникам усвоить ядерную физику' },
  { C: Slide6, kicker: 'Учебная программа', title: 'Цели обучения ТУП РК' },
  { C: Slide7, kicker: 'Контент-ядро', title: '9 анимаций на Manim' },
  { C: Slide8, kicker: 'Анализ ниши', title: 'Существующие платформы' },
  { C: Slide9, kicker: 'Реализация', title: 'Создание анимаций на Python' },
  { C: Slide10, kicker: 'Платформа Physez', title: 'Сайт-агрегатор анимаций' },
  { C: SlideArchitecture, kicker: 'Архитектура', title: 'Технологический стек' },
  { C: SlideMethodology, kicker: 'Методика эксперимента', title: '5 вопросов теста' },
  { C: Slide17, kicker: 'Апробация', title: 'Работа учащихся с анимациями' },
  { C: SlidePerQuestion, kicker: 'Поэлементный разбор', title: 'Где анимации дают эффект' },
  { C: SlideQ5, kicker: '§3.6 разбор', title: '№5 · Замедление нейтронов (+57 п.п.)' },
  { C: SlideQ3, kicker: '§3.6 разбор', title: '№3 · Деление U-235 (100% эксп.)' },
  { C: SlideQ124, kicker: '§3.6 разбор', title: '№1, №2, №4 — где анимация даёт меньше' },
  { C: Slide11, kicker: 'Результаты', title: 'Сравнение контрольной и экспериментальной групп' },
  { C: Slide12, kicker: 'Эффективность', title: 'Пре- и пост-тестирование' },
  { C: SlideSurveyQuestions, kicker: 'Анкета учителей', title: 'Вопросы анкеты' },
  { C: Slide16, kicker: 'Апробация', title: 'Проведение урока' },
  { C: Slide14, kicker: 'Анкета учителей', title: 'Средние оценки по вопросам' },
  { C: Slide15, kicker: 'Готовность', title: 'Учителя готовы внедрить' },
  { C: SlideSummaryNumbers, kicker: 'Итоговые цифры', title: 'Что показала работа в числах' },
  { C: SlideConclusion, kicker: 'Заключение', title: 'Что сделано и куда движется работа' },
  { C: Slide18, kicker: 'Литература', title: 'Использованные источники' },
];

export default function Thesis() {
  const [[index, direction], setIndexState] = useState<[number, number]>([0, 1]);
  const a11y = useAccessibility();
  const theme: 'dark' | 'light' = a11y.enabled && a11y.lightTheme ? 'light' : 'dark';
  const total = slides.length;
  const setIndex = useCallback((updater: number | ((i: number) => number)) => {
    setIndexState(([i]) => {
      const next = typeof updater === 'function' ? updater(i) : updater;
      const clamped = Math.max(0, Math.min(total - 1, next));
      return [clamped, clamped >= i ? 1 : -1];
    });
  }, [total]);
  const [isA11yOpen, setIsA11yOpen] = useState(false);
  const a11yTimeoutRef = useRef<number | null>(null);

  const openA11y = () => {
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
    if (!a11y.enabled) a11y.setEnabled(true);
    setIsA11yOpen(true);
  };
  const closeA11yWithDelay = () => {
    a11yTimeoutRef.current = window.setTimeout(() => setIsA11yOpen(false), 200);
  };
  const keepA11yOpen = () => {
    if (a11yTimeoutRef.current) {
      clearTimeout(a11yTimeoutRef.current);
      a11yTimeoutRef.current = null;
    }
  };

  const toggleTheme = useCallback(() => {
    const next = !(a11y.enabled && a11y.lightTheme);
    a11y.setEnabled(true);
    a11y.setLightTheme(next);
  }, [a11y]);

  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [setIndex, total]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [setIndex]);

  const scrollSlide = useCallback((dir: 1 | -1): boolean => {
    const el = document.querySelector('.thesis-scrollable') as HTMLElement | null;
    if (!el) return false;
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 1) return false;
    const cur = el.scrollTop;
    if (dir === 1 && cur < max - 1) {
      el.scrollBy({ top: el.clientHeight * 0.8, behavior: 'smooth' });
      return true;
    }
    if (dir === -1 && cur > 1) {
      el.scrollBy({ top: -el.clientHeight * 0.8, behavior: 'smooth' });
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter', 'N', 'n']);
    const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'P', 'p']);
    const SCROLL_DOWN_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);
    const SCROLL_UP_KEYS = new Set(['ArrowUp', 'PageUp']);
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;
      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault();
        if (SCROLL_DOWN_KEYS.has(e.key) && scrollSlide(1)) return;
        next();
      }
      else if (PREV_KEYS.has(e.key)) {
        e.preventDefault();
        if (SCROLL_UP_KEYS.has(e.key) && scrollSlide(-1)) return;
        prev();
      }
      else if (e.key === 'Home') { e.preventDefault(); setIndex(0); }
      else if (e.key === 'End') { e.preventDefault(); setIndex(total - 1); }
      else if (e.key === 'F5') {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      }
      else if (e.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen();
      }
      else if (e.key === '.' || e.code === 'KeyB' || e.key.toLowerCase() === 'b' || e.key.toLowerCase() === 'и') {
        e.preventDefault();
        document.documentElement.classList.toggle('thesis-blackout');
      }
      else if (e.code === 'KeyF' || e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      else if (e.code === 'KeyT' || e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'е') toggleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, setIndex, total, toggleTheme, scrollSlide]);

  // Touch swipe
  useEffect(() => {
    let startX = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchend', onEnd); };
  }, [next, prev]);

  const Slide = useMemo(() => slides[index].C, [index]);
  const progress = ((index + 1) / total) * 100;
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navCloseRef = useRef<number | null>(null);

  return (
    <div className="thesis-root" data-theme={theme}>
      <div className="thesis-bg" />
      <div className="thesis-grain" />

      <div className="thesis-progress">
        <div className="thesis-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <Link to="/" className="thesis-logo" aria-label="На главную">
        <img src="/favicon1.png" alt="" className="logo-icon" />
        <span className="logo-phys">Phys</span>
        <span className="logo-ez">ez</span>
        <span className="logo-tld">.com</span>
      </Link>

      <button
        className="a11y-header-btn thesis-a11y-btn"
        onClick={() => {
          if (!a11y.enabled) a11y.setEnabled(true);
          setIsA11yOpen((v) => !v);
        }}
        onMouseEnter={openA11y}
        onMouseLeave={closeA11yWithDelay}
        aria-label="Режим доступности"
        title="Доступность"
      >
        <svg className="a11y-icon" viewBox="0 0 40 40" fill="currentColor">
          <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="20" cy="10" r="2.8" />
          <path d="M20 13.5l-7 2c-0.6 0.2-0.9 0.7-0.8 1.3 0.2 0.6 0.7 0.9 1.3 0.8L18 16v5l-3.5 6c-0.3 0.5-0.1 1.2 0.4 1.5 0.5 0.3 1.2 0.1 1.5-0.4L20 22l3.6 6.1c0.3 0.5 1 0.7 1.5 0.4 0.5-0.3 0.7-1 0.4-1.5L22 21v-5l4.5 1.6c0.6 0.2 1.1-0.2 1.3-0.8 0.2-0.6-0.2-1.1-0.8-1.3l-7-2z" />
        </svg>
      </button>

      <AccessibilityPanel
        isOpen={isA11yOpen}
        onClose={() => setIsA11yOpen(false)}
        onMouseEnter={keepA11yOpen}
        onMouseLeave={closeA11yWithDelay}
      />

      <div className="thesis-stage">
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(96px, 9vh) 5vw 4vh' }}
          >
            <Slide />
          </motion.div>
        </AnimatePresence>
      </div>

      {(() => {
        const openNav = () => {
          if (navCloseRef.current) { clearTimeout(navCloseRef.current); navCloseRef.current = null; }
          setIsNavOpen(true);
        };
        const closeNav = () => {
          navCloseRef.current = window.setTimeout(() => setIsNavOpen(false), 180);
        };
        return (
          <div className="thesis-controls">
            <AnimatePresence>
              {isNavOpen && (
                <div className="thesis-nav-anchor" onMouseEnter={openNav} onMouseLeave={closeNav}>
                  <motion.div
                    className="thesis-nav-strip"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <div className="thesis-nav-strip__scroll">
                      {slides.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`thesis-nav-num${i === index ? ' is-current' : ''}`}
                          onClick={() => setIndex(i)}
                          aria-label={`Слайд ${i + 1}: ${s.title}`}
                        >
                          {i + 1}
                          <span className="thesis-nav-tip" role="tooltip">
                            {s.kicker && <span className="thesis-nav-tip__kicker">{s.kicker}</span>}
                            <span className="thesis-nav-tip__title">{s.title}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <button onClick={prev} disabled={index === 0} aria-label="Previous">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
            <div
              className="thesis-counter"
              aria-live="polite"
              onMouseEnter={openNav}
              onMouseLeave={closeNav}
            >
              {index + 1} / {total}
            </div>
            <button onClick={next} disabled={index === total - 1} aria-label="Next">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>
        );
      })()}
    </div>
  );
}
