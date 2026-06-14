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
import { useMemo, useState } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { QUOTA_TYPE_VALUES } from './constants'
import { usePricingData } from './hooks/use-pricing-data'
import {
  getDynamicDisplayGroupRatio,
  getDynamicPricingSummary,
} from './lib/dynamic-price'
import { stripTrailingZeros } from './lib/price'
import type { PricingModel } from './types'

type PlatformGroup = {
  id: string
  name: string
  badge: string
  description: string
  models: PricingModel[]
  knownOrder: number
}

type PriceCells = {
  input: string
  output: string
  cacheCreate: string
  cacheRead: string
  officialInput: string
  officialOutput: string
}

const KNOWN_PLATFORM_ORDER = ['anthropic', 'openai', 'google', 'antigravity']

function cleanPrice(value: string | null | undefined): string {
  if (!value || value === '-' || value.includes('NaN')) return '—'
  return stripTrailingZeros(value)
}

function hasNumber(value: number | null | undefined): boolean {
  return value !== undefined && value !== null && Number.isFinite(Number(value))
}

function getMinGroupRatio(model: PricingModel): number {
  const groups = Array.isArray(model.enable_groups) ? model.enable_groups : []
  const ratios = model.group_ratio || {}
  if (groups.length === 0) return 1

  let minRatio = Number.POSITIVE_INFINITY
  for (const group of groups) {
    const ratio = ratios[group]
    if (ratio !== undefined && ratio < minRatio) {
      minRatio = ratio
    }
  }

  return minRatio === Number.POSITIVE_INFINITY ? 1 : minRatio
}

function formatMoney(amountUSD: number, multiplier = 1): string {
  return cleanPrice(
    formatBillingCurrencyFromUSD(amountUSD * multiplier, {
      digitsLarge: 4,
      digitsSmall: 6,
      abbreviate: false,
    })
  )
}

function formatMultiplier(priceRate: number, usdExchangeRate: number): string {
  const ratio = Math.max(priceRate / Math.max(usdExchangeRate, 0.001), 0.001)
  const digits = ratio < 0.1 ? 3 : ratio < 1 ? 2 : 1
  return `${Number(ratio.toFixed(digits)).toString()}x`
}

function inferPlatformId(model: PricingModel): string {
  const source = `${model.vendor_name || ''} ${model.model_name}`.toLowerCase()
  if (source.includes('antigravity')) return 'antigravity'
  if (source.includes('anthropic') || source.includes('claude')) {
    return 'anthropic'
  }
  if (source.includes('google') || source.includes('gemini')) return 'google'
  if (
    source.includes('openai') ||
    source.includes('gpt') ||
    source.includes('o1') ||
    source.includes('o3') ||
    source.includes('o4')
  ) {
    return 'openai'
  }
  return model.vendor_name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'other'
}

function platformName(id: string, fallback: string | undefined): string {
  if (id === 'anthropic') return 'Claude API - Standard'
  if (id === 'openai') return 'OpenAI API - Standard'
  if (id === 'google') return 'Gemini API - Standard'
  if (id === 'antigravity') return 'Antigravity - Dedicated Channel'
  return fallback || 'Other Models'
}

function platformBadge(id: string, fallback: string | undefined): string {
  if (id === 'anthropic') return 'ANTHROPIC'
  if (id === 'openai') return 'OPENAI'
  if (id === 'google') return 'GEMINI'
  if (id === 'antigravity') return 'ANTIGRAVITY'
  return (fallback || 'OTHER').toUpperCase()
}

function platformDescription(
  id: string,
  fallback: string | undefined,
  t: (key: string) => string
): string {
  if (fallback) return fallback
  if (id === 'anthropic') {
    return t(
      'Works with Claude Code, Anthropic SDK, and compatible third-party clients.'
    )
  }
  if (id === 'openai') {
    return t(
      'Works with Codex CLI and OpenAI SDK, including compatible chat and response interfaces.'
    )
  }
  if (id === 'google') {
    return t(
      'Works with Gemini CLI and Google GenAI SDK, with long-context and multimodal billing.'
    )
  }
  if (id === 'antigravity') {
    return t(
      'Dedicated access for Antigravity IDE, billed by the model routed through the channel.'
    )
  }
  return t('Models in this platform use the current site pricing rules.')
}

