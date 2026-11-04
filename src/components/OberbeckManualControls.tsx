import { useState } from 'react'
import { useApiClient } from '../lib/apiClient'
import { studentRequest } from '../lib/studentProfile'
import type { OberbeckVariant } from '../lib/oberbeckVariant'
import { MANUAL_OBERBECK_FIELDS, manualOberbeckValues, parseManualOberbeck, type ManualOberbeckField, type ManualOberbeckSetup } from '../lib/oberbeckManual'

export default function OberbeckManualControls({ setup, custom, onApply, onReset, canLookup = false }: { setup: ManualOberbeckSetup; custom: boolean; canLookup?: boolean; onApply: (setup: ManualOberbeckSetup) => void; onReset: () => void }) {
  const [error, setError] = useState('')
  const [number, setNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const { authFetch } = useApiClient()
  const load = async () => {
    const n = Number(number)
    if (!Number.isSafeInteger(n) || n < 1) { setError('Введите целый положительный номер варианта.'); return }
    setLoading(true); setError('')
    try { const result = await studentRequest<{ parameters: OberbeckVariant }>(`/api/oberbeck?view=lookup&number=${n}`, undefined, authFetch); onApply({ variant: result.parameters, length: 10 }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить вариант.') }
    finally { setLoading(false) }
  }
  const values = manualOberbeckValues(setup)
  return <section className="ob-manual-controls" aria-label="Ручные параметры PRO">
    <h3 className="ob-manual-heading">Сверка варианта</h3>
    {canLookup && <div className="ob-manual-number"><label>Номер варианта студента<input inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)}/></label><button type="button" disabled={loading} onClick={() => void load()}>{loading ? 'Загружаем…' : 'Загрузить по номеру'}</button></div>}
    <p>Загрузите условия или введите параметры вручную. Записи сверки сохраняются отдельно.</p>
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
