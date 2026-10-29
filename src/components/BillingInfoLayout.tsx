import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import '../styles/billing-info.css'

const sections = [
  ['/payments', 'Об оплате'], ['/legal/offer', 'Оферта'], ['/legal/refunds', 'Возвраты'],
  ['/legal/recurring', 'Продление'], ['/legal/privacy', 'Данные'], ['/legal/seller', 'Реквизиты'],
]

export default function BillingInfoLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="billing-info-page"><div className="billing-info-container">
    <Link className="billing-info-back" to="/premium"><span aria-hidden="true">←</span> К тарифам</Link>
    <header className="billing-info-heading"><h1>{title}</h1><p>{description}</p></header>
    <nav className="billing-info-nav" aria-label="Информация об оплате">{sections.map(([to, label]) => <NavLink key={to} to={to} end className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}</nav>
    {children}
    <div className="billing-info-contact"><span>Есть вопрос?</span><a href="mailto:tgr.aimurza@gmail.com">tgr.aimurza@gmail.com <span aria-hidden="true">↗</span></a></div>
  </div></main>
}
