import React from 'react'
import ReactDOM from 'react-dom/client'
import DashboardApp from './App'
import '../styles/global.css'

ReactDOM.createRoot(document.getElementById('dashboard-root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>,
)
