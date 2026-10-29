import BillingInfoLayout from '../components/BillingInfoLayout'

export default function Payments() {
  return <BillingInfoLayout title="Оплата и безопасность" description="Коротко о покупке PRO, продлении и защите данных.">
    <div className="billing-info-status"><span aria-hidden="true"/><div><b>Оплата пока не запущена</b><p>Цены и окончательные условия появятся до первой оплаты. Базовый доступ остаётся бесплатным.</p></div></div>
    <div className="billing-info-grid">
      <section className="billing-info-card"><h2>Как оплатить</h2><ol className="billing-info-steps">
        <li><span>01</span><div><b>Выберите PRO</b><p>Войдите в аккаунт и выберите период. Стоимость — в тенге.</p></div></li>
        <li><span>02</span><div><b>Укажите способ продления</b><p>Разовая оплата или автопродление с отдельным согласием.</p></div></li>
        <li><span>03</span><div><b>Перейдите в Halyk ePay</b><p>Реквизиты карты вводятся на защищённой странице банка.</p></div></li>
        <li><span>04</span><div><b>Получите доступ</b><p>PRO активируется после подтверждения списания банком.</p></div></li>
      </ol></section>
      <section className="billing-info-card"><h2>Что важно знать</h2><div className="billing-info-facts">
        <div><b>Данные карты у банка</b><p>Physez не хранит номер карты и CVV. Для автопродления используется только банковский идентификатор карты.</p></div>
        <div><b>Продление под вашим контролем</b><p>Будущие списания можно отключить в кабинете. Уже начатая операция может завершиться.</p></div>
        <div><b>Условия доступны до оплаты</b><p>Оферта, возвраты и сведения о продавце будут опубликованы после утверждения.</p></div>
      </div></section>
    </div>
    <details className="billing-info-details"><summary>Чеки и сведения о продавце</summary><p>Банковское уведомление не заменяет фискальный чек. Порядок выдачи чеков согласовывается до запуска. Официальные реквизиты ИП, адреса и телефон поддержки будут опубликованы после подтверждения владельцем.</p></details>
  </BillingInfoLayout>
}
