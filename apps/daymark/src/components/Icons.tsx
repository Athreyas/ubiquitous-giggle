/**
 * Iconify Solar bold-duotone icons — cinematic, duotone depth that fits
 * the dark Daymark chrome. Sourced from iconify.design (open icon sets).
 */
import { Icon } from '@iconify/react'

type IconProps = {
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
  'aria-hidden'?: boolean | 'true' | 'false'
}

const wrap =
  (icon: string) =>
  ({ className, style, width = '1em', height = '1em', ...rest }: IconProps) => (
    <Icon
      icon={icon}
      className={className}
      style={style}
      width={width}
      height={height}
      {...rest}
    />
  )

export const IconSparkle = wrap('solar:stars-bold-duotone')
export const IconLibrary = wrap('solar:library-bold-duotone')
export const IconPlus = wrap('solar:add-circle-bold-duotone')
export const IconImport = wrap('solar:download-minimalistic-bold-duotone')
export const IconGear = wrap('solar:settings-bold-duotone')
export const IconSearch = wrap('solar:magnifer-bold-duotone')
export const IconClose = wrap('solar:close-circle-bold-duotone')
export const IconExternal = wrap('solar:square-top-up-bold-duotone')
export const IconShuffle = wrap('solar:shuffle-bold-duotone')
export const IconFolder = wrap('solar:folder-with-files-bold-duotone')
export const IconArrow = wrap('solar:arrow-right-bold-duotone')
export const IconUpload = wrap('solar:upload-minimalistic-bold-duotone')
export const IconCheck = wrap('solar:check-circle-bold-duotone')
export const IconGlobe = wrap('solar:global-bold-duotone')
export const IconLink = wrap('solar:link-round-bold-duotone')
export const IconType = wrap('solar:text-bold-duotone')
export const IconBook = wrap('solar:book-bold-duotone')
export const IconChevron = wrap('solar:alt-arrow-down-bold-duotone')

export const GlyphPlay = wrap('solar:play-bold-duotone')
export const GlyphCamera = wrap('solar:camera-bold-duotone')
export const GlyphMusic = wrap('solar:music-note-bold-duotone')
export const GlyphDoc = wrap('solar:document-text-bold-duotone')
export const GlyphNote = wrap('solar:notes-bold-duotone')
export const GlyphImage = wrap('solar:gallery-bold-duotone')
