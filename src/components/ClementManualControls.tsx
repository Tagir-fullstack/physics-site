import { useEffect, useId, useRef, useState } from 'react'
import { clementVariant, type ClementVariant } from '../lib/clementDesormes'
import { CLEMENT_MANUAL_FIELDS, clementManualValues, parseManualClement, type ClementManualValues } from '../lib/clementManual'

export default function ClementManualControls({ variant, custom, onApply, onReset }: { variant: ClementVariant; custom: boolean; onApply: (v: ClementVariant) => void; onReset: () => void }) {
  const [number, setNumber] = useState(String(variant.number))
  const [values, setValues] = useState<ClementManualValues>(() => clementManualValues(variant))
  const [error, setError] = useState('')
  const hintId = useId()
  const hint = useRef<HTMLDivElement>(null)
  const summary = useRef<HTMLElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const hideHint = () => { window.clearTimeout(hideTimer.current); hint.current?.hidePopover() }
  const showHint = () => {
    window.clearTimeout(hideTimer.current)
    const popup = hint.current, anchor = summary.current
    if (!popup || !anchor) return
    popup.showPopover()
    const bounds = anchor.getBoundingClientRect(), size = popup.getBoundingClientRect()
    popup.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - size.width - 12))}px`
    popup.style.top = `${Math.max(12, bounds.bottom + size.height + 12 < window.innerHeight ? bounds.bottom + 8 : bounds.top - size.height - 8)}px`
  }
  const scheduleHide = () => { hideTimer.current = window.setTimeout(hideHint, 150) }
  useEffect(() => {
    const dismiss = () => { window.clearTimeout(hideTimer.current); hint.current?.hidePopover() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    const outside = (event: PointerEvent) => { if (!summary.current?.contains(event.target as Node) && !hint.current?.contains(event.target as Node)) dismiss() }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { window.clearTimeout(hideTimer.current); window.removeEventListener('resize', dismiss); window.removeEventListener('scroll', dismiss, true); document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside) }
  }, [])
  const fromNumber = () => {
    const n = Number(number)
    if (!Number.isSafeInteger(n) || n < 1) { setError('Введите целый положительный номер варианта.'); return }
    const next = clementVariant(n)
    setValues(clementManualValues(next)); setError(''); onApply(next)
  }
  return <><details className="cd-manual-controls">
    <summary ref={summary} aria-describedby={hintId} onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) showHint() }} onMouseLeave={scheduleHide} onFocus={event => { if (event.target === event.currentTarget) showHint() }} onBlur={scheduleHide}>Ручная сверка варианта <span className="atwood-pro-badge">PRO</span><button type="button" className="cd-manual-help" aria-label="О ручной сверке" aria-describedby={hintId} onClick={event => { event.preventDefault(); event.stopPropagation(); if (hint.current?.matches(':popover-open')) hideHint(); else showHint() }}>?</button></summary>
    <div className="cd-manual-number"><label>Номер варианта<input inputMode="numeric" value={number} onChange={e => { setNumber(e.target.value); setError('') }} /></label><button type="button" onClick={fromNumber}>Загрузить по номеру</button></div>
    <form onSubmit={e => { e.preventDefault(); const result = parseManualClement(values, Number(number)); if (!result.ok) { setError(result.error); return } setError(''); onApply(result.variant) }}>
      <div className="cd-manual-fields">{CLEMENT_MANUAL_FIELDS.map(([key,label]) => <label key={key}>{label}<input inputMode="decimal" required value={values[key]} onChange={e => {setValues(current => ({...current,[key]:e.target.value}));setError('')}}/></label>)}</div>
      {error && <p role="alert" className="student-error">{error}</p>}
      <div className="cd-manual-actions"><button type="submit" className="cd-primary">Применить параметры</button>{custom && <button type="button" onClick={onReset}>Вернуть мой вариант</button>}</div>
    </form>
  </details><div id={hintId} ref={hint} popover="manual" role="tooltip" className="cd-manual-tooltip" onMouseEnter={() => window.clearTimeout(hideTimer.current)} onMouseLeave={scheduleHide}>Возьмите условия по номеру студента или введите его параметры. Применение начинает новый опыт; записи вашего исходного варианта сохраняются отдельно.</div></>
}
