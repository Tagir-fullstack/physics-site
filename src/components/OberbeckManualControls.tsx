import { useState } from 'react'
import { MANUAL_OBERBECK_FIELDS, manualOberbeckValues, parseManualOberbeck, type ManualOberbeckField, type ManualOberbeckSetup } from '../lib/oberbeckManual'

export default function OberbeckManualControls({ setup, custom, onApply, onReset }: { setup: ManualOberbeckSetup; custom: boolean; onApply: (setup: ManualOberbeckSetup) => void; onReset: () => void }) {
  const [error, setError] = useState('')
  const values = manualOberbeckValues(setup)
  return <section className="ob-manual-controls" aria-label="Ручные параметры PRO">
    <h3 className="ob-manual-heading">Ручные параметры</h3>
    <form onSubmit={event => {
      event.preventDefault()
      const fields = new FormData(event.currentTarget)
      const input = Object.fromEntries(MANUAL_OBERBECK_FIELDS.map(([key]) => [key, String(fields.get(key) ?? '')])) as Record<ManualOberbeckField, string>
      const result = parseManualOberbeck(input)
      if (!result.ok) { setError(result.error); return }
      setError(''); onApply(result.setup)
    }}><div className="ob-manual-fields">{MANUAL_OBERBECK_FIELDS.map(([key, label]) => <label key={key}>{label}<input name={key} required inputMode="decimal" defaultValue={values[key]} autoComplete="off" /></label>)}</div>
      {error && <p className="student-error" role="alert">{error}</p>}
      <div className="ob-manual-actions"><button className="atwood-primary" type="submit">Применить параметры</button>{custom && <button className="atwood-secondary" type="button" onClick={onReset}>Вернуть мой вариант</button>}</div>
    </form>
  </section>
}
