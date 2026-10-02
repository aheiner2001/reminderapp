# Birthday & Anniversary Reminder — Specification

Date: October 2, 2026 · Status: Draft for review · Deliverable: Product specification, not implementation

## 1. Purpose and confirmed intent

Help a user remember birthdays and anniversaries early enough to plan a gift, make a call, or send a greeting. The user confirmed that reminders go only to the app user. People listed in the app do not receive messages and do not need accounts, email addresses, or phone numbers.

The three supplied mockups establish a table of event settings, a beginning-of-month summary covering this month and next month, and an optional daily countdown. Weekly summaries are indicated in the table but their exact content was not shown. Defaults below are proposed design decisions for review.

Success means a user can enter an event, preview its reminders, and receive the correct summary at the chosen local time while the app is closed.

## 2. Approaches and recommendation

| Approach | Advantages | Trade-offs |
|---|---|---|
| Web app with email first; SMS second — recommended | Matches the mockups, supports private accounts and precise rules; email requires only the user's address | Requires a backend scheduler and email delivery setup |
| Spreadsheet with scheduled automation | Quick personal prototype, easy data entry | Account isolation, editing, delivery tracking, and preference logic become harder as usage grows |
| Email and SMS together at launch | Both requested channels available immediately | Adds phone verification, consent, sender onboarding, and recurring messaging costs before the basic flow is proven |

Recommended release sequence: email and in-app reminders first, then SMS using the same reminder engine. Preserve a Text Reminder column in the initial UI, labeled “Coming soon” and disabled until SMS is operational.

## 3. Scope

### First release

- Private sign-in and account settings.
- Add, edit, archive, and delete annual birthdays and anniversaries.
- Table with per-event email, lead-time, daily, monthly, and weekly settings.
- Upcoming events view and reminder previews.
- Scheduled email reminders and delivery history.
- Global pause and email unsubscribe.
- Mobile-friendly cards exposing the same settings as the desktop table.

### Second release

- Optional verified phone number, explicit SMS opt-in, per-event text selection, SMS delivery history, and opt-out handling.

### Deferred

Automatic greetings, contact scraping, reading email or text messages, address-book access, social-network imports, shared family accounts, gifts, payments, and AI-generated messages. Manual entry is sufficient for the first release; CSV import can be added later.

## 4. Screens and input fields

| Screen | Required behavior |
|---|---|
| Onboarding | Verify email, select timezone, set default lead time and send time; create first event |
| Events | Show name, event type, event date, email toggle, text status/toggle, lead time, daily toggle, monthly toggle, weekly toggle, edit/archive actions |
| Add/Edit | Require name, event type, month, and day; optional year and notes; reject impossible dates |
| Upcoming | Sort by next occurrence; show date and calendar days remaining; filter birthdays/anniversaries |
| Settings | Manage recipient address/phone, verification, timezone, delivery time, defaults, channel pause, and account deletion |
| Preview/History | Preview example summaries without sending; show queued, accepted, delivered, failed, or unknown delivery states honestly |

Name allows 1–100 trimmed characters. Types are Birthday and Anniversary. Year is optional; display age or anniversary number only when a valid year is present. Notes are private and excluded from reminder messages by default. Use labeled switches and status text; do not rely on green/red color alone.

## 5. Exact reminder rules

All rules use the account's IANA timezone and calendar dates, not elapsed multiples of 24 hours. Proposed defaults: 9:00 AM local time, lead time 7 days, email on, monthly on, weekly on, daily off. A new account's timezone is suggested from the browser and confirmed by the user.

Lead time accepts integers from 0–365 or “Use default.” The default is resolved when scheduling, so changing the account default affects events without an override. Changing it previews the impact before saving.

| Reminder | Proposed behavior |
|---|---|
| Monthly | On the first day of each month, include monthly-enabled events occurring in that entire month and the next calendar month, grouped under separate headings. Lead time does not filter this summary. |
| Weekly | On Monday, include weekly-enabled events whose next occurrence falls today through six days from today, inclusive. Lead time does not filter this summary. |
| Daily | Every day, include daily-enabled events with days remaining between 0 and their effective lead time, inclusive. |
| One-time advance | For events with daily off, send once when days remaining equals the effective lead time. With daily on, that date is covered by the daily countdown. |
| Event day | Include every active event on its occurrence date. Combine with the daily or advance entry if already eligible, so each event appears once in the day's alerts section. |

