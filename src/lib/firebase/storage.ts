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
  type GroupCircle,
  type GroupMember,
  type WishlistItem,
  type UserWishlist,
} from "../reminders";
import { validateSettings } from "../access";
import { validatePerson, type Person } from "../people";
import { applyReservation, type GroupDraw } from "../draws";

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

export function validateClientPerson(person: unknown): Person {
  return validatePerson(person);
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

function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createGroupCircle(
  uid: string,
  userName: string,
  userEmail: string,
  groupName: string,
): Promise<GroupCircle> {
  const db = getClientDb();
  const groupId = crypto.randomUUID();
  const code = generateGroupCode();
  const now = new Date().toISOString();

  const group: GroupCircle = {
    id: groupId,
    name: groupName.trim() || "My Group",
    code,
    ownerUid: uid,
    createdAt: now,
    members: {
      [uid]: {
        uid,
        name: userName || userEmail.split("@")[0] || "Member",
        email: userEmail,
        joinedAt: now,
      },
    },
  };

  const groupRef = doc(db, "reminderGroups", groupId);
  await setDoc(groupRef, group);

  // Link group to user
  const userGroupRef = doc(db, `reminderUsers/${uid}/groups`, groupId);
  await setDoc(userGroupRef, { groupId, joinedAt: now });

  return group;
}

export async function joinGroupByCode(
  uid: string,
  userName: string,
  userEmail: string,
  code: string,
): Promise<GroupCircle> {
  const db = getClientDb();
  const cleanCode = code.trim().toUpperCase();

  const groupsCol = collection(db, "reminderGroups");
  const snap = await getDocs(groupsCol);
  let matchedGroup: GroupCircle | null = null;

  snap.forEach((d) => {
    const data = d.data() as GroupCircle;
    if (data.code?.toUpperCase() === cleanCode) {
      matchedGroup = { ...data, id: d.id };
    }
  });

  if (!matchedGroup) {
    throw new Error(`No group found with code "${cleanCode}".`);
  }

  const group = matchedGroup as GroupCircle;
  const now = new Date().toISOString();

  group.members[uid] = {
    uid,
    name: userName || userEmail.split("@")[0] || "Member",
    email: userEmail,
    joinedAt: now,
  };

  const groupRef = doc(db, "reminderGroups", group.id);
  await setDoc(groupRef, group);

  // Link group to user
  const userGroupRef = doc(db, `reminderUsers/${uid}/groups`, group.id);
  await setDoc(userGroupRef, { groupId: group.id, joinedAt: now });

  return group;
}

export async function fetchUserGroups(uid: string): Promise<GroupCircle[]> {
  const db = getClientDb();
  const groups: GroupCircle[] = [];

  try {
    const userGroupsCol = collection(db, `reminderUsers/${uid}/groups`);
    const userGroupsSnap = await getDocs(userGroupsCol);

    for (const d of userGroupsSnap.docs) {
      const gId = d.data().groupId || d.id;
      const groupRef = doc(db, "reminderGroups", gId);
      const gSnap = await getDoc(groupRef);
      if (gSnap.exists()) {
        groups.push({ ...(gSnap.data() as GroupCircle), id: gSnap.id });
      }
    }
  } catch (err) {
    console.warn("fetchUserGroups warning", err);
  }

  return groups;
}

export async function fetchGroupOccasions(
  groupId: string,
  members: Record<string, GroupMember>,
): Promise<{ event: ReminderEvent; memberName: string }[]> {
  const db = getClientDb();
  const results: { event: ReminderEvent; memberName: string }[] = [];

  for (const [memberUid, member] of Object.entries(members)) {
    try {
      const eventsCol = collection(db, `reminderUsers/${memberUid}/events`);
      const eventsSnap = await getDocs(eventsCol);
      eventsSnap.forEach((docSnap) => {
        try {
          const ev = validateEvent({ ...docSnap.data(), id: docSnap.id });
          if (!ev.archived && ev.sharedGroupIds && ev.sharedGroupIds.includes(groupId)) {
            results.push({ event: ev, memberName: member.name });
          }
        } catch {
          // ignore corrupted
        }
      });
    } catch {
      // ignore
    }
  }

  return results;
}

export async function saveUserWishlist(
  uid: string,
  items: WishlistItem[],
): Promise<UserWishlist> {
  const db = getClientDb();
  const wishlist: UserWishlist = {
    uid,
    items,
    updatedAt: new Date().toISOString(),
  };
  const ref = doc(db, `reminderUsers/${uid}/profile`, "wishlist");
  await setDoc(ref, wishlist);
  return wishlist;
}

export async function fetchUserWishlist(uid: string): Promise<WishlistItem[]> {
  const db = getClientDb();
  try {
    const ref = doc(db, `reminderUsers/${uid}/profile`, "wishlist");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.items) ? data.items : [];
    }
  } catch {
    // fallback
  }
  return [];
}

