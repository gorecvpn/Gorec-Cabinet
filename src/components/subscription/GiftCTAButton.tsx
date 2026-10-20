import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, GiftIcon } from '@/components/icons';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

// GorecVPN: кнопка «Подарить подписку» под «Продлить подписку»
export default function GiftCTAButton() {
  const { t } = useTranslation();
  const { giftEnabled } = useFeatureFlags();
  if (!giftEnabled) return null;
  return (
    <Link to="/gift" className="block">
      <div
        className="group relative flex w-full items-center justify-between rounded-2xl border border-dark-700/40 px-5 py-4 transition-colors duration-300"
        style={{
          background:
            'linear-gradient(135deg, rgba(var(--color-accent-400), 0.08), rgba(var(--color-accent-400), 0.06))',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'rgba(var(--color-accent-400), 0.12)',
              color: 'rgb(var(--color-accent-400))',
            }}
          >
            <GiftIcon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-dark-50">
              {t('subscription.giftCta.title')}
            </div>
            <div className="text-[12px] text-dark-400">{t('subscription.giftCta.subtitle')}</div>
          </div>
        </div>
        <ChevronRightIcon className="h-5 w-5 flex-shrink-0 text-dark-400 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
