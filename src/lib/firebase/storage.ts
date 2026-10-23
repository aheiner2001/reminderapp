import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  type Firestore,
} from "firebase/firestore";
import { browserAuth } from "./client";
import {
  validateEvent,
  type ReminderEvent,
  type Settings,
  defaultSettings,
} from "../reminders";
import { validateSettings } from "../access";

let dbInstance: Firestore | null = null;

export function getClientDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Client Firestore is only available in the browser.");
  }
  if (!dbInstance) {
    const auth = browserAuth();
    dbInstance = getFirestore(auth.app);
  }
  return dbInstance;
}

export function formatStoragePath(uid: string, type: "events" | "profile"): string {
  if (type === "profile") {
    return `reminderUsers/${uid}/profile/settings`;
  }
  return `reminderUsers/${uid}/events`;
}

export function validateClientEvent(event: unknown): ReminderEvent {
  return validateEvent(event);
}

export async function fetchUserData(uid: string): Promise<{
  events: ReminderEvent[];
  settings: Settings;
}> {
  const db = getClientDb();

  // Fetch settings
  let settings = defaultSettings;
  try {
    const settingsRef = doc(db, `reminderUsers/${uid}/profile`, "settings");
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      settings = validateSettings(settingsSnap.data());
    }
  } catch (err) {
    console.warn("Failed to fetch settings, using defaults", err);
  }

  // Fetch events
  const events: ReminderEvent[] = [];
  try {
    const eventsCol = collection(db, `reminderUsers/${uid}`, "events");
    const eventsSnap = await getDocs(eventsCol);
    eventsSnap.forEach((docSnap) => {
      try {
        events.push(validateEvent({ ...docSnap.data(), id: docSnap.id }));
      } catch {
        // Skip corrupted documents gracefully
      }
    });
  } catch (err) {
    console.warn("Failed to fetch events", err);
  }

  return { events, settings };
}

export async function saveUserEvent(
  uid: string,
  event: ReminderEvent,
): Promise<ReminderEvent> {
  const validated = validateClientEvent(event);
  const id = validated.id && !validated.id.startsWith("demo-")
    ? validated.id
    : crypto.randomUUID();
  const db = getClientDb();
  const eventRef = doc(db, `reminderUsers/${uid}/events`, id);
  const payload = { ...validated, id };
  await setDoc(eventRef, payload);
  return payload;
}

export async function deleteUserEvent(uid: string, eventId: string): Promise<void> {
  const db = getClientDb();
  const eventRef = doc(db, `reminderUsers/${uid}/events`, eventId);
  await deleteDoc(eventRef);
}

export async function saveUserSettings(
  uid: string,
  settings: Settings,
): Promise<Settings> {
  const validated = validateSettings(settings);
  const db = getClientDb();
  const settingsRef = doc(db, `reminderUsers/${uid}/profile`, "settings");
  await setDoc(settingsRef, validated);
  return validated;
}

export async function deleteUserAccountData(uid: string): Promise<void> {
  const db = getClientDb();
  // Delete all user events
  const eventsCol = collection(db, `reminderUsers/${uid}`, "events");
  const eventsSnap = await getDocs(eventsCol);
  const deletes = eventsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletes);

  // Delete profile/settings
  const settingsRef = doc(db, `reminderUsers/${uid}/profile`, "settings");
  await deleteDoc(settingsRef);
}
