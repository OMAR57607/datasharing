import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'nitro_theme' // 'light' | 'dark' | 'system'

function systemPref() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(choice) {
  const resolved = choice === 'system' ? systemPref() : choice
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'light' ? '#ffffff' : '#0d0d0f')
}

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(() => localStorage.getItem(KEY) || 'system')

  useEffect(() => {
    applyTheme(choice)
    localStorage.setItem(KEY, choice)
  }, [choice])

  // Si está en "sistema", reaccionar a cambios del SO.
  useEffect(() => {
    if (choice !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [choice])

  return (
    <ThemeContext.Provider value={{ choice, setChoice }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
