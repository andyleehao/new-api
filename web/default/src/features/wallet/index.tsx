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
import { useState, useEffect, useCallback, useMemo } from 'react'
import { FileText, Gift, HandCoins } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSelf } from '@/lib/api'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { DEFAULT_DISCOUNT_RATE } from './constants'
import {
  useTopupInfo,
  usePayment,
  useAffiliate,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from './hooks'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  isWaffoPancakePayment,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
  initialSection?: WalletSection
}

type WalletSection =
  | 'purchase'
  | 'orders'
  | 'redeem'
  | 'affiliate'
  | 'subscriptions'

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const activeSection = props.initialSection ?? 'purchase'
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  // Fetch and refresh user data
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    if (activeSection === 'orders') {
      setBillingDialogOpen(true)
    }
  }, [props.initialShowHistory, activeSection])

  // Initialize topup amount when topup info is loaded
  useEffect(() => {
    if (topupInfo && topupAmount === 0) {
      const minTopup = getMinTopupAmount(topupInfo)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopupAmount(minTopup)

      // Calculate initial payment amount with default payment type
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, topupAmount, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  // Handle topup amount change
  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setPaymentLoading(method.type)

    try {
      // Validate minimum topup
      const minTopup = getMinTopupAmount(topupInfo)
      if (topupAmount < minTopup) {
        return
      }

      // Calculate payment amount and show confirmation dialog
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return

    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const success = isPancake
      ? await processWaffoPancakePayment(topupAmount)
      : await processPayment(topupAmount, selectedPaymentMethod.type)

    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  // Handle transfer
  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }

  const handleWaffoMethodSelect = async (_method: unknown, index: number) => {
    const loadingKey = `waffo-${index}`
    setPaymentLoading(loadingKey)

    try {
      await processWaffoPayment(topupAmount, index)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  const rechargeCard = (
    <RechargeFormCard
      topupInfo={topupInfo}
      presetAmounts={presetAmounts}
      selectedPreset={selectedPreset}
      onSelectPreset={handleSelectPreset}
      topupAmount={topupAmount}
      onTopupAmountChange={handleTopupAmountChange}
      paymentAmount={paymentAmount}
      calculating={calculating}
      onPaymentMethodSelect={handlePaymentMethodSelect}
      paymentLoading={paymentLoading}
      redemptionCode={redemptionCode}
      onRedemptionCodeChange={setRedemptionCode}
      onRedeem={handleRedeem}
      redeeming={redeeming}
      topupLink={topupInfo?.topup_link}
      loading={topupLoading}
      priceRatio={(status?.price as number) || 1}
      usdExchangeRate={effectiveUsdExchangeRate}
      onOpenBilling={() => setBillingDialogOpen(true)}
      creemProducts={topupInfo?.creem_products}
      enableCreemTopup={topupInfo?.enable_creem_topup}
      onCreemProductSelect={handleCreemProductSelect}
      enableWaffoTopup={topupInfo?.enable_waffo_topup}
      waffoPayMethods={topupInfo?.waffo_pay_methods}
      waffoMinTopup={topupInfo?.waffo_min_topup}
      onWaffoMethodSelect={handleWaffoMethodSelect}
      enableWaffoPancakeTopup={topupInfo?.enable_waffo_pancake_topup}
    />
  )

  const subscriptionCard = (
    <SubscriptionPlansCard
      topupInfo={topupInfo}
      onAvailabilityChange={handleSubscriptionAvailabilityChange}
      userQuota={user?.quota}
      onPurchaseSuccess={fetchUser}
    />
  )

  const affiliateCard = (
    <AffiliateRewardsCard
      user={user}
      affiliateLink={affiliateLink}
      onTransfer={() => setTransferDialogOpen(true)}
      complianceConfirmed={topupInfo?.payment_compliance_confirmed !== false}
      loading={affiliateLoading}
    />
  )

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{getWalletSectionTitle(activeSection, t)}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-4 sm:gap-5'>
            <WalletStatsCard user={user} loading={userLoading} />

            {activeSection === 'purchase' && (
              <>
                <div
                  className={
                    showSubscriptionPanel
                      ? 'grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-start'
                      : 'grid gap-4'
                  }
                >
                  <div id='wallet-add-funds' className='scroll-mt-4'>
                    {rechargeCard}
                  </div>
                  {subscriptionCard}
                </div>
                {affiliateCard}
              </>
            )}

            {activeSection === 'orders' && (
              <WalletOrdersPanel onOpenBilling={() => setBillingDialogOpen(true)} />
            )}

            {activeSection === 'redeem' && (
              <WalletRedeemPanel
                redemptionCode={redemptionCode}
                redeeming={redeeming}
                onRedemptionCodeChange={setRedemptionCode}
                onRedeem={handleRedeem}
              />
            )}

            {activeSection === 'affiliate' && affiliateCard}

            {activeSection === 'subscriptions' && (
              <>
                {subscriptionCard}
                {!showSubscriptionPanel && <WalletSubscriptionsEmpty />}
              </>
            )}
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing || pancakeProcessing}
        discountRate={getDiscountRate()}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}

function getWalletSectionTitle(
  section: WalletSection,
  t: (key: string) => string
) {
  switch (section) {
    case 'orders':
      return t('Order History')
    case 'redeem':
      return t('Redemption Code')
    case 'affiliate':
      return t('Referral Rewards')
    case 'subscriptions':
      return t('My Subscriptions')
    default:
      return t('Recharge / Subscription')
  }
}

function WalletOrdersPanel(props: { onOpenBilling: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className='overflow-hidden'>
      <CardHeader>
        <div className='flex items-center gap-3'>
          <span className='bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl'>
            <FileText className='size-5' />
          </span>
          <div>
            <CardTitle>{t('Order History')}</CardTitle>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('Review top-up and subscription order records.')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={props.onOpenBilling}>{t('View Order History')}</Button>
      </CardContent>
    </Card>
  )
}

function WalletRedeemPanel(props: {
  redemptionCode: string
  redeeming: boolean
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
}) {
  const { t } = useTranslation()
  return (
    <Card className='overflow-hidden'>
      <CardHeader>
        <div className='flex items-center gap-3'>
          <span className='bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl'>
            <Gift className='size-5' />
          </span>
          <div>
            <CardTitle>{t('Redemption Code')}</CardTitle>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('Enter a redemption code to add balance or benefits.')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col gap-2 sm:flex-row'>
          <Input
            value={props.redemptionCode}
            onChange={(event) =>
              props.onRedemptionCodeChange(event.target.value)
            }
            placeholder={t('Enter redemption code')}
            className='font-mono'
          />
          <Button
            onClick={props.onRedeem}
            disabled={!props.redemptionCode || props.redeeming}
            className='sm:w-auto'
          >
            {props.redeeming ? t('Redeeming...') : t('Redeem')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WalletSubscriptionsEmpty() {
  const { t } = useTranslation()
  return (
    <Card className='overflow-hidden'>
      <CardContent className='flex flex-col items-center justify-center px-6 py-14 text-center'>
        <span className='bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl'>
          <HandCoins className='size-6' />
        </span>
        <h3 className='mt-4 text-base font-semibold'>
          {t('No active subscriptions')}
        </h3>
        <p className='text-muted-foreground mt-1 max-w-md text-sm'>
          {t('You do not have an active subscription plan yet.')}
        </p>
      </CardContent>
    </Card>
  )
}
