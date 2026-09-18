import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadIcon } from '@/components/icons';
import { adminRaffleApi } from '@/api/adminRaffle';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

type PrizeImageFieldProps = {
  id: string;
  value: string;
  onChange: (url: string) => void;
  /** denser layout for prize slots */
  compact?: boolean;
};

function isPreviewable(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('/');
}

function resolvePreviewUrl(url: string): string {
  if (url.startsWith('/')) {
    const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    return `${base}${url}`;
  }
  return url;
}

export function PrizeImageField({ id, value, onChange, compact = false }: PrizeImageFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelClass = compact
    ? 'mb-1 block text-xs font-medium text-dark-400'
    : 'mb-1.5 block text-sm font-medium text-dark-300';
  const inputClass = compact
    ? 'w-full min-w-0 flex-1 rounded-lg border border-dark-600 bg-dark-950 px-3 py-2 text-sm text-dark-100 outline-none focus:border-accent-500'
    : 'w-full min-w-0 flex-1 rounded-xl border border-dark-600 bg-dark-900 px-3 py-2 text-dark-100 outline-none focus:border-accent-500';
  const hintClass = compact ? 'mt-1 text-[11px] text-dark-500' : 'mt-1 text-xs text-dark-500';

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!ACCEPT.split(',').includes(file.type)) {
      setError(t('admin.raffle.form.imageUploadTypeError'));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t('admin.raffle.form.imageUploadSizeError'));
      return;
    }
    setUploading(true);
    try {
      const result = await adminRaffleApi.uploadPrizeImage(file);
      onChange(result.url);
    } catch {
      setError(t('admin.raffle.form.imageUploadError'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <label className={labelClass} htmlFor={id}>
        {t('admin.raffle.form.imageUpload')}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          value={value}
          onChange={(e) => {
            setError(null);
            onChange(e.target.value);
          }}
          placeholder={t('admin.raffle.form.imageUrlPlaceholder')}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-dark-700 px-3 py-2 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('admin.raffle.form.imageUploadButton')}
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
          ) : (
            <UploadIcon className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t('admin.raffle.form.imageUploadButton')}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-hidden="true"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <p className={hintClass}>{t('admin.raffle.form.imageUrlHint')}</p>
      {error ? <p className="mt-1 text-xs text-error-400">{error}</p> : null}
      {isPreviewable(value) ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-dark-700">
          <img
            src={resolvePreviewUrl(value)}
            alt=""
            className="h-auto max-h-40 w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
    </div>
  );
}
