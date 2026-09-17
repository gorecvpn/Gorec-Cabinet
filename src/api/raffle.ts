import apiClient from './client';

export interface RaffleCampaignSummary {
  id: number;
  name: string;
  description: string | null;
  prize_type: string;
  prize_value: number | null;
  prize_text: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  max_winners: number;
}

export interface RaffleTicketItem {
  id: number;
  ticket_code: string;
  created_at: string;
  campaign_id: number;
}

export interface RaffleSummaryResponse {
  enabled: boolean;
  campaign: RaffleCampaignSummary | null;
  tickets: RaffleTicketItem[];
  ticket_count: number;
}

export const raffleApi = {
  getSummary: async (): Promise<RaffleSummaryResponse> => {
    const response = await apiClient.get<RaffleSummaryResponse>('/cabinet/raffle');
    return response.data;
  },
};
