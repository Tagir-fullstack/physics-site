import { useTranslation } from 'react-i18next';
import PageTemplate from '../../components/PageTemplate';

export default function Droplet() {
  const { t } = useTranslation();

  return (
    <PageTemplate
      title={t('topics.droplet.title')}
      section={t('pageTemplate.section')}
      videoSrc="/videos/nuclear/2.1_DropletModel3D.mp4"
      description={t('topics.droplet.description')}
      prevLink={{ path: '/nuclear/interactions', title: t('topics.interactions.title') }}
      nextLink={{ path: '/nuclear/decay', title: t('topics.decay.title') }}
      animationStatus="green"
    />
  );
}
