import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminRaffleApi, type RafflePrizeType } from '../api/adminRaffle';
import { AdminBackButton } from '../components/admin';
import { useNotify } from '@/platform';
import { createNumberInputHandler } from '../utils/inputHelpers';

function toIsoOrNull(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function AdminRaffleCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxWinners, setMaxWinners] = useState<number | ''>(1);
  const [prizeType, setPrizeType] = useState<RafflePrizeType>('days');
  const [prizeValue, setPrizeValue] = useState<number | ''>('');
  const [prizeText, setPrizeText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: adminRaffleApi.createCampaign,
    onSuccess: () => {
      notify.success(t('admin.raffle.toast.created'));
      navigate('/admin/raffle');
    },
    onError: (err: unknown) => {
      let message = t('admin.raffle.toast.createError');
      if (err && typeof err === 'object' && 'response' in err) {
        const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data
          ?.detail;
        if (typeof detail === 'string' && detail.trim()) message = detail;
      }
      notify.error(message);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t('admin.raffle.form.nameRequired'));
      return;
    }

    const winners = typeof maxWinners === 'number' ? maxWinners : Number(maxWinners);
    if (!Number.isFinite(winners) || winners < 1 || winners > 1000) {
      setFormError(t('admin.raffle.form.maxWinnersInvalid'));
      return;
    }

    let prize_value: number | null = null;
    let prize_text: string | null = null;

    if (prizeType === 'custom') {
      const text = prizeText.trim();
      if (!text) {
        setFormError(t('admin.raffle.form.prizeTextRequired'));
        return;
      }
      prize_text = text;
    } else {
      const raw = typeof prizeValue === 'number' ? prizeValue : Number(prizeValue);
      if (!Number.isFinite(raw) || raw <= 0) {
        setFormError(t('admin.raffle.form.prizeValueRequired'));
        return;
      }
      // Balance prizes are stored in kopeks on the bot side.
      prize_value = prizeType === 'balance' ? Math.round(raw * 100) : Math.round(raw);
    }

    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || null,
      max_winners: winners,
      prize_type: prizeType,
      prize_value,
      prize_text,
      starts_at: toIsoOrNull(startsAt),
      ends_at: toIsoOrNull(endsAt),
    });
  };

  const prizeTypes: { value: RafflePrizeType; labelKey: string }[] = [
    { value: 'days', labelKey: 'admin.raffle.form.prizeTypeDays' },
    { value: 'balance', labelKey: 'admin.raffle.form.prizeTypeBalance' },
    { value: 'custom', labelKey: 'admin.raffle.form.prizeTypeCustom' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/raffle" />
        <div>
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.raffle.createTitle')}</h1>
          <p className="text-sm text-dark-400">{t('admin.raffle.createSubtitle')}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-dark-700 bg-dark-800 p-5"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark-300" htmlFor="raffle-name">
            {t('admin.raffle.form.name')}
          </label>
          <input
            id="raffle-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            required
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-dark-300"
            htmlFor="raffle-description"
          >
            {t('admin.raffle.form.description')}
          </label>
          <textarea
            id="raffle-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark-300"
              htmlFor="raffle-starts"
            >
              {t('admin.raffle.form.startsAt')}
            </label>
            <input
              id="raffle-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.raffle.form.startsAtHint')}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300" htmlFor="raffle-ends">
              {t('admin.raffle.form.endsAt')}
            </label>
            <input
              id="raffle-ends"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-accent-500/30 bg-accent-500/5 p-4">
          <label
            className="mb-1.5 block text-sm font-semibold text-accent-200"
            htmlFor="raffle-max-winners"
          >
            {t('admin.raffle.form.maxWinners')}
          </label>
          <input
            id="raffle-max-winners"
            type="number"
            min={1}
            max={1000}
            value={maxWinners}
            onChange={createNumberInputHandler(setMaxWinners, 1, 1000)}
            className="w-full rounded-xl border border-accent-500/40 bg-dark-900 px-3 py-2 text-lg font-semibold text-dark-100 outline-none focus:border-accent-500"
            required
          />
          <p className="mt-2 text-xs text-dark-400">{t('admin.raffle.form.maxWinnersHint')}</p>
          <p className="mt-1 text-xs text-dark-500">{t('admin.raffle.form.maxWinnersPrizeHint')}</p>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.raffle.form.prizeType')}
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {prizeTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPrizeType(item.value)}
                className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                  prizeType === item.value
                    ? 'border-accent-500 bg-accent-500/15 text-accent-300'
                    : 'border-dark-600 bg-dark-900 text-dark-300 hover:border-dark-500'
                }`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {prizeType === 'custom' ? (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark-300"
              htmlFor="raffle-prize-text"
            >
              {t('admin.raffle.form.prizeText')}
            </label>
            <input
              id="raffle-prize-text"
              value={prizeText}
              onChange={(e) => setPrizeText(e.target.value)}
              className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
        ) : (
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark-300"
              htmlFor="raffle-prize-value"
            >
              {prizeType === 'days'
                ? t('admin.raffle.form.prizeValueDays')
                : t('admin.raffle.form.prizeValueBalance')}
            </label>
            <input
              id="raffle-prize-value"
              type="number"
              min={1}
              step={prizeType === 'balance' ? '0.01' : '1'}
              value={prizeValue}
              onChange={createNumberInputHandler(setPrizeValue, 0)}
              className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
        )}

        {formError && (
          <div className="rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/raffle')}
            className="rounded-xl border border-dark-600 px-4 py-2 text-dark-300 transition-colors hover:border-dark-500"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-xl bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600 disabled:opacity-50"
          >
            {createMutation.isPending
              ? t('common.loading')
              : t('admin.raffle.form.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
