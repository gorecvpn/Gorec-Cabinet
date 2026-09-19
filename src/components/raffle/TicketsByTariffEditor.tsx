import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createNumberInputHandler } from '@/utils/inputHelpers';

export type TariffOption = {
  id: number;
  name: string;
};

type Props = {
  tariffs: TariffOption[];
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  /** Default tickets_per_purchase — shown as the fallback for tariffs without an override. */
  defaultTickets: number;
  disabled?: boolean;
};

/**
 * Row-based tickets-by-tariff editor: only list overrides that matter,
 * add via tariff select + count, remove with one click.
 */
export function TicketsByTariffEditor({
  tariffs,
  value,
  onChange,
  defaultTickets,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const [pendingTariffId, setPendingTariffId] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number | ''>(defaultTickets || 1);

  const tariffNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const tariff of tariffs) {
      map.set(String(tariff.id), tariff.name);
    }
    return map;
  }, [tariffs]);

  const rows = useMemo(() => {
    return Object.entries(value)
      .map(([tariffId, count]) => ({
        tariffId,
        count,
        name: tariffNameById.get(tariffId) || `#${tariffId}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [value, tariffNameById]);

  const availableTariffs = useMemo(
    () => tariffs.filter((tariff) => !(String(tariff.id) in value)),
    [tariffs, value],
  );

  const addOverride = () => {
    if (disabled || !pendingTariffId) return;
    const n = typeof pendingCount === 'number' ? pendingCount : Number(pendingCount);
    if (!Number.isFinite(n) || n < 1 || n > 50) return;
    onChange({ ...value, [pendingTariffId]: Math.round(n) });
    const nextAvailable = availableTariffs.filter((t) => String(t.id) !== pendingTariffId);
    setPendingTariffId(nextAvailable[0] ? String(nextAvailable[0].id) : '');
    setPendingCount(defaultTickets || 1);
  };

  const removeOverride = (tariffId: string) => {
    if (disabled) return;
    const next = { ...value };
    delete next[tariffId];
    onChange(next);
  };

  const updateCount = (tariffId: string, count: number | '') => {
    if (disabled) return;
    if (count === '' || count == null) return;
    const n = typeof count === 'number' ? count : Number(count);
    if (!Number.isFinite(n) || n < 1 || n > 50) return;
    onChange({ ...value, [tariffId]: Math.round(n) });
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-dark-200">
          {t('admin.raffle.form.ticketsByTariff')}
        </p>
        <p className="text-xs text-dark-500">{t('admin.raffle.form.ticketsByTariffHint')}</p>
        <p className="mt-1 text-xs text-dark-400">
          {t('admin.raffle.form.ticketsByTariffDefault', { count: defaultTickets || 1 })}
        </p>
      </div>

      {tariffs.length === 0 ? (
        <p className="text-xs text-dark-500">{t('admin.raffle.form.noTariffs')}</p>
      ) : (
        <>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-dark-700 px-3 py-3 text-xs text-dark-500">
              {t('admin.raffle.form.ticketsByTariffEmpty')}
            </p>
          ) : (
            <div className="space-y-2 rounded-xl border border-dark-700 p-2">
              {rows.map((row) => (
                <div
                  key={row.tariffId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-dark-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-dark-100">{row.name}</p>
                    <p className="text-xs text-dark-500">#{row.tariffId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`tariff-tickets-${row.tariffId}`}>
                      {t('admin.raffle.form.ticketsByTariffCount')}
                    </label>
                    <input
                      id={`tariff-tickets-${row.tariffId}`}
                      type="number"
                      min={1}
                      max={50}
                      disabled={disabled}
                      value={row.count}
                      onChange={createNumberInputHandler(
                        (v) => updateCount(row.tariffId, v),
                        1,
                        50,
                      )}
                      className="w-20 rounded-lg border border-dark-600 bg-dark-950 px-2 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeOverride(row.tariffId)}
                      className="rounded-lg px-2 py-1 text-xs text-error-400 hover:bg-error-500/10 hover:text-error-300 disabled:opacity-50"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {availableTariffs.length > 0 && !disabled && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dark-600 bg-dark-900/40 p-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  className="mb-1 block text-xs font-medium text-dark-400"
                  htmlFor="raffle-tariff-override-select"
                >
                  {t('admin.raffle.form.ticketsByTariffAdd')}
                </label>
                <select
                  id="raffle-tariff-override-select"
                  value={pendingTariffId}
                  onChange={(e) => setPendingTariffId(e.target.value)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-950 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500"
                >
                  <option value="">{t('admin.raffle.form.ticketsByTariffSelect')}</option>
                  {availableTariffs.map((tariff) => (
                    <option key={tariff.id} value={String(tariff.id)}>
                      {tariff.name} (#{tariff.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-28">
                <label
                  className="mb-1 block text-xs font-medium text-dark-400"
                  htmlFor="raffle-tariff-override-count"
                >
                  {t('admin.raffle.form.ticketsByTariffCount')}
                </label>
                <input
                  id="raffle-tariff-override-count"
                  type="number"
                  min={1}
                  max={50}
                  value={pendingCount}
                  onChange={createNumberInputHandler(setPendingCount, 1, 50)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-950 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500"
                />
              </div>
              <button
                type="button"
                disabled={!pendingTariffId}
                onClick={addOverride}
                className="rounded-lg border border-accent-500/40 bg-accent-500/10 px-3 py-2 text-sm text-accent-300 transition-colors hover:bg-accent-500/20 disabled:opacity-40"
              >
                {t('admin.raffle.form.ticketsByTariffAddButton')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
