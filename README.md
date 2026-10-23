# Remember — birthday & anniversary reminders

A beautifully crafted, minimalist web app for remembering the birthdays and anniversaries of the people who matter most.

---

## 🚀 Live Website on GitHub Pages

The app builds as a static Next.js export and deploys directly to **GitHub Pages** using GitHub Actions.

### How to enable GitHub Pages in your repository:
1. Go to your GitHub repository: `https://github.com/aheiner2001/reminderapp` (or your fork).
2. Click **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Push to `main` (or run the **Deploy to GitHub Pages** workflow in the Actions tab).
5. Your website will be live at:
   ```
   https://<your-username>.github.io/reminderapp/
   ```

---

## 🎨 Craft-Focused UI (Non-AI-Slop)

- Clean, tactile, editorial aesthetic inspired by Things 3 and Linear.
- Chronological countdown cards with relative badges (`Today`, `In 3 days`, `In 2 weeks`).
- Category badges for Birthdays, Anniversaries, and Custom occasions.
- Interactive modal for quick occasion additions with customizable reminder lead times (Day-of, 3 days, 7 days, 14 days, 30 days).
- In-browser email digest preview showing exactly what scheduled reminder emails will look like.

---

## 💾 Firebase Client Storage

- **Google Sign-In**: Uses Firebase Auth directly from the browser.
- **Client Firestore Sync**: Directly reads and writes user occasions and preferences to `reminderUsers/{uid}/events` and `reminderUsers/{uid}/profile/settings`.
- **Preview Demo Mode**: If signed out, allows instant offline exploration with preloaded demo occasions.
- **Security Rules**: Configured in [firestore.rules](firestore.rules) to ensure authenticated users can only access their own records.

---

## ✉️ Automated Reminder Delivery: AWS EventBridge + Lambda + SES

Automated daily reminders are handled independently by an AWS worker:
- **AWS EventBridge**: Triggers daily on a cron schedule (e.g. 9:00 AM).
- **AWS Lambda**: Queries Firestore for users with due occasions and builds a mobile-friendly HTML digest.
- **AWS SES**: Sends email notifications to recipients from your verified email address.
- Full step-by-step setup instructions are in **[lambda/README.md](lambda/README.md)**.

---

## 🛠️ Local Development & Testing

1. Use Node 24 (`v24.x`).
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Run local dev server:
   ```bash
   npm run dev
   ```
4. Run full test suite & typecheck:
   ```bash
   npm run typecheck
   npm test
   ```
5. Test static export production build:
   ```bash
   npm run build
   ```
   *(Generates static assets in `out/`)*.

---

## 📚 Project Documentation

- [Design Spec](docs/superpowers/specs/2026-10-23-github-pages-aws-reminder-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-10-23-github-pages-aws-reminder.md)
- [AWS Worker Guide](lambda/README.md)
