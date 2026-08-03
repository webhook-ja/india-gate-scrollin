import type { ButtonHTMLAttributes } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

type ShimmerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
}

export function ShimmerButton({
  label,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button className={cn('shimmer-button', className)} type="button" {...props}>
      <span className="shimmer-button__light" aria-hidden="true" />
      <span>{label}</span>
      <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.6} />
    </button>
  )
}
