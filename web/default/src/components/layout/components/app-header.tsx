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
import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, Tags } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/hooks/use-notifications'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { defaultTopNavLinks } from '../config/top-nav.config'
import { type TopNavLink } from '../types'
import { Header } from './header'
import { TopNav } from './top-nav'

/**
 * General application Header component
 * Integrates navigation bar, search, configuration and profile functions
 *
 * @example
 * // Basic usage
 * <AppHeader />
 *
 * @example
 * // Custom navigation links
 * <AppHeader navLinks={customLinks} />
 *
 * @example
 * // Hide navigation bar and search box
 * <AppHeader showTopNav={false} showSearch={false} />
 *
 * @example
 * // Fully customize left and right content
 * <AppHeader
 *   leftContent={<CustomLeft />}
 *   rightContent={<CustomRight />}
 * />
 */
type AppHeaderProps = {
  /**
   * Custom navigation links, uses default global navigation or dynamically generated from backend if not provided
   */
  navLinks?: TopNavLink[]
  /**
   * Whether to show top navigation bar
   * @default true
   */
  showTopNav?: boolean
  /**
   * Left content, overrides TopNav if provided
   */
  leftContent?: React.ReactNode
  /**
   * Whether to show search box
   * @default true
   */
  showSearch?: boolean
  /**
   * Custom right content, overrides default right content if provided
   */
  rightContent?: React.ReactNode
  /**
   * Whether to show notification button
   * @default true
   */
  showNotifications?: boolean
  /**
   * Whether to show config drawer
   * @default true
   */
  showConfigDrawer?: boolean
  /**
   * Whether to show profile dropdown
   * @default true
   */
  showProfileDropdown?: boolean
}

export function AppHeader({
  navLinks = defaultTopNavLinks,
  showTopNav = true,
  leftContent,
  showSearch = true,
  rightContent,
  showNotifications = true,
  showConfigDrawer = false,
  showProfileDropdown = true,
}: AppHeaderProps) {
  const { t } = useTranslation()
  // Prioritize dynamically generated links from backend
  const dynamicLinks = useTopNavLinks()
  const links = dynamicLinks.length > 0 ? dynamicLinks : navLinks
  const location = useRouterState({ select: (state) => state.location })
  const pageMeta = getTokensRelayPageMeta(location.href, t)

  // Notifications hook
  const notifications = useNotifications()

  return (
    <>
      <Header>
        {leftContent ? (
          <div className='ms-2 flex items-center'>{leftContent}</div>
        ) : pageMeta ? (
          <div className='ms-1 min-w-0 flex-1'>
            <h1 className='truncate text-base leading-5 font-semibold tracking-tight'>
              {pageMeta.title}
            </h1>
            {pageMeta.subtitle ? (
              <p className='text-muted-foreground hidden truncate text-xs leading-4 sm:block'>
                {pageMeta.subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {rightContent ?? (
          <div className='ms-auto flex shrink-0 items-center gap-1 sm:gap-2'>
            {showTopNav && (
              <div className='me-1 hidden lg:block'>
                <TopNav links={links} />
              </div>
            )}
            <Link
              to='/pricing'
              className='text-muted-foreground hover:bg-accent hover:text-accent-foreground hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors lg:inline-flex'
            >
              <Tags className='size-4' />
              {t('Pricing')}
            </Link>
            <Link
              to='/about'
              className='text-muted-foreground hover:bg-accent hover:text-accent-foreground hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors xl:inline-flex'
            >
              <BookOpen className='size-4' />
              {t('Docs')}
            </Link>
            {showSearch && <Search />}
            {showNotifications && (
              <NotificationPopover
                open={notifications.popoverOpen}
                onOpenChange={notifications.setPopoverOpen}
                unreadCount={notifications.unreadCount}
                activeTab={notifications.activeTab}
                onTabChange={notifications.setActiveTab}
                notice={notifications.notice}
                announcements={notifications.announcements}
                loading={notifications.loading}
              />
            )}
            <LanguageSwitcher />
            {showConfigDrawer && <ConfigDrawer />}
            {showProfileDropdown && <ProfileDropdown />}
          </div>
        )}
      </Header>
    </>
  )
}

type PageMeta = {
  title: string
  subtitle?: string
}

function getTokensRelayPageMeta(
  href: string,
  t: (key: string) => string
): PageMeta | null {
  const [pathname, query = ''] = href.split('?')
  const section = new URLSearchParams(query).get('section') || 'purchase'

  if (pathname.startsWith('/keys')) {
    return {
      title: t('API Keys'),
      subtitle: t('Manage your API keys and access tokens'),
    }
  }
  if (pathname.startsWith('/usage-logs')) {
    return {
      title: t('Usage Logs'),
      subtitle: t('View and analyze your API usage history'),
    }
  }
  if (pathname.startsWith('/wallet')) {
    if (section === 'orders') {
      return {
        title: t('Order History'),
        subtitle: t('Top-up and subscription order records'),
      }
    }
    if (section === 'redeem') {
      return {
        title: t('Redemption Code'),
        subtitle: t('Redeem a code to add balance or benefits'),
      }
    }
    if (section === 'affiliate') {
      return {
        title: t('Referral Rewards'),
        subtitle: t('Invite users and transfer rewards to your balance'),
      }
    }
    if (section === 'subscriptions') {
      return {
        title: t('My Subscriptions'),
        subtitle: t('View your subscription plans and usage'),
      }
    }
    return {
      title: t('Recharge / Subscription'),
      subtitle: t('Add funds and manage subscription plans'),
    }
  }
  if (pathname.startsWith('/profile')) {
    return {
      title: t('Profile Settings'),
      subtitle: t('Manage your account information and settings'),
    }
  }
  if (pathname.startsWith('/users')) {
    return {
      title: t('User Management'),
      subtitle: t('Manage platform users, balances, and permissions'),
    }
  }
  if (pathname.startsWith('/channels')) {
    return {
      title: t('Channel Management'),
      subtitle: t('Manage upstream channels and load policies'),
    }
  }
  if (pathname.startsWith('/dashboard/users')) {
    return {
      title: t('Dashboard'),
      subtitle: t('Platform operations overview'),
    }
  }
  if (pathname.startsWith('/dashboard')) {
    return {
      title: t('Dashboard'),
      subtitle: t('Welcome back! Here is your account overview.'),
    }
  }

  return null
}
