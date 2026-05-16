import { useEffect, useState } from 'react'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { MainPanel } from './components/MainPanel'
import { AlertModal } from './components/AlertModal'

export function App() {
  const [windowLabel, setWindowLabel] = useState<string>('')

  useEffect(() => {
    setWindowLabel(getCurrentWebviewWindow().label)
  }, [])

  if (windowLabel === 'alert') return <AlertModal />
  if (windowLabel === 'main') return <MainPanel />
  return null
}
