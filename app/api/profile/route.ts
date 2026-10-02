import { apiError, session, jsonBody } from "@/src/lib/firebase/admin";
import { defaultSettings, validateEvent } from "@/src/lib/reminders";
import { validateSettings } from "@/src/lib/access";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { uid, email, db } = await session(request);
    const ref = db.collection("reminderUsers").doc(uid);
    const [profile, events, history] = await Promise.all([
      ref.get(),
      ref.collection("events").get(),
      ref.collection("deliveries").orderBy("createdAt", "desc").limit(20).get(),
    ]);
    return Response.json(
      {
        email,
        settings: profile.exists
          ? validateSettings(profile.data()!.settings)
          : defaultSettings,
        events: events.docs.map((d) =>
          validateEvent({ ...d.data(), id: d.id }),
        ),
        history: history.docs.map((d) => ({ id: d.id, ...d.data() })),
        emailReady: Boolean(
          (process.env.resend_api_key || process.env.RESEND_API_KEY) &&
          process.env.RESEND_FROM_EMAIL,
        ),
        scheduled: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    const { uid, email, db } = await session(request);
    const settings = validateSettings(await jsonBody(request));
    await db
      .collection("reminderUsers")
      .doc(uid)
      .set(
        { email, settings, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    return Response.json({ settings });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { uid, db } = await session(request);
    await db.recursiveDelete(db.collection("reminderUsers").doc(uid));
    return Response.json({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
