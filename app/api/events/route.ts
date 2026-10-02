import { apiError, session, jsonBody } from "@/src/lib/firebase/admin";
import { validateEvent } from "@/src/lib/reminders";
import { AppError } from "@/src/lib/access";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { uid, db } = await session(request);
    let event;
    try {
      event = validateEvent(await jsonBody(request));
    } catch (e) {
      throw new AppError(
        e instanceof Error ? e.message : "Invalid event.",
        400,
      );
    }
    const collection = db
      .collection("reminderUsers")
      .doc(uid)
      .collection("events");
    if (event.id && !/^[\w-]{1,100}$/.test(event.id))
      throw new AppError("Invalid event ID.", 400);
    const ref = event.id ? collection.doc(event.id) : collection.doc();
    await ref.set({
      ...event,
      id: ref.id,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ event: { ...event, id: ref.id } });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { uid, db } = await session(request);
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[\w-]{1,100}$/.test(id))
      throw new AppError("Invalid event ID.", 400);
    await db
      .collection("reminderUsers")
      .doc(uid)
      .collection("events")
      .doc(id)
      .delete();
    return Response.json({ deleted: true });
  } catch (e) {
    return apiError(e);
  }
}
