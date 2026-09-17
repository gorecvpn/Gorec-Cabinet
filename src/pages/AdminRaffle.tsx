import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminRaffleApi,
  type AdminRaffleCampaign,
  type AdminRaffleWinner,
} from '../api/adminRaffle';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useDestructiveConfirm } from '@/platform';
import { useNotify } from '@/platform/hooks/useNotify';
import { usePlatform } from '../platform/hooks/usePlatform';
import { usePermissionStore } from '@/store/permissions';
import {
  BackIcon,
  CheckIcon,
  PlusIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from '@/components/icons';
import { StatCard } from '../components/stats';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useFocusTrap } from '../hooks/useFocusTrap';
import i18n from '../i18n';

const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const locale = localeMap[i18n.language] || 'ru-RU';
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

function formatPrize(
  campaign: AdminRaffleCampaign,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  if (campaign.prize_type === 'days' && campaign.prize_value != null) {
    return t('admin.raffle.prizeDays', { count: campaign.prize_value });
  }
  if (campaign.prize_type === 'balance' && campaign.prize_value != null) {
    const rubles = (campaign.prize_value / 100).toFixed(0);
    return t('admin.raffle.prizeBalance', { amount: rubles });
  }
  if (campaign.prize_text) return campaign.prize_text;
  return t('admin.raffle.prizeCustom');
}

