import { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useDashboardStore } from '../store'
import { IPC } from '../shared/constants'
import type { Settings, Thread, Playbook } from '../shared/types'
import Hub from './pages/Hub'
import Models from './pages/Models'
import Playbooks from './pages/Playbooks'
import History from './pages/History'
import Settings from './pages/Settings'

const NAV_ITEMS = [
  { id: 'hub', icon: '◎', label: 'Hub' },
  { id: 'models', icon: '◈', label: 'Models' },
  { id: 'playbooks', icon: '◆', label: 'Playbooks' },
  { id: 'history', icon: '≡', label: 'History' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
] as const

type Page = typeof NAV_ITEMS[number]['id']

export default function DashboardApp() {
  const { page, setPage, setThreads, setPlaybooks, setSettings } = useDashboardStore()

  useEffect(() => {
    Promise.all([
      invoke<Settings>(IPC.GET_SETTINGS),
      invoke<Thread[]>(IPC.GET_THREADS),
      invoke<Playbook[]>(IPC.GET_PLAYBOOKS),
    ]).then(([s, t, p]) => {
      if (s) setSettings(s)
      if (t) setThreads(t)
      if (p) setPlaybooks(p)
    }).catch(() => {})
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'hub': return <Hub />
      case 'models': return <Models />
      case 'playbooks': return <Playbooks />
      case 'history': return <History />
      case 'settings': return <Settings />
    }
  }

  return (
    <div className="dashboard-root">
      {/* Vertical sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo">W</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`dash-nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id as Page)}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main className="dash-content">
        {renderPage()}
      </main>
    </div>
  )
}
