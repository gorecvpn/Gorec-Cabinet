import apiClient from './client';

export type RafflePrizeType = 'days' | 'balance' | 'custom';
export type RaffleCampaignStatus = 'draft' | 'active' | 'closed' | 'drawn';

export interface RafflePrizeSlot {
  place: number;
  prize_type: RafflePrizeType | string;
  prize_value?: number | null;
  prize_text?: string | null;
  image_url?: string | null;
}

export interface AdminRaffleCampaign {
  id: number;
  name: string;
  description: string | null;
  status: RaffleCampaignStatus | string;
  starts_at: string;
  ends_at: string | null;
  max_winners: number;
  prize_type: RafflePrizeType | string;
  prize_value: number | null;
  prize_text: string | null;
  prize_slots?: RafflePrizeSlot[] | null;
  tickets_per_purchase?: number;
  tickets_by_tariff?: Record<string, number> | null;
  skip_trial_purchases?: boolean;
  tickets: number;
  unique_users: number;
  winners: number;
  draw_seed?: string | null;
  draw_algorithm?: string | null;
  drawn_at?: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface AdminRaffleCampaignListResponse {
  enabled: boolean;
  campaigns: AdminRaffleCampaign[];
}

export interface CreateRaffleCampaignRequest {
  name: string;
  description?: string | null;
  max_winners?: number;
  prize_type?: RafflePrizeType | string;
  prize_value?: number | null;
  prize_text?: string | null;
  prize_slots?: RafflePrizeSlot[] | null;
  tickets_per_purchase?: number;
  tickets_by_tariff?: Record<string, number> | null;
  skip_trial_purchases?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface UpdateRaffleCampaignRequest {
  name?: string | null;
  description?: string | null;
  ends_at?: string | null;
  clear_ends_at?: boolean;
  prize_type?: RafflePrizeType | string | null;
  prize_value?: number | null;
  prize_text?: string | null;
  prize_slots?: RafflePrizeSlot[] | null;
  tickets_per_purchase?: number | null;
  tickets_by_tariff?: Record<string, number> | null;
  skip_trial_purchases?: boolean | null;
  starts_at?: string | null;
}

export interface AdminRaffleWinner {
  id: number;
  campaign_id: number;
  user_id: number;
  telegram_id?: number | null;
  username?: string | null;
  first_name?: string | null;
  display_name?: string | null;
  ticket_id?: number | null;
  ticket_code: string | null;
  place: number;
  prize_type: string | null;
  prize_value: number | null;
  prize_text: string | null;
  awarded: boolean;
  awarded_at?: string | null;
  created_at?: string | null;
}

export interface AdminRaffleDrawResponse {
  campaign_id: number;
  status: string;
  drawn_at?: string | null;
  draw_seed?: string | null;
  draw_algorithm?: string | null;
  winners: AdminRaffleWinner[];
}

export interface AdminRaffleCampaignDetailResponse {
  enabled: boolean;
  campaign: AdminRaffleCampaign;
  winners: AdminRaffleWinner[];
}


export interface RaffleImageUploadResponse {
  url: string;
  thumbnail_url: string | null;
  media_type: 'image';
  filename: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

export const adminRaffleApi = {
  listCampaigns: async (limit = 50, offset = 0): Promise<AdminRaffleCampaignListResponse> => {
    const response = await apiClient.get<AdminRaffleCampaignListResponse>(
      '/cabinet/admin/raffle/campaigns',
      { params: { limit, offset } },
    );
    return response.data;
  },

  getCampaign: async (campaignId: number): Promise<AdminRaffleCampaignDetailResponse> => {
    const response = await apiClient.get<AdminRaffleCampaignDetailResponse>(
      `/cabinet/admin/raffle/campaigns/${campaignId}`,
    );
    return response.data;
  },

  createCampaign: async (data: CreateRaffleCampaignRequest): Promise<AdminRaffleCampaign> => {
    const response = await apiClient.post<AdminRaffleCampaign>(
      '/cabinet/admin/raffle/campaigns',
      data,
    );
    return response.data;
  },

  activateCampaign: async (campaignId: number): Promise<AdminRaffleCampaign> => {
    const response = await apiClient.post<AdminRaffleCampaign>(
      `/cabinet/admin/raffle/campaigns/${campaignId}/activate`,
    );
    return response.data;
  },

  closeCampaign: async (campaignId: number): Promise<AdminRaffleCampaign> => {
    const response = await apiClient.post<AdminRaffleCampaign>(
      `/cabinet/admin/raffle/campaigns/${campaignId}/close`,
    );
    return response.data;
  },

  drawCampaign: async (campaignId: number): Promise<AdminRaffleDrawResponse> => {
    const response = await apiClient.post<AdminRaffleDrawResponse>(
      `/cabinet/admin/raffle/campaigns/${campaignId}/draw`,
    );
    return response.data;
  },

  awardWinner: async (campaignId: number, winnerId: number): Promise<AdminRaffleWinner> => {
    const response = await apiClient.post<AdminRaffleWinner>(
      `/cabinet/admin/raffle/campaigns/${campaignId}/winners/${winnerId}/award`,
    );
    return response.data;
  },

  updateCampaign: async (
    campaignId: number,
    data: UpdateRaffleCampaignRequest,
  ): Promise<AdminRaffleCampaign> => {
    const response = await apiClient.patch<AdminRaffleCampaign>(
      `/cabinet/admin/raffle/campaigns/${campaignId}`,
      data,
    );
    return response.data;
  },


  uploadPrizeImage: async (file: File): Promise<RaffleImageUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<RaffleImageUploadResponse>(
      '/cabinet/admin/raffle/upload',
      formData,
    );
    return response.data;
  },
  deleteCampaign: async (campaignId: number, force = false): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/raffle/campaigns/${campaignId}`, {
      params: force ? { force: true } : undefined,
    });
  },
};
