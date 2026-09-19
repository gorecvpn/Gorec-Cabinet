import { describe, expect, it } from 'vitest';
import { winnersToCsv } from './raffleWinnersCsv';
import type { AdminRaffleWinner } from '@/api/adminRaffle';

function winner(
  partial: Partial<AdminRaffleWinner> & Pick<AdminRaffleWinner, 'id' | 'place'>,
): AdminRaffleWinner {
  return {
    campaign_id: 1,
    user_id: 10,
    ticket_code: 'T-1',
    prize_type: 'days',
    prize_value: 7,
    prize_text: null,
    awarded: true,
    ...partial,
  };
}

describe('winnersToCsv', () => {
  it('emits header and sorted rows with escaped commas', () => {
    const csv = winnersToCsv([
      winner({ id: 2, place: 2, display_name: 'A, B', ticket_code: 'X' }),
      winner({ id: 1, place: 1, username: 'alice', ticket_code: 'Y' }),
    ]);
    const lines = csv.trimEnd().split('\n');
    expect(lines[0]).toContain('place,user_id');
    expect(lines[1]).toMatch(/^1,/);
    expect(lines[2]).toContain('"A, B"');
  });
});
