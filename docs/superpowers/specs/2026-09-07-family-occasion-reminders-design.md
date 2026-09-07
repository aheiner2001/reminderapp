# Family Occasion Reminders — Design Spec

**Date:** 2026-09-07  
**Status:** Draft for user review  
**Working name:** Family Occasion Reminders

## Problem

Families with many kids or grandkids struggle to remember birthdays and other gift-worthy dates early enough to plan and buy something. Phone calendars help individuals; they do not reliably coordinate a household or deliver a clear “time to shop” nudge.

## Goal

Ship a phone-friendly web app a family can share now. Later, the same product can grow into something sellable (SMS, billing, native apps) without rewriting the core model.

## Product decisions (locked)

| Decision | Choice |
| --- | --- |
| Sharing model | Shared family group; everyone gets reminders by default |
| Customization (v1) | Per-person mute per occasion; per-person email on/off |
| Client | Web app that feels app-like on phones (PWA); native later |
| Channels (v1) | Email only; SMS later |
| Occasion types | Any custom label + date (birthday, anniversary, Christmas, graduation, etc.) |
| Lead time | Family-wide default days-before; overridable per occasion |
| Permissions | Equal household — any member can invite and add/edit/delete occasions |
| Families per user (v1) | One active family per user |

## Explicitly out of scope for v1

- SMS / text messages
- Push notifications
- Payments / subscriptions
- Native iOS/Android apps
- Gift ideas, shopping links, or wishlists
- Per-occasion recipient picking (beyond mute/opt-out)
- Multiple families per user
- Admin-only roles

## Users and core loop

1. Someone creates a family and invites others by email.
2. Any member adds occasions (required label, optional person name, date, optional lead-time override).
3. The family has a default “remind N days before” (default **14**); an occasion may override N.
4. Each member receives the reminder email unless they muted that occasion or turned email off.
5. A daily job sends only due emails and records sends so the same reminder is not repeated.
6. A member may leave the family (stops future emails for them). Removing other members is out of scope for v1.

## Architecture

### Stack

- **Next.js** — web UI + API routes / server actions; installable as a PWA
- **Supabase Auth** — email magic link sign-in
- **Supabase Postgres** — source of truth for families, members, occasions, mutes, send log
- **Resend** — outbound reminder emails
- **Daily scheduled job** — Vercel Cron (or equivalent) calling a secured endpoint that runs reminder logic

Firebase is **not** used. It can provide auth and data storage, but it does not send scheduled reminder email/SMS by itself; yearly “N days before” queries are a better fit for Postgres + cron. SMS later would use a provider such as Twilio on top of the same reminder job.

### High-level flow

```text
Member (PWA)
    │
    ▼
Next.js app ──► Supabase Auth / Postgres
    │
    │  (daily)
    ▼
Cron endpoint ──► query due occasions ──► Resend ──► reminder_sends log
```

### Components (boundaries)

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| Auth & session | Magic-link sign-in, session cookies | Supabase Auth |
| Family membership | Create family, accept invite, list members | Postgres |
| Occasions | CRUD occasions; compute next occurrence | Postgres |
| Preferences | Family default lead days + timezone; member email on/off; mutes | Postgres |
| Reminder scheduler | Daily: find due reminders, send, log, retry failures once | Postgres, Resend |
| Email templates | Plain, clear “occasion coming up in N days” message | Resend |

## Data model

### `families`

- `id`
- `name`
- `default_lead_days` (integer, default **14**)
- `timezone` (IANA name, e.g. `America/Chicago`; set at family creation)
- `created_at`

### `family_members`

- `id`
- `family_id`
- `user_id`
- `email` (denormalized for sending / invites display)
- `email_reminders_enabled` (boolean, default true)
- `joined_at`

Constraint (v1): a user may belong to at most one family.

### `invites`

- `id`
- `family_id`
- `email`
- `token`
- `invited_by`
- `created_at`
- `accepted_at` (nullable)
- `expires_at` (default: 7 days after `created_at`)

### `occasions`

- `id`
- `family_id`
- `title` (required label, e.g. “Birthday”, “Christmas”, “Graduation”)
- `person_name` (optional; who it is for / about — empty for general holidays)
- `month` (1–12)
- `day` (1–31)
- `year` (nullable; null = recurs every year)
- `lead_days_override` (nullable; null = use family default)
- `created_by`
- `created_at`
- `updated_at`

