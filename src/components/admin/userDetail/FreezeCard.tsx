import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { freezeErrorCode, subscriptionFreezeApi } from '@/api/subscriptionFreeze';
import type { SubscriptionFreezeState } from '@/api/subscriptionFreeze';
import { PauseIcon } from '@/components/icons';
import { uiLocale } from '@/utils/uiLocale';
import { Section } from './sectionParts';

interface FreezeCardProps {
  userId: number;
  subscriptionId: number;
  canManage: boolean;
  onChanged?: () => void;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString(uiLocale()) : '—';
}

/** Админ: принудительная пауза / выход из паузы подписки пользователя (без лимита пауз). */
export function FreezeCard({ userId, subscriptionId, canManage, onChanged }: FreezeCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(7);
  const queryKey = ['admin-subscription-freeze', userId, subscriptionId];

  const { data: state } = useQuery<SubscriptionFreezeState>({
    queryKey,
    queryFn: () => subscriptionFreezeApi.adminGetState(userId, subscriptionId),
  });

  const onSuccess = (next: SubscriptionFreezeState) => {
    queryClient.setQueryData(queryKey, next);
    onChanged?.();
  };
  const freeze = useMutation({
    mutationFn: () => subscriptionFreezeApi.adminFreeze(userId, subscriptionId, days),
    onSuccess,
  });
  const unfreeze = useMutation({
    mutationFn: () => subscriptionFreezeApi.adminUnfreeze(userId, subscriptionId),
    onSuccess,
  });

  if (!state) return null;
  const busy = freeze.isPending || unfreeze.isPending;
  const error = freeze.error ?? unfreeze.error;
  const reason = state.is_paused ? null : state.reason;
  if (!state.is_paused && reason && ['trial', 'daily'].includes(reason)) return null;

  return (
    <Section
      icon={<PauseIcon className="h-5 w-5" />}
      title={t('admin.users.detail.freeze.title')}
      id="subscription-freeze"
    >
      <div className="flex items-center justify-between gap-3" data-testid="admin-freeze-card">
        <div>
          <div className="text-sm text-dark-400">
            {state.is_paused
              ? t('admin.users.detail.freeze.pausedUntil', {
                  date: formatDate(state.planned_until),
                  count: state.remaining_days,
                })
              : t('admin.users.detail.freeze.notPaused')}
          </div>
        </div>
        {canManage && state.is_paused && (
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => unfreeze.mutate()}
          >
            {t('admin.users.detail.freeze.resume')}
          </button>
        )}
      </div>
      {canManage && !state.is_paused && state.can_pause && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={state.max_days}
            value={days}
            onChange={(e) =>
              setDays(Math.max(1, Math.min(state.max_days, Number(e.target.value) || 1)))
            }
            className="input w-24"
            aria-label={t('admin.users.detail.freeze.days')}
          />
          <span className="text-sm text-dark-400">{t('admin.users.detail.freeze.days')}</span>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => freeze.mutate()}
          >
            {t('admin.users.detail.freeze.pause')}
          </button>
        </div>
      )}
      {!state.is_paused && !state.can_pause && reason && (
        <div className="text-sm text-dark-400">
          {t(`subscription.freeze.errors.${reason}`, { date: formatDate(state.next_available_at) })}
        </div>
      )}
      {error && (
        <div className="text-sm text-error-400">
          {t(`subscription.freeze.errors.${freezeErrorCode(error) ?? 'not_active'}`, { date: '—' })}
        </div>
      )}
    </Section>
  );
}

export default FreezeCard;
