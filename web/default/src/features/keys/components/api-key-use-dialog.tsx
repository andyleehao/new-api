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
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Box, Copy, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApiKeys } from './api-keys-provider'

type GuideTool = 'claude' | 'opencode'
type GuidePlatform = 'mac' | 'cmd' | 'powershell'

const GUIDE_TOOLS: Array<{ value: GuideTool; label: string }> = [
  { value: 'claude', label: 'Claude Code' },
  { value: 'opencode', label: 'OpenCode' },
]

const GUIDE_PLATFORMS: Array<{ value: GuidePlatform; label: string }> = [
  { value: 'mac', label: 'macOS / Linux' },
  { value: 'cmd', label: 'Windows CMD' },
  { value: 'powershell', label: 'PowerShell' },
]

function getServerAddress(): string {
  try {
    const raw = localStorage.getItem('status')
    if (raw) {
      const status = JSON.parse(raw)
      if (status.server_address) return status.server_address as string
    }
  } catch {
    /* noop */
  }
  return window.location.origin
}

function buildTerminalSnippet(
  tool: GuideTool,
  platform: GuidePlatform,
  apiKey: string,
  serverAddress: string
): string {
  const isClaude = tool === 'claude'

  if (platform === 'cmd') {
    return isClaude
      ? [
          `set ANTHROPIC_BASE_URL=${serverAddress}`,
          `set ANTHROPIC_AUTH_TOKEN=${apiKey}`,
          'set CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1',
          'claude',
        ].join('\n')
      : [
          `set ANTHROPIC_BASE_URL=${serverAddress}`,
          `set ANTHROPIC_API_KEY=${apiKey}`,
          'opencode',
        ].join('\n')
  }

  if (platform === 'powershell') {
    return isClaude
      ? [
          `$env:ANTHROPIC_BASE_URL="${serverAddress}"`,
          `$env:ANTHROPIC_AUTH_TOKEN="${apiKey}"`,
          '$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1"',
          'claude',
        ].join('\n')
      : [
          `$env:ANTHROPIC_BASE_URL="${serverAddress}"`,
          `$env:ANTHROPIC_API_KEY="${apiKey}"`,
          'opencode',
        ].join('\n')
  }

  return isClaude
    ? [
        `export ANTHROPIC_BASE_URL="${serverAddress}"`,
        `export ANTHROPIC_AUTH_TOKEN="${apiKey}"`,
        'export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1',
        'claude',
      ].join('\n')
    : [
        `export ANTHROPIC_BASE_URL="${serverAddress}"`,
        `export ANTHROPIC_API_KEY="${apiKey}"`,
        'opencode',
      ].join('\n')
}

