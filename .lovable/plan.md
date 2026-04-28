# SMTP self-hosted + Notifications email integration

## Context (already in place)
- `app_settings` table exists (RLS: select=authenticated, write=admin) with keys `smtp_host/port/user/password/from_email/from_name`.
- Edge function `send-email` already validates admin role server-side, reads SMTP config from `app_settings`, sends via `denomailer`, and logs to `audit_logs`. Verify_jwt=false with manual JWT check.
- Notifications module is live: `notifications`, `notification_rules` tables, `triggerNotification()` helper, rules support `channels: ["in_app","email","push"]` (email channel is currently ignored).
- No third-party email provider — pure SMTP, white-label.

## What changes

### 1. Database (1 migration)
Add app_settings rows (idempotent upsert via insert-tool, not migration):
- `smtp_secure` (tls|ssl|none, default "tls")
- `support_email`
- `notif_email_enabled` (default "true")
- `notif_rappel_jours_defaut` (default "3")

New table `notification_email_log`:
- `id, notification_id (nullable fk), recipient_email, recipient_user_id, subject, status (queued|sent|failed|skipped), error, sent_at, created_at, dedup_key`
- RLS: admin + responsable_si full access; users select own (`recipient_user_id = auth.uid()`)
- Index on `dedup_key`, `created_at desc`

New table `notification_deadline_tracking` (entities to watch for échéance reminders):
- Reuses existing entities. No new table needed — cron will scan `tickets.echeance`, `preventif.next_due_date`, `ordres_fabrication.date_fin_prevue` and dedupe via `notification_email_log.dedup_key`.

Trigger `notify_email_dispatch` on `notifications` AFTER INSERT:
- If parent rule's `channels` jsonb contains `"email"` AND `notif_email_enabled = true`, call `pg_net.http_post` to `send-notification-email` edge function with notification id. (Async, non-blocking.)
- Falls back gracefully if pg_net unavailable — front also invokes after `triggerNotification`.

### 2. Edge functions (4 total)

**Reuse `send-email`** as low-level SMTP transport — keep as-is.

**New `send-notification-email`** (`verify_jwt=false`, manual auth via service-role internal token OR admin JWT):
- Body: `{ notification_id }` OR `{ recipient_email, subject, html, text, dedup_key }`.
- Reads `notif_email_enabled` — if false, inserts log row `status=skipped` and returns 200.
- If `notification_id`: loads notification, resolves recipient(s) — `recipient_user_id` → auth.users email; `recipient_role` → fan-out to all users having that role via `user_roles` + `auth.admin.listUsers()` cache.
- Renders HTML template inline (header with `app_name` from settings, body with title+message+action_url, footer with `support_email`).
- Calls SMTP directly via denomailer (same code pattern as existing `send-email`, factored into shared helper at top of file — no `_shared` import).
- Inserts `notification_email_log` row per recipient with status.
- Dedup: if same `dedup_key` exists with status=sent in last 24h → skip.

**New `send-test-email`** (`verify_jwt=false`, admin-only):
- Body: `{ to }`. Sends fixed-content test email through SMTP. Returns precise SMTP error. Logs to `audit_logs`.
- Effectively a thin wrapper — could be merged into existing `send-email` with `is_test=true`, but kept separate for clarity per user spec.

**New `check-deadlines`** (`verify_jwt=false`, validates internal cron secret header `x-cron-secret` against `app_settings.cron_secret`):
- Reads `notif_rappel_jours_defaut` (N).
- Scans:
  - `tickets` where `status NOT IN ('resolu','ferme')` and `echeance` between today and today+N (rappel) or `echeance < today` (retard).
  - `preventif` plans where `next_due_date` between today and today+N or overdue.
  - `ordres_fabrication` where `date_fin_prevue` between today and today+N and not closed.
- For each match → calls `triggerNotification` server-side via direct `notifications` insert + invokes `send-notification-email` with dedup_key `deadline:{entity_type}:{id}:{YYYY-MM-DD}`.
- Returns summary `{scanned, sent, skipped}`.

**`admin-save-smtp-password`**: NOT needed as a separate function — existing `app_settings` admin RLS already protects writes from authenticated admins, and the `is_secret=true` flag prevents the value from being exposed in the listing UI. Will document this in the admin page (admin client writes directly via supabase-js with their JWT — RLS gates it).

If user insists on edge-function path for symmetry: trivial wrapper that upserts via service role. **Decision: skip it; use direct upsert under admin RLS** (simpler, equally secure, matches existing pattern in project).

### 3. config.toml
Add blocks for the 3 new functions:
```toml
[functions.send-notification-email]
verify_jwt = false
[functions.send-test-email]
verify_jwt = false
[functions.check-deadlines]
verify_jwt = false
```

### 4. Cron job (pg_cron)
Schedule `check-deadlines` daily at 07:00 Africa/Algiers (=06:00 UTC) via `cron.schedule` calling `net.http_post` with the `x-cron-secret` header. Inserted via insert-tool so the secret stays out of source.

### 5. Frontend

**New page `src/pages/parametres/SmtpConfigAdmin.tsx`** route `/parametres/smtp` (admin only):
- Section "Serveur SMTP": host, port, user, password (placeholder `••••••••` if `is_secret` row exists & non-empty; only sent on change), from_name, from_email, secure (tls/ssl/none) → save via admin upsert on `app_settings`.
- Section "Test": email input + button → invokes `send-test-email`. Toast with detailed error.
- Section "Notifications email": switches `notif_email_enabled`, numeric `notif_rappel_jours_defaut` (1-30), `support_email`.

**Update `RuleEditorDialog`**: existing `channels` checkboxes (in_app/email/push) — ensure email checkbox is enabled and labeled "Email (SMTP)".

**Update `src/lib/notifications.ts` `triggerNotification`**: after inserting in-app rows, if any matching rule has `email` channel + `notif_email_enabled=true`, fire-and-forget `supabase.functions.invoke('send-notification-email', { body: { notification_id } })` for each inserted row. Errors swallowed (already in try/catch).

**Add to `Parametres.tsx` / Apps**: a "Configuration SMTP & Emails" tile (admin only, icon `Mail`).

### 6. Audit
Each test/save action writes to `audit_logs` (already done in `send-email`; replicated in new functions).

## Out of scope / clarifications
- No bulk marketing — emails strictly transactional, triggered per-notification.
- No HTML editor — fixed branded template using `app_name` + accent color.
- Reuse current `denomailer` (no Resend/SendGrid). 100% self-hosted.
- `admin-save-smtp-password` deliberately NOT created — direct admin-RLS upsert is equivalent and consistent with the codebase. If you want it strictly per spec, say so and I'll add it.

## Files touched
- `supabase/migrations/<ts>_email_notifications.sql` (new tables, trigger, RLS)
- `supabase/functions/send-notification-email/index.ts` (new)
- `supabase/functions/send-test-email/index.ts` (new)
- `supabase/functions/check-deadlines/index.ts` (new)
- `supabase/config.toml` (3 new function blocks)
- `src/pages/parametres/SmtpConfigAdmin.tsx` (new)
- `src/App.tsx` (route)
- `src/pages/Parametres.tsx` (tile)
- `src/lib/notifications.ts` (email dispatch hook)
- Insert-tool calls: seed new app_settings keys, schedule pg_cron.
