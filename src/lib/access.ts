import type { Settings } from "./reminders";
export class AppError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function checkTester(
  token: { uid: string; email?: string; email_verified?: boolean },
  allowlist: string,
): { uid: string; email: string } {
  const email = token.email?.trim().toLowerCase();
  const allowed = allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || token.email_verified !== true)
    throw new AppError("Sign in with a verified Google email.", 403);
  if (!allowed.includes(email))
    throw new AppError(
      "This pilot is invite-only. Ask the owner to add your Google email to TESTER_EMAILS.",
      403,
    );
  return { uid: token.uid, email };
}
export function validateSettings(input: unknown): Settings {
  if (!input || typeof input !== "object")
    throw new AppError("Invalid settings.", 400);
  const s = input as Record<string, unknown>;
  if (typeof s.timezone !== "string" || s.timezone.length > 100)
    throw new AppError("Choose a valid timezone.", 400);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: s.timezone }).format();
  } catch {
    throw new AppError("Choose a valid timezone.", 400);
  }
  if (
    typeof s.sendTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.sendTime)
  )
    throw new AppError("Choose a valid send time.", 400);
  if (
    !Number.isInteger(s.defaultLeadDays) ||
    Number(s.defaultLeadDays) < 0 ||
    Number(s.defaultLeadDays) > 365
  )
    throw new AppError("Default lead time must be 0–365.", 400);
  if (typeof s.emailEnabled !== "boolean" || typeof s.paused !== "boolean")
    throw new AppError("Invalid settings.", 400);
  return {
    timezone: s.timezone,
    sendTime: s.sendTime,
    defaultLeadDays: Number(s.defaultLeadDays),
    emailEnabled: s.emailEnabled,
    paused: s.paused,
  };
}
