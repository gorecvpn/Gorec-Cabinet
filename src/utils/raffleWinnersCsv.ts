import type { AdminRaffleWinner } from '@/api/adminRaffle';

const CSV_HEADERS = [
  'place',
  'user_id',
  'telegram_id',
  'username',
  'display_name',
  'ticket_code',
  'prize_type',
  'prize_value',
  'prize_text',
  'awarded',
  'awarded_at',
] as const;

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build a winners report CSV from admin raffle winner rows (client fallback). */
export function winnersToCsv(winners: AdminRaffleWinner[]): string {
  const lines = [CSV_HEADERS.join(',')];
  const sorted = [...winners].sort((a, b) => a.place - b.place || a.id - b.id);
  for (const winner of sorted) {
    lines.push(
      [
        winner.place,
        winner.user_id,
        winner.telegram_id ?? '',
        winner.username ?? '',
        winner.display_name ?? '',
        winner.ticket_code ?? '',
        winner.prize_type ?? '',
        winner.prize_value ?? '',
        winner.prize_text ?? '',
        winner.awarded ? 'true' : 'false',
        winner.awarded_at ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
