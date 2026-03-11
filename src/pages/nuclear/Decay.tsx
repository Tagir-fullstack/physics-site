import { useTranslation } from 'react-i18next';
import PageTemplate from '../../components/PageTemplate';

export default function Decay() {
  const { t } = useTranslation();

  return (
    <PageTemplate
      title={t('topics.decay.title')}
      section={t('pageTemplate.section')}
      videoSrc="/videos/nuclear/8_decay.mp4"
      description={t('topics.decay.description')}
      prevLink={{ path: '/nuclear/droplet', title: t('topics.droplet.title') }}
      nextLink={{ path: '/nuclear/chain', title: t('topics.chain.title') }}
      animationStatus="yellow"
    />
  );
}
