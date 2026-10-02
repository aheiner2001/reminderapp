import { Resend } from "resend";
import { apiError, session, jsonBody } from "@/src/lib/firebase/admin";
import {
  buildSummary,
  defaultSettings,
  validateDate,
  validateEvent,
} from "@/src/lib/reminders";
import { validateSettings, AppError } from "@/src/lib/access";
import { summaryText } from "@/src/lib/email";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { uid, email, db } = await session(request);
    const { date } = await jsonBody(request);
    try {
      validateDate(date);
    } catch {
      throw new AppError("Choose a valid preview date.", 400);
    }
    const key = process.env.resend_api_key || process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from)
      throw new AppError(
        "Set resend_api_key and RESEND_FROM_EMAIL on the Vercel server to send test emails.",
        503,
      );
    const ref = db.collection("reminderUsers").doc(uid);
    const [p, stored] = await Promise.all([
      ref.get(),
      ref.collection("events").get(),
    ]);
    const settings = p.exists
      ? validateSettings(p.data()!.settings)
      : defaultSettings;
    const summary = buildSummary(
      stored.docs.map((d) => validateEvent({ ...d.data(), id: d.id })),
      settings,
      date,
    );
    if (!summary.sections.length)
      throw new AppError(
        "No email reminders qualify on this preview date, or reminders are paused.",
        400,
      );
    const now = new Date();
    const rateRef = db
      .collection("reminderRateLimits")
      .doc(`${uid}-${now.toISOString().slice(0, 10)}`);
    const job = ref.collection("deliveries").doc();
    await db.runTransaction(async (tx) => {
      const rate = await tx.get(rateRef);
      const count = Number(rate.data()?.count ?? 0);
      if (count >= 3)
        throw new AppError(
          "Test limit reached: three emails per account per UTC day.",
          429,
        );
      tx.set(rateRef, {
        count: count + 1,
        expiresAt: new Date(now.getTime() + 30 * 86400000),
      });
      tx.create(job, {
        status: "sending",
        createdAt: now.toISOString(),
        date,
        test: true,
      });
    });
    const origin = new URL(request.url).origin;
    try {
      const result = await new Resend(key).emails.send(
        {
          from,
          to: [email],
          subject: `[Test] Your reminders for ${date}`,
          text: `This is the test email you requested. Automatic sending is not enabled.\n\n${summaryText(summary)}\n\nManage email preferences: ${origin}/?view=settings`,
        },
        { idempotencyKey: `test/${uid}/${job.id}` },
      );
      if (result.error) {
        await job.update({ status: "failed" });
        throw new AppError(
          "Email provider rejected this test. Check the sender domain and recipient restrictions in Resend.",
          502,
        );
      }
      await job.update({
        status: "accepted",
        providerMessageId: result.data?.id ?? null,
      });
      return Response.json({ status: "accepted" });
    } catch (e) {
      if (!(e instanceof AppError)) await job.update({ status: "unknown" });
      throw e;
    }
  } catch (e) {
    return apiError(e);
  }
}
