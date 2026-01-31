export interface Topic {
  title: string;
  path: string;
}

export interface Section {
  title: string;
  topics: Topic[];
}

export const sections: Section[] = [
  {
    title: "Физика Атомного ядра",
    topics: [
      {
        title: "Опыт Резерфорда",
        path: "/nuclear/rutherford"
      },
      {
        title: "Капельная модель ядра",
        path: "/nuclear/droplet"
      },
      {
        title: "Альфа-распад",
        path: "/nuclear/alpha"
      },
      {
        title: "Бета-распад",
        path: "/nuclear/beta"
      },
      {
        title: "Гамма-излучение",
        path: "/nuclear/gamma"
      },
      {
        title: "Период полураспада",
        path: "/nuclear/halflife"
      },
      {
        title: "Ядерные взаимодействия",
        path: "/nuclear/interactions"
      },
      {
        title: "Деление ядра",
        path: "/nuclear/decay"
      },
      {
        title: "Цепная реакция",
        path: "/nuclear/chain"
      }
    ]
  },
  {
    title: "Квантовая физика",
    topics: [
      {
        title: "Квантовая гипотеза Планка",
        path: "/quantum/planck"
      },
      {
        title: "Фотоэффект",
        path: "/quantum/photoelectric"
      },
      {
        title: "Эффект Комптона",
        path: "/quantum/compton"
      },
      {
        title: "Корпускулярно-волновой дуализм",
        path: "/quantum/wave-particle"
      },
      {
        title: "Модель атома Бора",
        path: "/quantum/bohr"
      },
      {
        title: "Принцип неопределенности",
        path: "/quantum/uncertainty"
      },
      {
        title: "Волновая функция",
        path: "/quantum/wave-function"
      },
      {
        title: "Уравнение Шрёдингера",
        path: "/quantum/schrodinger"
      },
      {
        title: "Квантовые числа",
        path: "/quantum/quantum-numbers"
      },
      {
        title: "Спин электрона",
        path: "/quantum/electron-spin"
      }
    ]
  }
];
