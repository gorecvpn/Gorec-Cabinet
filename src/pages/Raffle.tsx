import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { raffleApi, type RaffleCampaignSummary, type RafflePrizeSlot } from '../api/raffle';
import { GiftIcon } from '@/components/icons';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { ProtectedPrizeImage } from '@/components/raffle/ProtectedPrizeImage';

function resolvePrizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  // Site-relative /uploads/... → serve via API proxy (/api/uploads/...)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${apiBase}${trimmed}`;
  }

  // Absolute URL whose path is /uploads/... on this cabinet host:
  // historically upload API built https://cabinet/.../uploads/... but Caddy
  // only proxied /api/* → bot, so bare /uploads hit the SPA (blank card).
  // Rewrite same-origin /uploads to the API proxy so already-saved URLs work
  // before/without a Caddy /uploads route.
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      const sameOrigin = typeof window !== 'undefined' && parsed.host === window.location.host;
      if (sameOrigin && parsed.pathname.startsWith('/uploads/')) {
        return `${apiBase}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return null;
    }
    // External https prize photos (CDN / Telegram CDN) still work as-is.
    if (trimmed.startsWith('https://')) return trimmed;
    return null;
  }

  return null;
}

function formatPrizeValue(
  prize_type: string,
  prize_value: number | null | undefined,
  prize_text: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  if (prize_type === 'days' && prize_value != null) {
    return t('raffle.prizeDays', { count: prize_value });
  }
  if (prize_type === 'balance' && prize_value != null) {
    const rubles = (prize_value / 100).toFixed(0);
    return t('raffle.prizeBalance', { amount: rubles });
  }
  if (prize_text) return prize_text;
  return t('raffle.prizeCustom');
}

function formatPrize(
  campaign: RaffleCampaignSummary,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return formatPrizeValue(campaign.prize_type, campaign.prize_value, campaign.prize_text, t);
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function useCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return useMemo(() => {
    if (!endsAt) return null;
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return null;
    const diff = Math.max(0, end - now);
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, finished: diff <= 0 };
  }, [endsAt, now]);
}

function PrizeSlotCard({
  slot,
  t,
}: {
  slot: RafflePrizeSlot;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const imageUrl = resolvePrizeImageUrl(slot.image_url);
  const title = formatPrizeValue(
    slot.prize_type,
    slot.prize_value ?? null,
    slot.prize_text ?? null,
    t,
  );

  return (
    <li className="overflow-hidden rounded-2xl border border-dark-700/80 bg-dark-900/40 shadow-sm">
      {imageUrl ? (
        <div className="aspect-[16/10] w-full bg-dark-800">
          <ProtectedPrizeImage src={imageUrl} alt={title} />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <span className="rounded-full bg-accent-500/15 px-2.5 py-0.5 text-xs font-medium text-accent-300">
          {t('raffle.place', { place: slot.place })}
        </span>
        <span className="text-right text-sm font-semibold text-dark-100 [overflow-wrap:anywhere]">
          {title}
        </span>
      </div>
    </li>
  );
}

export default function Raffle() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const { data, isLoading, error } = useQuery({
    queryKey: ['raffle-summary'],
    queryFn: raffleApi.getSummary,
    refetchInterval: 60_000,
  });

  const campaign = data?.campaign ?? null;
  const countdown = useCountdown(campaign?.ends_at);

  if (isLoading) {
    return (
      <PageSkeleton leading={1} titleWidth="w-40">
        <Skeleton variant="card" count={2} className="h-32" />
      </PageSkeleton>
    );
  }

  if (error) {
    return (
      <div className="card border-error-500/20 bg-error-500/10">
        <p className="text-error-400">{t('raffle.error')}</p>
      </div>
    );
  }

  const enabled = data?.enabled ?? false;
  const tickets = data?.tickets ?? [];
  const slots: RafflePrizeSlot[] = campaign?.prize_slots ?? [];
  const perMonthTickets = campaign?.tickets_per_purchase ?? 1;

  let progressPct = 0;
  if (campaign?.starts_at && campaign?.ends_at) {
    const start = new Date(campaign.starts_at).getTime();
    const end = new Date(campaign.ends_at).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      progressPct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
    }
  } else if (countdown?.finished) {
    progressPct = 100;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-500/15">
          <GiftIcon className="h-6 w-6 text-accent-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('raffle.title')}</h1>
          <p className="text-sm text-dark-400">{t('raffle.hint')}</p>
        </div>
      </div>

      {!enabled || !campaign ? (
        <div className="card py-12 text-center">
          <GiftIcon className="mx-auto h-10 w-10 text-dark-500" />
          <p className="mt-4 text-dark-400">
            {!enabled ? t('raffle.disabled') : t('raffle.noCampaign')}
          </p>
        </div>
      ) : (
        <>
          <div className="card space-y-5 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold tracking-tight">
                  {campaign.name}
                </h2>
                {campaign.description && (
                  <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-dark-400 [overflow-wrap:anywhere]">
                    {campaign.description}
                  </div>
                )}
              </div>
              <div className="shrink-0 rounded-full bg-accent-500/15 px-3 py-1 text-sm font-medium text-accent-400">
                {t('raffle.active')}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-dark-700/60 bg-dark-800/50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-dark-500">
                  {t('raffle.prize')}
                </p>
                <p className="mt-1.5 font-semibold text-dark-100 [overflow-wrap:anywhere]">
                  {formatPrize(campaign, t)}
                </p>
              </div>
              <div className="rounded-2xl border border-dark-700/60 bg-dark-800/50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-dark-500">
                  {t('raffle.ends')}
                </p>
                <p className="mt-1.5 font-semibold text-dark-100">
                  {formatDate(campaign.ends_at, locale) || t('raffle.noEndDate')}
                </p>
              </div>
              <div className="rounded-2xl border border-dark-700/60 bg-dark-800/50 p-3.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-dark-500">
                  {t('raffle.countdown')}
                </p>
                <p className="mt-1.5 font-semibold tabular-nums text-accent-300">
                  {!campaign.ends_at
                    ? t('raffle.noEndDate')
                    : countdown?.finished
                      ? t('raffle.ended')
                      : t('raffle.countdownValue', {
                          days: countdown?.days ?? 0,
                          hours: String(countdown?.hours ?? 0).padStart(2, '0'),
                          minutes: String(countdown?.minutes ?? 0).padStart(2, '0'),
                          seconds: String(countdown?.seconds ?? 0).padStart(2, '0'),
                        })}
                </p>
              </div>
            </div>

            {slots.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-medium text-dark-200">{t('raffle.places')}</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {slots.map((slot) => (
                    <PrizeSlotCard key={slot.place} slot={slot} t={t} />
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-dark-700 bg-dark-900/30 px-3.5 py-3">
              <p className="text-sm text-dark-300">
                {campaign.tickets_per_month
                  ? t('raffle.howToEarnPerMonth', {
                      n: perMonthTickets,
                      n3: perMonthTickets * 3,
                      n6: perMonthTickets * 6,
                      n12: perMonthTickets * 12,
                    })
                  : t('raffle.howToEarn', {
                      count: campaign.tickets_per_purchase ?? 1,
                    })}
              </p>
              {campaign.tickets_by_tariff && Object.keys(campaign.tickets_by_tariff).length > 0 && (
                <p className="mt-1 text-xs text-dark-500">{t('raffle.tariffTicketsHint')}</p>
              )}
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{t('raffle.progressTitle')}</h3>
              <span className="rounded-full bg-accent-500/15 px-2.5 py-1 text-sm font-medium text-accent-300">
                {t('raffle.progressTickets', { count: tickets.length })}
              </span>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-dark-400">{t('raffle.progressTimeLeft')}</span>
                <span className="font-medium tabular-nums text-dark-100">
                  {!campaign.ends_at
                    ? t('raffle.noEndDate')
                    : countdown?.finished
                      ? t('raffle.ended')
                      : t('raffle.progressDaysLeft', {
                          days: countdown?.days ?? 0,
                          hours: countdown?.hours ?? 0,
                        })}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-dark-700/80">
                <div
                  className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                  style={{ width: `${progressPct.toFixed(1)}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(progressPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="mt-2 text-xs text-dark-500">
                {campaign.ends_at
                  ? t('raffle.progressEndsAt', { date: formatDate(campaign.ends_at, locale) })
                  : t('raffle.noEndDate')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('raffle.myTickets')}</h3>
              <span className="rounded-full bg-dark-800 px-2.5 py-1 text-sm text-dark-300">
                {t('raffle.ticketCount', { count: tickets.length })}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="card py-10 text-center">
                <p className="text-dark-400">{t('raffle.noTickets')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="card flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <code className="rounded-lg bg-dark-800 px-2.5 py-1.5 font-mono text-sm text-accent-300">
                      {ticket.ticket_code}
                    </code>
                    <span className="text-sm text-dark-400">
                      {formatDate(ticket.created_at, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
