import { useTranslation } from 'react-i18next';
import PageTemplate from '../../components/PageTemplate';

export default function HalfLife() {
  const { t } = useTranslation();

  return (
    <PageTemplate
      title={t('topics.halflife.title')}
      section={t('pageTemplate.section')}
      videoSrc="/videos/nuclear/6_halflife.mp4"
      description={t('topics.halflife.description')}
      prevLink={{ path: '/nuclear/gamma', title: t('topics.gamma.title') }}
      nextLink={{ path: '/nuclear/interactions', title: t('topics.interactions.title') }}
      animationStatus="red"
    />
  );
}
