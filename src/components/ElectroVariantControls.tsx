import { useId, useState } from 'react'
import { parseElectroVariantNumber } from '../lib/electrostaticsSelection'

export default function ElectroVariantControls({ number, custom, onApply, onReset }: { number: number; custom: boolean; onApply: (number: number) => void; onReset: () => void }) {
  const [draft, setDraft] = useState(String(number))
  const [error, setError] = useState('')
  const hintId = useId()
  return <details className="es-variant-controls">
    <summary>Выбор варианта <span className="es-pro-badge">PRO</span></summary>
    <form onSubmit={event => {
      event.preventDefault()
      const next = parseElectroVariantNumber(draft)
      if (next === null) { setError('Введите целый номер от 1 до 1 000 000.'); return }
      setError(''); onApply(next)
    }}>
      <label>Номер варианта<input inputMode="numeric" value={draft} aria-describedby={hintId} aria-invalid={!!error} onChange={event => { setDraft(event.target.value); setError('') }}/></label>
      <button className="es-primary" type="submit">Загрузить по номеру</button>
      {custom && <button type="button" onClick={onReset}>Вернуть мой вариант</button>}
      {error && <p role="alert">{error}</p>}
      <p id={hintId} className="es-hint">Каждый номер задаёт персональную схему с 2–4 электродами, источником 12–15 В и шагом 1 В. Расположение постоянно для вашего профиля. Загрузка начинает отдельный опыт. Измерения назначенного варианта сохраняются.</p>
    </form>
  </details>
}
