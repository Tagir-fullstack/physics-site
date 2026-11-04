import { useEffect, useState } from 'react'
import '../styles/lab-toast.css'

export default function LabToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [])
  if (!visible) return null
  return <aside className="lab-toast"><p role="status">{message}</p><button type="button" aria-label="Закрыть уведомление" onClick={() => setVisible(false)}>×</button></aside>
}
