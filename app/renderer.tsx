import React from 'react'
import ReactDOM from 'react-dom/client'
import appIcon from '@/resources/build/icon.png'
import { WindowContextProvider, menuItems } from '@/app/components/window'
import { ErrorBoundary } from './components/ErrorBoundary'
// import App from './app'
import App from './CleanApp' // Clean three-panel layout with proper terminal

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <ErrorBoundary>
    <WindowContextProvider titlebar={{ title: 'Electron React App', icon: appIcon, menuItems }}>
      <App />
    </WindowContextProvider>
  </ErrorBoundary>
)
