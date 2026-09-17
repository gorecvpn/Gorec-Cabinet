import apiClient from './client';

export type RafflePrizeType = 'days' | 'balance' | 'custom';
export type RaffleCampaignStatus = 'draft' | 'active' | 'closed' | 'drawn';

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
  tickets: number;
  unique_users: number;
  winners: number;
  created_at: string | null;
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
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface AdminRaffleWinner {
  id: number;
  user_id: number;
  ticket_code: string | null;
  place: number;
  prize_type: string | null;
  prize_value: number | null;
  prize_text: string | null;
  awarded: boolean;
}

export interface AdminRaffleDrawResponse {
  campaign_id: number;
  status: string;
  winners: AdminRaffleWinner[];
}

export const adminRaffleApi = {
  listCampaigns: async (limit = 50, offset = 0): Promise<AdminRaffleCampaignListResponse> => {
    const response = await apiClient.get<AdminRaffleCampaignListResponse>(
      '/cabinet/admin/raffle/campaigns',
      { params: { limit, offset } },
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
};
