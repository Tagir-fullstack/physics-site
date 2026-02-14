import PageTemplate from '../../components/PageTemplate';

export default function HalfLife() {
  return (
    <PageTemplate
      title="Период полураспада"
      section="Физика Атомного ядра"
      videoSrc="/videos/nuclear/6_halflife.mp4"
      description="Анимация иллюстрирует понятие периода полураспада — времени, за которое распадается половина первоначального количества радиоактивных ядер. Показан экспоненциальный закон радиоактивного распада. Период полураспада является важнейшей характеристикой радиоактивного изотопа и может составлять от долей секунды до миллиардов лет."
      prevLink={{ path: '/nuclear/gamma', title: 'Гамма-излучение' }}
      nextLink={{ path: '/nuclear/interactions', title: 'Ядерные взаимодействия' }}
      animationStatus="red"
    />
  );
}
