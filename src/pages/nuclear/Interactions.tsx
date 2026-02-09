import PageTemplate from '../../components/PageTemplate';

export default function Interactions() {
  return (
    <PageTemplate
      title="Ядерные взаимодействия"
      section="Физика Атомного ядра"
      videoSrc="/videos/nuclear/7_interactions.mp4"
      description="Анимация демонстрирует сильное ядерное взаимодействие — фундаментальную силу, удерживающую протоны и нейтроны в ядре. Показано, как ядерные силы действуют на малых расстояниях, преодолевая электростатическое отталкивание протонов. Ядерные силы обладают свойством насыщения и зарядовой независимости."
      prevLink={{ path: '/nuclear/halflife', title: 'Период полураспада' }}
      nextLink={{ path: '/nuclear/droplet', title: 'Капельная модель ядра' }}
    />
  );
}
