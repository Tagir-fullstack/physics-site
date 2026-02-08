import { useState, useCallback } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';

interface Props {
  text: string;
}

export default function SpeakButton({ text }: Props) {
  const { enabled } = useAccessibility();
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = useCallback(() => {
    if (!('speechSynthesis' in window)) return;

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    speechSynthesis.speak(utterance);
  }, [text]);

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
