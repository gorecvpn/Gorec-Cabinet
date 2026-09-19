# Raffle admin — expected bot endpoints (cabinet UI)

Cabinet PR `feat/raffle-admin-enhancements` ships UI for grant-tickets and winners CSV.
As of Gorec bot `main` (4.16.9), these routes are **not merged yet**. The UI calls the
shapes below (aligned with existing `/cabinet/admin/raffle/*` patterns). Until the bot
exposes them, grant fails with the API error toast; CSV falls back to a client-side
export from the winners already loaded in the history modal.

## Existing (already on bot)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/cabinet/admin/raffle/campaigns` | list; includes `ends_at`, `tickets_by_tariff` |
| GET | `/cabinet/admin/raffle/campaigns/{id}` | detail + winners |
| POST | `/cabinet/admin/raffle/campaigns` | create (`tickets_by_tariff`, `ends_at`, …) |
| PATCH | `/cabinet/admin/raffle/campaigns/{id}` | update |
| POST | `/cabinet/admin/raffle/campaigns/{id}/activate` | |
| POST | `/cabinet/admin/raffle/campaigns/{id}/close` | |
| POST | `/cabinet/admin/raffle/campaigns/{id}/draw` | |
| POST | `/cabinet/admin/raffle/campaigns/{id}/winners/{winner_id}/award` | |
| POST | `/cabinet/admin/raffle/upload` | prize image |
| DELETE | `/cabinet/admin/raffle/campaigns/{id}` | |

Optional campaign fields the UI already reads when present:

- `ends_at` — shown on list/cards; with active status, “ended, awaiting draw” when past.
- `auto_draw` (`boolean`, optional) — when `true`, list shows an **Auto-draw** badge and
  labels the end time as auto-draw time.

## Expected: grant tickets (active campaign)

```
POST /cabinet/admin/raffle/campaigns/{campaign_id}/grant-tickets
Permission: raffle:edit
```

Request body:

```json
{
  "user_id": 123,
  "telegram_id": null,
  "count": 3,
  "note": "optional admin note"
}
```

- Exactly one of `user_id` or `telegram_id` should identify the user (bot may accept either).
- `count`: integer 1–50 (same range as `tickets_per_purchase`).
- Only for `status=active` campaigns (cabinet disables the button otherwise).

Suggested response:

```json
{
  "campaign_id": 1,
  "user_id": 123,
  "tickets_issued": 3,
  "ticket_codes": ["ABC1", "ABC2", "ABC3"],
  "tickets": 42,
  "unique_users": 10
}
```

## Expected: winners CSV (drawn campaign)

```
GET /cabinet/admin/raffle/campaigns/{campaign_id}/winners.csv
Permission: raffle:read
Content-Type: text/csv; charset=utf-8
```

Suggested columns (cabinet client fallback uses the same):

`place,user_id,telegram_id,username,display_name,ticket_code,prize_type,prize_value,prize_text,awarded,awarded_at`

404 → cabinet builds CSV from `GET .../campaigns/{id}` winners in the browser.
