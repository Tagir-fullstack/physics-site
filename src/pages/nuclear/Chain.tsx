import { useTranslation } from 'react-i18next';
import PageTemplate from '../../components/PageTemplate';

export default function Chain() {
  const { t } = useTranslation();

  return (
    <PageTemplate
      title={t('topics.chain.title')}
      section={t('pageTemplate.section')}
      videoSrc="/videos/nuclear/9_chain.mp4"
      description={t('topics.chain.description')}
      prevLink={{ path: '/nuclear/decay', title: t('topics.decay.title') }}
      nextLink={{ path: '/nuclear/quiz', title: t('quiz.startTest') }}
      animationStatus="red"
    />
  );
}
