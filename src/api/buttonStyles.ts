import apiClient from './client';

export interface ButtonSectionConfig {
  style: 'primary' | 'success' | 'danger' | 'default';
  icon_custom_emoji_id: string;
  enabled: boolean;
  labels: Record<string, string>;
}

export interface ButtonStylesConfig {
  home: ButtonSectionConfig;
  subscription: ButtonSectionConfig;
  balance: ButtonSectionConfig;
  referral: ButtonSectionConfig;
  raffle: ButtonSectionConfig;
  support: ButtonSectionConfig;
  info: ButtonSectionConfig;
  admin: ButtonSectionConfig;
}

export type ButtonStylesUpdate = {
  [K in keyof ButtonStylesConfig]?: Partial<ButtonSectionConfig>;
};

export const BUTTON_SECTIONS = [
  'home',
  'subscription',
  'balance',
  'referral',
  'raffle',
  'support',
  'info',
  'admin',
] as const;

export type ButtonSection = (typeof BUTTON_SECTIONS)[number];

// Bot-side locales (includes 'ua' for Ukrainian, mapped from ISO 'uk' internally).
export const BOT_LOCALES = ['ru', 'en', 'ua', 'zh', 'fa'] as const;

export type BotLocale = (typeof BOT_LOCALES)[number];

const DEFAULT_SECTION: ButtonSectionConfig = {
  style: 'primary',
  icon_custom_emoji_id: '',
  enabled: true,
  labels: {},
};

export const DEFAULT_BUTTON_STYLES: ButtonStylesConfig = {
  home: { ...DEFAULT_SECTION, style: 'primary' },
  subscription: { ...DEFAULT_SECTION, style: 'success' },
  balance: { ...DEFAULT_SECTION, style: 'primary' },
  referral: { ...DEFAULT_SECTION, style: 'success' },
  raffle: { ...DEFAULT_SECTION, style: 'primary' },
  support: { ...DEFAULT_SECTION, style: 'primary' },
  info: { ...DEFAULT_SECTION, style: 'primary' },
  admin: { ...DEFAULT_SECTION, style: 'danger' },
};

/** Old cabinet defaults baked 🎫 into raffle labels; other sections use empty labels. */
const STALE_RAFFLE_LABELS = new Set(['🎫 Розыгрыш', '🎫 Raffle']);

function scrubRaffleLabels(labels: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [locale, value] of Object.entries(labels)) {
    const trimmed = (value || '').trim();
    if (!trimmed || STALE_RAFFLE_LABELS.has(trimmed)) continue;
    next[locale] = value;
  }
  return next;
}

function normalizeConfig(data: ButtonStylesConfig): ButtonStylesConfig {
  const result = {} as ButtonStylesConfig;
  const incoming = data && typeof data === 'object' ? data : ({} as ButtonStylesConfig);
  for (const section of BUTTON_SECTIONS) {
    const defaults = DEFAULT_BUTTON_STYLES[section];
    const saved = incoming[section];
    let labels = {
      ...(defaults.labels || {}),
      ...(saved?.labels || {}),
    };
    if (section === 'raffle') {
      labels = scrubRaffleLabels(labels);
    }
    result[section] = {
      ...DEFAULT_SECTION,
      ...defaults,
      ...saved,
      labels,
    };
  }
  return result;
}

export const buttonStylesApi = {
  getStyles: async (): Promise<ButtonStylesConfig> => {
    try {
      const response = await apiClient.get<ButtonStylesConfig>('/cabinet/admin/button-styles');
      return normalizeConfig(response.data);
    } catch {
      return DEFAULT_BUTTON_STYLES;
    }
  },

  updateStyles: async (update: ButtonStylesUpdate): Promise<ButtonStylesConfig> => {
    const response = await apiClient.patch<ButtonStylesConfig>(
      '/cabinet/admin/button-styles',
      update,
    );
    return normalizeConfig(response.data);
  },

  resetStyles: async (): Promise<ButtonStylesConfig> => {
    const response = await apiClient.post<ButtonStylesConfig>('/cabinet/admin/button-styles/reset');
    return normalizeConfig(response.data);
  },
};
