import PageTemplate from '../../components/PageTemplate';

export default function Alpha() {
  return (
    <PageTemplate
      title="Альфа-распад"
      section="Физика Атомного ядра"
      videoSrc="/videos/nuclear/3_alpha.mp4"
      description="Анимация показывает процесс альфа-распада — вид радиоактивного распада, при котором ядро испускает альфа-частицу (ядро гелия-4, состоящее из 2 протонов и 2 нейтронов). В результате массовое число ядра уменьшается на 4, а заряд — на 2. Альфа-частицы обладают высокой ионизирующей способностью, но малой проникающей способностью."
      nextLink={{ path: '/nuclear/beta', title: 'Бета-распад' }}
    />
  );
}
