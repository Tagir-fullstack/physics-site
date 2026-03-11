import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../context/AccessibilityContext';
import '../styles/page-layout.css';

export default function Terms() {
  const { t } = useTranslation();
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
          {t('terms.title')}
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
              1. {t('terms.copyright')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              {t('terms.copyrightText1')} <strong>Physez</strong> {t('terms.copyrightText2')} <strong>Аймурза Тагиру</strong>.
            </p>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              © {new Date().getFullYear()} Physez. {t('terms.allRightsReserved')}
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              2. {t('terms.commercialProhibition')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              {t('terms.commercialProhibitionText')}
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem', marginBottom: '1rem' }}>
              <li>{t('terms.commercialItem1')}</li>
              <li>{t('terms.commercialItem2')}</li>
              <li>{t('terms.commercialItem3')}</li>
              <li>{t('terms.commercialItem4')}</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              3. {t('terms.allowedUse')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc', marginBottom: '1rem' }}>
              {t('terms.allowedUseText')}
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>{t('terms.allowedItem1')}</li>
              <li>{t('terms.allowedItem2')}</li>
              <li>{t('terms.allowedItem3')}</li>
              <li>{t('terms.allowedItem4')}</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              4. {t('terms.distributionProhibition')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.distributionProhibitionText')}
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>{t('terms.distributionItem1')}</li>
              <li>{t('terms.distributionItem2')}</li>
              <li>{t('terms.distributionItem3')}</li>
              <li>{t('terms.distributionItem4')}</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              5. {t('terms.citation')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.citationText')}
            </p>
            <ul style={{ color: isLightTheme ? '#555' : '#ccc', paddingLeft: '2rem' }}>
              <li>{t('terms.citationItem1')}</li>
              <li>{t('terms.citationItem2')}</li>
              <li>{t('terms.citationItem3')}</li>
            </ul>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              6. {t('terms.academicHonesty')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.academicHonestyText')}
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              7. {t('terms.liability')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.liabilityText')}
            </p>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              8. {t('terms.permission')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.permissionText')}
            </p>
            <p style={{ color: '#FC6255', fontWeight: 'bold', marginTop: '0.5rem' }}>
              tgr.aimurza@gmail.com
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: isLightTheme ? '#1a1a1a' : '#fff' }}>
              9. {t('terms.changes')}
            </h2>
            <p style={{ color: isLightTheme ? '#555' : '#ccc' }}>
              {t('terms.changesText')}
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
              {t('terms.lastUpdated')}: {new Date().toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
