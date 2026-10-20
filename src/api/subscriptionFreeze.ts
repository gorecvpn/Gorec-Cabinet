import apiClient from './client';

/** Пауза (заморозка) подписки пользователем. Не путать с суточной паузой (`/subscription/pause`). */
export interface SubscriptionFreezeState {
  enabled: boolean;
  is_paused: boolean;
  paused_at: string | null;
  planned_until: string | null;
  remaining_days: number;
  remaining_seconds: number;
  day_options: number[];
  max_days: number;
  can_pause: boolean;
  /** Почему пауза недоступна: trial, daily, not_active, limit_reached, too_little_remaining, disabled… */
  reason: string | null;
  pauses_used: number;
  pauses_limit: number;
  next_available_at: string | null;
  subscription_id: number | null;
}

const subParams = (subscriptionId?: number) =>
  subscriptionId ? { params: { subscription_id: subscriptionId } } : undefined;

export const subscriptionFreezeApi = {
  getState: async (subscriptionId?: number): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.get('/cabinet/subscription/freeze', subParams(subscriptionId));
    return response.data;
  },

  freeze: async (days: number, subscriptionId?: number): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.post(
      '/cabinet/subscription/freeze',
      { days },
      subParams(subscriptionId),
    );
    return response.data;
  },

  unfreeze: async (subscriptionId?: number): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.post(
      '/cabinet/subscription/unfreeze',
      undefined,
      subParams(subscriptionId),
    );
    return response.data;
  },

  adminGetState: async (userId: number, subId: number): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.get(
      `/cabinet/admin/users/${userId}/subscriptions/${subId}/freeze`,
    );
    return response.data;
  },

  adminFreeze: async (
    userId: number,
    subId: number,
    days: number,
  ): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.post(
      `/cabinet/admin/users/${userId}/subscriptions/${subId}/freeze`,
      { days },
    );
    return response.data;
  },

  adminUnfreeze: async (userId: number, subId: number): Promise<SubscriptionFreezeState> => {
    const response = await apiClient.post(
      `/cabinet/admin/users/${userId}/subscriptions/${subId}/unfreeze`,
    );
    return response.data;
  },
};

/** Машинный код ошибки паузы из ответа API (`detail.code`), если он есть. */
export function freezeErrorCode(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (detail && typeof detail === 'object' && 'code' in detail) {
    const code = (detail as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}
