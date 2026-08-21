import { motion } from 'motion/react'
import { IconGear, IconLibrary, IconPlus, IconSky, IconSparkle } from './Icons'
import { WarrenMark } from './WarrenMark'
import type { Space } from '../lib/api/spaces'

export type ViewKey = 'memories' | 'library' | 'sky'

interface Props {
  active: ViewKey
  onNavigate: (view: ViewKey) => void
  onOpenSettings: () => void
  onOpenCommandPalette: () => void
  onOpenCapture: () => void
  demo: boolean
  signedIn: boolean
  spaces: Space[]
  activeSpaceId: string | null
  onSelectSpace: (spaceId: string | null) => void
}

const ITEMS: { key: ViewKey; label: string; Icon: typeof IconSparkle }[] = [
  { key: 'memories', label: 'Daily Echo', Icon: IconSparkle },
  { key: 'library', label: 'Library', Icon: IconLibrary },
  { key: 'sky', label: 'Sky', Icon: IconSky },
]

export function NavRail({
  active,
  onNavigate,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenCapture,
  demo,
  signedIn,
  spaces,
  activeSpaceId,
  onSelectSpace,
}: Props) {
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
            className={`nav-item relative ${active === key ? 'active' : ''}`}
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

      {!demo && signedIn && spaces.length > 0 ? (
        <div className="space-switcher" style={{ padding: '8px 12px' }}>
          <div className="lbl" style={{ marginBottom: 6, fontSize: 12, opacity: 0.7 }}>
            Space
          </div>
          <select
            aria-label="Active space"
            value={activeSpaceId ?? ''}
            onChange={(e) => onSelectSpace(e.target.value || null)}
            style={{
              width: '100%',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              padding: '8px 10px',
            }}
          >
            <option value="">All spaces</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="rail-foot">
        {!demo && signedIn ? (
          <button type="button" className="btn btn-ghost" onClick={onOpenCapture}>
            <IconPlus /> Capture
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost mobile-search-btn" onClick={onOpenCommandPalette}>
          Search ⌘K
        </button>
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
