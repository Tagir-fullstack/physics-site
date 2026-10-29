import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LabIllustration from '../components/LabIllustration'
import '../styles/labs-catalog.css'

const LABS = [
  { id: 'atwood', number: '01', title: 'Машина Атвуда', topic: 'Движение и силы', description: 'Два груза, один блок. Изменяйте массы и исследуйте, от чего зависит ускорение системы.', route: '/labs/atwood', accent: 'blue' },
  { id: 'ball-collision', number: '02', title: 'Столкновение шаров', topic: 'Импульс и энергия', description: 'Сталкивайте шары, меняйте условия опыта и наблюдайте передачу движения при ударе.', route: '/labs/ball-collision', accent: 'coral' },
  { id: 'oberbeck', number: '03', title: 'Маятник Обербека', topic: 'Вращательное движение', description: 'Меняйте положение грузов и исследуйте связь момента силы, ускорения и момента инерции.', route: '/labs/oberbeck', accent: 'mint' },
  { id: 'clement-desormes', number: '05', title: 'Метод Клемана—Дезорма', topic: 'Термодинамика', description: 'Управляйте кранами и компрессором, снимайте показания манометра и определяйте показатель адиабаты воздуха.', route: '/labs/clement-desormes', accent: 'blue' },
] as const


export default function Labs() {
  const { user } = useAuth()
  return <main className="labs-catalog-page"><div className="labs-catalog-container">
    <section className="labs-catalog-hero" aria-labelledby="labs-title">
      <div className="labs-catalog-welcome">
        <span className="labs-catalog-eyebrow"><i aria-hidden="true" /> PHYSEZ / ВИРТУАЛЬНАЯ ЛАБОРАТОРИЯ</span>
        <h1 id="labs-title">Добро пожаловать<br />в лабораторию<span>.</span></h1>
        <p>Физика становится понятнее, когда её можно увидеть. Собирайте опыты, меняйте условия и находите закономерности — прямо в браузере.</p>
        <div className="labs-catalog-actions"><a href="#lab-catalog" className="labs-catalog-primary">Выбрать опыт <span aria-hidden="true">↓</span></a><Link to={user ? '/account' : '/student/profile'}>Мой профиль <span aria-hidden="true">↗</span></Link></div>
        <div className="labs-catalog-facts"><span><strong>{String(LABS.length).padStart(2, '0')}</strong> установки</span><span>Механика и термодинамика</span><span>Без установки программ</span></div>
      </div>
      <div className="labs-hero-apparatus" aria-hidden="true"><div className="labs-apparatus-caption"><span>НАБЛЮДАЙТЕ. ИССЛЕДУЙТЕ.</span><span>↗</span></div><LabIllustration id="oberbeck" /><div className="labs-apparatus-footer"><span>От наблюдения<br />к пониманию</span><b>F → a</b></div></div>
    </section>

    <section id="lab-catalog" className="labs-catalog-list" aria-labelledby="labs-list-title">
      <header className="labs-catalog-list-heading"><div><span className="labs-catalog-eyebrow">ВАШ СЛЕДУЮЩИЙ ЭКСПЕРИМЕНТ</span><h2 id="labs-list-title">Выберите лабораторную</h2></div><span className="labs-catalog-free">Установки доступны бесплатно</span></header>
      <div className="labs-catalog-cards">{LABS.map(lab => <article className={`labs-catalog-card labs-accent-${lab.accent}`} key={lab.id}>
        <div className="labs-card-art"><span className="labs-card-number">{lab.number} / ЛАБОРАТОРНАЯ</span><LabIllustration id={lab.id} /></div>
        <div className="labs-card-copy"><span className="labs-card-topic">{lab.topic}</span><h3>{lab.title}</h3><p>{lab.description}</p><Link to={lab.route} aria-label={`Открыть лабораторную «${lab.title}»`}>Начать эксперимент <span aria-hidden="true">↗</span></Link></div>
      </article>)}</div>
    </section>

    <section className="labs-catalog-guide" aria-label="Как начать"><div><span className="labs-catalog-eyebrow">ВСЁ ГОТОВО К ОПЫТУ</span><h2>Ваша очередь исследовать</h2><p>Начните с установки. Дополнительные инструменты обработки результатов доступны с PRO.</p></div><ol><li><span>1</span>Выберите опыт</li><li><span>2</span>Настройте параметры</li><li><span>3</span>Запустите и наблюдайте</li></ol></section>
  </div></main>
}
