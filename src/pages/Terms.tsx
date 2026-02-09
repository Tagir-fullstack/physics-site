import { motion } from 'framer-motion';
import '../styles/page-layout.css';

export default function Terms() {
  return (
    <motion.main
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        marginTop: '80px',
        minHeight: 'calc(100vh - 80px)',
        paddingTop: '1rem',
        paddingBottom: '4rem'
      }}
    >
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          color: '#fff',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Условия использования
        </h1>

        <div style={{
          backgroundColor: '#111',
          padding: '2.5rem',
          borderRadius: '15px',
          border: '1px solid #222',
          lineHeight: '1.8'
        }}>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              1. Авторские права
            </h2>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              Все материалы, размещенные на образовательной платформе <strong>Physez</strong>
              (включая, но не ограничиваясь: тексты, изображения, видео, анимации, программный код),
              являются объектами авторского права и принадлежат <strong>Аймурза Тагиру</strong>.
            </p>
            <p style={{ color: '#ccc' }}>
              © {new Date().getFullYear()} Physez. Все права защищены.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              2. Запрет коммерческого использования
            </h2>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              Материалы данного сайта предназначены <strong>исключительно для образовательных
              и некоммерческих целей</strong>. Запрещается:
            </p>
            <ul style={{ color: '#ccc', paddingLeft: '2rem', marginBottom: '1rem' }}>
              <li>Использование материалов в коммерческих целях</li>
              <li>Продажа или перепродажа контента</li>
              <li>Использование материалов для получения прямой или косвенной финансовой выгоды</li>
              <li>Включение материалов в платные образовательные программы без письменного разрешения автора</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              3. Разрешенное использование
            </h2>
            <p style={{ color: '#ccc', marginBottom: '1rem' }}>
              Разрешается использование материалов в следующих случаях:
            </p>
            <ul style={{ color: '#ccc', paddingLeft: '2rem' }}>
              <li>Для личного образования и самообучения</li>
              <li>Для использования в некоммерческих образовательных учреждениях при условии указания источника</li>
              <li>Для цитирования в научных работах и публикациях с обязательной ссылкой на источник</li>
              <li>Для использования в диссертационных исследованиях с указанием авторства</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              4. Запрет на распространение и модификацию
            </h2>
            <p style={{ color: '#ccc' }}>
              Запрещается без письменного разрешения правообладателя:
            </p>
            <ul style={{ color: '#ccc', paddingLeft: '2rem' }}>
              <li>Копирование и распространение материалов на других ресурсах</li>
              <li>Модификация, изменение или создание производных работ</li>
              <li>Удаление или изменение информации об авторских правах</li>
              <li>Размещение материалов на других веб-сайтах или платформах</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              5. Ссылки и цитирование
            </h2>
            <p style={{ color: '#ccc' }}>
              При цитировании материалов обязательно указание:
            </p>
            <ul style={{ color: '#ccc', paddingLeft: '2rem' }}>
              <li>Автора: Аймурза Тагир</li>
              <li>Названия ресурса: Physez</li>
              <li>Прямой ссылки на источник</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              6. Академическая честность
            </h2>
            <p style={{ color: '#ccc' }}>
              Данный сайт создан в рамках диссертационного исследования. Все материалы
              являются результатом научной работы автора. Плагиат и незаконное использование
              материалов преследуется в соответствии с законодательством об авторских правах.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              7. Ответственность
            </h2>
            <p style={{ color: '#ccc' }}>
              Материалы предоставляются "как есть". Автор не несет ответственности за
              возможные ошибки или неточности в содержании. Использование материалов
              осуществляется на собственный риск пользователя.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              8. Получение разрешения
            </h2>
            <p style={{ color: '#ccc' }}>
              Для получения разрешения на коммерческое использование или иное использование
              материалов, не предусмотренное данными условиями, обращайтесь по адресу:
            </p>
            <p style={{ color: '#FC6255', fontWeight: 'bold', marginTop: '0.5rem' }}>
              tgr.aimurza@gmail.com
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>
              9. Изменения условий
            </h2>
            <p style={{ color: '#ccc' }}>
              Автор оставляет за собой право изменять данные условия использования в любое время.
              Продолжение использования сайта после внесения изменений означает принятие новых условий.
            </p>
          </section>

          <div style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: '#1a1a1a',
            borderRadius: '10px',
            borderLeft: '4px solid #FC6255'
          }}>
            <p style={{ color: '#ccc', margin: 0, fontWeight: '500' }}>
              Дата последнего обновления: {new Date().toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
