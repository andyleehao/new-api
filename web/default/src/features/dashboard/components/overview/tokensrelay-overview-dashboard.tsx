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
import { useMemo, useState, type ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Coins,
  CreditCard,
  Database,
  Gauge,
  KeyRound,
  Layers,
  RadioTower,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getUserModels } from '@/lib/api'
import {
  formatCompactNumber,
  formatNumber,
  formatQuota,
  formatTokens,
} from '@/lib/format'
import { computeTimeRange, formatChartTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getApiKeys } from '@/features/keys/api'
import { getUserQuotaDates } from '../../api'
import type { QuotaDataItem } from '../../types'

type DashboardRange = '24h' | '7d' | '30d'
type TileTone = 'green' | 'indigo' | 'purple' | 'amber' | 'red' | 'teal'

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: ComponentType<{ className?: string }>
  tone: TileTone
  loading?: boolean
}

interface PlatformStat {
  label: string
  cost: number
  requests: number
  tokens: number
}

interface ModelStat {
  label: string
  requests: number
  tokens: number
  cost: number
  colorClass: string
}

interface TrendPoint {
  label: string
  value: number
}

const RANGE_CONFIG: Record<
  DashboardRange,
  { labelKey: string; days: number; defaultTime: 'hour' | 'day' }
> = {
  '24h': { labelKey: '24 Hours', days: 1, defaultTime: 'hour' },
  '7d': { labelKey: '7 Days', days: 7, defaultTime: 'day' },
  '30d': { labelKey: '30 Days', days: 30, defaultTime: 'day' },
}

const TILE_TONE_CLASS: Record<TileTone, string> = {
  green: 'bg-accent text-primary',
  indigo: 'bg-accent text-primary',
  purple: 'bg-accent text-primary',
  amber: 'bg-accent text-primary',
  red: 'bg-accent text-primary',
  teal: 'bg-accent text-primary',
}

const MODEL_COLOR_CLASSES = [
  'text-primary',
  'text-chart-3',
  'text-chart-2',
  'text-chart-4',
  'text-muted-foreground',
] as const

function quotaValue(item: QuotaDataItem): number {
  return Math.max(0, Number(item.quota) || 0)
}

function requestValue(item: QuotaDataItem): number {
  return Math.max(0, Number(item.count) || 0)
}

function tokenValue(item: QuotaDataItem): number {
  return Math.max(0, Number(item.token_used) || 0)
}

function getProviderName(modelName?: string): string {
  const name = (modelName ?? '').toLowerCase()
  if (!name) return 'Other'
  if (name.includes('claude') || name.includes('anthropic')) return 'Claude'
  if (
    name.includes('gpt') ||
    name.includes('openai') ||
    name.startsWith('o1') ||
    name.startsWith('o3') ||
    name.startsWith('o4')
  ) {
    return 'OpenAI'
  }
  if (name.includes('gemini') || name.includes('google')) return 'Gemini'
  if (name.includes('deepseek')) return 'DeepSeek'
  if (name.includes('grok') || name.includes('xai')) return 'Grok'
  if (name.includes('llama') || name.includes('meta')) return 'Meta'
  return 'Other'
}

function aggregatePlatforms(data: QuotaDataItem[]): PlatformStat[] {
  const map = new Map<string, PlatformStat>()

  for (const item of data) {
    const label = getProviderName(item.model_name)
    const current = map.get(label) ?? {
      label,
      cost: 0,
      requests: 0,
      tokens: 0,
    }
    current.cost += quotaValue(item)
    current.requests += requestValue(item)
    current.tokens += tokenValue(item)
    map.set(label, current)
  }

  return [...map.values()]
    .sort((a, b) => b.cost - a.cost || b.requests - a.requests)
    .slice(0, 4)
}

function aggregateModels(data: QuotaDataItem[]): ModelStat[] {
  const map = new Map<string, Omit<ModelStat, 'colorClass'>>()

  for (const item of data) {
    const label = item.model_name || 'Unknown model'
    const current = map.get(label) ?? {
      label,
      requests: 0,
      tokens: 0,
      cost: 0,
    }
    current.requests += requestValue(item)
    current.tokens += tokenValue(item)
    current.cost += quotaValue(item)
    map.set(label, current)
  }

  return [...map.values()]
    .sort((a, b) => b.cost - a.cost || b.requests - a.requests)
    .slice(0, MODEL_COLOR_CLASSES.length)
    .map((item, index) => ({
      ...item,
      colorClass: MODEL_COLOR_CLASSES[index] ?? 'text-muted-foreground',
    }))
}

