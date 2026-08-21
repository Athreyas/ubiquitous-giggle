import { Icon } from '@iconify/react'

/** Single icon family: Lucide via Iconify (MARK-14). */
const size = { width: 18, height: 18 }

type Props = { className?: string }

export const IconSparkle = (p: Props) => <Icon icon="lucide:sparkles" {...size} {...p} />
export const IconLibrary = (p: Props) => <Icon icon="lucide:library" {...size} {...p} />
export const IconGear = (p: Props) => <Icon icon="lucide:settings" {...size} {...p} />
export const IconSearch = (p: Props) => <Icon icon="lucide:search" {...size} {...p} />
export const IconClose = (p: Props) => <Icon icon="lucide:x" {...size} {...p} />
export const IconExternal = (p: Props) => <Icon icon="lucide:external-link" {...size} {...p} />
export const IconShuffle = (p: Props) => <Icon icon="lucide:shuffle" {...size} {...p} />
export const IconArrow = (p: Props) => <Icon icon="lucide:arrow-right" {...size} {...p} />
export const IconBook = (p: Props) => <Icon icon="lucide:book-open" {...size} {...p} />
export const IconSky = (p: Props) => <Icon icon="lucide:orbit" {...size} {...p} />
export const IconPlus = (p: Props) => <Icon icon="lucide:plus" {...size} {...p} />

export const GlyphPlay = (p: Props) => <Icon icon="lucide:play" {...size} {...p} />
export const GlyphCamera = (p: Props) => <Icon icon="lucide:camera" {...size} {...p} />
export const GlyphNote = (p: Props) => <Icon icon="lucide:sticky-note" {...size} {...p} />
export const GlyphLink = (p: Props) => <Icon icon="lucide:link-2" {...size} {...p} />
export const GlyphDoc = (p: Props) => <Icon icon="lucide:file-text" {...size} {...p} />
export const GlyphMusic = (p: Props) => <Icon icon="lucide:music-2" {...size} {...p} />
