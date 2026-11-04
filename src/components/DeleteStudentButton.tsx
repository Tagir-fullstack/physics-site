import { useEffect, useRef, useState } from 'react'
import { useApiClient } from '../lib/apiClient'
import { studentRequest, type StudentProfile } from '../lib/studentProfile'

export default function DeleteStudentButton({ student, onDeleted }: { student: StudentProfile; onDeleted: (id: string) => void }) {
  const { authFetch } = useApiClient()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const expected = `УДАЛИТЬ ${student.variantNumber}`
  useEffect(() => { const node = dialog.current; if (!open || !node) return; node.showModal(); return () => node.close() }, [open])
  const remove = async () => {
    if (busy || confirmation !== expected) return
    setBusy(true); setError('')
    try { await studentRequest('/api/student-profile', { action: 'deleteStudent', studentId: student.id, confirmation }, authFetch); setOpen(false); onDeleted(student.id) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось удалить студента.') }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" className="monitor-row-open student-delete-button" onClick={() => { setConfirmation(''); setError(''); setOpen(true) }}>Удалить аккаунт</button>
    {open && <dialog ref={dialog} className="student-delete-dialog" aria-labelledby={`delete-title-${student.id}`} onCancel={e => { if (busy) e.preventDefault(); else setOpen(false) }}>
      <h2 id={`delete-title-${student.id}`}>Удалить аккаунт студента?</h2>
      <p><b>{student.lastName} {student.firstName}</b> · {student.group || 'Без группы'} · вариант № {student.variantNumber}</p>
      <p>Будут безвозвратно удалены профиль, варианты, ссылки восстановления и связанные результаты. Если профиль связан с аккаунтом входа, он также будет удалён вместе с данными обучения и подписки. Другие студенты с похожими именами останутся.</p>
      <form onSubmit={e => { e.preventDefault(); void remove() }}><label>Для подтверждения введите «{expected}»<input autoComplete="off" autoFocus value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)}/></label>
        {error && <p className="student-error" role="alert">{error}</p>}
        <div className="student-delete-actions"><button type="button" className="monitor-export" disabled={busy} onClick={() => setOpen(false)}>Отмена</button><button type="submit" className="monitor-export student-delete-button" disabled={busy || confirmation !== expected}>{busy ? 'Удаляем…' : 'Удалить безвозвратно'}</button></div>
      </form>
    </dialog>}
  </>
}
