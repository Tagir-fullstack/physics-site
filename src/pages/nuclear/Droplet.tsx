import PageTemplate from '../../components/PageTemplate';

export default function Droplet() {
  return (
    <PageTemplate
      title="Капельная модель ядра"
      section="Физика Атомного ядра"
      videoSrc="/videos/nuclear/2.1_DropletModel3D.mp4"
      description="Анимация иллюстрирует капельную модель атомного ядра, предложенную Нильсом Бором. Ядро представляется как капля несжимаемой ядерной жидкости, состоящей из протонов и нейтронов. Модель объясняет многие свойства ядер: их примерно одинаковую плотность, энергию связи нуклонов и механизм деления тяжёлых ядер."
      prevLink={{ path: '/nuclear/interactions', title: 'Ядерные взаимодействия' }}
      nextLink={{ path: '/nuclear/decay', title: 'Деление ядра' }}
      animationStatus="green"
    />
  );
}
