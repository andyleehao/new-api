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
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { MOTION_TRANSITION, MOTION_VARIANTS } from '@/lib/motion'
import { useLayout } from '@/context/layout-provider'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { SidebarViewHeader } from './sidebar-view-header'
import { SystemBrand } from './system-brand'

/**
 * Application sidebar.
 *
 * Adopts the Vercel / Cloudflare "drill-in" pattern: the URL drives
 * which sidebar *view* is rendered. Clicking a top-level entry like
 * `System Settings` swaps the sidebar to a contextual workspace —
 * with a `← Back to Dashboard` affordance — instead of stacking the
 * sub-navigation inside the root tree.
 *
 * Architecture:
 *   - View resolution + filtering: {@link useSidebarView}
 *   - View registry: `layout/lib/sidebar-view-registry.ts`
 *   - Per-view header: {@link SidebarViewHeader}
 *
 * Adding a new nested view only requires registering a {@link SidebarView}
 * in the registry; this component requires no changes.
 */
export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { key, view, navGroups } = useSidebarView()
  const shouldReduce = useReducedMotion()

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader className='border-sidebar-border border-b px-3 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0'>
        <SystemBrand variant='sidebar' />
      </SidebarHeader>
      {view && <SidebarViewHeader view={view} />}

      <SidebarContent className='py-2'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={key}
            initial={
              shouldReduce ? false : MOTION_VARIANTS.sidebarSlide.initial
            }
            animate={MOTION_VARIANTS.sidebarSlide.animate}
            exit={shouldReduce ? undefined : MOTION_VARIANTS.sidebarSlide.exit}
            transition={MOTION_TRANSITION.fast}
            className='flex flex-col'
          >
            {navGroups.map((props) => (
              <NavGroup key={props.id || props.title} {...props} />
            ))}
          </motion.div>
        </AnimatePresence>
      </SidebarContent>

      <TokensRelaySidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}

function TokensRelaySidebarFooter() {
  const { t } = useTranslation()
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarFooter className='border-sidebar-border border-t p-3'>
      <Button
        type='button'
        variant='ghost'
        className='text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-9 justify-start gap-2 rounded-lg px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
        onClick={toggleSidebar}
      >
        {isCollapsed ? (
          <ChevronsRight className='size-4' />
        ) : (
          <ChevronsLeft className='size-4' />
        )}
        <span className='group-data-[collapsible=icon]:hidden'>
          {t('Collapse')}
        </span>
      </Button>
    </SidebarFooter>
  )
}
