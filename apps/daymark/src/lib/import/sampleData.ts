import type { ImportSource } from './parsers'

/**
 * Small, realistic sample exports so users (and the demo) can try the import
 * pipeline without hunting down a real file first.
 */

export const SAMPLE_BROWSER = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1650000000">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://www.nngroup.com/articles/ux-research/" ADD_DATE="1651000000">UX research methods that actually matter</A>
        <DT><A HREF="https://www.youtube.com/watch?v=oHg5SJYRHA0" ADD_DATE="1652000000" TAGS="talks,design">A talk on calm technology</A>
        <DT><H3>Recipes</H3>
        <DL><p>
            <DT><A HREF="https://cooking.nytimes.com/recipes/1018147-miso-butter-pasta" ADD_DATE="1655000000">Miso butter pasta</A>
            <DT><A HREF="https://www.seriouseats.com/no-knead-focaccia" ADD_DATE="1656000000">No-knead focaccia</A>
        </DL><p>
        <DT><H3>Travel</H3>
        <DL><p>
            <DT><A HREF="https://www.atlasobscura.com/places/dolomites-rifugio" ADD_DATE="1657000000">A rifugio in the Dolomites</A>
        </DL><p>
        <DT><A HREF="https://overreacted.io/a-complete-guide-to-useeffect/" ADD_DATE="1658000000" TAGS="react,frontend">A complete guide to useEffect</A>
    </DL><p>
</DL><p>`

export const SAMPLE_INSTAGRAM = JSON.stringify(
  {
    saved_saved_media: [
      {
        title: 'chiang_mai_eats',
        string_map_data: {
          'Saved on': {
            href: 'https://www.instagram.com/reel/CxNightMarket/',
            timestamp: 1699900000,
          },
        },
      },
      {
        title: 'brutalist.interiors',
        string_map_data: {
          'Saved on': {
            href: 'https://www.instagram.com/p/CxWarmConcrete/',
            timestamp: 1698700000,
          },
        },
      },
      {
        title: 'slow.mornings',
        string_map_data: {
          'Saved on': {
            href: 'https://www.instagram.com/reel/CxFocacciaRise/',
            timestamp: 1697600000,
          },
        },
      },
    ],
  },
  null,
  2,
)

export const SAMPLE_TIKTOK = JSON.stringify(
  {
    Activity: {
      'Favorite Videos': {
        FavoriteVideoList: [
          { Date: '2023-09-01 18:20:00', Link: 'https://www.tiktokv.com/share/video/7261112223334445556/' },
          { Date: '2023-10-14 21:05:00', Link: 'https://www.tiktokv.com/share/video/7278889990001112223/' },
        ],
      },
      'Like List': {
        ItemFavoriteList: [
          { Date: '2023-11-02 08:40:00', Link: 'https://www.tiktokv.com/share/video/7290001112223334445/' },
        ],
      },
    },
  },
  null,
  2,
)

export const SAMPLES: Record<ImportSource, string> = {
  browser: SAMPLE_BROWSER,
  instagram: SAMPLE_INSTAGRAM,
  tiktok: SAMPLE_TIKTOK,
}

export const SAMPLE_FILENAMES: Record<ImportSource, string> = {
  browser: 'bookmarks.html',
  instagram: 'saved_posts.json',
  tiktok: 'user_data.json',
}