Channel selection is per event. An event appears in an email only if Email Reminder is on and the account email channel is enabled and verified. The corresponding rule applies independently to SMS in release two. If both event channels are off, show “In-app only.” Global pause overrides all event switches.

At most one logical scheduled summary per user, channel, and local date. Combine monthly, weekly, and daily/advance/event-day sections when schedules coincide. Keep monthly and weekly headings intact; an event may appear in those different contexts but only once within each section. Skip empty sections and do not send an empty message. SMS may require multiple billed segments; one logical summary does not imply one SMS segment.

Changing preferences affects unsent jobs. Do not backfill earlier advance reminders when an event is created inside its lead window; daily reminders begin at the next scheduled time if enabled, and event-day reminders still apply. A separate test-send button is explicit and rate-limited.

## 6. Message examples

Monthly email subject: “Your October and November birthdays & anniversaries.” Group by month and event type; show name, date, and age/anniversary number only when known.

Daily example: “Taylor's anniversary is in 12 days — October 14.” Event-day example: “Today is Roger's birthday — October 2.” Generate countdowns from stored dates; do not copy hard-coded numbers from the mockups. The supplied daily example has inconsistent countdowns for its two dates.

Each email includes a settings link and an authenticated or signed unsubscribe action. An SMS identifies the app and provides opt-out instructions. Never expose other users' events or recipient information.

## 7. Email and text access

No inbox permission, Gmail integration, text-message access, or recipient password is required. The user supplies their own address and optionally phone number; the app sends from its own configured sender through a delivery provider.

Email setup: configure an app-owned sender domain and provider, verify the user's recipient address, and handle bounces, complaints, and unsubscribe. Resend is a candidate provider; its sender-domain setup requires domain verification. An app login alone does not enable reminder delivery automatically.

SMS setup: collect an optional phone number in international format; verify ownership and record a separate explicit reminder opt-in with timestamp and consent-text version. Phone verification and permission to send reminders are separate states. Process STOP immediately, disable queued SMS, and require renewed consent before restarting. A changed number must be reverified and opted in again.

Twilio is a candidate provider. Its US local ten-digit application messaging route requires A2P 10DLC registration, including hobbyist use. Complete the applicable sender onboarding before enabling production SMS. Budget for verification, sender/registration fees, message segments, and delivery volume; no specific free tier or price is assumed.

## 8. Proposed architecture

Use a TypeScript web app with a server runtime, Firebase Authentication, Firestore, a managed scheduler, and separate email/SMS adapters. This aligns with Aaron's existing Firebase experience. A static frontend alone cannot securely schedule or send reminders; provider secrets remain on the server.

| Component | Responsibility |
|---|---|
| Web UI | Event management, account settings, previews, and history |
| Auth and authorization | Identify users; restrict all event and history access to their owner |
| Reminder engine | Calculate annual occurrences and eligibility with a supplied local date |
| Scheduler and queue | Run every 15 minutes; claim due account/day jobs atomically and dispatch within the scheduled window |
| Delivery adapters | Render and submit email/SMS; expose provider IDs and normalized statuses |
| Webhook handlers | Verify provider signatures; update delivery, suppression, and opt-out states |

The scheduler uses privileged server access but rechecks account state, ownership, channel verification, suppression, and current event settings immediately before dispatch.

## 9. Data model

| Record | Core fields |
|---|---|
| User | uid, email, emailVerified, timezone, sendTime, defaultLeadDays, emailEnabled, remindersPaused, createdAt, updatedAt |
| Event | id, ownerUid, name, type, month, day, optional year/notes, emailEnabled, smsEnabled, optional leadDaysOverride, dailyEnabled, monthlyEnabled, weeklyEnabled, archived, revision |
| SMS preference | ownerUid, phone, phoneVerified, optedIn, consentAt, consentVersion, optedOutAt |
| Delivery job | idempotencyKey, ownerUid, channel, localDate, timezone snapshot, included event IDs/occurrences, status, attemptCount, providerMessageId, scheduledAt, acceptedAt, errorCode |