export const fetchMemberWishlist = fetchUserWishlist;

export async function fetchUserPeople(uid: string): Promise<Person[]> {
  const db = getClientDb();
  const people: Person[] = [];
  try {
    const peopleCol = collection(db, `reminderUsers/${uid}`, "people");
    const snap = await getDocs(peopleCol);
    snap.forEach((docSnap) => {
      try {
        people.push(validatePerson({ ...docSnap.data(), id: docSnap.id }));
      } catch {
        // Skip corrupted documents gracefully
      }
    });
  } catch (err) {
    console.warn("Failed to fetch people", err);
  }
  return people;
}

export async function saveUserPerson(
  uid: string,
  person: Person,
): Promise<Person> {
  const validated = validatePerson(person);
  const id =
    validated.id && !validated.id.startsWith("demo-")
      ? validated.id
      : crypto.randomUUID();
  const now = new Date().toISOString();
  const payload: Person = {
    ...validated,
    id,
    createdAt: validated.createdAt || now,
    updatedAt: now,
  };
  const db = getClientDb();
  const personRef = doc(db, `reminderUsers/${uid}/people`, id);
  await setDoc(personRef, payload);
  return payload;
}

export async function deleteUserPerson(
  uid: string,
  personId: string,
): Promise<void> {
  const db = getClientDb();
  const personRef = doc(db, `reminderUsers/${uid}/people`, personId);
  await deleteDoc(personRef);

  const eventsCol = collection(db, `reminderUsers/${uid}`, "events");
  const eventsSnap = await getDocs(eventsCol);
  const updates: Promise<ReminderEvent>[] = [];
  eventsSnap.forEach((docSnap) => {
    try {
      const ev = validateEvent({ ...docSnap.data(), id: docSnap.id });
      if (ev.personId === personId) {
        const cleared = { ...ev, personId: null as string | null };
        updates.push(saveUserEvent(uid, cleared));
      }
    } catch {
      // ignore corrupted
    }
  });
  await Promise.all(updates);
}

export async function updateGroupDraw(
  groupId: string,
  draw: GroupDraw,
): Promise<void> {
  const db = getClientDb();
  const groupRef = doc(db, "reminderGroups", groupId);
  await setDoc(groupRef, { draw }, { merge: true });
}

export async function clearGroupDraw(groupId: string): Promise<void> {
  const db = getClientDb();
  const groupRef = doc(db, "reminderGroups", groupId);
  await setDoc(groupRef, { draw: null }, { merge: true });
}

export async function reserveWishlistItem(
  ownerUid: string,
  itemId: string,
  actorUid: string,
  action: "reserve" | "unreserve",
): Promise<WishlistItem[]> {
  const items = await fetchUserWishlist(ownerUid);
  const updated = applyReservation(items, itemId, actorUid, action);
  await saveUserWishlist(ownerUid, updated);
  return updated;
}