function buildTrend(data: QuotaDataItem[], defaultTime: 'hour' | 'day') {
  const map = new Map<string, number>()

  for (const item of data) {
    const timestamp = Number(item.created_at) || 0
    const label = timestamp ? formatChartTime(timestamp, defaultTime) : '-'
    map.set(label, (map.get(label) ?? 0) + tokenValue(item))
  }

  return [...map.entries()].map(([label, value]) => ({ label, value }))
}

function MetricCard(props: MetricCardProps) {
  const Icon = props.icon

  return (
    <Card className='min-h-28 flex-row items-center gap-3 p-4'>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          TILE_TONE_CLASS[props.tone]
        )}
        aria-hidden='true'
      >
        <Icon className='size-5' />
      </span>
      <div className='min-w-0'>
        <div className='text-muted-foreground truncate text-xs font-medium'>
          {props.title}
        </div>
        <div className='text-primary mt-1 truncate font-mono text-[1.375rem] leading-tight font-medium tabular-nums'>
          {props.loading ? '-' : props.value}
        </div>
        <div className='text-muted-foreground/75 mt-1 truncate text-xs'>
          {props.description}
        </div>
      </div>
    </Card>
  )
}

function PlatformCards(props: { items: PlatformStat[]; loading?: boolean }) {
  const { t } = useTranslation()

  return (
    <Card className='gap-0 py-0'>
      <CardHeader className='flex-row items-center justify-between gap-3 py-4'>
        <CardTitle>{t('Platform split')}</CardTitle>
        <span className='text-muted-foreground text-xs'>
          {t('{{count}} platforms', { count: props.items.length })}
        </span>
      </CardHeader>
      <CardContent className='grid gap-3 pb-4 md:grid-cols-2 xl:grid-cols-4'>
        {props.items.length > 0 ? (
          props.items.map((item) => (
            <div key={item.label} className='rounded-xl border p-4'>
              <div className='mb-2 flex items-baseline justify-between gap-3'>
                <div className='truncate text-sm font-semibold'>
                  {item.label}
                </div>
                <div className='text-chart-3 shrink-0 font-mono text-sm font-semibold'>
                  {formatQuota(item.cost)}
                </div>
              </div>
              <div className='text-muted-foreground flex justify-between gap-3 py-0.5 text-xs'>
                <span>{t('Requests')}</span>
                <span className='text-foreground font-mono'>
                  {formatNumber(item.requests)}
                </span>
              </div>
              <div className='text-muted-foreground flex justify-between gap-3 py-0.5 text-xs'>
                <span>{t('Tokens')}</span>
                <span className='text-foreground font-mono'>
                  {formatTokens(item.tokens)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className='text-muted-foreground col-span-full rounded-xl border border-dashed px-4 py-8 text-center text-sm'>
            {props.loading ? t('Loading') : t('No usage data yet')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DonutChart(props: { items: ModelStat[] }) {
  const { t } = useTranslation()
  const total = props.items.reduce((sum, item) => sum + item.requests, 0)
  const radius = 38
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className='grid gap-4 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-center'>
      <div className='mx-auto size-40'>
        <svg viewBox='0 0 100 100' className='size-full -rotate-90'>
          <circle
            cx='50'
            cy='50'
            r={radius}
            fill='none'
            stroke='currentColor'
            strokeWidth='12'
            className='text-muted'
          />
          {total > 0 &&
            props.items.map((item) => {
              const length = (item.requests / total) * circumference
              const dash = `${length} ${circumference - length}`
              const dashOffset = -offset
              offset += length

              return (
                <circle
                  key={item.label}
                  cx='50'
                  cy='50'
                  r={radius}
                  fill='none'
                  stroke='currentColor'
                  strokeDasharray={dash}
                  strokeDashoffset={dashOffset}
                  strokeLinecap='round'
                  strokeWidth='12'
                  className={item.colorClass}
                />
              )
            })}
        </svg>
      </div>
      <div className='min-w-0 overflow-x-auto'>
        <table className='w-full min-w-96 text-xs'>
          <thead>
            <tr className='text-muted-foreground border-b text-right'>
              <th className='py-2 pr-3 text-left font-medium'>{t('Model')}</th>
              <th className='px-3 font-medium'>{t('Requests')}</th>
              <th className='px-3 font-medium'>{t('Tokens')}</th>
              <th className='pl-3 font-medium'>{t('Cost')}</th>
            </tr>
          </thead>
          <tbody>
            {props.items.length > 0 ? (
              props.items.map((item) => (
                <tr key={item.label} className='border-b last:border-b-0'>
                  <td className='max-w-48 py-2 pr-3 font-medium'>
                    <span
                      className={cn(
                        'mr-2 inline-block size-2 rounded-full bg-current align-middle',
                        item.colorClass
                      )}
                      aria-hidden='true'
                    />
                    <span className='align-middle'>{item.label}</span>
                  </td>
                  <td className='px-3 text-right font-mono'>
                    {formatNumber(item.requests)}
                  </td>
                  <td className='px-3 text-right font-mono'>
                    {formatTokens(item.tokens)}
                  </td>
                  <td className='text-primary pl-3 text-right font-mono'>
                    {formatQuota(item.cost)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className='text-muted-foreground py-8 text-center'
                >
                  {t('No usage data yet')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrendChart(props: { points: TrendPoint[] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...props.points.map((point) => point.value))
  const width = 360
  const height = 180
  const gap = 8
  const barWidth =
    props.points.length > 0
      ? Math.max(
          10,
          (width - gap * (props.points.length - 1)) / props.points.length
        )
      : 0

  if (props.points.length === 0) {
    return (
      <div className='text-muted-foreground flex h-48 items-center justify-center rounded-xl border border-dashed text-sm'>
        {t('No usage data yet')}
      </div>
    )
  }

  return (
    <div className='overflow-hidden'>
      <div className='text-primary h-48 w-full'>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio='none'
          className='size-full'
          role='img'
          aria-label={t('Token usage trend')}
        >
          {props.points.map((point, index) => {
            const barHeight = Math.max(4, (point.value / max) * (height - 24))
            const x = index * (barWidth + gap)
            const y = height - barHeight

            return (
              <rect
                key={`${point.label}-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx='4'
                fill='currentColor'
                opacity={0.82}
              />
            )
          })}
        </svg>
      </div>
      <div className='text-muted-foreground mt-2 grid grid-cols-4 gap-2 text-[11px] md:grid-cols-7'>
        {props.points.slice(-7).map((point) => (
          <span key={point.label} className='truncate'>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TokensRelayOverviewDashboard() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const [selectedRange, setSelectedRange] = useState<DashboardRange>('7d')
  const rangeConfig = RANGE_CONFIG[selectedRange]
  const timeRange = useMemo(
    () => computeTimeRange(rangeConfig.days),
    [rangeConfig.days]
  )

  const quotaQuery = useQuery({
    queryKey: [
      'dashboard',
      'tokensrelay-overview',
      selectedRange,
      rangeConfig.defaultTime,
      timeRange.start_timestamp,
      timeRange.end_timestamp,
    ],
    queryFn: async () => {
      const result = await getUserQuotaDates({
        start_timestamp: timeRange.start_timestamp,
        end_timestamp: timeRange.end_timestamp,
        default_time: rangeConfig.defaultTime,
      })

      if (!result.success) return []
      return result.data ?? []
    },
    staleTime: 60 * 1000,
  })

  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'tokensrelay-overview', 'api-keys'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 100 })
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['dashboard', 'tokensrelay-overview', 'user-models'],
    queryFn: async () => {
      const result = await getUserModels()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const quotaData = useMemo(() => quotaQuery.data ?? [], [quotaQuery.data])
  const apiKeys = apiKeysQuery.data ?? []
  const activeApiKeys = apiKeys.filter((item) => item.status === 1).length
  const totalRequests = quotaData.reduce(
    (sum, item) => sum + requestValue(item),
    0
  )
  const totalTokens = quotaData.reduce((sum, item) => sum + tokenValue(item), 0)
  const totalQuota = quotaData.reduce((sum, item) => sum + quotaValue(item), 0)
  const totalMinutes = Math.max(1, rangeConfig.days * 24 * 60)
  const averageRpm = totalRequests / totalMinutes

  const platformStats = useMemo(
    () => aggregatePlatforms(quotaData),
    [quotaData]
  )
  const modelStats = useMemo(() => aggregateModels(quotaData), [quotaData])
  const trendPoints = useMemo(
    () => buildTrend(quotaData, rangeConfig.defaultTime),
    [quotaData, rangeConfig.defaultTime]
  )

  const isRefreshing =
    quotaQuery.isFetching || apiKeysQuery.isFetching || modelsQuery.isFetching
  const rangeLabel = t(rangeConfig.labelKey)

  const handleRefresh = async () => {
    await Promise.all([
      quotaQuery.refetch(),
      apiKeysQuery.refetch(),
      modelsQuery.refetch(),
    ])
    toast.success(t('Dashboard data refreshed'))
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricCard
          title={t('Balance')}
          value={formatQuota(Number(user?.quota ?? 0))}
          description={t('Available')}
          icon={CreditCard}
          tone='green'
        />
        <MetricCard
          title={t('API Keys')}
          value={formatNumber(apiKeys.length)}
          description={t('{{count}} enabled', { count: activeApiKeys })}
          icon={KeyRound}
          tone='indigo'
          loading={apiKeysQuery.isLoading}
        />
        <MetricCard
          title={t('Range requests')}
          value={formatCompactNumber(totalRequests)}
          description={rangeLabel}
          icon={Activity}
          tone='teal'
          loading={quotaQuery.isLoading}
        />
        <MetricCard
          title={t('Range usage')}
          value={formatQuota(totalQuota)}
          description={rangeLabel}
          icon={Coins}
          tone='purple'
          loading={quotaQuery.isLoading}
        />
        <MetricCard
          title={t('Range tokens')}
          value={formatTokens(totalTokens)}
          description={rangeLabel}
          icon={Layers}
          tone='amber'
          loading={quotaQuery.isLoading}
        />
        <MetricCard
          title={t('Lifetime usage')}
          value={formatQuota(Number(user?.used_quota ?? 0))}
          description={t('Total consumed quota')}
          icon={Database}
          tone='indigo'
        />
        <MetricCard
          title={t('Average RPM')}
          value={formatNumber(averageRpm)}
          description={t('Requests per minute')}
          icon={Gauge}
          tone='purple'
          loading={quotaQuery.isLoading}
        />
        <MetricCard
          title={t('Active models')}
          value={formatNumber(modelsQuery.data?.length ?? 0)}
          description={t('Available for this account')}
          icon={RadioTower}
          tone='red'
          loading={modelsQuery.isLoading}
        />
      </div>

      <PlatformCards items={platformStats} loading={quotaQuery.isLoading} />

      <Card className='flex-row flex-wrap items-end justify-between gap-3 px-4 py-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <label className='flex flex-col gap-1 text-xs font-medium'>
            <span className='text-muted-foreground'>{t('Time range')}</span>
            <NativeSelect
              className='w-38'
              value={selectedRange}
              onChange={(event) =>
                setSelectedRange(event.currentTarget.value as DashboardRange)
              }
              aria-label={t('Time range')}
            >
              {(Object.keys(RANGE_CONFIG) as DashboardRange[]).map((key) => (
                <NativeSelectOption key={key} value={key}>
                  {t(RANGE_CONFIG[key].labelKey)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <div className='flex flex-col gap-1 text-xs font-medium'>
            <span className='text-muted-foreground'>{t('Granularity')}</span>
            <div className='border-input bg-background flex h-8 items-center rounded-lg border px-3 text-sm'>
              {rangeConfig.defaultTime === 'hour' ? t('By hour') : t('By day')}
            </div>
          </div>
        </div>
        <Button
          variant='outline'
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            data-icon='inline-start'
            className={cn(isRefreshing && 'animate-spin')}
          />
          {t('Refresh')}
        </Button>
      </Card>

      <div className='grid gap-4 xl:grid-cols-2'>
        <Card className='gap-0 py-0'>
          <CardHeader className='py-4'>
            <CardTitle>{t('Model distribution')}</CardTitle>
          </CardHeader>
          <CardContent className='pb-4'>
            <DonutChart items={modelStats} />
          </CardContent>
        </Card>
        <Card className='gap-0 py-0'>
          <CardHeader className='py-4'>
            <CardTitle>{t('Token usage trend')}</CardTitle>
          </CardHeader>
          <CardContent className='pb-4'>
            <TrendChart points={trendPoints} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
