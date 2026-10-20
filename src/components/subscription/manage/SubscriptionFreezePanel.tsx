import { type CSSProperties, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { freezeErrorCode, subscriptionFreezeApi } from '@/api/subscriptionFreeze';
import type { SubscriptionFreezeState } from '@/api/subscriptionFreeze';
import { PauseIcon } from '@/components/icons';
import type { Subscription } from '@/types';
import { uiLocale } from '@/utils/uiLocale';

export interface SubscriptionFreezePanelProps {
  subscription: Subscription;
  subscriptionId: number | undefined;
  /** Рисовать ли собственную подложку-карточку (полный вид) или только содержимое (простой вид). */
  bare?: boolean;
  /** Стиль подложки-карточки экрана (фон/рамка/тень), чтобы блок не выбивался из соседних. */
  cardStyle?: CSSProperties;
}

/** Причины, при которых блок паузы вообще не показываем. */
const HIDDEN_REASONS = new Set(['disabled', 'trial', 'daily', 'no_subscription']);

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString(uiLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Пауза (заморозка) подписки: поставить на паузу на 7/14/30 дней и выйти из
 * неё в любой момент. Остаток сохраняется и возвращается полностью.
 * Суточная пауза — отдельный блок (DailyPausePanel).
 */
export function SubscriptionFreezePanel({
  subscription,
  subscriptionId,
  bare = false,
  cardStyle,
}: SubscriptionFreezePanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [choosing, setChoosing] = useState(false);
  const [days, setDays] = useState<number | null>(null);

  const enabled = !subscription.is_daily && !subscription.is_trial;
  const queryKey = ['subscription-freeze', subscriptionId ?? subscription.id];
  const { data: state } = useQuery<SubscriptionFreezeState>({
    queryKey,
    queryFn: () => subscriptionFreezeApi.getState(subscriptionId),
    enabled,
    staleTime: 30_000,
  });

  const onDone = (next: SubscriptionFreezeState) => {
    queryClient.setQueryData(queryKey, next);
    queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
    queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
    setChoosing(false);
    setDays(null);
  };

  const freezeMutation = useMutation({
    mutationFn: (value: number) => subscriptionFreezeApi.freeze(value, subscriptionId),
    onSuccess: onDone,
  });
  const unfreezeMutation = useMutation({
    mutationFn: () => subscriptionFreezeApi.unfreeze(subscriptionId),
    onSuccess: onDone,
  });

  if (!enabled || !state || !state.enabled) return null;
  const paused = state.is_paused;
  if (!paused && state.reason && HIDDEN_REASONS.has(state.reason)) return null;

  const error = freezeMutation.error ?? unfreezeMutation.error;
  const errorCode = error ? freezeErrorCode(error) : null;
  const busy = freezeMutation.isPending || unfreezeMutation.isPending;

  const reasonText = (reason: string | null) =>
    reason === 'limit_reached'
      ? t('subscription.freeze.errors.limit_reached', {
          date: formatDate(state.next_available_at),
        })
      : t(`subscription.freeze.errors.${reason ?? 'not_active'}`, {
          defaultValue: t('subscription.freeze.errors.not_active'),
        });

  const content = (
    <div data-testid="subscription-freeze-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-dark-50">
            {t('subscription.freeze.title')}
          </h2>
          <div className="mt-1 text-[12px] text-dark-400">
            {paused
              ? t('subscription.freeze.pausedUntil', { date: formatDate(state.planned_until) })
              : t('subscription.freeze.hint')}
          </div>
        </div>
        {paused ? (
          <button
            type="button"
            onClick={() => unfreezeMutation.mutate()}
            disabled={busy}
            className="rounded-[10px] px-4 py-2 text-sm font-semibold"
            style={{
              background: 'rgba(var(--color-accent-400), 0.12)',
              border: '1px solid rgba(var(--color-accent-400), 0.2)',
              color: 'rgb(var(--color-accent-400))',
            }}
          >
            {t('subscription.freeze.resumeBtn')}
          </button>
        ) : (
          state.can_pause &&
          !choosing && (
            <button
              type="button"
              onClick={() => setChoosing(true)}
              disabled={busy}
              className="rounded-[10px] px-4 py-2 text-sm font-semibold"
              style={{
                background: 'rgba(255,184,0,0.12)',
                border: '1px solid rgba(255,184,0,0.2)',
                color: 'rgb(var(--color-urgent-400))',
              }}
            >
              {t('subscription.freeze.pauseBtn')}
            </button>
          )
        )}
      </div>

      {paused && (
        <div
          className="mt-4 flex items-start gap-3 rounded-[12px] p-4"
          style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.12)' }}
        >
          <PauseIcon
            className="h-5 w-5 shrink-0"
            style={{ color: 'rgb(var(--color-urgent-400))' }}
          />
          <div className="text-[12px] text-dark-300">
            {t('subscription.freeze.pausedInfo', { count: state.remaining_days })}
          </div>
        </div>
      )}

      {!paused && !state.can_pause && state.reason && (
        <div className="mt-3 text-[12px] text-dark-400">{reasonText(state.reason)}</div>
      )}

      {!paused && choosing && (
        <div className="mt-4 space-y-3">
          <div className="text-[13px] text-dark-300">
            {t('subscription.freeze.chooseDescription', { count: state.remaining_days })}
          </div>
          <div className="flex flex-wrap gap-2">
            {state.day_options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold"
                aria-pressed={days === option}
                style={{
                  background:
                    days === option
                      ? 'rgba(var(--color-accent-400), 0.18)'
                      : 'rgba(255,255,255,0.04)',
                  border:
                    days === option
                      ? '1px solid rgba(var(--color-accent-400), 0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                  color: days === option ? 'rgb(var(--color-accent-400))' : undefined,
                }}
              >
                {t('subscription.freeze.daysOption', { count: option })}
              </button>
            ))}
          </div>
          {state.pauses_limit > 0 && (
            <div className="text-[11px] text-dark-400">
              {t('subscription.freeze.limitLine', {
                used: state.pauses_used,
                limit: state.pauses_limit,
              })}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={days === null || busy}
              onClick={() => days !== null && freezeMutation.mutate(days)}
            >
              {t('subscription.freeze.confirmBtn')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                setChoosing(false);
                setDays(null);
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mt-4 rounded-[10px] p-3 text-center text-sm"
          style={{
            background: 'rgba(255,59,92,0.08)',
            border: '1px solid rgba(255,59,92,0.15)',
            color: 'rgb(var(--color-critical-500))',
          }}
        >
          {reasonText(errorCode)}
        </div>
      )}
    </div>
  );

  if (bare) return <div className="py-4">{content}</div>;
  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={
        cardStyle ?? {
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '24px 28px',
        }
      }
    >
      {content}
    </div>
  );
}

export default SubscriptionFreezePanel;
