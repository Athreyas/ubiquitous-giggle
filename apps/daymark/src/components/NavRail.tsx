import { motion } from 'motion/react'
import { IconGear, IconImport, IconLibrary, IconPlus, IconSparkle } from './Icons'

export type ViewKey = 'memories' | 'library' | 'capture' | 'import'

interface Props {
  active: ViewKey
  onNavigate: (view: ViewKey) => void
  onOpenSettings: () => void
  demo: boolean
}

const ITEMS: { key: ViewKey; label: string; Icon: typeof IconSparkle }[] = [
  { key: 'memories', label: 'Memories', Icon: IconSparkle },
  { key: 'library', label: 'Library', Icon: IconLibrary },
  { key: 'capture', label: 'Capture', Icon: IconPlus },
  { key: 'import', label: 'Import', Icon: IconImport },
]

export function NavRail({ active, onNavigate, onOpenSettings, demo }: Props) {
  return (
    <aside className="rail">
      <div className="brand">
        <motion.div
          className="brand-orb"
          aria-hidden
          animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div>
          <div className="brand-name">Daymark</div>
          <div className="brand-sub">Living memory</div>
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
                className="nav-glow"
                layoutId="nav-glow"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="nav-icon">
              <Icon width={20} height={20} />
            </span>
            <motion.span
              className="nav-label"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.02 }}
            >
              {label}
            </motion.span>
          </button>
        ))}
      </nav>

      <div className="rail-foot">
        <div className="rail-tip">
          {demo ? (
            <>
              You&apos;re exploring the <b>demo library</b>. Connect Daykeep to resurface your
              own saves.
            </>
          ) : (
            <>Connected to your Daykeep library.</>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
          <IconGear width={18} height={18} /> Connect library
        </button>
      </div>
    </aside>
  )
}
