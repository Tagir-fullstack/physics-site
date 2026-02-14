import PageTemplate from '../../components/PageTemplate';

export default function Decay() {
  return (
    <PageTemplate
      title="Деление ядра"
      section="Физика Атомного ядра"
      videoSrc="/videos/nuclear/8_decay.mp4"
      description="Анимация показывает процесс деления тяжёлого ядра (урана-235) под действием нейтрона. Ядро захватывает нейтрон, переходит в возбуждённое состояние и делится на два осколка средней массы (барий и криптон) с выделением 2-3 нейтронов и огромной энергии. Этот процесс лежит в основе работы ядерных реакторов и атомного оружия."
      prevLink={{ path: '/nuclear/droplet', title: 'Капельная модель ядра' }}
      nextLink={{ path: '/nuclear/chain', title: 'Цепная реакция' }}
      animationStatus="yellow"
    />
  );
}
