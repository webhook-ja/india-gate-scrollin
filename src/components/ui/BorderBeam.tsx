import type { CSSProperties, HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../../lib/utils'

type BorderBeamProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    duration?: number
    borderRadius?: number
  }
>

export function BorderBeam({
  children,
  className,
  duration = 7,
  borderRadius = 999,
  style,
  ...props
}: BorderBeamProps) {
  return (
    <div
      className={cn('border-beam', className)}
      style={
        {
          '--beam-duration': `${duration}s`,
          '--beam-radius': `${borderRadius}px`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}
