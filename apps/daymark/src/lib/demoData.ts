import type { MemoryItem } from '../types'

/** Seed library so Daily Memory works without a live Karakeep instance. */
export const DEMO_ITEMS: MemoryItem[] = [
  {
    id: 'demo-1',
    type: 'link',
    title: 'How sleep shapes creative insight',
    url: 'https://example.com/sleep-creativity',
    summary:
      'A clear walk through why REM cycles help remote associations click — useful when you are stuck on a product problem overnight.',
    note: 'Read before the design sprint',
    tags: ['creativity', 'health', 'research'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1511295742362-92cda5412afb?w=1200&q=80',
    platform: 'article',
    createdAt: daysAgo(45),
  },
  {
    id: 'demo-2',
    type: 'link',
    title: 'Street food night market reel',
    url: 'https://www.instagram.com/reel/demo2',
    summary:
      'Quick cuts of a night market in Chiang Mai — steam, neon, and a stall that only sells crispy roti with condensed onion jam.',
    tags: ['food', 'travel', 'inspiration'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
    platform: 'instagram',
    createdAt: daysAgo(22),
  },
  {
    id: 'demo-3',
    type: 'link',
    title: 'Tiny CSS tricks for calm interfaces',
    url: 'https://www.youtube.com/watch?v=democss',
    summary:
      'Twelve-minute talk on spacing rhythm, soft shadows, and why one accent color beats a rainbow of badges.',
    tags: ['design', 'css', 'ui'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1523437113733-ab79c9694d0e?w=1200&q=80',
    platform: 'youtube',
    createdAt: daysAgo(18),
  },
  {
    id: 'demo-4',
    type: 'text',
    title: 'Snippet: second-brain capture rule',
    summary:
      'If it takes more than ten seconds to decide where something goes, dump it with one tag and move on. Organization is a later problem.',
    note: 'Personal rule',
    tags: ['productivity', 'second-brain'],
    platform: 'note',
    createdAt: daysAgo(60),
  },
  {
    id: 'demo-5',
    type: 'link',
    title: 'Balcony tomato update',
    url: 'https://www.tiktok.com/@demo/video/5',
    summary:
      'A grower shows week-six pruning for cherry tomatoes in a small planter — surprisingly relevant for your balcony experiment.',
    tags: ['garden', 'home'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=1200&q=80',
    platform: 'tiktok',
    createdAt: daysAgo(12),
  },
  {
    id: 'demo-6',
    type: 'link',
    title: 'The case for boring technology',
    url: 'https://example.com/boring-tech',
    summary:
      'Choose stacks your future self can operate at 2am. Novelty is a tax; reliability compounds.',
    tags: ['engineering', 'ops'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    platform: 'article',
    createdAt: daysAgo(90),
  },
  {
    id: 'demo-7',
    type: 'link',
    title: 'Rain on a Kyoto alley',
    url: 'https://www.instagram.com/p/demo7',
    summary:
      'Still frame mood reference — wet stone, paper lanterns, and a narrow vanishing point. Save for the travel essay layout.',
    tags: ['photography', 'mood', 'travel'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80',
    platform: 'instagram',
    createdAt: daysAgo(33),
  },
  {
    id: 'demo-8',
    type: 'link',
    title: 'Meilisearch ranking rules in practice',
    url: 'https://example.com/meili-ranking',
    summary:
      'How to bias title and tags over raw body text so “memory” queries surface the right bookmark first.',
    tags: ['search', 'engineering'],
    thumbnailUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
    platform: 'article',
    createdAt: daysAgo(8),
  },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
