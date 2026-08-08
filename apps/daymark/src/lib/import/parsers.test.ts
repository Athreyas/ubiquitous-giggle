import { describe, expect, it } from 'vitest'
import {
  detectSource,
  normalizeTimestamp,
  parseBrowserBookmarks,
  parseImportFile,
  parseInstagram,
  parseTikTok,
} from './parsers'

/* --------------------------------------------------------- fixtures */

const CHROME_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1600000000">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://example.com/read" ADD_DATE="1600000001">Example &amp; Co</A>
        <DT><A HREF="https://www.youtube.com/watch?v=abc" ADD_DATE="1600000002">A talk</A>
        <DT><H3>Recipes</H3>
        <DL><p>
            <DT><A HREF="https://cooking.example/pasta" ADD_DATE="1600000003">Miso pasta</A>
        </DL><p>
        <DT><A HREF="javascript:void(0)">bad</A>
        <DT><A HREF="place:type=6">firefox internal</A>
    </DL><p>
</DL><p>`

const FIREFOX_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><A HREF="https://blog.example/post" ADD_DATE="1610000000" TAGS="reading,longform">Great post</A>
</DL><p>`

const INSTAGRAM_JSON = JSON.stringify({
  saved_saved_media: [
    {
      title: 'chef_ana',
      string_map_data: {
        'Saved on': { href: 'https://www.instagram.com/reel/ABC123/', timestamp: 1699999999 },
      },
    },
    {
      title: 'travel_diaries',
      string_map_data: {
        'Saved on': { href: 'https://www.instagram.com/p/XYZ789/', timestamp: 1698888888 },
      },
    },
    {
      title: 'broken_entry',
      string_map_data: {},
    },
  ],
})

const INSTAGRAM_HTML = `<html><body>
  <a href="https://www.instagram.com/reel/HTML111/">reel</a>
  <a href="https://www.instagram.com/p/HTML222/">post</a>
  <a href="https://www.instagram.com/reel/HTML111/">dup</a>
</body></html>`

const TIKTOK_JSON = JSON.stringify({
  Activity: {
    'Favorite Videos': {
      FavoriteVideoList: [
        { Date: '2023-05-01 10:00:00', Link: 'https://www.tiktokv.com/share/video/111/' },
        { Date: '2023-06-02 11:30:00', Link: 'https://www.tiktokv.com/share/video/222/' },
      ],
    },
    'Like List': {
      ItemFavoriteList: [
        { Date: '2023-07-03 09:15:00', Link: 'https://www.tiktokv.com/share/video/333/' },
      ],
    },
    'Video Browsing History': {
      VideoList: [{ Date: '2023-01-01 00:00:00', Link: 'not-a-url' }],
    },
  },
})

/* --------------------------------------------------------- browser */

describe('parseBrowserBookmarks', () => {
  const res = parseBrowserBookmarks(CHROME_HTML)

  it('extracts every http(s) bookmark and skips internal/js links', () => {
    expect(res.items).toHaveLength(3)
    expect(res.skipped).toBe(2)
  })

  it('decodes HTML entities in titles', () => {
    expect(res.items[0].title).toBe('Example & Co')
  })

  it('detects platform from the URL', () => {
    const yt = res.items.find((i) => i.url?.includes('youtube'))
    expect(yt?.platform).toBe('youtube')
  })

  it('turns non-generic folders into tags (skips "Bookmarks bar")', () => {
    const pasta = res.items.find((i) => i.url?.includes('pasta'))
    expect(pasta?.tags).toContain('recipes')
    expect(res.items[0].tags).not.toContain('bookmarks bar')
  })

  it('parses ADD_DATE into a real ISO date', () => {
    expect(res.items[0].createdAt.startsWith('2020-')).toBe(true)
  })

  it('reads Firefox TAGS attribute', () => {
    const ff = parseBrowserBookmarks(FIREFOX_HTML)
    expect(ff.items[0].tags).toEqual(expect.arrayContaining(['reading', 'longform']))
  })
})

/* --------------------------------------------------------- instagram */

describe('parseInstagram', () => {
  const res = parseInstagram(INSTAGRAM_JSON)

  it('imports saved posts and reels, skipping entries without a URL', () => {
    expect(res.items).toHaveLength(2)
    expect(res.skipped).toBe(1)
  })

  it('distinguishes reels from posts and tags them', () => {
    const reel = res.items.find((i) => i.url?.includes('/reel/'))
    expect(reel?.tags).toContain('reel')
    expect(reel?.platform).toBe('instagram')
    expect(reel?.title).toBe('@chef_ana')
  })

  it('parses the saved timestamp', () => {
    expect(res.items[0].createdAt.startsWith('20')).toBe(true)
  })

  it('falls back to scraping links from the HTML export', () => {
    const html = parseInstagram(INSTAGRAM_HTML)
    expect(html.items).toHaveLength(2) // dedup removes the repeat
  })
})

/* --------------------------------------------------------- tiktok */

describe('parseTikTok', () => {
  const res = parseTikTok(TIKTOK_JSON)

  it('imports favourites and likes, skipping malformed links', () => {
    expect(res.items).toHaveLength(3)
    expect(res.skipped).toBeGreaterThanOrEqual(1)
  })

  it('tags favourites as saved and likes as liked', () => {
    const saved = res.items.filter((i) => i.tags.includes('saved'))
    const liked = res.items.filter((i) => i.tags.includes('liked'))
    expect(saved).toHaveLength(2)
    expect(liked).toHaveLength(1)
    expect(res.items[0].platform).toBe('tiktok')
  })
})

/* --------------------------------------------------------- detection */

describe('detectSource', () => {
  it('detects browser bookmark files', () => {
    expect(detectSource(CHROME_HTML, 'bookmarks.html')).toBe('browser')
  })
  it('detects Instagram export', () => {
    expect(detectSource(INSTAGRAM_JSON, 'saved_posts.json')).toBe('instagram')
  })
  it('detects TikTok export', () => {
    expect(detectSource(TIKTOK_JSON, 'user_data.json')).toBe('tiktok')
  })
  it('returns null for unknown content', () => {
    expect(detectSource('just some text', 'notes.txt')).toBeNull()
  })
})

describe('parseImportFile', () => {
  it('auto-detects and routes to the right parser', () => {
    expect(parseImportFile(TIKTOK_JSON, 'user_data.json').source).toBe('tiktok')
    expect(parseImportFile(CHROME_HTML, 'bookmarks.html').items.length).toBe(3)
  })
  it('honours an explicit source override', () => {
    expect(parseImportFile(INSTAGRAM_JSON, 'x.json', 'instagram').items).toHaveLength(2)
  })
})

/* --------------------------------------------------------- timestamps */

describe('normalizeTimestamp', () => {
  it('handles unix seconds', () => {
    expect(normalizeTimestamp(1600000000).startsWith('2020-')).toBe(true)
  })
  it('handles millisecond epochs', () => {
    expect(normalizeTimestamp(1600000000000).startsWith('2020-')).toBe(true)
  })
  it('handles date strings', () => {
    expect(normalizeTimestamp('2023-05-01 10:00:00').startsWith('2023-05-01')).toBe(true)
  })
  it('falls back to now for junk', () => {
    expect(typeof normalizeTimestamp(undefined)).toBe('string')
  })
})
