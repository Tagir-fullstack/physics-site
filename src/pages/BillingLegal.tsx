import { useParams } from 'react-router-dom'
import BillingInfoLayout from '../components/BillingInfoLayout'
import { billingLegal, billingLegalPublished } from '../config/billingLegal'

const descriptions: Record<string, string> = {
  offer: 'Условия использования платных возможностей Physez.',
  refunds: 'Предоставление доступа, отмена и возврат оплаты.',
  recurring: 'Как работает продление и как отключить будущие списания.',
  privacy: 'Какие данные используются для оплаты и как они защищены.',
  seller: 'Официальные сведения о продавце и контакты.',
}

export default function BillingLegal() {
  const { document = '' } = useParams()
  const page = Object.hasOwn(billingLegal.documents, document) ? billingLegal.documents[document] : undefined
  const published = billingLegalPublished()
  return <BillingInfoLayout title={page?.title ?? 'Раздел не найден'} description={descriptions[document] ?? 'Выберите нужный раздел выше.'}>
    {published && page ? <article className="billing-info-document"><p className="billing-info-version">Редакция {billingLegal.version}</p><div>{page.text}</div></article> : <section className="billing-info-empty">
      <meta name="robots" content="noindex,nofollow"/>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 12h8M8 16h5"/></svg>
      <span className="billing-info-eyebrow">{page ? 'На согласовании' : 'Нет такого раздела'}</span>
      <h2>{page ? 'Документ готовится' : 'Проверьте адрес страницы'}</h2>
      <p>{page ? 'Окончательные условия и реквизиты ещё не опубликованы. После утверждения они появятся здесь до начала приёма платежей.' : 'Информация об оплате доступна в разделах выше.'}</p>
      {page && <small>Реальные платежи пока не принимаются. Черновики не являются публичной офертой.</small>}
    </section>}
  </BillingInfoLayout>
}