Recurrence rule (v1): if `year` is null, the occasion recurs annually on month/day. If `year` is set, it is a one-time date (still reminded `lead_days` before that calendar date).

### `occasion_mutes`

- `occasion_id`
- `member_id`
- Unique `(occasion_id, member_id)`

### `reminder_sends`

- `id`
- `occasion_id`
- `member_id`
- `occurrence_date` (the calendar date of the occasion for this cycle)
- `lead_days` (the N used for this send)
- `channel` (`email` for v1)
- `status` (`sent` | `failed`)
- `provider_message_id` (nullable)
- `error` (nullable)
- `sent_at`

Unique key: `(occasion_id, member_id, occurrence_date, lead_days, channel)`. At most one send row per reminder window. Successful sends are never resent. Failed rows may be retried (row updated to `sent`) while still on the due calendar day.

## Reminder algorithm

Run once per day (recommended: early morning UTC is fine if each family is evaluated in its own timezone).

For each family:

1. Resolve “today” in `families.timezone`.
2. For each occasion, compute the next `occurrence_date` on or after today (annual or one-time).
3. Effective lead days = `lead_days_override ?? default_lead_days`.
4. Reminder is due if `occurrence_date - today == effective lead days` (in calendar days in that timezone).
5. Candidate recipients = family members with `email_reminders_enabled = true` who do **not** have an `occasion_mutes` row for that occasion.
6. Skip if a `reminder_sends` row exists with `status = sent` for that occasion/member/occurrence/lead/channel.
7. Send email via Resend; insert or update `reminder_sends` as `sent` or `failed`.
8. Retry: if a `failed` row exists and today is still the due day for that window, attempt send again and update the same row. After the due day passes, that window is not retried (acceptable for v1; ops can re-run cron more than once on the due day if needed).

### Leap day

If month/day is Feb 29 and the target year is not a leap year, treat the occurrence as Feb 28.

### Lead time = 0

Allowed: email on the day of the occasion.

## Screens (v1)

1. **Sign in** — email magic link  
2. **Create or join family** — first-run gate  
3. **Home** — upcoming occasions sorted by next occurrence  
4. **Add / edit occasion** — label, person, date, optional lead-time override  
5. **Occasion detail** — mute toggle for current member  
6. **Family settings** — name, default lead days, timezone, invite by email  
7. **My notification settings** — email reminders on/off; leave family  

## Permissions

| Action | Who |
| --- | --- |
| Invite members | Any member |
| Add / edit / delete occasions | Any member |
| Change family name, default lead days, timezone | Any member |
| Mute an occasion | That member only (self) |
| Toggle email reminders | That member only (self) |
| Leave family | That member only (self) |

No admin role in v1. Removing other members is deferred.

## Email content (v1)

Subject and body should include:

- Occasion label and person/name
- Occasion date
- How many days until it (the lead window)
- Family name
- Link back to the app (occasion or home)

No marketing footer beyond a short “you’re receiving this because you joined {family}.” Unsubscribe path for v1 = turn off email in My notification settings (link in footer).

## Error handling

- **Invite expired / invalid:** clear error; allow request of a new invite  
- **Email send failure:** log `failed`; retry on a subsequent cron if still due  
- **Cron auth failure:** endpoint requires a secret header/token; reject otherwise  
- **Member removed or left:** delete membership and mutes; no further sends  
- **Occasion deleted:** cascade/stop further sends  

## Testing / acceptance

- Create family, invite second user, both see the same occasions  
- Add occasion with lead days 0 or 1 → triggering the job sends email to both  
- Mute as user A → A skipped, B still receives  
- User A disables email → A skipped  
- Second cron run same day → no duplicate successful sends  
- Feb 29 occasion in a non-leap year → occurrence treated as Feb 28  
- Per-occasion lead override differs from family default → uses override  

## Future (post-v1)

- SMS via Twilio (member chooses email, SMS, or both)
- Per-occasion recipient picking
- Billing / multi-family / org features for selling
- Native apps wrapping the same backend
- Push notifications
- Admin vs member roles for larger families

## Success criteria

A real family can invite relatives, enter birthdays and other dates, and reliably receive a single timely email per reminder window without duplicate spam — on a phone browser, without installing a store app.
