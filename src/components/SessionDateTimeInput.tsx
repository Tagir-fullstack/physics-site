import { useState } from 'react'

function localValue(value: string | number) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

export default function SessionDateTimeInput({ name, label, defaultValue = '', required = false, max, shortcuts = [] }: {
  name: string; label: string; defaultValue?: string; required?: boolean; max?: string
  shortcuts?: { label: string; value: () => string | number }[]
}) {
  const [value, setValue] = useState(() => ({ date: defaultValue.slice(0, 10), time: defaultValue.slice(11, 16) }))
  const setPreset = (next: string | number) => {
    const formatted = localValue(next)
    setValue({ date: formatted.slice(0, 10), time: formatted.slice(11, 16) })
  }
  return <fieldset className="exam-datetime">
    <legend>{label}</legend>
    <div className="exam-datetime-fields">
      <label>Дата<input type="date" aria-label={`${label}: дата`} value={value.date} required={required || Boolean(value.time)} max={max?.slice(0, 10)} onChange={event => setValue(previous => ({ ...previous, date: event.target.value }))} /></label>
      <label>Время<input type="time" aria-label={`${label}: время`} value={value.time} required={required || Boolean(value.date)} step={60} max={value.date === max?.slice(0, 10) ? max?.slice(11, 16) : undefined} onChange={event => setValue(previous => ({ ...previous, time: event.target.value }))} /></label>
    </div>
    <input type="hidden" name={name} value={value.date && value.time ? `${value.date}T${value.time}` : ''} />
    {(shortcuts.length > 0 || !required) && <div className="exam-datetime-shortcuts">
      {shortcuts.map(shortcut => <button type="button" key={shortcut.label} onClick={() => setPreset(shortcut.value())}>{shortcut.label}</button>)}
      {!required && <button type="button" onClick={() => setValue({ date: '', time: '' })}>Не открывать</button>}
    </div>}
  </fieldset>
}
