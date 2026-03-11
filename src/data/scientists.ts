export interface Scientist {
  id: string;
  name: string;
  nameEn: string;
  years: string;
  country: string;
  photo?: string;
  achievements: string[];
  nobelPrize?: string;
  famousQuote?: string;
  category: 'radioactivity' | 'nuclear' | 'quantum' | 'particle';
}

export const scientists: Scientist[] = [
  // ===== РАДИОАКТИВНОСТЬ =====
  {
    id: 'becquerel',
    name: 'Анри Беккерель',
    nameEn: 'Henri Becquerel',
    years: '1852–1908',
    country: 'Франция',
    achievements: [
      'Открыл радиоактивность (1896)',
      'Обнаружил излучение солей урана',
      'Единица активности названа в его честь (Бк)'
    ],
    nobelPrize: 'Нобелевская премия по физике 1903',
    category: 'radioactivity'
  },
  {
    id: 'curie-marie',
    name: 'Мария Кюри',
    nameEn: 'Marie Curie',
    years: '1867–1934',
    country: 'Польша/Франция',
    achievements: [
      'Открыла полоний и радий',
      'Ввела термин «радиоактивность»',
      'Первая женщина — лауреат Нобелевской премии',
      'Единственный человек с Нобелевскими премиями в двух науках'
    ],
    nobelPrize: 'Нобелевская премия по физике 1903, по химии 1911',
    famousQuote: 'В жизни нет ничего, чего следует бояться. Есть лишь то, что нужно понять.',
    category: 'radioactivity'
  },
  {
    id: 'curie-pierre',
    name: 'Пьер Кюри',
    nameEn: 'Pierre Curie',
    years: '1859–1906',
    country: 'Франция',
    achievements: [
      'Совместно с женой открыл полоний и радий',
      'Исследовал пьезоэлектричество',
      'Открыл точку Кюри (магнетизм)'
    ],
    nobelPrize: 'Нобелевская премия по физике 1903',
    category: 'radioactivity'
  },

  // ===== ЯДЕРНАЯ ФИЗИКА =====
  {
    id: 'rutherford',
    name: 'Эрнест Резерфорд',
    nameEn: 'Ernest Rutherford',
    years: '1871–1937',
    country: 'Новая Зеландия/Великобритания',
    achievements: [
      'Открыл атомное ядро (1911)',
      'Классифицировал α, β, γ излучения',
      'Осуществил первую искусственную ядерную реакцию',
      '«Отец ядерной физики»'
    ],
    nobelPrize: 'Нобелевская премия по химии 1908',
    famousQuote: 'Вся наука — либо физика, либо коллекционирование марок.',
    category: 'nuclear'
  },
  {
    id: 'chadwick',
    name: 'Джеймс Чедвик',
    nameEn: 'James Chadwick',
    years: '1891–1974',
    country: 'Великобритания',
    achievements: [
      'Открыл нейтрон (1932)',
      'Участвовал в Манхэттенском проекте',
      'Ученик Резерфорда'
    ],
    nobelPrize: 'Нобелевская премия по физике 1935',
    category: 'nuclear'
  },
  {
    id: 'fermi',
    name: 'Энрико Ферми',
    nameEn: 'Enrico Fermi',
    years: '1901–1954',
    country: 'Италия/США',
    achievements: [
      'Построил первый ядерный реактор (1942)',
      'Разработал теорию бета-распада',
      'Открыл трансурановые элементы',
      'Элемент фермий назван в его честь'
    ],
    nobelPrize: 'Нобелевская премия по физике 1938',
    famousQuote: 'Есть два возможных результата эксперимента. Если результат подтверждает гипотезу — вы сделали измерение. Если нет — вы сделали открытие.',
    category: 'nuclear'
  },
  {
    id: 'hahn',
    name: 'Отто Ган',
    nameEn: 'Otto Hahn',
    years: '1879–1968',
    country: 'Германия',
    achievements: [
      'Открыл деление ядра урана (1938)',
      'Открыл несколько радиоактивных изотопов',
      '«Отец ядерной химии»'
    ],
    nobelPrize: 'Нобелевская премия по химии 1944',
    category: 'nuclear'
  },
  {
    id: 'meitner',
    name: 'Лиза Мейтнер',
    nameEn: 'Lise Meitner',
    years: '1878–1968',
    country: 'Австрия/Швеция',
    achievements: [
      'Объяснила механизм деления ядра',
      'Ввела термин «деление ядра»',
      'Элемент мейтнерий (Mt) назван в её честь',
      'Не получила Нобелевскую премию несправедливо'
    ],
    category: 'nuclear'
  },
  {
    id: 'oppenheimer',
    name: 'Роберт Оппенгеймер',
    nameEn: 'J. Robert Oppenheimer',
    years: '1904–1967',
    country: 'США',
    achievements: [
      'Научный руководитель Манхэттенского проекта',
      'Создание первой атомной бомбы',
      '«Отец атомной бомбы»'
    ],
    famousQuote: 'Я стал смертью, разрушителем миров.',
    category: 'nuclear'
  },
  {
    id: 'kurchatov',
    name: 'Игорь Курчатов',
    nameEn: 'Igor Kurchatov',
    years: '1903–1960',
    country: 'СССР',
    achievements: [
      'Руководитель советского атомного проекта',
      'Создал первую в СССР атомную бомбу (1949)',
      'Построил первую в мире АЭС (1954)',
      '«Отец советской атомной бомбы»'
    ],
    category: 'nuclear'
  },
  {
    id: 'sakharov',
    name: 'Андрей Сахаров',
    nameEn: 'Andrei Sakharov',
    years: '1921–1989',
    country: 'СССР',
    achievements: [
      'Создатель водородной бомбы',
      'Борец за права человека и разоружение',
      'Предложил концепцию токамака'
    ],
    nobelPrize: 'Нобелевская премия мира 1975',
    famousQuote: 'Мир, прогресс, права человека — эти три цели неразрывно связаны.',
    category: 'nuclear'
  },
  {
    id: 'dalton',
    name: 'Джон Дальтон',
    nameEn: 'John Dalton',
    years: '1766–1844',
    country: 'Великобритания',
    achievements: [
      'Создатель атомной теории',
      'Закон кратных отношений',
      'Закон парциальных давлений (закон Дальтона)',
      'Первым описал цветовую слепоту (дальтонизм)'
    ],
    famousQuote: 'Материя состоит из мельчайших неделимых частиц — атомов.',
    category: 'quantum'
  },

  // ===== КВАНТОВАЯ ФИЗИКА =====
  {
    id: 'planck',
    name: 'Макс Планк',
    nameEn: 'Max Planck',
    years: '1858–1947',
    country: 'Германия',
    achievements: [
      'Основоположник квантовой теории',
      'Ввёл постоянную Планка (h)',
      'Объяснил излучение абсолютно чёрного тела'
    ],
    nobelPrize: 'Нобелевская премия по физике 1918',
    category: 'quantum'
  },
  {
    id: 'bohr',
    name: 'Нильс Бор',
    nameEn: 'Niels Bohr',
    years: '1885–1962',
    country: 'Дания',
    achievements: [
      'Создал модель атома Бора',
      'Принцип дополнительности',
      'Копенгагенская интерпретация квантовой механики',
      'Элемент борий (Bh) назван в его честь'
    ],
    nobelPrize: 'Нобелевская премия по физике 1922',
    famousQuote: 'Если квантовая механика не потрясла вас — вы её не поняли.',
    category: 'quantum'
  },
  {
    id: 'heisenberg',
    name: 'Вернер Гейзенберг',
    nameEn: 'Werner Heisenberg',
    years: '1901–1976',
    country: 'Германия',
    achievements: [
      'Сформулировал принцип неопределённости',
      'Создал матричную механику',
      'Руководил немецким урановым проектом'
    ],
    nobelPrize: 'Нобелевская премия по физике 1932',
    category: 'quantum'
  },
  {
    id: 'schrodinger',
    name: 'Эрвин Шрёдингер',
    nameEn: 'Erwin Schrödinger',
    years: '1887–1961',
    country: 'Австрия',
    achievements: [
      'Создал волновую механику',
      'Уравнение Шрёдингера',
      'Мысленный эксперимент «кот Шрёдингера»'
    ],
    nobelPrize: 'Нобелевская премия по физике 1933',
    category: 'quantum'
  },
  {
    id: 'einstein',
    name: 'Альберт Эйнштейн',
    nameEn: 'Albert Einstein',
    years: '1879–1955',
    country: 'Германия/США',
    achievements: [
      'Формула E = mc²',
      'Специальная и общая теория относительности',
      'Объяснил фотоэффект',
      'Предсказал существование гравитационных волн'
    ],
    nobelPrize: 'Нобелевская премия по физике 1921',
    famousQuote: 'Воображение важнее знания. Знания ограничены, тогда как воображение охватывает весь мир.',
    category: 'quantum'
  },

  // ===== ФИЗИКА ЭЛЕМЕНТАРНЫХ ЧАСТИЦ =====
  {
    id: 'dirac',
    name: 'Поль Дирак',
    nameEn: 'Paul Dirac',
    years: '1902–1984',
    country: 'Великобритания',
    achievements: [
      'Предсказал существование антивещества',
      'Уравнение Дирака',
      'Квантовая электродинамика'
    ],
    nobelPrize: 'Нобелевская премия по физике 1933',
    famousQuote: 'В физике красота уравнений важнее их соответствия эксперименту.',
    category: 'particle'
  },
  {
    id: 'anderson',
    name: 'Карл Андерсон',
    nameEn: 'Carl Anderson',
    years: '1905–1991',
    country: 'США',
    achievements: [
      'Открыл позитрон (1932)',
      'Открыл мюон (1936)',
      'Подтвердил теорию Дирака'
    ],
    nobelPrize: 'Нобелевская премия по физике 1936',
    category: 'particle'
  },
  {
    id: 'gellmann',
    name: 'Мюррей Гелл-Манн',
    nameEn: 'Murray Gell-Mann',
    years: '1929–2019',
    country: 'США',
    achievements: [
      'Предложил кварковую модель',
      'Ввёл понятие «странность»',
      'Классификация адронов'
    ],
    nobelPrize: 'Нобелевская премия по физике 1969',
    category: 'particle'
  },
  {
    id: 'higgs',
    name: 'Питер Хиггс',
    nameEn: 'Peter Higgs',
    years: '1929–2024',
    country: 'Великобритания',
    achievements: [
      'Предсказал бозон Хиггса (1964)',
      'Механизм Хиггса объясняет массу частиц',
      'Бозон открыт на БАК в 2012 году'
    ],
    nobelPrize: 'Нобелевская премия по физике 2013',
    category: 'particle'
  }
];

export const scientistCategories = {
  radioactivity: 'Радиоактивность',
  nuclear: 'Ядерная физика',
  quantum: 'Квантовая физика',
  particle: 'Элементарные частицы'
} as const;

export function getScientistsByCategory(category: string): Scientist[] {
  if (category === 'all') return scientists;
  return scientists.filter(s => s.category === category);
}
