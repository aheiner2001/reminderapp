import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function buildEmailHtml(heading, events) {
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const itemsHtml = events
    .map((e) => {
      const monthStr = monthNames[(e.month || 1) - 1];
      const daysText =
        e.days === 0
          ? "Today"
          : e.days === 1
            ? "Tomorrow"
            : `${e.days} days away`;

      return `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 16px 0; vertical-align: middle;">
            <div style="display: inline-block; background: #f4f4f5; border-radius: 8px; padding: 6px 12px; text-align: center; min-width: 48px;">
              <div style="font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase;">${monthStr}</div>
              <div style="font-size: 18px; font-weight: 800; color: #18181b;">${e.day}</div>
            </div>
          </td>
          <td style="padding: 16px 16px; vertical-align: middle;">
            <div style="font-size: 16px; font-weight: 600; color: #18181b;">${escapeHtml(e.name)}</div>
            <div style="font-size: 13px; color: #71717a; margin-top: 2px;">
              ${escapeHtml(e.type || "Occasion")} ${e.notes ? `· <em>${escapeHtml(e.notes)}</em>` : ""}
            </div>
          </td>
          <td style="padding: 16px 0; text-align: right; vertical-align: middle;">
            <span style="display: inline-block; background: #fafaf9; border: 1px solid #e4e4e7; border-radius: 12px; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #3f3f46;">
              ${daysText}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafaf9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafaf9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #f4f4f5;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #71717a; text-transform: uppercase;">Remember</div>
              <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 700; color: #18181b; line-height: 1.3;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 16px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${itemsHtml}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fbfbfa; border-top: 1px solid #e4e4e7; font-size: 12px; color: #a1a1aa; text-align: center;">
              Sent by Remember · Meaningful moments for the people who matter.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let firestoreInstance = null;
function getDb() {
  if (!firestoreInstance) {
    if (!getApps().length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        initializeApp({ credential: cert(creds) });
      } else {
        initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "sandbox-ed1e2",
        });
      }
    }
    firestoreInstance = getFirestore();
  }
  return firestoreInstance;
}

export async function handler(event, context) {
  console.log("Starting Reminder Worker execution...", JSON.stringify(event));

  const fromEmail = process.env.SES_FROM_EMAIL;
  if (!fromEmail) {
    console.error("Missing SES_FROM_EMAIL environment variable.");
    return { statusCode: 500, body: "Missing SES_FROM_EMAIL" };
  }

  const ses = new SESClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  });

  const db = getDb();
  const usersSnap = await db.collection("reminderUsers").get();

  let sentCount = 0;
  let userCount = 0;

  for (const userDoc of usersSnap.docs) {
    userCount++;
    const uid = userDoc.id;

    try {
      // 1. Load user settings
      const settingsSnap = await db.doc(`reminderUsers/${uid}/profile/settings`).get();
      const settings = settingsSnap.exists ? settingsSnap.data() : { emailEnabled: true };

      if (settings.emailEnabled === false || settings.paused === true) {
        continue;
      }

      // 2. Load user events
      const eventsSnap = await db.collection(`reminderUsers/${uid}/events`).get();
      const events = [];
      eventsSnap.forEach((doc) => {
        const data = doc.data();
        if (!data.archived) {
          events.push({ ...data, id: doc.id });
        }
      });

      if (events.length === 0) continue;

      // 3. Compute upcoming events for today
      const today = new Date();
      const currentMonth = today.getUTCMonth() + 1;
      const currentDay = today.getUTCDate();

      // Find events within lead days (e.g. 7 days or matching leadDays)
      const dueEvents = [];
      for (const e of events) {
        const lead = e.leadDays !== undefined ? e.leadDays : 7;
        // Simple day calculation for target occasion
        const occasionDate = new Date(Date.UTC(today.getUTCFullYear(), e.month - 1, e.day));
        if (occasionDate < today) {
          occasionDate.setUTCFullYear(today.getUTCFullYear() + 1);
        }
        const diffDays = Math.round((occasionDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= lead && diffDays >= 0) {
          dueEvents.push({ ...e, days: diffDays });
        }
      }

      if (dueEvents.length === 0) continue;

      // 4. Send email digest
      const recipientEmail = settings.email || userDoc.data()?.email;
      if (!recipientEmail) {
        console.warn(`User ${uid} has no recipient email configured.`);
        continue;
      }

      const subject = dueEvents.length === 1
        ? `Reminder: ${dueEvents[0].name}'s ${dueEvents[0].type || "Occasion"} is ${dueEvents[0].days === 0 ? "today!" : `in ${dueEvents[0].days} days`}`
        : `Reminder: ${dueEvents.length} upcoming occasions`;

      const htmlBody = buildEmailHtml(subject, dueEvents);

      const command = new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlBody },
          },
        },
      });

      await ses.send(command);
      sentCount++;
      console.log(`Dispatched reminder email to ${recipientEmail}`);
    } catch (err) {
      console.error(`Error processing reminders for user ${uid}:`, err);
    }
  }

  console.log(`Worker completed. Scanned ${userCount} users, sent ${sentCount} emails.`);
  return {
    statusCode: 200,
    body: JSON.stringify({ scannedUsers: userCount, sentEmails: sentCount }),
  };
}
