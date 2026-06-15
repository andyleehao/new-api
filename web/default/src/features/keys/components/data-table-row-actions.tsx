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
import { useCallback, useState } from 'react'
import { type Row } from '@tanstack/react-table'
import {
  Trash2,
  Pencil,
  Power,
  Ban,
  SquareTerminal,
  Upload,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { updateApiKeyStatus } from '../api'
import { API_KEY_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'
import { apiKeySchema } from '../types'
import { useApiKeys } from './api-keys-provider'

type DataTableRowActionsProps<TData> = {
  row: Row<TData>
}

type ActionButtonProps = {
  label: string
  icon: React.ReactNode
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  danger?: boolean
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type='button'
            variant='ghost'
            className={cn(
              'tr-key-action-button',
              danger && 'tr-key-action-button-danger'
            )}
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
          />
        }
      >
        {icon}
        <span>{label}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation()
  const apiKey = apiKeySchema.parse(row.original)
  const {
    setOpen,
    setCurrentRow,
    triggerRefresh,
    setResolvedKey,
    resolveRealKey,
    loadingKeys,
  } = useApiKeys()
  const isEnabled = apiKey.status === API_KEY_STATUS.ENABLED
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const isRealKeyLoading = Boolean(loadingKeys[apiKey.id])

  const handleToggleStatus = async (
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    e?.stopPropagation()
    const newStatus = isEnabled
      ? API_KEY_STATUS.DISABLED
      : API_KEY_STATUS.ENABLED

    setIsTogglingStatus(true)
    try {
      const result = await updateApiKeyStatus(apiKey.id, newStatus)
      if (result.success) {
        const message = isEnabled
          ? t(SUCCESS_MESSAGES.API_KEY_DISABLED)
          : t(SUCCESS_MESSAGES.API_KEY_ENABLED)
        toast.success(message)
        triggerRefresh()
      } else {
        toast.error(result.message || t(ERROR_MESSAGES.STATUS_UPDATE_FAILED))
      }
    } catch {
      toast.error(t(ERROR_MESSAGES.UNEXPECTED))
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const handleUseKey = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setCurrentRow(apiKey)
      setOpen('use-key')
      void resolveRealKey(apiKey.id)
    },
    [apiKey, resolveRealKey, setCurrentRow, setOpen]
  )

  const handleImportToCCS = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      const realKey = await resolveRealKey(apiKey.id)
      if (!realKey) return
      setResolvedKey(realKey)
      setCurrentRow(apiKey)
      setOpen('cc-switch')
    },
    [apiKey, resolveRealKey, setCurrentRow, setOpen, setResolvedKey]
  )

  const handleEdit = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setCurrentRow(apiKey)
      setOpen('update')
    },
    [apiKey, setCurrentRow, setOpen]
  )

  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setCurrentRow(apiKey)
      setOpen('delete')
    },
    [apiKey, setCurrentRow, setOpen]
  )

  return (
    <div className='tr-key-row-actions' role='group' aria-label={t('Actions')}>
      <ActionButton
        label={t('Use Key')}
        icon={<SquareTerminal className='size-5' />}
        onClick={handleUseKey}
      />
      <ActionButton
        label={t('Import to CC Switch')}
        icon={
          isRealKeyLoading ? (
            <Loader2 className='size-5 animate-spin' />
          ) : (
            <Upload className='size-5' />
          )
        }
        onClick={handleImportToCCS}
        disabled={isRealKeyLoading}
      />
      <ActionButton
        label={isEnabled ? t('Disable') : t('Enable')}
        icon={
          isTogglingStatus ? (
            <Loader2 className='size-5 animate-spin' />
          ) : isEnabled ? (
            <Ban className='size-5' />
          ) : (
            <Power className='size-5' />
          )
        }
        onClick={handleToggleStatus}
        disabled={isTogglingStatus}
      />
      <ActionButton
        label={t('Edit')}
        icon={<Pencil className='size-5' />}
        onClick={handleEdit}
      />
      <ActionButton
        label={t('Delete')}
        icon={<Trash2 className='size-5' />}
        onClick={handleDelete}
        danger
      />
    </div>
  )
}
