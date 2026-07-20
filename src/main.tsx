import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { ruRU } from '@clerk/localizations'
import { Analytics } from '@vercel/analytics/react'
import './i18n'
import './index.css'
import App from './App.tsx'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env.local')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      localization={ruRU}
      appearance={{
        variables: {
          colorPrimary: '#FC6255',
          colorBackground: '#0a0a0a',
          colorText: '#ffffff',
          colorTextSecondary: '#aaaaaa',
          colorInputBackground: '#1a1a1a',
          colorInputText: '#ffffff',
          colorNeutral: '#ffffff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          borderRadius: '12px',
        },
        elements: {
          card: {
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          },
          headerTitle: {
            fontFamily: '"CCUltimatum", Arial, sans-serif',
          },
          socialButtonsBlockButton: {
            backgroundColor: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#1a1a1a',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
          },
          socialButtonsBlockButtonText: {
            color: '#1a1a1a',
            fontWeight: 500,
          },
          formButtonPrimary: {
            fontFamily: '"CCUltimatum", Arial, sans-serif',
            letterSpacing: '0.03em',
          },
          footer: {
            background: 'transparent',
          },
        },
      }}
    >
      <App />
      <Analytics />
    </ClerkProvider>
  </StrictMode>,
)