function buildPriceCells(
  model: PricingModel,
  priceRate: number,
  usdExchangeRate: number
): PriceCells {
  const discountMultiplier = priceRate / Math.max(usdExchangeRate, 0.001)
  const dynamicDiscount = getDynamicPricingSummary(model, {
    tokenUnit: 'M',
    showRechargePrice: true,
    priceRate,
    usdExchangeRate,
    groupRatioMultiplier: getDynamicDisplayGroupRatio(model),
  })
  const dynamicOfficial = getDynamicPricingSummary(model, {
    tokenUnit: 'M',
    showRechargePrice: false,
    priceRate,
    usdExchangeRate,
    groupRatioMultiplier: getDynamicDisplayGroupRatio(model),
  })

  if (dynamicDiscount) {
    const find = (
      summary: NonNullable<typeof dynamicDiscount>,
      field: string
    ) => summary.entries.find((entry) => entry.field === field)?.formatted

    return {
      input: cleanPrice(find(dynamicDiscount, 'inputPrice')),
      output: cleanPrice(find(dynamicDiscount, 'outputPrice')),
      cacheCreate: cleanPrice(
        find(dynamicDiscount, 'cacheCreatePrice') ||
          find(dynamicDiscount, 'cacheCreate1hPrice')
      ),
      cacheRead: cleanPrice(find(dynamicDiscount, 'cacheReadPrice')),
      officialInput: dynamicOfficial
        ? cleanPrice(find(dynamicOfficial, 'inputPrice'))
        : '—',
      officialOutput: dynamicOfficial
        ? cleanPrice(find(dynamicOfficial, 'outputPrice'))
        : '—',
    }
  }

  const groupRatio = getMinGroupRatio(model)

  if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    const official = (model.model_price || 0) * groupRatio
    const discounted = official * discountMultiplier
    const requestPrice = formatMoney(discounted)
    const officialPrice = formatMoney(official)
    return {
      input: requestPrice,
      output: '—',
      cacheCreate: '—',
      cacheRead: '—',
      officialInput: officialPrice,
      officialOutput: '—',
    }
  }

  const base = model.model_ratio * 2 * groupRatio
  const officialInput = base
  const officialOutput = base * model.completion_ratio

  return {
    input: formatMoney(officialInput, discountMultiplier),
    output: formatMoney(officialOutput, discountMultiplier),
    cacheCreate: hasNumber(model.create_cache_ratio)
      ? formatMoney(base * Number(model.create_cache_ratio), discountMultiplier)
      : '—',
    cacheRead: hasNumber(model.cache_ratio)
      ? formatMoney(base * Number(model.cache_ratio), discountMultiplier)
      : '—',
    officialInput: formatMoney(officialInput),
    officialOutput: formatMoney(officialOutput),
  }
}

function PricingSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <Skeleton className='h-10 w-40' />
        <Skeleton className='h-9 w-36' />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className='gap-0 py-0'>
          <div className='space-y-3 p-5'>
            <Skeleton className='h-5 w-56' />
            <Skeleton className='h-3 w-2/3' />
          </div>
          <div className='space-y-2 border-t p-4'>
            {Array.from({ length: 5 }).map((__, rowIndex) => (
              <Skeleton key={rowIndex} className='h-8 w-full' />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function PriceValue({ value }: { value: string }) {
  return <span className='tr-price-value'>{value}</span>
}

function PlatformSection({
  group,
  priceRate,
  usdExchangeRate,
}: {
  group: PlatformGroup
  priceRate: number
  usdExchangeRate: number
}) {
  const { t } = useTranslation()
  const discount = formatMultiplier(priceRate, usdExchangeRate)

  return (
    <Card className='tr-platform-section gap-0 py-0'>
      <div className='tr-platform-head'>
        <h2>{group.name}</h2>
        <Badge variant='outline' className='gap-1'>
          <span aria-hidden='true'>☀</span>
          {group.badge}
        </Badge>
        <Badge variant='outline' className='font-mono'>
          {t('Discount multiplier')} {discount}
        </Badge>
        <span className='tr-platform-count'>
          {t('{{count}} models', { count: group.models.length })}
        </span>
      </div>
      <p className='tr-platform-desc'>{group.description}</p>

      <div className='tr-pricing-table-wrap'>
        <table className='tr-pricing-table'>
          <thead>
            <tr>
              <th>{t('Model')}</th>
              <th>{t('Input price (1M tokens)')}</th>
              <th>{t('Output price (1M tokens)')}</th>
              <th>{t('Cache price (1M tokens)')}</th>
              <th>{t('Official price (1M tokens)')}</th>
              <th>{t('Discount')}</th>
            </tr>
          </thead>
          <tbody>
            {group.models.map((model) => {
              const cells = buildPriceCells(model, priceRate, usdExchangeRate)
              return (
                <tr key={`${group.id}-${model.model_name}`}>
                  <td className='font-mono font-medium'>{model.model_name}</td>
                  <td>
                    <PriceValue value={cells.input} />
                  </td>
                  <td>
                    <PriceValue value={cells.output} />
                  </td>
                  <td>
                    <div className='tr-cache-line'>
                      {cells.cacheCreate !== '—' && (
                        <>
                          <span>{t('Cache write:')}</span> {cells.cacheCreate}
                          <br />
                        </>
                      )}
                      <span>{t('Cache read:')}</span> {cells.cacheRead}
                    </div>
                  </td>
                  <td>
                    <div className='tr-official-line'>
                      <span>{t('Input:')}</span> {cells.officialInput}{' '}
                      <span>{t('Output:')}</span> {cells.officialOutput}
                    </div>
                  </td>
                  <td>
                    <Badge variant='outline' className='font-mono'>
                      {discount}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function Pricing() {
  const { t } = useTranslation()
  const { models, vendors, isLoading, priceRate, usdExchangeRate } =
    usePricingData()
  const [hiddenPlatforms, setHiddenPlatforms] = useState<Set<string>>(
    () => new Set()
  )

  const groups = useMemo<PlatformGroup[]>(() => {
    const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]))
    const groupMap = new Map<string, PlatformGroup>()

    for (const model of models || []) {
      const vendor = model.vendor_id
        ? vendorMap.get(model.vendor_id)
        : undefined
      const id = inferPlatformId(model)
      const fallbackName = model.vendor_name || vendor?.name
      const fallbackDescription =
        model.vendor_description || vendor?.description
      const existing = groupMap.get(id)

      if (existing) {
        existing.models.push(model)
        continue
      }

      groupMap.set(id, {
        id,
        name: platformName(id, fallbackName),
        badge: platformBadge(id, fallbackName),
        description: platformDescription(id, fallbackDescription, t),
        models: [model],
        knownOrder: KNOWN_PLATFORM_ORDER.indexOf(id),
      })
    }

    return Array.from(groupMap.values()).sort((a, b) => {
      const aOrder =
        a.knownOrder === -1 ? Number.POSITIVE_INFINITY : a.knownOrder
      const bOrder =
        b.knownOrder === -1 ? Number.POSITIVE_INFINITY : b.knownOrder
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.name.localeCompare(b.name)
    })
  }, [models, t, vendors])

  const visibleGroups = groups.filter((group) => !hiddenPlatforms.has(group.id))

  const togglePlatform = (id: string) => {
    setHiddenPlatforms((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <PublicLayout
      showMainContainer={false}
      navLinks={[]}
      showNotifications={false}
      showThemeSwitch={false}
      headerProps={{ showLanguageSwitcher: false }}
    >
      <div className='tr-pricing-kami'>
        <PageTransition className='tr-pricing-main'>
          {isLoading ? (
            <PricingSkeleton />
          ) : (
            <>
              <div className='tr-pricing-head'>
                <h1>{t('Model Pricing')}</h1>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant='outline' />}>
                    <SlidersHorizontal className='size-4' />
                    {t('Platforms')}
                    <Badge variant='outline' className='font-mono'>
                      {visibleGroups.length}/{groups.length}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='min-w-56'>
                    {groups.map((group) => {
                      const visible = !hiddenPlatforms.has(group.id)
                      return (
                        <DropdownMenuItem
                          key={group.id}
                          onClick={(event) => {
                            event.preventDefault()
                            togglePlatform(group.id)
                          }}
                        >
                          <span className='flex size-4 items-center justify-center'>
                            {visible && <Check className='size-3.5' />}
                          </span>
                          <span>{group.badge}</span>
                          <span className='text-muted-foreground ml-auto text-xs'>
                            {group.models.length}
                          </span>
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {visibleGroups.length > 0 ? (
                <div className='space-y-0'>
                  {visibleGroups.map((group) => (
                    <PlatformSection
                      key={group.id}
                      group={group}
                      priceRate={priceRate}
                      usdExchangeRate={usdExchangeRate}
                    />
                  ))}
                </div>
              ) : (
                <Card className='tr-pricing-empty'>
                  <div>
                    <h2>{t('No platform selected')}</h2>
                    <p>
                      {t(
                        'Select at least one platform from the filter menu to view model pricing.'
                      )}
                    </p>
                    <Button
                      variant='outline'
                      className='mt-4'
                      onClick={() => setHiddenPlatforms(new Set())}
                    >
                      {t('Show all platforms')}
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </PageTransition>
      </div>
    </PublicLayout>
  )
}
