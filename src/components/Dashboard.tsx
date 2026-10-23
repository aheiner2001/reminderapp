"use client";

import { useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { browserAuth } from "../lib/firebase/client";
import {
  fetchUserData,
  saveUserEvent,
  deleteUserEvent,
  saveUserSettings as persistSettings,
  deleteUserAccountData,
  createGroupCircle,
  joinGroupByCode,
  fetchUserGroups,
  fetchGroupOccasions,
  saveUserWishlist,
  fetchUserWishlist,
} from "../lib/firebase/storage";
import {
  blankEvent,
  buildSummary,
  defaultSettings,
  localDate,
  upcoming,
  validateEvent,
  nextOccurrence,
  daysBetween,
  type ReminderEvent,
  type Settings,
  type GroupCircle,
  type WishlistItem,
} from "../lib/reminders";
import { validateSettings } from "../lib/access";

type Tab = "over" | "ev" | "gro" | "pre" | "his" | "set";
type Delivery = { id: string; date: string; status: string; createdAt: string; attempts?: number };

const MN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const demos: ReminderEvent[] = [
  { ...blankEvent, id: "demo-1", name: "Roger", type: "Birthday", month: 10, day: 25, year: 1958, emailEnabled: true },
  { ...blankEvent, id: "demo-2", name: "Grandma Joan", type: "Birthday", month: 10, day: 28, year: 1944, daily: true, emailEnabled: true },
  { ...blankEvent, id: "demo-3", name: "Maya", type: "Birthday", month: 11, day: 2, year: 1991, emailEnabled: true },
  { ...blankEvent, id: "demo-4", name: "Taylor & Sam", type: "Anniversary", month: 11, day: 7, year: 2014, emailEnabled: true },
  { ...blankEvent, id: "demo-5", name: "Priya", type: "Birthday", month: 11, day: 14, leadDays: 3, emailEnabled: true },
  { ...blankEvent, id: "demo-6", name: "Alex & Jordan", type: "Anniversary", month: 12, day: 5, year: 2019, emailEnabled: false },
];

const demoGroups: GroupCircle[] = [
  {
    id: "demo-group-1",
    name: "The Family",
    code: "FAM778",
    ownerUid: "demo-owner",
    createdAt: new Date().toISOString(),
    members: {
      "demo-owner": { uid: "demo-owner", name: "You", email: "you@example.com", joinedAt: new Date().toISOString() },
      "demo-2": { uid: "demo-2", name: "Grandma Joan", email: "joan@example.com", joinedAt: new Date().toISOString() },
      "demo-3": { uid: "demo-3", name: "Maya", email: "maya@example.com", joinedAt: new Date().toISOString() },
    },
  },
];

function ord(n: number) {
  return n + (n % 100 > 10 && n % 100 < 14 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
}

export default function Dashboard() {
  const authGeneration = useRef(0);
  const identityUid = useRef<string | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("over");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<ReminderEvent[]>(demos);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [today, setToday] = useState("");
  const [previewDate, setPreviewDate] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastTimer, setToastTimer] = useState<any>(null);
  const [editing, setEditing] = useState<ReminderEvent | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Groups and Wishlists state
  const [groups, setGroups] = useState<GroupCircle[]>(demoGroups);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("demo-group-1");
  const [sharedGroupEvents, setSharedGroupEvents] = useState<{ event: ReminderEvent; memberName: string }[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([
    { id: "w-1", title: "Warm winter wool socks", notes: "Size M, forest green or charcoal", createdAt: new Date().toISOString() },
    { id: "w-2", title: "Chemex Pour-Over Glass Coffee Maker", url: "https://example.com/chemex", notes: "6 cup classic", createdAt: new Date().toISOString() },
  ]);
  const [newWishTitle, setNewWishTitle] = useState("");
  const [newWishUrl, setNewWishUrl] = useState("");
  const [newWishNotes, setNewWishNotes] = useState("");

  function toast(msg: string) {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToastMsg(""), 2800);
    setToastTimer(t);
  }

  useEffect(() => {
    const now = localDate(new Date(), defaultSettings.timezone);
    setToday(now);
    setPreviewDate(now);

    let stop = () => {};
    try {
      stop = onAuthStateChanged(browserAuth(), (u) => {
        if (identityUid.current !== (u?.uid ?? null)) {
          identityUid.current = u?.uid ?? null;
          authGeneration.current += 1;
          setEditing(null);
          setEvents(u ? [] : demos);
          setSettings(defaultSettings);
          setHistory([]);
          setGroups(u ? [] : demoGroups);
          setSelectedGroupId(u ? "" : "demo-group-1");
          setBusy(false);
          setToday(now);
          setPreviewDate(now);
        }
        setUser(u);
        setAuthReady(true);
      });
    } catch {
      setAuthReady(true);
    }
    return () => stop();
  }, []);

  useEffect(() => {
    let current = true;
    if (!authReady) return;
    if (!user) {
      setEvents(demos);
      setSettings(defaultSettings);
      return;
    }
    setBusy(true);

    async function loadData(identity: User) {
      try {
        const token = await identity.getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fall back to Firestore direct client
      }
      return await fetchUserData(identity.uid);
    }

    loadData(user)
      .then(async (data) => {
        if (current) {
          setEvents(data.events || []);
          setSettings(data.settings);
          setHistory(data.history || []);
          const now = localDate(new Date(), data.settings.timezone);
          setToday(now);
          setPreviewDate(now);

          // Fetch user's groups and wishlist
          try {
            const userGroups = await fetchUserGroups(user.uid);
            setGroups(userGroups);
            if (userGroups.length > 0 && !selectedGroupId) {
              setSelectedGroupId(userGroups[0].id);
            }
            const wishes = await fetchUserWishlist(user.uid);
            setWishlistItems(wishes);
          } catch {
            // non-fatal
          }
        }
      })
      .catch((e) => {
        if (current) toast(e.message || "Failed to load events.");
      })
      .finally(() => {
        if (current) setBusy(false);
      });

    return () => {
      current = false;
    };
  }, [user, authReady]);

  async function act(work: (generation: number) => Promise<void>) {
    const generation = authGeneration.current;
    setBusy(true);
    try {
      await work(generation);
    } catch (e) {
      if (generation === authGeneration.current) {
        toast(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      if (generation === authGeneration.current) setBusy(false);
    }
  }

  async function login() {
    await act(async () => {
      await signInWithPopup(browserAuth(), new GoogleAuthProvider());
      toast("Signed in with Google.");
    });
  }

  async function saveOccasion(value: ReminderEvent) {
    await act(async (generation) => {
      const validated = validateEvent(value);

      // If a new custom type was used that isn't yet in settings.customTypes or built-ins, save it
      const builtIns = ["Birthday", "Anniversary"];
      const currentCustoms = settings.customTypes || [];
      if (
        !builtIns.includes(validated.type) &&
        !currentCustoms.includes(validated.type)
      ) {
        const updatedCustoms = [...currentCustoms, validated.type];
        const updatedSettings = { ...settings, customTypes: updatedCustoms };
        setSettings(updatedSettings);
        if (user) {
          try {
            await persistSettings(user.uid, updatedSettings);
          } catch {
            // best effort persist
          }
        }
      }

      let saved: ReminderEvent | null = null;
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/events", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(validated),
          });
          if (res.ok) {
            const json = await res.json();
            saved = json.event;
          }
        } catch {
          // Direct client fallback
        }
        if (!saved) {
          saved = await saveUserEvent(user.uid, validated);
        }
      } else {
        saved = { ...validated, id: validated.id || crypto.randomUUID() };
      }
      if (generation !== authGeneration.current) return;
      setEvents((old) =>
        old.some((e) => e.id === saved!.id)
          ? old.map((e) => (e.id === saved!.id ? saved! : e))
          : [...old, saved!],
      );
      setEditing(null);
      toast(user ? "Occasion saved." : "Saved locally (demo). Sign in to sync.");
    });
  }

  async function removeOccasion(id: string) {
    await act(async (generation) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error();
        } catch {
          await deleteUserEvent(user.uid, id);
        }
      }
      if (generation !== authGeneration.current) return;
      setEvents((old) => old.filter((e) => e.id !== id));
      setArmedDelete(null);
      toast("Event deleted.");
    });
  }

  async function toggleArchive(id: string) {
    const item = events.find((e) => e.id === id);
    if (!item) return;
    await saveOccasion({ ...item, archived: !item.archived });
    toast(item.archived ? "Restored." : "Archived.");
  }

  async function updateSettingField<K extends keyof Settings>(key: K, val: Settings[K]) {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    await act(async (generation) => {
      const validated = validateSettings(newSettings);
      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/profile", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(validated),
          });
        } catch {
          await persistSettings(user.uid, validated);
        }
      }
      if (generation !== authGeneration.current) return;
      toast("Settings updated.");
    });
  }

  const items = today ? upcoming(events, today) : [];
  const nextUp = items[0];
  const summary = previewDate ? buildSummary(events, settings, previewDate) : { sections: [] };

  const currentYear = today ? parseInt(today.slice(0, 4), 10) : new Date().getFullYear();

  return (
    <div className="wrap">
      <header>
        <h1 aria-label="Remember home">
          <span className="logoMark" aria-hidden="true">✓</span>
          Dates to Remember
        </h1>
        <div className="headerActions">
          <button
            className="btn p"
            onClick={() => {
              setDialogError("");
              setIsAddingCustomType(false);
              setNewTypeName("");
              setEditing({
                ...blankEvent,
                month: new Date().getMonth() + 1,
                day: 1,
                checkpoints: [30, 7, 1, 0],
                remindTime: settings.sendTime || "09:00",
              });
            }}
          >
            Add event
          </button>
          {user ? (
            <button
              className="btn"
              onClick={() => signOut(browserAuth())}
              disabled={busy}
            >
              Sign out ({user.email?.split("@")[0]})
            </button>
          ) : (
            <button className="btn" onClick={login} disabled={busy || !authReady}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <p className="note">
        {user
          ? "Connected to Firebase. Scheduled reminders are dispatched by AWS EventBridge & Lambda."
          : "Prototype preview: summaries are previewed here using your reminder rules. Sign in with Google to sync."}
      </p>

      {settings.paused && (
        <div className="banner">
          All reminders are paused. Turn this off in Settings to resume.
        </div>
      )}

      {/* Navigation tabs */}
      <nav className="tabs" aria-label="Main navigation">
        {[
          ["over", "Overview"],
          ["ev", "Events"],
          ["gro", "Groups"],
          ["pre", "Preview"],
          ["his", "History"],
          ["set", "Settings"],
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "on" : ""}
            onClick={() => setTab(key as Tab)}
            aria-current={tab === key ? "page" : undefined}
          >
            {title}
          </button>
        ))}
      </nav>

      {/* OVERVIEW TAB */}
      {tab === "over" && (
        <section>
          <div className="stats">
            <div className="stat">
              <span>Active occasions</span>
              <b>{items.length}</b>
            </div>
            <div className="stat">
              <span>Next celebration</span>
              <b>{nextUp ? (nextUp.days === 0 ? "Today" : `in ${nextUp.days} days`) : "None"}</b>
              <small>
                {nextUp
                  ? `${nextUp.name} — ${MN[parseInt(nextUp.date.split("-")[1], 10) - 1].slice(0, 3)} ${parseInt(nextUp.date.split("-")[2], 10)}`
                  : ""}
              </small>
            </div>
            <div className="stat">
              <span>Due in 30 days</span>
              <b>
                {
                  items.filter((x) => x.days <= 30).length
                }
              </b>
              <small>{items.filter((x) => x.days <= 7).length} due this week</small>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="emptyState">
              <h3>No occasions added yet</h3>
              <p>
                Start fresh by adding your loved ones’ birthdays, anniversaries, or important annual dates.
              </p>
              <div className="acts" style={{ justifyContent: "center" }}>
                <button
                  className="btn p"
                  onClick={() => {
                    setDialogError("");
                    setIsAddingCustomType(false);
                    setNewTypeName("");
                    setEditing({
                      ...blankEvent,
                      month: new Date().getMonth() + 1,
                      day: 1,
                      checkpoints: [30, 7, 1, 0],
                      remindTime: settings.sendTime || "09:00",
                    });
                  }}
                >
                  + Add your first occasion
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    demos.forEach((d) => saveOccasion(d));
                  }}
                >
                  Load sample occasions
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2>Upcoming</h2>
              <div className="chips">
                {[
                  ["all", "All"],
                  ...Array.from(new Set(events.map((e) => e.type))).map((t) => [
                    t,
                    t === "Birthday" ? "Birthdays" : t === "Anniversary" ? "Anniversaries" : t,
                  ]),
                ].map(([k, label]) => (
                  <button
                    key={k}
                    className={filter === k ? "on" : ""}
                    onClick={() => setFilter(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {items
                .filter((x) => filter === "all" || x.type === filter)
                .map((x) => {
                  const orig = events.find((e) => e.id === x.id);
                  const isDueSoon = x.days <= (orig?.leadDays ?? settings.defaultLeadDays);
                  const parts = x.date.split("-");
                  const mIdx = parseInt(parts[1], 10) - 1;
                  const dNum = parseInt(parts[2], 10);
                  const numText = x.number
                    ? x.type === "Anniversary"
                      ? ` (${ord(x.number)} anniversary)`
                      : ` (turning ${x.number})`
                    : "";

                  return (
                    <div className="row" key={x.id}>
                      <div className="dt">
                        <span>{MN[mIdx]?.slice(0, 3)}</span>
                        <b>{dNum}</b>
                      </div>
                      <div className="grow">
                        <b>{x.name}</b>
                        <span>{numText}</span>
                        <br />
                        <span className={`tag ${x.type}`}>{x.type}</span>
                        <small style={{ display: "inline" }}>
                          {orig?.emailEnabled ? "Email on" : "In-app only"}
                          {orig?.remindTime ? ` at ${orig.remindTime}` : ""}
                        </small>
                      </div>
                      <span className={`pill ${isDueSoon ? "hot" : ""}`}>
                        {x.days === 0 ? "Today" : x.days === 1 ? "Tomorrow" : `in ${x.days} days`}
                      </span>
                      <button
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: "12px", marginLeft: 8 }}
                        aria-label={`Edit ${x.name}`}
                        onClick={() => {
                          const orig = events.find((e) => e.id === x.id);
                          if (orig) {
                            setIsAddingCustomType(false);
                            setNewTypeName("");
                            setEditing(orig);
                          }
                        }}
                      >
                        Edit ↗
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {/* EVENTS TABLE TAB */}
      {tab === "ev" && (
        <section>
          <div className="card tw">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Email reminder</th>
                  <th>Text reminder</th>
                  <th>Lead time</th>
                  <th>Daily</th>
                  <th>Monthly</th>
                  <th>Weekly</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className={e.archived ? "arch" : ""}>
                    <td data-l="Name">
                      <span>
                        <b>{e.name}</b>
                        <br />
                        <span className={`tag ${e.type}`}>{e.type}</span>
                        {e.archived && <small>Archived</small>}
                      </span>
                    </td>
                    <td data-l="Date">
                      {MN[e.month - 1].slice(0, 3)} {e.day}
                      {e.year ? `, ${e.year}` : ""}
                    </td>
                    <td data-l="Email">
                      <label className="sw">
                        <input
                          type="checkbox"
                          checked={e.emailEnabled}
                          onChange={(ev) => saveOccasion({ ...e, emailEnabled: ev.target.checked })}
                        />
                        <span className="tr"></span>
                        <span className="st">{e.emailEnabled ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td data-l="Text">
                      <span className="soon">Coming soon</span>
                    </td>
                    <td data-l="Lead time">
                      <input
                        className="lead"
                        type="number"
                        min="0"
                        max="365"
                        defaultValue={e.leadDays ?? ""}
                        placeholder={`Default (${settings.defaultLeadDays})`}
                        onBlur={(ev) => {
                          const v = ev.target.value === "" ? null : parseInt(ev.target.value, 10);
                          saveOccasion({ ...e, leadDays: v });
                        }}
                      />
                    </td>
                    <td data-l="Daily">
                      <label className="sw">
                        <input
                          type="checkbox"
                          checked={e.daily}
                          onChange={(ev) => saveOccasion({ ...e, daily: ev.target.checked })}
                        />
                        <span className="tr"></span>
                        <span className="st">{e.daily ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td data-l="Monthly">
                      <label className="sw">
                        <input
                          type="checkbox"
                          checked={e.monthly}
                          onChange={(ev) => saveOccasion({ ...e, monthly: ev.target.checked })}
                        />
                        <span className="tr"></span>
                        <span className="st">{e.monthly ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td data-l="Weekly">
                      <label className="sw">
                        <input
                          type="checkbox"
                          checked={e.weekly}
                          onChange={(ev) => saveOccasion({ ...e, weekly: ev.target.checked })}
                        />
                        <span className="tr"></span>
                        <span className="st">{e.weekly ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td data-l="Actions">
                      <div className="acts">
                        <button className="btn" onClick={() => setEditing(e)}>
                          Edit
                        </button>
                        <button className="btn" onClick={() => toggleArchive(e.id)}>
                          {e.archived ? "Restore" : "Archive"}
                        </button>
                        <button
                          className="btn d"
                          onClick={() => {
                            if (armedDelete === e.id) {
                              removeOccasion(e.id);
                            } else {
                              setArmedDelete(e.id);
                            }
                          }}
                        >
                          {armedDelete === e.id ? "Confirm delete" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="note">
            Lead time controls daily countdowns and advance alerts. Monthly and weekly summaries compile automatically.
          </p>
        </section>
      )}

      {/* GROUPS TAB */}
      {tab === "gro" && (
        <section>
          <div className="groupGrid">
            {/* Left sidebar: Group list & Join/Create */}
            <div className="card">
              <h2>Your Groups</h2>
              <div className="groupList">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    className={`groupItemBtn ${selectedGroupId === g.id ? "on" : ""}`}
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <div className="groupItemInfo">
                      <b>{g.name}</b>
                      <small>{Object.keys(g.members || {}).length} members · Code: <code>{g.code}</code></small>
                    </div>
                  </button>
                ))}
                {groups.length === 0 && (
                  <p className="off">You haven't joined or created any groups yet.</p>
                )}
              </div>

              <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--ln)" }} />

              <h3>Create a Group</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newGroupName.trim()) return;
                  await act(async () => {
                    if (user) {
                      const grp = await createGroupCircle(
                        user.uid,
                        user.displayName || user.email?.split("@")[0] || "User",
                        user.email || "",
                        newGroupName,
                      );
                      setGroups((prev) => [...prev, grp]);
                      setSelectedGroupId(grp.id);
                    } else {
                      const demoGrp: GroupCircle = {
                        id: crypto.randomUUID(),
                        name: newGroupName.trim(),
                        code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                        ownerUid: "demo",
                        createdAt: new Date().toISOString(),
                        members: {
                          demo: { uid: "demo", name: "You", email: "you@example.com", joinedAt: new Date().toISOString() },
                        },
                      };
                      setGroups((prev) => [...prev, demoGrp]);
                      setSelectedGroupId(demoGrp.id);
                    }
                    setNewGroupName("");
                    toast(`Created group "${newGroupName}"!`);
                  });
                }}
              >
                <label className="f">
                  Group name
                  <input
                    value={newGroupName}
                    placeholder="e.g. The Heiner Family"
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn p" style={{ width: "100%", marginTop: 4 }}>
                  Create group
                </button>
              </form>

              <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--ln)" }} />

              <h3>Join with Code</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!joinCodeInput.trim()) return;
                  await act(async () => {
                    if (user) {
                      const grp = await joinGroupByCode(
                        user.uid,
                        user.displayName || user.email?.split("@")[0] || "User",
                        user.email || "",
                        joinCodeInput.trim(),
                      );
                      setGroups((prev) => (prev.some((g) => g.id === grp.id) ? prev : [...prev, grp]));
                      setSelectedGroupId(grp.id);
                      toast(`Joined "${grp.name}"!`);
                    } else {
                      toast(`Demo: Code "${joinCodeInput.toUpperCase()}" accepted! Sign in to join live Firestore circles.`);
                    }
                    setJoinCodeInput("");
                  });
                }}
              >
                <label className="f">
                  Invite code
                  <input
                    value={joinCodeInput}
                    placeholder="e.g. FAM778"
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn" style={{ width: "100%", marginTop: 4 }}>
                  Join group
                </button>
              </form>
            </div>

            {/* Right side: Selected Group Details & Shared Feed */}
            {selectedGroupId && groups.find((g) => g.id === selectedGroupId) ? (
              (() => {
                const grp = groups.find((g) => g.id === selectedGroupId)!;
                // Occasions shared with this group
                const groupEvents = events.filter(
                  (e) => !e.archived && e.sharedGroupIds && e.sharedGroupIds.includes(grp.id),
                );

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="card">
                      <div className="groupHeader">
                        <div>
                          <h2>{grp.name}</h2>
                          <p className="note" style={{ margin: "4px 0 0" }}>
                            Invite code: <strong style={{ color: "var(--pr)", fontSize: 16 }}>{grp.code}</strong>
                            <button
                              className="btn"
                              style={{ marginLeft: 10, padding: "2px 8px", fontSize: 12 }}
                              onClick={() => {
                                navigator.clipboard.writeText(grp.code);
                                toast("Invite code copied to clipboard!");
                              }}
                            >
                              Copy code
                            </button>
                          </p>
                        </div>
                      </div>

                      <h3 style={{ marginTop: 20 }}>Group Members</h3>
                      <div className="checkpointPills" style={{ marginBottom: 20 }}>
                        {Object.values(grp.members || {}).map((m) => (
                          <span key={m.uid} className="checkpointPill">
                            👤 {m.name} {m.email ? `(${m.email.split("@")[0]})` : ""}
                          </span>
                        ))}
                      </div>

                      <h3>Shared Occasions</h3>
                      <p className="note">
                        Dates shared by members of {grp.name}. To share an occasion, edit it and check "{grp.name}".
                      </p>

                      {groupEvents.length === 0 ? (
                        <div className="emptyState" style={{ padding: "24px 16px" }}>
                          <p style={{ margin: "0 auto" }}>
                            No occasions are shared with this group yet. Edit any birthday, anniversary, or wish to opt it in!
                          </p>
                        </div>
                      ) : (
                        <div className="groupSharedFeed">
                          {groupEvents.map((ev) => {
                            const nextDate = nextOccurrence(ev, today || localDate(new Date(), settings.timezone));
                            const days = daysBetween(today || localDate(new Date(), settings.timezone), nextDate);
                            return (
                              <div className="row" key={ev.id}>
                                <div className="dt">
                                  <span>{MN[ev.month - 1].slice(0, 3)}</span>
                                  <b>{ev.day}</b>
                                </div>
                                <div className="grow">
                                  <b>{ev.name}</b>
                                  <br />
                                  <span className={`tag ${ev.type}`}>{ev.type}</span>
                                  {ev.notes && <small style={{ display: "inline" }}>{ev.notes}</small>}
                                </div>
                                <span className={`pill ${days <= 7 ? "hot" : ""}`}>
                                  {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Christmas Wishlist inside Group */}
                    <div className="card">
                      <h2>🎄 Christmas Wishlists</h2>
                      <p className="note">
                        Share gift ideas, sizes, and wishes with your group members.
                      </p>

                      <div style={{ marginBottom: 20 }}>
                        <h3>Your Christmas Wishlist</h3>
                        {wishlistItems.length === 0 ? (
                          <p className="off">Your wishlist is currently empty. Add your first gift idea below!</p>
                        ) : (
                          <ul className="wishlist">
                            {wishlistItems.map((item) => (
                              <li key={item.id} className="wishlistItem">
                                <div className="grow">
                                  <b>{item.title}</b>
                                  {item.url && (
                                    <div>
                                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--pr)" }}>
                                        View item link ↗
                                      </a>
                                    </div>
                                  )}
                                  {item.notes && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--mu)" }}>{item.notes}</p>}
                                </div>
                                <button
                                  className="btn d"
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  onClick={async () => {
                                    const updated = wishlistItems.filter((w) => w.id !== item.id);
                                    setWishlistItems(updated);
                                    if (user) await saveUserWishlist(user.uid, updated);
                                    toast("Wishlist item removed.");
                                  }}
                                >
                                  Remove
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newWishTitle.trim()) return;
                            const newItem: WishlistItem = {
                              id: crypto.randomUUID(),
                              title: newWishTitle.trim(),
                              url: newWishUrl.trim() || undefined,
                              notes: newWishNotes.trim() || undefined,
                              createdAt: new Date().toISOString(),
                            };
                            const updated = [...wishlistItems, newItem];
                            setWishlistItems(updated);
                            if (user) await saveUserWishlist(user.uid, updated);
                            setNewWishTitle("");
                            setNewWishUrl("");
                            setNewWishNotes("");
                            toast("Added to your Christmas wishlist!");
                          }}
                          style={{ marginTop: 16, background: "var(--bg)", padding: 14, borderRadius: 10 }}
                        >
                          <b>+ Add a gift wish</b>
                          <label className="f" style={{ marginTop: 8 }}>
                            Item or idea
                            <input
                              value={newWishTitle}
                              placeholder="e.g. Cozy Merino Wool Scarf, Espresso Grinder"
                              required
                              onChange={(e) => setNewWishTitle(e.target.value)}
                            />
                          </label>
                          <div className="two">
                            <label className="f">
                              Product URL (optional)
                              <input
                                type="url"
                                value={newWishUrl}
                                placeholder="https://..."
                                onChange={(e) => setNewWishUrl(e.target.value)}
                              />
                            </label>
                            <label className="f">
                              Details / Size / Color (optional)
                              <input
                                value={newWishNotes}
                                placeholder="Size M, forest green, etc."
                                onChange={(e) => setNewWishNotes(e.target.value)}
                              />
                            </label>
                          </div>
                          <button type="submit" className="btn p" style={{ marginTop: 6 }}>
                            Add to wishlist
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="card">
                <p className="off">Select a group or create one to view shared dates and wishlists.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PREVIEW TAB */}
      {tab === "pre" && (
        <section className="card">
          <h2>Preview a day’s email</h2>
          <div className="acts" style={{ alignItems: "flex-end", marginBottom: 14 }}>
            <label className="f" style={{ margin: 0 }}>
              Date
              <input
                type="date"
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
              />
            </label>
            <button className="btn" onClick={() => setPreviewDate(today)}>
              Today
            </button>
          </div>
          <small style={{ marginBottom: 12 }}>
            Simulating notification dispatch for {previewDate} at {settings.sendTime} ({settings.timezone}).
          </small>

          {summary.sections.length === 0 ? (
            <p className="off">
              {settings.paused
                ? "All reminders are paused in settings."
                : !settings.emailEnabled
                  ? "Email reminders are toggled off."
                  : "No events qualify on this date. Empty summaries are skipped."}
            </p>
          ) : (
            <div className="mail">
              <div className="sub">
                <small>Subject</small>
                <b>
                  {summary.sections.length === 1
                    ? `Reminder: ${summary.sections[0].title}`
                    : `Your reminders for ${previewDate}`}
                </b>
              </div>
              <div className="bd">
                {summary.sections.map((sec, idx) => (
                  <div key={idx}>
                    <h3>{sec.title}</h3>
                    <ul>
                      {sec.items.map((item, iIdx) => (
                        <li key={iIdx}>
                          {item.name}’s {item.type.toLowerCase()} — {item.date}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <small style={{ marginTop: 14 }}>
                  Delivered by your automated AWS Lambda worker via AWS SES.
                </small>
              </div>
            </div>
          )}
        </section>
      )}

      {/* HISTORY TAB */}
      {tab === "his" && (
        <section className="card tw">
          <div className="acts" style={{ marginBottom: 14 }}>
            <button
              className="btn p"
              onClick={() => toast("Test reminder preview generated above.")}
            >
              Trigger dry-run
            </button>
            <small style={{ alignSelf: "center" }}>
              Automated delivery executes daily via AWS EventBridge.
            </small>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Channel</th>
                <th>Contents</th>
                <th>Status</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? (
                history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.date}</td>
                    <td>Email (AWS SES)</td>
                    <td>Scheduled reminder</td>
                    <td>
                      <b style={{ color: "var(--good)" }}>✓ {h.status}</b>
                    </td>
                    <td>{h.attempts ?? 1}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--mu)", padding: 24 }}>
                    No automated deliveries recorded yet. AWS Lambda logs execution directly to AWS CloudWatch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {/* SETTINGS TAB */}
      {tab === "set" && (
        <section>
          <div className="card">
            <h2>Delivery</h2>
            <label className="f">
              Recipient email
              <input value={user?.email || "demo@example.com"} disabled />
            </label>
            <p className="badge" style={{ marginTop: -8 }}>
              {user ? "Verified Account" : "Demo Mode"}
            </p>

            <label className="f">
              Timezone
              <select
                value={settings.timezone}
                onChange={(e) => updateSettingField("timezone", e.target.value)}
              >
                {[
                  "UTC",
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "America/Los_Angeles",
                  "Europe/London",
                  "Europe/Paris",
                  "Asia/Tokyo",
                ].map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>

            <label className="f">
              Send time
              <input
                type="time"
                value={settings.sendTime}
                onChange={(e) => updateSettingField("sendTime", e.target.value)}
              />
            </label>

            <div style={{ marginBottom: 14 }}>
              <label className="sw">
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={(e) => updateSettingField("emailEnabled", e.target.checked)}
                />
                <span className="tr"></span>
                <span className="st">{settings.emailEnabled ? "On" : "Off"}</span>
                <b>Email reminders</b>
              </label>
              <small>Turn off to stop all scheduled reminder emails.</small>
            </div>

            <div>
              <label className="sw">
                <input
                  type="checkbox"
                  checked={settings.paused}
                  onChange={(e) => updateSettingField("paused", e.target.checked)}
                />
                <span className="tr"></span>
                <span className="st">{settings.paused ? "On" : "Off"}</span>
                <b>Pause all reminders</b>
              </label>
              <small>Overrides every occasion setting until you turn it off.</small>
            </div>
          </div>

          <div className="card">
            <h2>Default lead time</h2>
            <label className="f">
              Days before an event (0–365)
              <input
                type="number"
                min="0"
                max="365"
                value={settings.defaultLeadDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0 && val <= 365) {
                    updateSettingField("defaultLeadDays", val);
                  }
                }}
              />
            </label>
          </div>

          <div className="card">
            <h2>Account Data</h2>
            <p className="note">
              Permanently delete all your saved occasions and preferences from Firestore.
            </p>
            <button
              className="btn d"
              onClick={async () => {
                if (confirm("Are you sure you want to delete all your account data?")) {
                  if (user) await deleteUserAccountData(user.uid);
                  setEvents([]);
                  toast("All data removed.");
                }
              }}
            >
              Delete all data
            </button>
          </div>
        </section>
      )}

      {/* ADD / EDIT MODAL DIALOG */}
      {editing && (
        <div className="modalBackdrop" onClick={() => setEditing(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <h2>{editing.id ? "Edit event" : "Add event"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.name.trim()) {
                  setDialogError("Enter a name.");
                  return;
                }
                saveOccasion(editing);
              }}
            >
              <label className="f">
                Name
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Grandma Joan, Maya, Our Anniversary"
                  required
                />
              </label>

              <label className="f">
                Type
                <select
                  value={isAddingCustomType ? "__custom_new__" : editing.type}
                  onChange={(e) => {
                    if (e.target.value === "__custom_new__") {
                      setIsAddingCustomType(true);
                      setNewTypeName("");
                    } else {
                      setIsAddingCustomType(false);
                      setEditing({ ...editing, type: e.target.value });
                    }
                  }}
                >
                  <option value="Birthday">Birthday</option>
                  <option value="Anniversary">Anniversary</option>
                  {(settings.customTypes || [])
                    .filter((t) => t !== "Birthday" && t !== "Anniversary")
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  {editing.type &&
                    editing.type !== "Birthday" &&
                    editing.type !== "Anniversary" &&
                    !(settings.customTypes || []).includes(editing.type) && (
                      <option value={editing.type}>{editing.type}</option>
                    )}
                  <option value="__custom_new__">+ Add custom type...</option>
                </select>
              </label>

              {isAddingCustomType && (
                <label className="f">
                  Custom occasion name
                  <input
                    value={newTypeName}
                    placeholder="e.g. Graduation, Memorial, Pet Birthday"
                    autoFocus
                    onChange={(e) => {
                      setNewTypeName(e.target.value);
                      setEditing({ ...editing, type: e.target.value || "Custom" });
                    }}
                  />
                </label>
              )}

              <div className="two">
                <label className="f">
                  Month
                  <select
                    value={editing.month}
                    onChange={(e) => setEditing({ ...editing, month: parseInt(e.target.value, 10) })}
                  >
                    {MN.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="f">
                  Day
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={editing.day}
                    onChange={(e) => setEditing({ ...editing, day: parseInt(e.target.value, 10) })}
                    required
                  />
                </label>
              </div>

              <div className="two">
                <label className="f">
                  Year (optional)
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    value={editing.year ?? ""}
                    placeholder="Shows age or milestone"
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        year: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                  />
                </label>
                <label className="f">
                  Reminder time
                  <input
                    type="time"
                    value={editing.remindTime ?? settings.sendTime ?? "09:00"}
                    onChange={(e) => setEditing({ ...editing, remindTime: e.target.value })}
                  />
                </label>
              </div>

              <div className="f">
                <span>Reminder checkpoints</span>
                <div className="checkpointPills" role="group" aria-label="Reminder checkpoints">
                  {[
                    { days: 30, label: "1 month before" },
                    { days: 14, label: "2 weeks before" },
                    { days: 7, label: "1 week before" },
                    { days: 1, label: "1 day before" },
                    { days: 0, label: "Day of" },
                  ].map(({ days, label }) => {
                    const currentCheckpoints = editing.checkpoints || [30, 7, 1, 0];
                    const active = currentCheckpoints.includes(days);
                    return (
                      <button
                        key={days}
                        type="button"
                        className={`checkpointPill ${active ? "active" : ""}`}
                        aria-pressed={active}
                        onClick={() => {
                          const updated = active
                            ? currentCheckpoints.filter((d) => d !== days)
                            : [...currentCheckpoints, days].sort((a, b) => b - a);
                          setEditing({ ...editing, checkpoints: updated });
                        }}
                      >
                        {active ? "✓ " : "+ "}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <small style={{ marginTop: 4 }}>
                  Choose all advance milestones when you want to be alerted.
                </small>
              </div>

              <label className="f">
                Lead time in days (optional fallback)
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editing.leadDays ?? ""}
                  placeholder={`Default (${settings.defaultLeadDays})`}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      leadDays: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                />
              </label>

              <label className="f">
                Private notes
                <textarea
                  rows={2}
                  aria-label="Private notes"
                  value={editing.notes ?? ""}
                  placeholder="Gift ideas, favorite flowers..."
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </label>

              {/* Share with Groups */}
              <div className="f">
                <span>Share with Groups (Opt-in)</span>
                {groups.length === 0 ? (
                  <small style={{ color: "var(--mu)" }}>
                    You haven't joined any groups yet. Create or join one in the Groups tab!
                  </small>
                ) : (
                  <div className="checkpointPills" role="group" aria-label="Share with Groups">
                    {groups.map((grp) => {
                      const shared = (editing.sharedGroupIds || []).includes(grp.id);
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          className={`checkpointPill ${shared ? "active" : ""}`}
                          aria-pressed={shared}
                          onClick={() => {
                            const current = editing.sharedGroupIds || [];
                            const updated = shared
                              ? current.filter((id) => id !== grp.id)
                              : [...current, grp.id];
                            setEditing({ ...editing, sharedGroupIds: updated });
                          }}
                        >
                          {shared ? "✓ " : "+ "}
                          {grp.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                <small style={{ marginTop: 4 }}>
                  Only members of selected groups will be able to see this occasion.
                </small>
              </div>

              {dialogError && <p className="err">{dialogError}</p>}

              <div className="acts" style={{ marginTop: 18 }}>
                <button type="submit" className="btn p">
                  Save occasion
                </button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
