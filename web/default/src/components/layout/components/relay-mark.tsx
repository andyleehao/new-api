/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function RelayMark({
  className,
  strokeWidth = 1.8,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className={cn('size-5', className)}
      {...props}
    >
      <rect
        x='9.4'
        y='9.4'
        width='5.2'
        height='5.2'
        rx='1.5'
        transform='rotate(45 12 12)'
      />
      <path d='M5.9 12h2.3m7.6 0h2.3' />
      <circle cx='4.4' cy='12' r='1.5' />
      <circle cx='19.6' cy='12' r='1.5' />
      <circle cx='12' cy='12' r='.9' fill='currentColor' stroke='none' />
    </svg>
  )
}
