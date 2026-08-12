import type { MemoryItem } from '../types'
import { humanAge } from '../lib/selection'
import { PlatformBadge } from './PlatformBadge'

interface Props {
  item: MemoryItem
  index?: number
  onOpen: (item: MemoryItem) => void
}

export function MemoryCard({ item, onOpen }: Props) {
  return (
    <button type="button" className="feed-card" onClick={() => onOpen(item)}>
      <PlatformBadge platform={item.platform} />
      <h4>{item.title}</h4>
      <p>{humanAge(item)}</p>
    </button>
  )
}
