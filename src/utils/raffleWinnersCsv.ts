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

function revokeLater(url: string) {
  // Immediate revoke cancels the download in Telegram WebView / mobile Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function tryShareFile(filename: string, blob: Blob): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: blob.type || 'text/csv' });
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    if (typeof nav.share !== 'function') return false;
    if (typeof nav.canShare === 'function' && !nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file], title: filename });
    return true;
  } catch {
    return false;
  }
}

function clickDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  revokeLater(url);
}

/** Trigger a device download (or native share sheet on mobile / Telegram). */
export async function downloadBlobFile(filename: string, blob: Blob): Promise<void> {
  if (await tryShareFile(filename, blob)) return;
  clickDownload(filename, blob);
}

export async function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): Promise<void> {
  // BOM helps Excel open UTF-8 CSV correctly.
  const blob = new Blob(['\uFEFF', content], { type: mime });
  await downloadBlobFile(filename, blob);
}

/** True when a blob looks like CSV rather than an error JSON/HTML body. */
export async function blobLooksLikeCsv(blob: Blob): Promise<boolean> {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('json') || type.includes('html')) return false;
  const head = (await blob.slice(0, 64).text()).trimStart();
  if (!head) return false;
  if (head.startsWith('{') || head.startsWith('[') || head.startsWith('<!')) return false;
  if (type.includes('csv') || type.includes('text/plain') || type === '' || type.includes('octet-stream')) {
    return head.includes(',') || /^[a-zA-Z_]/.test(head);
  }
  return head.includes(',');
}
