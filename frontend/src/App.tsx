import { useEffect, useState } from 'react'

type Status = 'checking' | 'ok' | 'error'

const LABELS: Record<Status, string> = {
  checking: 'API: checking…',
  ok: 'API: ok ✓',
  error: 'API: unreachable ✕ (is the backend running on :8000?)',
}

function App() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ ok: boolean }>
      })
      .then((data) => setStatus(data.ok ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main>
      <h1>DeNote</h1>
      <p>{LABELS[status]}</p>
    </main>
  )
}

export default App
