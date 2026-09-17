import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { raffleApi, type RaffleCampaignSummary } from '../api/raffle';
import { TrophyIcon } from '@/components/icons';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';

function formatPrize(campaign: RaffleCampaignSummary, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (campaign.prize_type === 'days' && campaign.prize_value != null) {
    return t('raffle.prizeDays', { count: campaign.prize_value });
  }
  if (campaign.prize_type === 'balance' && campaign.prize_value != null) {
    const rubles = (campaign.prize_value / 100).toFixed(0);
    return t('raffle.prizeBalance', { amount: rubles });
  }
  if (campaign.prize_text) {
    return campaign.prize_text;
  }
  return t('raffle.prizeCustom');
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

export default function Raffle() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['raffle-summary'],
    queryFn: raffleApi.getSummary,
  });

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
  const campaign = data?.campaign ?? null;
  const tickets = data?.tickets ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrophyIcon className="h-6 w-6 text-accent-400" />
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('raffle.title')}</h1>
      </div>

      {!enabled || !campaign ? (
        <div className="card py-12 text-center">
          <TrophyIcon className="mx-auto h-10 w-10 text-dark-500" />
          <p className="mt-4 text-dark-400">
            {!enabled ? t('raffle.disabled') : t('raffle.noCampaign')}
          </p>
          <p className="mt-2 text-sm text-dark-500">{t('raffle.hint')}</p>
        </div>
      ) : (
        <>
          <div className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold">{campaign.name}</h2>
                {campaign.description && (
                  <p className="mt-1 text-sm text-dark-400 [overflow-wrap:anywhere]">
                    {campaign.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 rounded-full bg-accent-500/15 px-3 py-1 text-sm font-medium text-accent-400">
                {t('raffle.active')}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-dark-800/60 p-3">
                <p className="text-xs uppercase tracking-wide text-dark-500">{t('raffle.prize')}</p>
                <p className="mt-1 font-medium text-dark-100">{formatPrize(campaign, t)}</p>
              </div>
              <div className="rounded-lg bg-dark-800/60 p-3">
                <p className="text-xs uppercase tracking-wide text-dark-500">{t('raffle.ends')}</p>
                <p className="mt-1 font-medium text-dark-100">
                  {formatDate(campaign.ends_at, locale) || t('raffle.noEndDate')}
                </p>
              </div>
            </div>

            <p className="text-sm text-dark-400">
              {t('raffle.howToEarn')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('raffle.myTickets')}</h3>
              <span className="text-sm text-dark-400">
                {t('raffle.ticketCount', { count: tickets.length })}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="card py-8 text-center">
                <p className="text-dark-400">{t('raffle.noTickets')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="card flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <code className="rounded bg-dark-800 px-2 py-1 font-mono text-sm text-accent-300">
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
