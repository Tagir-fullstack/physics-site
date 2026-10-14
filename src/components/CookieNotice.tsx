import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/student-profile.css'
export default function CookieNotice() {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('physez-storage-notice-v1') !== 'seen' } catch { return true } })
  if (!open) return null
  return <aside className="cookie-notice" aria-label="Cookies и сохранение данных"><p>Сайт использует технические cookies для входа и узнавания вашего профиля. Черновики и настройки сохраняются в браузере. ФИО, группа и индивидуальный вариант — в базе сайта. <Link to="/privacy">Подробнее о данных</Link></p><button onClick={() => { try { localStorage.setItem('physez-storage-notice-v1', 'seen') } catch { /* Notice still dismisses for this visit. */ } setOpen(false) }}>Понятно</button></aside>
}
