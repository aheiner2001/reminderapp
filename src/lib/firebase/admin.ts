import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { AppError, checkTester } from "../access";
export function admin() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "sandbox-ed1e2";
  const email = process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!email || !privateKey)
    throw new AppError(
      "Private storage is not configured yet. Set the Firebase Admin environment variables on the server.",
      503,
    );
  const app =
    getApps().find((a) => a.name === "reminder-server") ??
    initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail: email,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      },
      "reminder-server",
    );
  return { auth: getAuth(app), db: getFirestore(app) };
}
export async function session(request: Request) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 10000)
    throw new AppError("Sign in to continue.", 401);
  const a = admin();
  let token;
  try {
    token = await a.auth.verifyIdToken(bearer.slice(7), true);
  } catch {
    throw new AppError("Your sign-in expired. Sign in again.", 401);
  }
  return { ...checkTester(token, process.env.TESTER_EMAILS ?? ""), ...a };
}
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "Reminder API failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return Response.json(
    {
      error:
        "Something went wrong. Try again or check the server configuration.",
    },
    { status: 500 },
  );
}
export async function jsonBody(request: Request) {
  const body = await request.text();
  if (body.length > 12000) throw new AppError("Request is too large.", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("Invalid JSON request.", 400);
  }
}
