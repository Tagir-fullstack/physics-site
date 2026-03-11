import { useTranslation } from 'react-i18next';
import PageTemplate from '../../components/PageTemplate';

export default function Interactions() {
  const { t } = useTranslation();

  return (
    <PageTemplate
      title={t('topics.interactions.title')}
      section={t('pageTemplate.section')}
      videoSrc="/videos/nuclear/7_interactions.mp4"
      description={t('topics.interactions.description')}
      prevLink={{ path: '/nuclear/halflife', title: t('topics.halflife.title') }}
      nextLink={{ path: '/nuclear/droplet', title: t('topics.droplet.title') }}
      animationStatus="red"
    />
  );
}
