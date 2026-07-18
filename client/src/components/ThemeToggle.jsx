import { useTheme } from '../context/ThemeContext.jsx'
import Icon from './Icon.jsx'

const OPTIONS = [
  { value: 'light', icon: 'sun', label: 'Día' },
  { value: 'dark', icon: 'moon', label: 'Noche' },
  { value: 'system', icon: 'monitor', label: 'Sistema' },
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
          <Icon name={o.icon} size={16} />
        </button>
      ))}
    </div>
  )
}
