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
import {
  Activity,
  CreditCard,
  FileText,
  Key,
  LayoutDashboard,
  Radio,
  User,
  Users,
  Wallet,
  Gift,
  HandCoins,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type SidebarData } from '@/components/layout/types'

/**
 * Root navigation groups for the application sidebar.
 *
 * These are shown when the URL does not match any nested sidebar view
 * registered in `layout/lib/sidebar-view-registry.ts`.
 */
export function useSidebarData(): SidebarData {
  const { t } = useTranslation()

  return {
    navGroups: [
      {
        id: 'user',
        title: t('User Console'),
        items: [
          {
            title: t('Dashboard'),
            url: '/dashboard/overview',
            icon: LayoutDashboard,
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: Key,
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: FileText,
          },
          {
            title: t('My Subscriptions'),
            url: '/wallet?section=subscriptions',
            icon: CreditCard,
          },
          {
            title: t('Recharge / Subscription'),
            url: '/wallet?section=purchase',
            icon: Wallet,
          },
          {
            title: t('Order History'),
            url: '/wallet?section=orders',
            icon: FileText,
          },
          {
            title: t('Redemption Code'),
            url: '/wallet?section=redeem',
            icon: Gift,
          },
          {
            title: t('Referral Rewards'),
            url: '/wallet?section=affiliate',
            icon: HandCoins,
          },
          {
            title: t('Profile Settings'),
            url: '/profile',
            icon: User,
          },
        ],
      },
      {
        id: 'admin',
        title: t('Admin'),
        items: [
          {
            title: t('Dashboard'),
            url: '/dashboard/users',
            icon: Activity,
          },
          {
            title: t('User Management'),
            url: '/users',
            icon: Users,
          },
          {
            title: t('Channel Management'),
            url: '/channels',
            icon: Radio,
          },
        ],
      },
    ],
  }
}
