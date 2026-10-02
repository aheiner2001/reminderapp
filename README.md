# Reminder App

Birthday and anniversary reminders for the app user, with per-event settings and monthly, weekly, and optional daily summaries.

**Status:** Planning documentation only. No app, authentication, scheduler, billing integration, or provider account has been implemented.

## Project documents
- [Full product specification](docs/superpowers/specs/2026-10-02-birthday-reminder-design.md)
- [TODO: platform choices, pilot setup, delivery providers, and future subscriptions](TODO.md)
- [Original mockups](docs/mockups/README.md)

## Proposed first version
Responsive web app + Firebase Google Authentication + private tester access + Firestore + scheduled backend + email. Browser push, SMS, Android, and payments are later options.

Testers use the app free through an administrator-controlled entitlement. Hosting/provider costs are separate. Do not commit tester addresses or secrets.

Reminder messages go to the signed-in user. Birthday contacts do not need accounts, email addresses, or phone numbers.


- [Testing and deployment plan](docs/superpowers/plans/2026-10-02-testing-deployment.md)
