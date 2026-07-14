'use client'

import { Icon as IconifyIcon } from '@iconify/react'

interface IconProps {
  icon: string
  className?: string
  style?: React.CSSProperties
}

export function Icon({ icon, className, style }: IconProps) {
  return <IconifyIcon icon={icon} className={className} style={style} />
}