function statusTone(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-success-500/20 text-success-400';
    case 'draft':
      return 'bg-dark-600 text-dark-300';
    case 'closed':
      return 'bg-warning-500/20 text-warning-400';
    case 'drawn':
      return 'bg-accent-500/20 text-accent-400';
    default:
      return 'bg-dark-600 text-dark-300';
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data
      ?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function AdminRaffle() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();
  const notify = useNotify();
  const confirmAction = useDestructiveConfirm();
  const hasPermission = usePermissionStore((s) => s.hasPermission);
  const canEdit = hasPermission('raffle:edit');

  const [winnersModal, setWinnersModal] = useState<{
    campaignId: number;
    winners: AdminRaffleWinner[];
    tickets?: number;
    uniqueUsers?: number;
  } | null>(null);
  const winnersDialogRef = useFocusTrap<HTMLDivElement>(winnersModal !== null, {
    onEscape: () => setWinnersModal(null),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-raffle-campaigns'],
    queryFn: () => adminRaffleApi.listCampaigns(100, 0),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-raffle-campaigns'] });
  };

  const activateMutation = useMutation({
    mutationFn: adminRaffleApi.activateCampaign,
    onSuccess: () => {
      notify.success(t('admin.raffle.toast.activated'));
      invalidate();
    },
    onError: (err) => notify.error(getErrorMessage(err, t('admin.raffle.toast.actionError'))),
  });

  const closeMutation = useMutation({
    mutationFn: adminRaffleApi.closeCampaign,
    onSuccess: () => {
      notify.success(t('admin.raffle.toast.closed'));
      invalidate();
    },
    onError: (err) => notify.error(getErrorMessage(err, t('admin.raffle.toast.actionError'))),
  });

  const drawMutation = useMutation({
    mutationFn: adminRaffleApi.drawCampaign,
    onSuccess: (result, campaignId) => {
      const campaign = data?.campaigns.find((c) => c.id === campaignId);
      notify.success(t('admin.raffle.toast.drawn'));
      invalidate();
      setWinnersModal({
        campaignId: result.campaign_id,
        winners: result.winners,
        tickets: campaign?.tickets,
        uniqueUsers: campaign?.unique_users,
      });
    },
    onError: (err) => notify.error(getErrorMessage(err, t('admin.raffle.toast.actionError'))),
  });

  const campaigns = data?.campaigns ?? [];
  const enabled = data?.enabled ?? false;
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const totalTickets = campaigns.reduce((sum, c) => sum + (c.tickets || 0), 0);
  const totalWinners = campaigns.reduce((sum, c) => sum + (c.winners || 0), 0);
  const busy =
    activateMutation.isPending || closeMutation.isPending || drawMutation.isPending;

  const handleActivate = async (campaign: AdminRaffleCampaign) => {
    const ok = await confirmAction(
      t('admin.raffle.confirm.activate', { name: campaign.name }),
      t('admin.raffle.actions.activate'),
      t('admin.raffle.confirm.activateTitle'),
    );
    if (ok) activateMutation.mutate(campaign.id);
  };

  const handleClose = async (campaign: AdminRaffleCampaign) => {
    const ok = await confirmAction(
      t('admin.raffle.confirm.close', { name: campaign.name }),
      t('admin.raffle.actions.close'),
      t('admin.raffle.confirm.closeTitle'),
    );
    if (ok) closeMutation.mutate(campaign.id);
  };

  const handleDraw = async (campaign: AdminRaffleCampaign) => {
    const ok = await confirmAction(
      t('admin.raffle.confirm.draw', { name: campaign.name, count: campaign.tickets }),
      t('admin.raffle.actions.draw'),
      t('admin.raffle.confirm.drawTitle'),
    );
    if (ok) drawMutation.mutate(campaign.id);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.raffle.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.raffle.subtitle')}</p>
          </div>
        </div>
        <PermissionGate permission="raffle:create" fallback={null}>
          <button
            onClick={() => navigate('/admin/raffle/create')}
            className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            {t('admin.raffle.createButton')}
          </button>
        </PermissionGate>
      </div>

      {!enabled && (
        <div className="mb-6 rounded-xl border border-warning-500/30 bg-warning-500/10 px-4 py-3 text-sm text-warning-300">
          {t('admin.raffle.disabledHint')}
        </div>
      )}

      {!isLoading && campaigns.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.raffle.stats.campaigns')}
            value={campaigns.length}
            icon={<TrophyIcon className="h-5 w-5" />}
            tone="neutral"
          />
          <StatCard
            label={t('admin.raffle.stats.active')}
            value={activeCount}
            icon={<CheckIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.raffle.stats.tickets')}
            value={totalTickets}
            icon={<TicketIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.raffle.stats.winners')}
            value={totalWinners}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>
      )}

      {isLoading ? (
        <SkeletonGroup className="space-y-3">
          <Skeleton variant="card" count={3} className="h-24" />
        </SkeletonGroup>
      ) : error ? (
        <div className="rounded-xl border border-error-500/20 bg-error-500/10 p-4 text-error-400">
          {t('admin.raffle.loadError')}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-12 text-center">
          <TrophyIcon className="mx-auto h-10 w-10 text-dark-500" />
          <p className="mt-4 text-dark-400">{t('admin.raffle.noCampaigns')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                campaign.status === 'active' ? 'border-dark-700' : 'border-dark-700/50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-dark-100">{campaign.name}</h2>
                    <span className={`rounded px-2 py-0.5 text-xs ${statusTone(campaign.status)}`}>
                      {t(`admin.raffle.status.${campaign.status}`, {
                        defaultValue: campaign.status,
                      })}
                    </span>
                    <span className="rounded bg-dark-700 px-2 py-0.5 text-xs text-dark-300">
                      #{campaign.id}
                    </span>
                  </div>
                  {campaign.description && (
                    <p className="mb-2 text-sm text-dark-400 [overflow-wrap:anywhere]">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="text-accent-300">{formatPrize(campaign, t)}</span>
                    <span>
                      {t('admin.raffle.tickets')}: {campaign.tickets} / {campaign.unique_users}{' '}
                      {t('admin.raffle.users')}
                    </span>
                    <span>
                      {t('admin.raffle.maxWinners')}: {campaign.max_winners}
                    </span>
                    <span>
                      {t('admin.raffle.starts')}: {formatDate(campaign.starts_at)}
                    </span>
                    <span>
                      {t('admin.raffle.ends')}: {formatDate(campaign.ends_at)}
                    </span>
                    {campaign.winners > 0 && (
                      <span className="text-success-400">
                        {t('admin.raffle.winnersCount', { count: campaign.winners })}
                      </span>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-dark-700 pt-3 sm:border-0 sm:pt-0">
                    {(campaign.status === 'draft' || campaign.status === 'closed') && (
                      <button
                        disabled={busy || !enabled}
                        onClick={() => void handleActivate(campaign)}
                        className="rounded-lg bg-success-500/20 px-3 py-1.5 text-sm text-success-300 transition-colors hover:bg-success-500/30 disabled:opacity-50"
                      >
                        {t('admin.raffle.actions.activate')}
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        disabled={busy}
                        onClick={() => void handleClose(campaign)}
                        className="rounded-lg bg-warning-500/20 px-3 py-1.5 text-sm text-warning-300 transition-colors hover:bg-warning-500/30 disabled:opacity-50"
                      >
                        {t('admin.raffle.actions.close')}
                      </button>
                    )}
                    {(campaign.status === 'active' || campaign.status === 'closed') && (
                      <button
                        disabled={busy}
                        onClick={() => void handleDraw(campaign)}
                        className="rounded-lg bg-accent-500/20 px-3 py-1.5 text-sm text-accent-300 transition-colors hover:bg-accent-500/30 disabled:opacity-50"
                      >
                        {t('admin.raffle.actions.draw')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {winnersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            ref={winnersDialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900 p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-dark-100">
                  {t('admin.raffle.winnersTitle')}
                </h3>
                <p className="text-sm text-dark-400">
                  {t('admin.raffle.winnersSubtitle', { id: winnersModal.campaignId })}
                </p>
              </div>
              <button
                onClick={() => setWinnersModal(null)}
                className="rounded-lg p-2 text-dark-400 hover:bg-dark-800 hover:text-dark-200"
                aria-label={t('common.close')}
              >
                <XIcon />
              </button>
            </div>

            {winnersModal.winners.length === 0 ? (
              <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-sm text-dark-300">
                <p>{t('admin.raffle.drawSuccessNoWinners')}</p>
                <p className="mt-2 text-dark-400">
                  {t('admin.raffle.ticketStats', {
                    tickets: winnersModal.tickets ?? 0,
                    users: winnersModal.uniqueUsers ?? 0,
                  })}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {winnersModal.winners.map((winner) => (
                  <li
                    key={winner.id}
                    className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-dark-100">
                        #{winner.place} · user {winner.user_id}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          winner.awarded
                            ? 'bg-success-500/20 text-success-400'
                            : 'bg-dark-600 text-dark-300'
                        }`}
                      >
                        {winner.awarded
                          ? t('admin.raffle.awarded')
                          : t('admin.raffle.notAwarded')}
                      </span>
                    </div>
                    <div className="mt-1 text-dark-400">
                      {winner.ticket_code && (
                        <span className="mr-3 font-mono text-accent-300">{winner.ticket_code}</span>
                      )}
                      {winner.prize_text ||
                        (winner.prize_type === 'days' && winner.prize_value != null
                          ? t('admin.raffle.prizeDays', { count: winner.prize_value })
                          : winner.prize_type === 'balance' && winner.prize_value != null
                            ? t('admin.raffle.prizeBalance', {
                                amount: (winner.prize_value / 100).toFixed(0),
                              })
                            : winner.prize_type || '')}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setWinnersModal(null)}
              className="mt-5 w-full rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
