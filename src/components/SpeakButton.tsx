import { useState, useCallback, type RefObject } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

interface Props {
  text?: string;
  textRef?: RefObject<HTMLElement | null>;
}

export default function SpeakButton({ text, textRef }: Props) {
  const { enabled, speechRate } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    // Always cancel first — Chrome bug: rate not applied without cancel
    speechSynthesis.cancel();

    if (speaking) {
      setSpeaking(false);
      return;
    }

    const resolvedText = text || textRef?.current?.textContent || '';
    if (!resolvedText) return;

    const utterance = new SpeechSynthesisUtterance(resolvedText);
    utterance.lang = 'ru-RU';
    utterance.rate = speechRate;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Small delay after cancel for Chrome to pick up new rate
    setTimeout(() => {
      setSpeaking(true);
      speechSynthesis.speak(utterance);
    }, 50);
  }, [text, textRef, speechRate, speaking]);

  if (!enabled) return null;

  return (
    <button
      className="a11y-speak-btn"
      onClick={handleSpeak}
      aria-label={speaking ? 'Остановить озвучку' : 'Озвучить текст'}
      title={speaking ? 'Остановить' : 'Озвучить'}
    >
      {speaking ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
