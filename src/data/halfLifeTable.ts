export interface Isotope {
  id: string;
  element: string; // символ элемента без массового числа (U, Th, etc.)
  name: string;
  massNumber: number;
  atomicNumber: number;
  halfLife: string;
  halfLifeSeconds: number; // для сортировки
  decayMode: string;
  decayProducts: string;
  category: 'natural' | 'medical' | 'industrial' | 'weapons' | 'research';
  description?: string;
}

export const isotopes: Isotope[] = [
  // ===== ЕСТЕСТВЕННЫЕ РАДИОАКТИВНЫЕ ИЗОТОПЫ =====
  {
    id: 'u238',
    element: 'U',
    name: 'Уран-238',
    massNumber: 238,
    atomicNumber: 92,
    halfLife: '4,468 млрд лет',
    halfLifeSeconds: 1.41e17,
    decayMode: 'α',
    decayProducts: '234-Th',
    category: 'natural',
    description: 'Самый распространённый изотоп урана (99,3%). Родоначальник радиоактивного ряда.'
  },
  {
    id: 'u235',
    element: 'U',
    name: 'Уран-235',
    massNumber: 235,
    atomicNumber: 92,
    halfLife: '703,8 млн лет',
    halfLifeSeconds: 2.22e16,
    decayMode: 'α',
    decayProducts: '231-Th',
    category: 'weapons',
    description: 'Делящийся изотоп, используемый в ядерных реакторах и оружии.'
  },
  {
    id: 'th232',
    element: 'Th',
    name: 'Торий-232',
    massNumber: 232,
    atomicNumber: 90,
    halfLife: '14,05 млрд лет',
    halfLifeSeconds: 4.43e17,
    decayMode: 'α',
    decayProducts: '228-Ra',
    category: 'natural',
    description: 'Родоначальник ториевого радиоактивного ряда.'
  },
  {
    id: 'k40',
    element: 'K',
    name: 'Калий-40',
    massNumber: 40,
    atomicNumber: 19,
    halfLife: '1,248 млрд лет',
    halfLifeSeconds: 3.94e16,
    decayMode: 'β⁻, β⁺, EC',
    decayProducts: '40-Ca, 40-Ar',
    category: 'natural',
    description: 'Присутствует во всех живых организмах. Используется для датирования горных пород.'
  },
  {
    id: 'c14',
    element: 'C',
    name: 'Углерод-14',
    massNumber: 14,
    atomicNumber: 6,
    halfLife: '5 730 лет',
    halfLifeSeconds: 1.81e11,
    decayMode: 'β⁻',
    decayProducts: '14-N',
    category: 'natural',
    description: 'Используется для радиоуглеродного датирования органических материалов до 50 000 лет.'
  },
  {
    id: 'ra226',
    element: 'Ra',
    name: 'Радий-226',
    massNumber: 226,
    atomicNumber: 88,
    halfLife: '1 600 лет',
    halfLifeSeconds: 5.05e10,
    decayMode: 'α',
    decayProducts: '222-Rn',
    category: 'natural',
    description: 'Открыт Марией и Пьером Кюри. Испускает радон-222.'
  },
  {
    id: 'rn222',
    element: 'Rn',
    name: 'Радон-222',
    massNumber: 222,
    atomicNumber: 86,
    halfLife: '3,82 дня',
    halfLifeSeconds: 3.30e5,
    decayMode: 'α',
    decayProducts: '218-Po',
    category: 'natural',
    description: 'Радиоактивный газ, накапливается в подвалах зданий. Вторая причина рака лёгких после курения.'
  },
  {
    id: 'pb210',
    element: 'Pb',
    name: 'Свинец-210',
    massNumber: 210,
    atomicNumber: 82,
    halfLife: '22,3 года',
    halfLifeSeconds: 7.04e8,
    decayMode: 'β⁻',
    decayProducts: '210-Bi',
    category: 'natural',
    description: 'Используется для датирования осадков и льда возрастом до 150 лет.'
  },
  {
    id: 'po210',
    element: 'Po',
    name: 'Полоний-210',
    massNumber: 210,
    atomicNumber: 84,
    halfLife: '138,4 дня',
    halfLifeSeconds: 1.20e7,
    decayMode: 'α',
    decayProducts: '206-Pb',
    category: 'natural',
    description: 'Высокотоксичен. Используется в источниках нейтронов и антистатических устройствах.'
  },

  // ===== МЕДИЦИНСКИЕ ИЗОТОПЫ =====
  {
    id: 'tc99m',
    element: 'Tc',
    name: 'Технеций-99m',
    massNumber: 99,
    atomicNumber: 43,
    halfLife: '6,01 часа',
    halfLifeSeconds: 2.16e4,
    decayMode: 'IT, γ',
    decayProducts: '99-Tc',
    category: 'medical',
    description: 'Самый используемый изотоп в ядерной медицине. Применяется в 80% диагностических процедур.'
  },
  {
    id: 'i131',
    element: 'I',
    name: 'Йод-131',
    massNumber: 131,
    atomicNumber: 53,
    halfLife: '8,02 дня',
    halfLifeSeconds: 6.93e5,
    decayMode: 'β⁻, γ',
    decayProducts: '131-Xe',
    category: 'medical',
    description: 'Используется для лечения рака щитовидной железы и гипертиреоза.'
  },
  {
    id: 'i125',
    element: 'I',
    name: 'Йод-125',
    massNumber: 125,
    atomicNumber: 53,
    halfLife: '59,4 дня',
    halfLifeSeconds: 5.13e6,
    decayMode: 'EC, γ',
    decayProducts: '125-Te',
    category: 'medical',
    description: 'Применяется в брахитерапии рака простаты и в радиоиммуноанализе.'
  },
  {
    id: 'f18',
    element: 'F',
    name: 'Фтор-18',
    massNumber: 18,
    atomicNumber: 9,
    halfLife: '109,8 мин',
    halfLifeSeconds: 6.59e3,
    decayMode: 'β⁺',
    decayProducts: '18-O',
    category: 'medical',
    description: 'Используется в ПЭТ-сканировании (позитронно-эмиссионная томография).'
  },
  {
    id: 'o14',
    element: 'O',
    name: 'Кислород-14',
    massNumber: 14,
    atomicNumber: 8,
    halfLife: '70,6 с',
    halfLifeSeconds: 70.6,
    decayMode: 'β⁺',
    decayProducts: '14-N',
    category: 'medical',
    description: 'Короткоживущий изотоп, используется в исследованиях ПЭТ для изучения кровотока.'
  },
  {
    id: 'co60',
    element: 'Co',
    name: 'Кобальт-60',
    massNumber: 60,
    atomicNumber: 27,
    halfLife: '5,27 года',
    halfLifeSeconds: 1.66e8,
    decayMode: 'β⁻, γ',
    decayProducts: '60-Ni',
    category: 'medical',
    description: 'Используется в лучевой терапии рака и для стерилизации медицинского оборудования.'
  },
  {
    id: 'mo99',
    element: 'Mo',
    name: 'Молибден-99',
    massNumber: 99,
    atomicNumber: 42,
    halfLife: '65,94 часа',
    halfLifeSeconds: 2.37e5,
    decayMode: 'β⁻',
    decayProducts: '99m-Tc',
    category: 'medical',
    description: 'Родительский изотоп для технеция-99m. Производится в ядерных реакторах.'
  },

  // ===== ПРОМЫШЛЕННЫЕ ИЗОТОПЫ =====
  {
    id: 'cs137',
    element: 'Cs',
    name: 'Цезий-137',
    massNumber: 137,
    atomicNumber: 55,
    halfLife: '30,17 года',
    halfLifeSeconds: 9.52e8,
    decayMode: 'β⁻, γ',
    decayProducts: '137-Ba',
    category: 'industrial',
    description: 'Продукт деления. Используется в промышленной гамма-дефектоскопии и измерителях уровня.'
  },
  {
    id: 'sr90',
    element: 'Sr',
    name: 'Стронций-90',
    massNumber: 90,
    atomicNumber: 38,
    halfLife: '28,8 года',
    halfLifeSeconds: 9.09e8,
    decayMode: 'β⁻',
    decayProducts: '90-Y',
    category: 'industrial',
    description: 'Продукт деления. Накапливается в костях. Используется в РИТЭГах.'
  },
  {
    id: 'am241',
    element: 'Am',
    name: 'Америций-241',
    massNumber: 241,
    atomicNumber: 95,
    halfLife: '432,2 года',
    halfLifeSeconds: 1.36e10,
    decayMode: 'α',
    decayProducts: '237-Np',
    category: 'industrial',
    description: 'Используется в детекторах дыма и промышленных измерителях плотности.'
  },
  {
    id: 'kr85',
    element: 'Kr',
    name: 'Криптон-85',
    massNumber: 85,
    atomicNumber: 36,
    halfLife: '10,76 года',
    halfLifeSeconds: 3.39e8,
    decayMode: 'β⁻',
    decayProducts: '85-Rb',
    category: 'industrial',
    description: 'Продукт деления. Используется в детекторах утечек и измерителях толщины.'
  },
  {
    id: 'ir192',
    element: 'Ir',
    name: 'Иридий-192',
    massNumber: 192,
    atomicNumber: 77,
    halfLife: '73,83 дня',
    halfLifeSeconds: 6.38e6,
    decayMode: 'β⁻, EC, γ',
    decayProducts: '192-Pt, 192-Os',
    category: 'industrial',
    description: 'Используется в промышленной радиографии и брахитерапии.'
  },

  // ===== ОРУЖЕЙНЫЕ / ЭНЕРГЕТИЧЕСКИЕ =====
  {
    id: 'pu239',
    element: 'Pu',
    name: 'Плутоний-239',
    massNumber: 239,
    atomicNumber: 94,
    halfLife: '24 110 лет',
    halfLifeSeconds: 7.61e11,
    decayMode: 'α',
    decayProducts: '235-U',
    category: 'weapons',
    description: 'Основной делящийся материал для ядерного оружия. Производится в реакторах из U-238.'
  },
  {
    id: 'pu238',
    element: 'Pu',
    name: 'Плутоний-238',
    massNumber: 238,
    atomicNumber: 94,
    halfLife: '87,7 года',
    halfLifeSeconds: 2.77e9,
    decayMode: 'α',
    decayProducts: '234-U',
    category: 'industrial',
    description: 'Используется в РИТЭГах для космических аппаратов (Вояджер, Кассини, Кьюриосити).'
  },
  {
    id: 'h3',
    element: 'H',
    name: 'Тритий',
    massNumber: 3,
    atomicNumber: 1,
    halfLife: '12,32 года',
    halfLifeSeconds: 3.89e8,
    decayMode: 'β⁻',
    decayProducts: '3-He',
    category: 'weapons',
    description: 'Используется в термоядерном оружии и светящихся приборах (тритиевая подсветка).'
  },

  // ===== ИССЛЕДОВАТЕЛЬСКИЕ / КОРОТКОЖИВУЩИЕ =====
  {
    id: 'na24',
    element: 'Na',
    name: 'Натрий-24',
    massNumber: 24,
    atomicNumber: 11,
    halfLife: '14,96 часа',
    halfLifeSeconds: 5.39e4,
    decayMode: 'β⁻, γ',
    decayProducts: '24-Mg',
    category: 'research',
    description: 'Используется в качестве радиоактивного индикатора в гидрологии.'
  },
  {
    id: 'p32',
    element: 'P',
    name: 'Фосфор-32',
    massNumber: 32,
    atomicNumber: 15,
    halfLife: '14,26 дня',
    halfLifeSeconds: 1.23e6,
    decayMode: 'β⁻',
    decayProducts: '32-S',
    category: 'research',
    description: 'Широко используется в молекулярной биологии для мечения ДНК и РНК.'
  },
  {
    id: 's35',
    element: 'S',
    name: 'Сера-35',
    massNumber: 35,
    atomicNumber: 16,
    halfLife: '87,32 дня',
    halfLifeSeconds: 7.55e6,
    decayMode: 'β⁻',
    decayProducts: '35-Cl',
    category: 'research',
    description: 'Используется для мечения белков в биохимических исследованиях.'
  },
  {
    id: 'fe59',
    element: 'Fe',
    name: 'Железо-59',
    massNumber: 59,
    atomicNumber: 26,
    halfLife: '44,5 дня',
    halfLifeSeconds: 3.85e6,
    decayMode: 'β⁻, γ',
    decayProducts: '59-Co',
    category: 'research',
    description: 'Используется для изучения метаболизма железа в организме.'
  },
  {
    id: 'bi214',
    element: 'Bi',
    name: 'Висмут-214',
    massNumber: 214,
    atomicNumber: 83,
    halfLife: '19,9 мин',
    halfLifeSeconds: 1.19e3,
    decayMode: 'β⁻, α',
    decayProducts: '214-Po, 210-Tl',
    category: 'natural',
    description: 'Член радиоактивного ряда урана-238. Источник гамма-излучения радона.'
  },
  {
    id: 'bi210',
    element: 'Bi',
    name: 'Висмут-210',
    massNumber: 210,
    atomicNumber: 83,
    halfLife: '5,01 дня',
    halfLifeSeconds: 4.33e5,
    decayMode: 'β⁻',
    decayProducts: '210-Po',
    category: 'natural',
    description: 'Член радиоактивного ряда урана-238. Распадается в полоний-210.'
  },
  {
    id: 'po214',
    element: 'Po',
    name: 'Полоний-214',
    massNumber: 214,
    atomicNumber: 84,
    halfLife: '164 мкс',
    halfLifeSeconds: 1.64e-4,
    decayMode: 'α',
    decayProducts: '210-Pb',
    category: 'natural',
    description: 'Один из самых короткоживущих природных изотопов.'
  },
  {
    id: 'be8',
    element: 'Be',
    name: 'Бериллий-8',
    massNumber: 8,
    atomicNumber: 4,
    halfLife: '8,19 × 10⁻¹⁷ с',
    halfLifeSeconds: 8.19e-17,
    decayMode: 'α',
    decayProducts: '2 × 4-He',
    category: 'research',
    description: 'Крайне нестабилен. Играет ключевую роль в нуклеосинтезе в звёздах (тройной альфа-процесс).'
  }
];

// Категории изотопов
export const isotopeCategories = {
  natural: 'Природные',
  medical: 'Медицинские',
  industrial: 'Промышленные',
  weapons: 'Энергетика/Оружие',
  research: 'Исследовательские'
} as const;

// Функция получения изотопов по категории
export function getIsotopesByCategory(category: string): Isotope[] {
  if (category === 'all') return isotopes;
  return isotopes.filter(iso => iso.category === category);
}

// Функция сортировки по периоду полураспада
export function sortByHalfLife(isotopes: Isotope[], ascending: boolean = true): Isotope[] {
  return [...isotopes].sort((a, b) =>
    ascending
      ? a.halfLifeSeconds - b.halfLifeSeconds
      : b.halfLifeSeconds - a.halfLifeSeconds
  );
}