function buildConfigSnippet(
  tool: GuideTool,
  apiKey: string,
  serverAddress: string
): string {
  if (tool === 'claude') {
    return JSON.stringify(
      {
        env: {
          ANTHROPIC_BASE_URL: serverAddress,
          ANTHROPIC_AUTH_TOKEN: apiKey,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      },
      null,
      2
    )
  }

  return JSON.stringify(
    {
      $schema: 'https://opencode.ai/config.json',
      provider: {
        anthropic: {
          options: {
            baseURL: serverAddress,
          },
        },
      },
    },
    null,
    2
  )
}

function terminalLabel(platform: GuidePlatform): string {
  if (platform === 'cmd') return 'Windows CMD'
  if (platform === 'powershell') return 'PowerShell'
  return 'Terminal'
}

function CopyButton({
  value,
  label,
  className,
  disabled,
}: {
  value: string
  label: string
  className?: string
  disabled?: boolean
}) {
  const { t } = useTranslation()

  return (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className={cn('tr-use-copy', className)}
      disabled={disabled}
      onClick={async () => {
        const ok = await copyToClipboard(value)
        if (ok) toast.success(t('Copied'))
      }}
    >
      <Copy className='size-3.5' />
      {label}
    </Button>
  )
}

export function ApiKeyUseDialog() {
  const { t } = useTranslation()
  const {
    open,
    setOpen,
    currentRow,
    resolvedKeys,
    loadingKeys,
    resolveRealKey,
  } = useApiKeys()
  const isOpen = open === 'use-key'
  const [tool, setTool] = useState<GuideTool>('claude')
  const [platform, setPlatform] = useState<GuidePlatform>('mac')

  useEffect(() => {
    if (!isOpen || !currentRow) return
    void resolveRealKey(currentRow.id)
  }, [currentRow, isOpen, resolveRealKey])

  const apiKey = currentRow ? resolvedKeys[currentRow.id] : ''
  const isLoading = currentRow ? Boolean(loadingKeys[currentRow.id]) : false
  const serverAddress = useMemo(() => getServerAddress(), [])
  const copyDisabled = !apiKey

  const terminalSnippet = useMemo(
    () =>
      buildTerminalSnippet(
        tool,
        platform,
        apiKey || t('Loading API key...'),
        serverAddress
      ),
    [apiKey, platform, serverAddress, t, tool]
  )
  const configSnippet = useMemo(
    () =>
      buildConfigSnippet(
        tool,
        apiKey || t('Loading API key...'),
        serverAddress
      ),
    [apiKey, serverAddress, t, tool]
  )
  const configLabel =
    tool === 'claude' ? '~/.claude/settings.json' : 'opencode.json'

  return (
    <Dialog open={isOpen} onOpenChange={(next) => !next && setOpen(null)}>
      <DialogContent className='tr-use-dialog gap-0 p-0 sm:max-w-[940px]'>
        <DialogHeader className='tr-use-dialog-head'>
          <DialogTitle>{t('Use API Key')}</DialogTitle>
          <DialogDescription>
            {t(
              'Add these environment variables to your terminal profile, or run the command directly in your project terminal.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='tr-use-dialog-body'>
          <div className='tr-use-summary'>
            <section className='tr-secret-card'>
              <div className='tr-secret-card-head'>
                <span>API_KEY</span>
                <CopyButton
                  value={apiKey}
                  label={t('Copy')}
                  disabled={copyDisabled}
                />
              </div>
              <div className='tr-secret-card-body'>
                {isLoading && !apiKey ? (
                  <span className='inline-flex items-center gap-2'>
                    <Loader2 className='size-3.5 animate-spin' />
                    {t('Loading API key...')}
                  </span>
                ) : (
                  apiKey || t('Open the dialog again after the API key loads.')
                )}
              </div>
            </section>

            <section className='tr-secret-card'>
              <div className='tr-secret-card-head'>
                <span>URL</span>
                <CopyButton value={serverAddress} label={t('Copy')} />
              </div>
              <div className='tr-secret-card-body'>{serverAddress}</div>
            </section>
          </div>

          <Tabs
            value={tool}
            onValueChange={(value) => setTool(value as GuideTool)}
            className='tr-guide-tabs'
          >
            <TabsList variant='line'>
              {GUIDE_TOOLS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  <Box className='size-3.5' />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {GUIDE_TOOLS.map((item) => (
              <TabsContent key={item.value} value={item.value} />
            ))}
          </Tabs>

          <Tabs
            value={platform}
            onValueChange={(value) => setPlatform(value as GuidePlatform)}
            className='tr-platform-tabs'
          >
            <TabsList variant='line'>
              {GUIDE_PLATFORMS.map((item) => (
                <TabsTrigger key={item.value} value={item.value}>
                  <Box className='size-3.5' />
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {GUIDE_PLATFORMS.map((item) => (
              <TabsContent key={item.value} value={item.value} />
            ))}
          </Tabs>

          <div className='tr-guide-layout'>
            <div className='min-w-0'>
              <section className='tr-terminal-card'>
                <div className='tr-terminal-head'>
                  <span>{terminalLabel(platform)}</span>
                  <CopyButton
                    value={terminalSnippet}
                    label={t('Copy')}
                    disabled={copyDisabled}
                  />
                </div>
                <pre>{terminalSnippet}</pre>
              </section>

              <section className='tr-terminal-card tr-config-card'>
                <div className='tr-terminal-head'>
                  <span>{configLabel}</span>
                  <CopyButton
                    value={configSnippet}
                    label={t('Copy')}
                    disabled={copyDisabled}
                  />
                </div>
                <pre>{configSnippet}</pre>
              </section>
            </div>

            <aside className='tr-guide-aside'>
              <h4>{t('Setup steps')}</h4>
              <ol>
                <li>
                  {t('Copy API_KEY and URL for "{{name}}".', {
                    name: currentRow?.name || t('Current key'),
                  })}
                </li>
                <li>
                  {t(
                    'Copy the command for your system and paste it into your project terminal or shell profile.'
                  )}
                </li>
                <li>
                  {t(
                    'Restart the terminal and run the tool. If requests fail, confirm the key is still enabled.'
                  )}
                </li>
              </ol>
            </aside>
          </div>

          <div className='tr-use-warning'>
            <AlertTriangle className='size-3.5' />
            <span>
              {t(
                'Do not commit, screenshot, or publish this API key in shared documents.'
              )}
            </span>
          </div>
        </div>

        <DialogFooter className='tr-use-dialog-foot'>
          <Button variant='outline' onClick={() => setOpen(null)}>
            {t('Close')}
          </Button>
          <Button
            onClick={async () => {
              const ok = await copyToClipboard(terminalSnippet)
              if (ok) toast.success(t('Copied'))
            }}
            disabled={copyDisabled}
          >
            <Copy className='size-4' />
            {t('Copy current command')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
