import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type FontSize = 'normal' | 'large' | 'xlarge';

interface AccessibilityState {
  enabled: boolean;
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
  lightTheme: boolean;
  speechRate: number;
}

interface AccessibilityContextType extends AccessibilityState {
  setEnabled: (v: boolean) => void;
  setFontSize: (v: FontSize) => void;
  setHighContrast: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setLightTheme: (v: boolean) => void;
  setSpeechRate: (v: number) => void;
  resetAll: () => void;
}

const defaults: AccessibilityState = {
  enabled: false,
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  lightTheme: false,
  speechRate: 0.9,
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

const STORAGE_KEY = 'physez-a11y';

function loadState(): AccessibilityState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...defaults };
}

function saveState(state: AccessibilityState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyClasses(state: AccessibilityState) {
  const html = document.documentElement;
  const body = document.body;

  // Font size on <html> so rem units scale
  html.classList.toggle('a11y-font-large', state.enabled && state.fontSize === 'large');
  html.classList.toggle('a11y-font-xlarge', state.enabled && state.fontSize === 'xlarge');

  // Everything else on <body>
  body.classList.toggle('a11y-enabled', state.enabled);
  body.classList.toggle('a11y-high-contrast', state.enabled && state.highContrast);
  body.classList.toggle('a11y-reduced-motion', state.enabled && state.reducedMotion);
  body.classList.toggle('a11y-light-theme', state.enabled && state.lightTheme);
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(loadState);

  useEffect(() => {
    saveState(state);
    applyClasses(state);
  }, [state]);

  const ctx: AccessibilityContextType = {
    ...state,
    setEnabled: (v) => setState((s) => ({ ...s, enabled: v })),
    setFontSize: (v) => setState((s) => ({ ...s, fontSize: v })),
    setHighContrast: (v) => setState((s) => ({ ...s, highContrast: v })),
    setReducedMotion: (v) => setState((s) => ({ ...s, reducedMotion: v })),
    setLightTheme: (v) => setState((s) => ({ ...s, lightTheme: v })),
    setSpeechRate: (v) => setState((s) => ({ ...s, speechRate: v })),
    resetAll: () => setState({ ...defaults }),
  };

  return (
    <AccessibilityContext.Provider value={ctx}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
