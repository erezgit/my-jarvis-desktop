import React from 'react'
import ReactDOM from 'react-dom/client'
import appIcon from '@/resources/build/icon.png'
import { WindowContextProvider, menuItems } from '@/app/components/window'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './app'

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <ErrorBoundary>
    <ThemeProvider>
      <WindowContextProvider titlebar={{ title: 'My Jarvis Desktop', icon: appIcon, menuItems }}>
        <App />
      </WindowContextProvider>
    </ThemeProvider>
  </ErrorBoundary>
)
