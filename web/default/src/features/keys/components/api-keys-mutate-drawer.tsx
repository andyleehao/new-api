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
import { useEffect, useState } from 'react'
import { useForm, type SubmitErrorHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, KeyRound, Settings2, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getUserModels, getUserGroups } from '@/lib/api'
import { getCurrencyDisplay, getCurrencyLabel } from '@/lib/currency'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/datetime-picker'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { MultiSelect } from '@/components/multi-select'
import { createApiKey, updateApiKey, getApiKey } from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import {
  getApiKeyFormSchema,
  type ApiKeyFormValues,
  getApiKeyFormDefaultValues,
  transformFormDataToPayload,
  transformApiKeyToFormDefaults,
} from '../lib'
import { type ApiKey } from '../types'
import {
  ApiKeyGroupCombobox,
  type ApiKeyGroupOption,
} from './api-key-group-combobox'
import { useApiKeys } from './api-keys-provider'

type ApiKeyMutateDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: ApiKey
}

export function ApiKeysMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: ApiKeyMutateDrawerProps) {
  const { t } = useTranslation()
  const isUpdate = !!currentRow
  const { triggerRefresh } = useApiKeys()
  const { status } = useStatus()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [expirationOpen, setExpirationOpen] = useState(false)
  const [customExpirationOpen, setCustomExpirationOpen] = useState(false)
  const defaultUseAutoGroup = status?.default_use_auto_group === true

  // Fetch models
  const { data: modelsData } = useQuery({
    queryKey: ['user-models'],
    queryFn: getUserModels,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ['user-groups'],
    queryFn: getUserGroups,
    staleTime: 5 * 60 * 1000,
  })

  const models = modelsData?.data || []
  const groupsRaw = groupsData?.data || {}
  const groups: ApiKeyGroupOption[] = Object.entries(groupsRaw).map(
    ([key, info]) => ({
      value: key,
      label: key,
      desc: info.desc || key,
      ratio: info.ratio,
    })
  )
  const backendHasAuto = groups.some((g) => g.value === 'auto')
  const schema = getApiKeyFormSchema(t)

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: getApiKeyFormDefaultValues(defaultUseAutoGroup),
  })

  // Load existing data when updating
  useEffect(() => {
    if (open && isUpdate && currentRow) {
      getApiKey(currentRow.id).then((result) => {
        if (result.success && result.data) {
          form.reset(transformApiKeyToFormDefaults(result.data))
        }
      })
    } else if (open && !isUpdate) {
      form.reset(
        getApiKeyFormDefaultValues(defaultUseAutoGroup && backendHasAuto)
      )
    }
  }, [open, isUpdate, currentRow, form, defaultUseAutoGroup, backendHasAuto])

  // Correct group after groups load: if the form value is not in available groups, fall back
  useEffect(() => {
    if (groups.length === 0) return
    const currentGroup = form.getValues('group')
    if (currentGroup && !groups.some((g) => g.value === currentGroup)) {
      const fallback =
        groups.find((g) => g.value === 'default')?.value ??
        groups[0]?.value ??
        ''
      form.setValue('group', fallback)
      if (currentGroup === 'auto') {
        form.setValue('cross_group_retry', false)
      }
    }
  }, [groups, form])

  const onSubmit = async (data: ApiKeyFormValues) => {
    setIsSubmitting(true)
    try {
      const basePayload = transformFormDataToPayload(data)

      if (isUpdate && currentRow) {
        const result = await updateApiKey({
          ...basePayload,
          id: currentRow.id,
        })
        if (result.success) {
          toast.success(t(SUCCESS_MESSAGES.API_KEY_UPDATED))
          onOpenChange(false)
          triggerRefresh()
        } else {
          toast.error(result.message || t(ERROR_MESSAGES.UPDATE_FAILED))
        }
      } else {
        // Create mode - handle batch creation
        const count = data.tokenCount || 1
        let successCount = 0

        for (let i = 0; i < count; i++) {
          const result = await createApiKey({
            ...basePayload,
            name:
              i === 0 && data.name
                ? data.name
                : `${data.name || 'default'}-${Math.random().toString(36).slice(2, 8)}`,
          })
          if (result.success) {
            successCount++
          } else {
            toast.error(result.message || t(ERROR_MESSAGES.CREATE_FAILED))
            break
          }
        }

        if (successCount > 0) {
          toast.success(
            t('Successfully created {{count}} API Key(s)', {
              count: successCount,
            })
          )
          onOpenChange(false)
          triggerRefresh()
        }
      }
    } catch (_error) {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsSubmitting(false)
    }
  }

  const onInvalid: SubmitErrorHandler<ApiKeyFormValues> = () => {
    toast.error(t('Please fix the highlighted fields before saving'))
  }

  const handleSetExpiryDays = (days: number) => {
    const now = new Date()
    now.setDate(now.getDate() + days)
    form.setValue('expired_time', now, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setExpirationOpen(false)
    setCustomExpirationOpen(false)
  }

  const handleClearExpiry = () => {
    form.setValue('expired_time', undefined, {
      shouldDirty: true,
      shouldValidate: true,
    })
    setExpirationOpen(false)
    setCustomExpirationOpen(false)
  }

  const { meta: currencyMeta } = getCurrencyDisplay()
  const currencyLabel = getCurrencyLabel()
  const tokensOnly = currencyMeta.kind === 'tokens'
  const quotaLabel = t('Quota ({{currency}})', { currency: currencyLabel })
  const quotaPlaceholder = tokensOnly
    ? t('Enter quota in tokens')
    : t('Enter quota in {{currency}}', { currency: currencyLabel })
  const selectedGroup = form.watch('group')
  const unlimitedQuota = form.watch('unlimited_quota')

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v)
    if (!v) {
      form.reset()
      setAdvancedOpen(false)
      setExpirationOpen(false)
      setCustomExpirationOpen(false)
    }
  }

  const formNode = (
    <Form {...form}>
      <form
        id='api-key-form'
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='tr-key-create-form'
      >
        {!isUpdate && (
          <div className='tr-key-create-preview' aria-hidden='true'>
            <span>API_KEY</span>
            <code>sk-********************</code>
          </div>
        )}

        <SideDrawerSection className='tr-key-create-section'>
          <SideDrawerSectionHeader
            className='tr-key-create-section-head'
            title={t('Basic Information')}
            description={t('Set API key basic information')}
            icon={<KeyRound className='size-4' />}
          />
          <div className='tr-key-create-grid'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('Enter a name')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='group'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Group')}</FormLabel>
                  <FormControl>
                    <ApiKeyGroupCombobox
                      options={groups}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('Select a group')}
                      compact
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {selectedGroup === 'auto' && (
            <FormField
              control={form.control}
              name='cross_group_retry'
              render={({ field }) => (
                <FormItem
                  className={sideDrawerSwitchItemClassName(
                    'tr-key-create-switch'
                  )}
                >
                  <div className='flex flex-col gap-0.5'>
                    <FormLabel className='text-sm'>
                      {t('Cross-group retry')}
                    </FormLabel>
                    <FormDescription className='line-clamp-2 text-xs sm:line-clamp-none'>
                      {t(
                        'When enabled, if channels in the current group fail, it will try channels in the next group in order.'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <div className='tr-key-create-grid'>
            <FormField
              control={form.control}
              name='expired_time'
              render={({ field }) => (
                <FormItem className='tr-key-expiry-field'>
                  <FormLabel>{t('Expiration Time')}</FormLabel>
                  <button
                    type='button'
                    className={cn(
                      'tr-key-expiry-trigger',
                      expirationOpen && 'is-open'
                    )}
                    aria-expanded={expirationOpen}
                    onClick={() => setExpirationOpen((value) => !value)}
                  >
                    <span>
                      {field.value
                        ? dayjs(field.value).format('YYYY-MM-DD HH:mm')
                        : t('Never expires')}
                    </span>
                    <ChevronDown
                      className={cn(
                        'size-4 transition-transform',
                        expirationOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {expirationOpen && (
                    <div className='tr-key-expiry-panel'>
                      <div className='tr-key-expiry-options'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => handleSetExpiryDays(7)}
                        >
                          {t('7 Days')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => handleSetExpiryDays(30)}
                        >
                          {t('30 Days')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => handleSetExpiryDays(90)}
                        >
                          {t('90 Days')}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          data-active={customExpirationOpen}
                          onClick={() =>
                            setCustomExpirationOpen((value) => !value)
                          }
                        >
                          {t('Custom')}
                        </Button>
                      </div>

                      {customExpirationOpen && (
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date)
                              if (date) {
                                setExpirationOpen(false)
                                setCustomExpirationOpen(false)
                              }
                            }}
                            placeholder={t('Select date')}
                            className='tr-key-expiry-custom tr-key-expiry-date-only min-w-0'
                            showTime={false}
                            showClear={false}
                            useCurrentTimeOnSelect
                          />
                        </FormControl>
                      )}

                      {field.value && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='tr-key-expiry-clear'
                          onClick={handleClearExpiry}
                        >
                          {t('Never expires')}
                        </Button>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isUpdate && (
              <FormField
                control={form.control}
                name='tokenCount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Quantity')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        min='1'
                        placeholder={t('Number of keys to create')}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 1)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Create multiple API keys at once (random suffix will be added to names)'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </SideDrawerSection>

        <SideDrawerSection className='tr-key-create-section'>
          <div className='tr-key-quota-head'>
            <SideDrawerSectionHeader
              className='tr-key-create-section-head'
              title={t('Quota Settings')}
              description={t('Set quota amount and limits')}
              icon={<WalletCards className='size-4' />}
            />
            <FormField
              control={form.control}
              name='unlimited_quota'
              render={({ field }) => (
                <FormItem className='tr-key-quota-toggle'>
                  <FormLabel className='text-sm'>
                    {t('Enable')} {t('Quota')}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={!field.value}
                      onCheckedChange={(checked) => field.onChange(!checked)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          {!unlimitedQuota && (
            <FormField
              control={form.control}
              name='remain_quota_dollars'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{quotaLabel}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='number'
                      step={tokensOnly ? 1 : 0.01}
                      placeholder={quotaPlaceholder}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {tokensOnly
                      ? t('Enter the quota amount in tokens')
                      : t('Enter the quota amount in {{currency}}', {
                          currency: currencyLabel,
                        })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </SideDrawerSection>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <SideDrawerSection className='tr-key-create-section'>
            <CollapsibleTrigger
              render={
                <button
                  type='button'
                  className={cn(
                    'hover:bg-muted/40 flex w-full items-center gap-3 rounded-md py-1.5 text-left transition-colors',
                    'tr-key-advanced-trigger'
                  )}
                />
              }
            >
              <SideDrawerSectionHeader
                className='tr-key-create-section-head flex-1'
                title={t('Advanced Settings')}
                description={t('Set API key access restrictions')}
                icon={<Settings2 className='size-4' />}
              />
              <ChevronDown
                className={cn(
                  'text-muted-foreground size-4 shrink-0 transition-transform',
                  advancedOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className='flex flex-col gap-4 pt-2'>
                <FormField
                  control={form.control}
                  name='model_limits'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Model Limits')}</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={models.map((m) => ({
                            label: m,
                            value: m,
                          }))}
                          selected={field.value}
                          onChange={field.onChange}
                          placeholder={t('Select models (empty for allow all)')}
                          contentClassName='tr-key-model-select-content'
                          itemClassName='tr-key-model-select-item'
                        />
                      </FormControl>
                      <FormDescription>
                        {t('Limit which models can be used with this key')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='allow_ips'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('IP Whitelist (supports CIDR)')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className='min-h-20 resize-none'
                          placeholder={t(
                            'One IP per line (empty for no restriction)'
                          )}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        {t(
                          'Do not over-trust this feature. IP may be spoofed. Please use with nginx, CDN and other gateways.'
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </SideDrawerSection>
        </Collapsible>
      </form>
    </Form>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='tr-key-create-dialog gap-0 p-0 sm:max-w-[560px]'>
        <DialogHeader className='tr-key-create-dialog-head'>
          <DialogTitle>
            {isUpdate ? t('Update API Key') : t('Create API Key')}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? t('Update the API key by providing necessary info.')
              : t('Add a new API key by providing necessary info.')}
          </DialogDescription>
        </DialogHeader>
        <div className='tr-key-create-dialog-body'>{formNode}</div>
        <DialogFooter className='tr-key-create-dialog-foot'>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            {isUpdate ? t('Close') : t('Cancel')}
          </Button>
          <Button
            type='button'
            onClick={form.handleSubmit(onSubmit, onInvalid)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('Saving...')
              : isUpdate
                ? t('Save changes')
                : t('Create API Key')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
