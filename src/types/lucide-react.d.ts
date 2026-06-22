declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react'
  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
  }
  export type LucideIcon = FC<LucideProps>

  export const Home: LucideIcon
  export const Search: LucideIcon
  export const Bell: LucideIcon
  export const User: LucideIcon
  export const PenSquare: LucideIcon
  export const Zap: LucideIcon
  export const Bot: LucideIcon
  export const Heart: LucideIcon
  export const MessageCircle: LucideIcon
  export const Repeat2: LucideIcon
  export const MoreHorizontal: LucideIcon
  export const ArrowLeft: LucideIcon
  export const Check: LucideIcon
  export const X: LucideIcon
  export const ExternalLink: LucideIcon
  export const Calendar: LucideIcon
  export const ImagePlus: LucideIcon
  export const Loader2: LucideIcon
  export const Share2: LucideIcon
  export const Sun: LucideIcon
  export const Moon: LucideIcon
  export const Edit2: LucideIcon
  export const Globe: LucideIcon
  export const Link2: LucideIcon
}
