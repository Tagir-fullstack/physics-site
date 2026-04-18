import { motion } from 'framer-motion';
import { useAccessibility } from '../context/AccessibilityContext';
import '../styles/page-layout.css';

export default function Privacy() {
  const { lightTheme, enabled: a11yEnabled } = useAccessibility();
  const isLightTheme = a11yEnabled && lightTheme;

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
          color: isLightTheme ? '#1a1a1a' : '#fff',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          Политика конфиденциальности
        </h1>

        <div style={{
          backgroundColor: isLightTheme ? '#f5f5f5' : '#111',
          padding: '2.5rem',
          borderRadius: '15px',
          border: isLightTheme ? '1px solid #ddd' : '1px solid #222',
          lineHeight: '1.8'
        }}>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              1. Общие положения
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              Настоящая Политика конфиденциальности описывает, как образовательный сайт <strong>Physez</strong> (physez.com)
              собирает, использует и защищает персональные данные пользователей.
            </p>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              Используя наш сайт, вы соглашаетесь с условиями данной политики.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              2. Какие данные мы собираем
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              При регистрации и использовании сайта мы можем собирать следующую информацию:
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem', marginBottom: '1rem' }}>
              <li><strong>Email</strong> — для авторизации и связи с вами</li>
              <li><strong>Имя</strong> — для персонализации</li>
              <li><strong>Фото профиля</strong> — при входе через Google (опционально)</li>
              <li><strong>Роль</strong> — школьник, студент, учитель или репетитор</li>
              <li><strong>Класс/курс</strong> — для персонализации контента</li>
              <li><strong>Учебное заведение</strong> — опционально</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              3. Как мы используем данные
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              Собранные данные используются исключительно для:
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>Авторизации и идентификации пользователя</li>
              <li>Персонализации образовательного контента</li>
              <li>Сохранения прогресса обучения</li>
              <li>Улучшения качества сайта</li>
              <li>Связи с пользователем при необходимости</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              4. Хранение данных
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              Ваши данные надёжно хранятся на серверах <strong>Supabase</strong> с использованием современных
              стандартов шифрования и безопасности.
            </p>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              Мы не передаём ваши персональные данные третьим лицам, за исключением случаев,
              предусмотренных законодательством.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              5. Вход через Google
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              При входе через Google мы получаем доступ только к базовой информации вашего аккаунта:
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>Email адрес</li>
              <li>Имя</li>
              <li>Фото профиля (если есть)</li>
            </ul>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginTop: '1rem' }}>
              Мы не получаем доступ к вашим контактам, файлам или другим данным Google-аккаунта.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              6. Cookies и аналитика
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              Мы используем технические cookies для обеспечения работы авторизации.
              Аналитические данные собираются в обезличенном виде для улучшения сайта.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              7. Ваши права
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              Вы имеете право:
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>Запросить информацию о хранящихся данных</li>
              <li>Изменить или обновить свои данные в личном кабинете</li>
              <li>Запросить удаление аккаунта и всех связанных данных</li>
              <li>Отозвать согласие на обработку данных</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              8. Безопасность
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              Мы принимаем все необходимые технические и организационные меры для защиты ваших данных
              от несанкционированного доступа, изменения, раскрытия или уничтожения.
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              9. Контакты
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться:
            </p>
            <p style={{ color: '#FC6255', fontWeight: 'bold', marginTop: '0.5rem' }}>
              tgr.aimurza@gmail.com
            </p>
          </section>

          <div style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: isLightTheme ? '#eee' : '#1a1a1a',
            borderRadius: '10px',
            borderLeft: '4px solid #FC6255'
          }}>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', margin: 0, fontWeight: '500' }}>
              Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
