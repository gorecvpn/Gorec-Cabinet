import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminRaffleApi,
  type RafflePrizeSlot,
  type RafflePrizeType,
} from '../api/adminRaffle';
import { tariffsApi } from '../api/tariffs';
import { AdminBackButton } from '../components/admin';
import { useNotify } from '@/platform';
import { createNumberInputHandler } from '../utils/inputHelpers';

function toIsoOrNull(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

type SlotDraft = {
  prize_type: RafflePrizeType;
  prize_value: number | '';
  prize_text: string;
};

function emptySlot(): SlotDraft {
  return { prize_type: 'days', prize_value: '', prize_text: '' };
}

export default function AdminRaffleCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useSlots, setUseSlots] = useState(false);
  const [maxWinners, setMaxWinners] = useState<number | ''>(1);
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()]);
  const [prizeType, setPrizeType] = useState<RafflePrizeType>('days');
  const [prizeValue, setPrizeValue] = useState<number | ''>('');
  const [prizeText, setPrizeText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [ticketsPerPurchase, setTicketsPerPurchase] = useState<number | ''>(1);
  const [skipTrial, setSkipTrial] = useState(true);
  const [tariffTickets, setTariffTickets] = useState<Record<string, number | ''>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data: tariffsData } = useQuery({
    queryKey: ['admin-tariffs-for-raffle'],
    queryFn: () => tariffsApi.getTariffs(true),
  });
  const tariffs = useMemo(
    () => (tariffsData?.tariffs ?? []).filter((tariff) => !tariff.is_trial_available || tariff.is_active),
    [tariffsData],
  );

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

  const prizeTypes: { value: RafflePrizeType; labelKey: string }[] = [
    { value: 'days', labelKey: 'admin.raffle.form.prizeTypeDays' },
    { value: 'balance', labelKey: 'admin.raffle.form.prizeTypeBalance' },
    { value: 'custom', labelKey: 'admin.raffle.form.prizeTypeCustom' },
  ];

  const normalizePrize = (
    type: RafflePrizeType,
    value: number | '',
    text: string,
  ): { prize_type: RafflePrizeType; prize_value: number | null; prize_text: string | null } | string => {
    if (type === 'custom') {
      const trimmed = text.trim();
      if (!trimmed) return t('admin.raffle.form.prizeTextRequired');
      return { prize_type: type, prize_value: null, prize_text: trimmed };
    }
    const raw = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(raw) || raw <= 0) return t('admin.raffle.form.prizeValueRequired');
    return {
      prize_type: type,
      prize_value: type === 'balance' ? Math.round(raw * 100) : Math.round(raw),
      prize_text: null,
    };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t('admin.raffle.form.nameRequired'));
      return;
    }

    const perPurchase =
      typeof ticketsPerPurchase === 'number' ? ticketsPerPurchase : Number(ticketsPerPurchase);
    if (!Number.isFinite(perPurchase) || perPurchase < 1 || perPurchase > 50) {
      setFormError(t('admin.raffle.form.ticketsPerPurchaseInvalid'));
      return;
    }

    const tickets_by_tariff: Record<string, number> = {};
    for (const [tariffId, raw] of Object.entries(tariffTickets)) {
      if (raw === '' || raw == null) continue;
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) || n < 1 || n > 50) {
        setFormError(t('admin.raffle.form.ticketsByTariffInvalid'));
        return;
      }
      tickets_by_tariff[tariffId] = n;
    }

    let max_winners = 1;
    let prize_type: RafflePrizeType | string = prizeType;
    let prize_value: number | null = null;
    let prize_text: string | null = null;
    let prize_slots: RafflePrizeSlot[] | null = null;

    if (useSlots) {
      if (slots.length < 1) {
        setFormError(t('admin.raffle.form.slotsRequired'));
        return;
      }
      const built: RafflePrizeSlot[] = [];
      for (let i = 0; i < slots.length; i += 1) {
        const slot = slots[i];
        const normalized = normalizePrize(slot.prize_type, slot.prize_value, slot.prize_text);
        if (typeof normalized === 'string') {
          setFormError(`${t('admin.raffle.form.place', { place: i + 1 })}: ${normalized}`);
          return;
        }
        built.push({ place: i + 1, ...normalized });
      }
      prize_slots = built;
      max_winners = built.length;
      prize_type = built[0].prize_type;
      prize_value = built[0].prize_value ?? null;
      prize_text = built[0].prize_text ?? null;
    } else {
      const winners = typeof maxWinners === 'number' ? maxWinners : Number(maxWinners);
      if (!Number.isFinite(winners) || winners < 1 || winners > 1000) {
        setFormError(t('admin.raffle.form.maxWinnersInvalid'));
        return;
      }
      max_winners = winners;
      const normalized = normalizePrize(prizeType, prizeValue, prizeText);
      if (typeof normalized === 'string') {
        setFormError(normalized);
        return;
      }
      prize_type = normalized.prize_type;
      prize_value = normalized.prize_value;
      prize_text = normalized.prize_text;
    }

    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || null,
      max_winners,
      prize_type,
      prize_value,
      prize_text,
      prize_slots,
      tickets_per_purchase: perPurchase,
      tickets_by_tariff: Object.keys(tickets_by_tariff).length ? tickets_by_tariff : null,
      skip_trial_purchases: skipTrial,
      starts_at: toIsoOrNull(startsAt),
      ends_at: toIsoOrNull(endsAt),
    });
  };

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
            <label className="mb-1.5 block text-sm font-medium text-dark-300" htmlFor="raffle-starts">
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-accent-200">
                {t('admin.raffle.form.winnersSection')}
              </p>
              <p className="text-xs text-dark-400">{t('admin.raffle.form.winnersSectionHint')}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-dark-200">
              <input
                type="checkbox"
                checked={useSlots}
                onChange={(e) => setUseSlots(e.target.checked)}
                className="rounded border-dark-600"
              />
              {t('admin.raffle.form.usePrizeSlots')}
            </label>
          </div>

          {!useSlots ? (
            <>
              <label
                className="mb-1.5 block text-sm font-medium text-accent-200"
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

              <div className="mt-4">
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
                <div className="mt-3">
                  <label className="mb-1.5 block text-sm font-medium text-dark-300" htmlFor="raffle-prize-text">
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
                <div className="mt-3">
                  <label className="mb-1.5 block text-sm font-medium text-dark-300" htmlFor="raffle-prize-value">
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
            </>
          ) : (
            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div key={index} className="rounded-xl border border-dark-700 bg-dark-900/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-dark-100">
                      {t('admin.raffle.form.place', { place: index + 1 })}
                    </span>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-error-400 hover:text-error-300"
                        onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {prizeTypes.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          setSlots((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, prize_type: item.value } : s,
                            ),
                          )
                        }
                        className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                          slot.prize_type === item.value
                            ? 'border-accent-500 bg-accent-500/15 text-accent-300'
                            : 'border-dark-600 text-dark-300'
                        }`}
                      >
                        {t(item.labelKey)}
                      </button>
                    ))}
                  </div>
                  {slot.prize_type === 'custom' ? (
                    <input
                      value={slot.prize_text}
                      onChange={(e) =>
                        setSlots((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, prize_text: e.target.value } : s,
                          ),
                        )
                      }
                      placeholder={t('admin.raffle.form.prizeText')}
                      className="mt-2 w-full rounded-lg border border-dark-600 bg-dark-950 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500"
                    />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      step={slot.prize_type === 'balance' ? '0.01' : '1'}
                      value={slot.prize_value}
                      onChange={createNumberInputHandler(
                        (v) =>
                          setSlots((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, prize_value: v } : s)),
                          ),
                        0,
                      )}
                      placeholder={
                        slot.prize_type === 'days'
                          ? t('admin.raffle.form.prizeValueDays')
                          : t('admin.raffle.form.prizeValueBalance')
                      }
                      className="mt-2 w-full rounded-lg border border-dark-600 bg-dark-950 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500"
                    />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSlots((prev) => [...prev, emptySlot()])}
                className="rounded-lg border border-dashed border-dark-600 px-3 py-2 text-sm text-dark-300 hover:border-accent-500 hover:text-accent-300"
              >
                {t('admin.raffle.form.addPlace')}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-dark-700 p-4">
          <p className="mb-1 text-sm font-semibold text-dark-100">
            {t('admin.raffle.form.ticketsSection')}
          </p>
          <p className="mb-3 text-xs text-dark-400">{t('admin.raffle.form.ticketsSectionHint')}</p>

          <label
            className="mb-1.5 block text-sm font-medium text-dark-300"
            htmlFor="raffle-tickets-default"
          >
            {t('admin.raffle.form.ticketsPerPurchase')}
          </label>
          <input
            id="raffle-tickets-default"
            type="number"
            min={1}
            max={50}
            value={ticketsPerPurchase}
            onChange={createNumberInputHandler(setTicketsPerPurchase, 1, 50)}
            className="w-full rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500"
          />

          <label className="mt-3 flex items-center gap-2 text-sm text-dark-200">
            <input
              type="checkbox"
              checked={skipTrial}
              onChange={(e) => setSkipTrial(e.target.checked)}
              className="rounded border-dark-600"
            />
            {t('admin.raffle.form.skipTrial')}
          </label>
          <p className="mt-1 text-xs text-dark-500">{t('admin.raffle.form.skipTrialHint')}</p>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-dark-200">
              {t('admin.raffle.form.ticketsByTariff')}
            </p>
            <p className="text-xs text-dark-500">{t('admin.raffle.form.ticketsByTariffHint')}</p>
            {tariffs.length === 0 ? (
              <p className="text-xs text-dark-500">{t('admin.raffle.form.noTariffs')}</p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-dark-700 p-2">
                {tariffs.map((tariff) => (
                  <div
                    key={tariff.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-dark-900/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-dark-100">{tariff.name}</p>
                      <p className="text-xs text-dark-500">#{tariff.id}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      placeholder={String(ticketsPerPurchase || 1)}
                      value={tariffTickets[String(tariff.id)] ?? ''}
                      onChange={createNumberInputHandler(
                        (v) =>
                          setTariffTickets((prev) => ({
                            ...prev,
                            [String(tariff.id)]: v,
                          })),
                        1,
                        50,
                      )}
                      className="w-20 rounded-lg border border-dark-600 bg-dark-950 px-2 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
            {createMutation.isPending ? t('common.loading') : t('admin.raffle.form.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
