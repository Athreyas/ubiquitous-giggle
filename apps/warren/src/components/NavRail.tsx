import { motion } from 'motion/react'
import { IconGear, IconLibrary, IconSparkle } from './Icons'
import { WarrenMark } from './WarrenMark'

export type ViewKey = 'memories' | 'library'

interface Props {
  active: ViewKey
  onNavigate: (view: ViewKey) => void
  onOpenSettings: () => void
  demo: boolean
  signedIn: boolean
}

const ITEMS: { key: ViewKey; label: string; Icon: typeof IconSparkle }[] = [
  { key: 'memories', label: 'Daily Echo', Icon: IconSparkle },
  { key: 'library', label: 'Library', Icon: IconLibrary },
]

export function NavRail({ active, onNavigate, onOpenSettings, demo, signedIn }: Props) {
  return (
    <aside className="rail">
      <div className="brand">
        <WarrenMark />
        <div>
          <div className="brand-name">Warren</div>
          <div className="brand-sub">everything, connected</div>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        {ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`nav-item ${active === key ? 'active' : ''}`}
            onClick={() => onNavigate(key)}
            aria-current={active === key ? 'page' : undefined}
          >
            {active === key ? (
              <motion.span
                className="absolute inset-0 -z-10 rounded-[12px] bg-[var(--accent-soft)]"
                layoutId="nav-active"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            ) : null}
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="rail-foot">
        <div className="rail-tip">
          {demo ? (
            <>
              Exploring the <b>demo library</b>. Sign in to resurface your own saves.
            </>
          ) : signedIn ? (
            <>Connected to your cloud library.</>
          ) : (
            <>Sign in to sync your saves, or switch on demo mode.</>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
          <IconGear /> {demo || !signedIn ? 'Sign in' : 'Cloud library'}
        </button>
      </div>
    </aside>
  )
}
