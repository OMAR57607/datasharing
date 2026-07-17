import { useTheme } from '../context/ThemeContext.jsx'

const OPTIONS = [
  { value: 'light', icon: '☀️', label: 'Día' },
  { value: 'dark', icon: '🌙', label: 'Noche' },
  { value: 'system', icon: '💻', label: 'Sistema' },
]

export default function ThemeToggle() {
  const { choice, setChoice } = useTheme()
  return (
    <div className="theme-toggle" role="group" aria-label="Tema">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={`theme-opt ${choice === o.value ? 'active' : ''}`}
          onClick={() => setChoice(o.value)}
          title={o.label}
          aria-pressed={choice === o.value}
        >
          <span aria-hidden="true">{o.icon}</span>
        </button>
      ))}
    </div>
  )
}