Private per-user storage or equivalent enforced owner checks are required. Client rules must never allow public access. SMS fields remain inactive until release two.

## 10. Date handling and reliability

- Annual dates roll into the next year after the occurrence passes. December monthly summaries include January of the following year.
- February 29 is observed on February 28 in non-leap years; show this policy in event editing.
- Calendar-day calculations handle daylight-saving transitions. If a chosen local time is skipped, use the next valid time; if repeated, send only once.
- Use an atomic unique job key based on user, channel, and local date; preserve provider idempotency where supported. Concurrent scheduler runs must not create duplicate submissions.
- Retry explicit temporary failures up to three times with backoff. Do not blindly resend after an ambiguous timeout; reconcile with the provider or mark unknown for review. Exactly-once external delivery is not guaranteed.
- Send late jobs only until the end of their intended local date; expire older jobs. A timezone change does not resend an already dispatched reminder for the same occurrence and cadence period.
- Bounce/complaint suppression and SMS opt-outs override retries. Provider acceptance is not proof of delivery.
- Account deletion immediately disables reminders, cancels queued jobs, and deletes events and recipient data; document any operational log retention before launch.
- Limit provider spending and surface delivery failures. Scheduled sending targets within 15 minutes of the chosen time under normal operation, not guaranteed inbox arrival.

## 11. Acceptance criteria

1. A user can create a birthday using only a name and month/day; no contact information for that person is requested.
2. Two users cannot view or modify one another's events or message history through the UI or direct API/database requests.
3. Monthly preview on December 1 shows December and following January; weekly previews span year boundaries correctly.
4. An event 7 days away receives an advance alert at lead time 7; daily-enabled events appear each day from day 7 through day 0.
5. Daily off prevents repeated countdowns while preserving the advance and event-day alerts.
6. Monthly and weekly inclusion switches work independently of lead time and daily mode.
7. Events with email off never appear in emails. Unverified recipients, paused accounts, and suppressed channels never receive scheduled submissions.
8. Overlapping monthly/weekly/daily schedules produce one logical summary per channel/date; each alerts-section event appears once.
9. Repeated or concurrent scheduler runs do not duplicate provider submissions in the confirmed-success case; ambiguous failures become unknown rather than triggering blind retries.
10. February 29, daylight-saving changes, edits before dispatch, deletion, empty summaries, and year rollover behave as defined above.
11. Email sending works while the browser is closed, and history distinguishes accepted from delivered/failed/unknown.
12. Release-two SMS cannot send before verified ownership, explicit consent, and sender onboarding; STOP prevents queued and future SMS.

Validate the pure reminder engine with deterministic date tests, security with cross-account access tests, and delivery with a small end-to-end test account. Keep provider calls mocked for routine automated tests.

## 12. Delivery milestones and review points

1. Review this specification, especially defaults, weekly window, February 29 policy, and event-day behavior.
2. Implement private event management and previews.
3. Configure email and the scheduler; test boundary dates, retries, and unsubscribe with a private pilot.
4. Add SMS after provider onboarding and a cost review; retain email-only operation for users who decline SMS.

This document does not authorize implementation or purchase provider services. No existing repository was supplied; the specification is delivered as a standalone reviewable artifact.

## Sources checked October 2, 2026

- Resend domain verification: https://www.resend.com/changelog/new-domains-workflow
- Twilio A2P 10DLC requirements: https://www.twilio.com/docs/messaging/compliance/a2p-10dlc
- Twilio messaging consent and sender identification: https://www.twilio.com/en-us/legal/messaging-policy
- Twilio opt-out state handling: https://www.twilio.com/docs/messaging/features/consent-api

Provider documentation supports integration constraints; the schedules, defaults, architecture, and release sequence are proposed product decisions.
