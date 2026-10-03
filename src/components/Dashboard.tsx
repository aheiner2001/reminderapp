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
import { validateSettings } from "../lib/access";
import {
  blankEvent,
  buildSummary,
  defaultSettings,
  localDate,
  upcoming,
  validateEvent,
  type ReminderEvent,
  type Settings,
} from "../lib/reminders";

type View = "upcoming" | "people" | "preview" | "settings";
type Delivery = { id: string; date: string; status: string; createdAt: string };
const demos: ReminderEvent[] = [
  {
    ...blankEvent,
    id: "demo-1",
    name: "Maya",
    month: 10,
    day: 12,
    daily: true,
  },
  {
    ...blankEvent,
    id: "demo-2",
    name: "Sam",
    month: 10,
    day: 23,
    leadDays: 21,
  },
  {
    ...blankEvent,
    id: "demo-3",
    name: "Our anniversary",
    type: "Anniversary",
    month: 11,
    day: 7,
  },
  { ...blankEvent, id: "demo-4", name: "Leo", month: 11, day: 18 },
];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function CalendarIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 3v4m10-4v4M3 11h18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m9 16 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switchLabel">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="switch" />
      <span>{label}</span>
    </label>
  );
}

export default function Dashboard() {
  const authGeneration = useRef(0);
  const identityUid = useRef<string | null | undefined>(undefined);
  const [view, setView] = useState<View>("upcoming");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [events, setEvents] = useState<ReminderEvent[]>(demos);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [emailReady, setEmailReady] = useState(false);
  const [history, setHistory] = useState<Delivery[]>([]);
  const [editing, setEditing] = useState<ReminderEvent | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState("All");
  useEffect(() => {
    const now = localDate(new Date(), defaultSettings.timezone);
    setToday(now);
    setDate(now);
    if (new URLSearchParams(window.location.search).get("view") === "settings")
      setView("settings");
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
          setEmailReady(false);
          setError("");
          setNotice("");
          setBusy(false);
          setToday(now);
          setDate(now);
        }
        setUser(u);
        setAuthReady(true);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in setup failed.");
      setAuthReady(true);
    }
    return () => stop();
  }, []);
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
    identity = user,
  ) {
    if (!identity) throw new Error("Sign in to save your events.");
    const token = await identity.getIdToken();
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }
  useEffect(() => {
    let current = true;
    if (!authReady) return;
    if (!user) {
      setEvents(demos);
      setSettings(defaultSettings);
      setEmailReady(false);
      setHistory([]);
      return;
    }
    setEvents([]);
    setHistory([]);
    setEmailReady(false);
    setBusy(true);
    setError("");
    api("/api/profile", "GET", undefined, user)
      .then((data) => {
        if (current) {
          setEvents(data.events);
          setSettings(data.settings);
          setHistory(data.history);
          setEmailReady(data.emailReady);
          const now = localDate(new Date(), data.settings.timezone);
          setToday(now);
          setDate(now);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [user, authReady]); // api uses the explicit identity to avoid stale authentication.
  const items = today ? upcoming(events, today) : [];
  const filtered = items.filter((i) => filter === "All" || i.type === filter);
  const soon = items.filter((i) => i.days <= 30);
  const summary = date
    ? buildSummary(events, settings, date)
    : { sections: [] };
  async function act(work: (generation: number) => Promise<void>) {
    const generation = authGeneration.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work(generation);
    } catch (e) {
      if (generation === authGeneration.current)
        setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (generation === authGeneration.current) setBusy(false);
    }
  }
  async function login() {
    await act(async (generation) => {
      await signInWithPopup(browserAuth(), new GoogleAuthProvider());
    });
  }
  async function saveEvent(value: ReminderEvent) {
    await act(async (generation) => {
      const validated = validateEvent(value);
      const saved = user
        ? (await api("/api/events", "POST", validated)).event
        : { ...validated, id: validated.id || crypto.randomUUID() };
      if (generation !== authGeneration.current) return;
      setEvents((old) =>
        old.some((e) => e.id === saved.id)
          ? old.map((e) => (e.id === saved.id ? saved : e))
          : [...old, saved],
      );
      setEditing(null);
      setNotice(
        user
          ? "Event saved."
          : "Demo updated. Sign in to save your own events.",
      );
    });
  }
  async function removeEvent(event: ReminderEvent) {
    if (!confirm(`Delete ${event.name}'s event?`)) return;
    await act(async (generation) => {
      if (user)
        await api(`/api/events?id=${encodeURIComponent(event.id)}`, "DELETE");
      if (generation !== authGeneration.current) return;
      setEvents((old) => old.filter((e) => e.id !== event.id));
      setEditing(null);
      setNotice("Event deleted.");
    });
  }
  async function saveSettings() {
    await act(async (generation) => {
      const saved = validateSettings(settings);
      if (user) await api("/api/profile", "PUT", saved);
      if (generation !== authGeneration.current) return;
      const now = localDate(new Date(), saved.timezone);
      setToday(now);
      setDate(now);
      setNotice(user ? "Preferences saved." : "Demo preferences updated.");
    });
  }
  async function testEmail() {
    await act(async (generation) => {
      await api("/api/test-email", "POST", { date });
      if (generation !== authGeneration.current) return;
      setNotice(
        `Test email accepted for ${user?.email}. Provider acceptance does not confirm inbox delivery.`,
      );
      const data = await api("/api/profile");
      if (generation !== authGeneration.current) return;
      setHistory(data.history);
    });
  }
  const change = (
    event: ReminderEvent,
    key: "emailEnabled" | "daily" | "weekly" | "monthly",
    value: boolean,
  ) => saveEvent({ ...event, [key]: value });
  return (
    <div className="appShell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Remember home">
          <span className="brandMark">
            <CalendarIcon />
          </span>
          remember<span className="brandDot">.</span>
        </a>
        <p className="sideLabel">YOUR LITTLE REMINDER</p>
        <nav aria-label="Main navigation">
          {(
            [
              ["upcoming", "◷", "Coming up"],
              ["people", "♡", "Your people"],
              ["preview", "✉", "Reminder preview"],
              ["settings", "⚙", "Preferences"],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                setError("");
                setNotice("");
              }}
              className={view === key ? "navItem active" : "navItem"}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
              {key === "people" && (
                <small>{events.filter((e) => !e.archived).length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebarNote">
          <span className="littleFlower" aria-hidden="true">
            ✳
          </span>
          <h3>
            Small reminders.
            <br />
            Meaningful moments.
          </h3>
          <p>A little heads-up for the people who make life brighter.</p>
        </div>
        <div className="account">
          <span className="avatar">
            {user?.displayName?.slice(0, 1) || "D"}
          </span>
          <div>
            <strong>{user?.displayName || "Demo workspace"}</strong>
            <small>{user ? "Private pilot" : "Try it before signing in"}</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span className="breadcrumb">
            Your workspace <span>/</span>{" "}
            {view === "upcoming"
              ? "Coming up"
              : view === "people"
                ? "Your people"
                : view === "preview"
                  ? "Reminder preview"
                  : "Preferences"}
          </span>
          <div className="topActions">
            <span className="pill">
              {user ? "Private beta" : "Demo · not saved"}
            </span>
            {user ? (
              <button
                className="textButton"
                onClick={() =>
                  act(async () => {
                    await signOut(browserAuth());
                  })
                }
                disabled={busy}
              >
                Sign out
              </button>
            ) : (
              <button
                className="secondary"
                onClick={login}
                disabled={busy || !authReady}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>
        <div className="content">
          <div className="pageHeading">
            <div>
              <p className="eyebrow">MAKE ROOM FOR THE GOOD MOMENTS</p>
              <h1>
                {view === "upcoming"
                  ? "Something to celebrate."
                  : view === "people"
                    ? "The people who matter."
                    : view === "preview"
                      ? "A little heads-up."
                      : "Make it yours."}
              </h1>
              <p className="subtitle">
                {view === "upcoming"
                  ? "Birthdays, anniversaries, and a little time to plan something thoughtful."
                  : view === "people"
                    ? "Keep their important dates close, and choose how you want to remember."
                    : view === "preview"
                      ? "See exactly which email reminders qualify on a date you choose."
                      : "A few preferences to help you remember in your own way."}
              </p>
            </div>
            {(view === "upcoming" || view === "people") && (
              <button
                className="primary"
                onClick={() => setEditing({ ...blankEvent })}
                disabled={busy}
              >
                <span aria-hidden="true">＋</span> Add an occasion
              </button>
            )}
          </div>
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              {notice}
            </div>
          )}
          {!user && (
            <div className="demoNote">
              <strong>You’re exploring a demo.</strong> Sample events can be
              edited here. Sign in with an invited Google account to save your
              own.
            </div>
          )}
          {view === "upcoming" && (
            <>
              <div className="stats">
                <div>
                  <span className="statIcon lavender">♡</span>
                  <p>
                    Your people
                    <strong>{events.filter((e) => !e.archived).length}</strong>
                  </p>
                </div>
                <div>
                  <span className="statIcon peach">✧</span>
                  <p>
                    Next 30 days
                    <strong>
                      {soon.length} <small>occasions</small>
                    </strong>
                  </p>
                </div>
                <div>
                  <span className="statIcon sage">✉</span>
                  <p>
                    Email reminders
                    <strong>
                      {settings.paused
                        ? "Paused"
                        : settings.emailEnabled
                          ? "On"
                          : "Off"}{" "}
                      <small>test mode</small>
                    </strong>
                  </p>
                </div>
              </div>
              <div className="sectionTitle">
                <h2>On the horizon</h2>
                <div className="segmented" aria-label="Filter occasions">
                  {["All", "Birthday", "Anniversary"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f === "All"
                        ? "All occasions"
                        : f === "Birthday"
                          ? "Birthdays"
                          : "Anniversaries"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="occasionGrid">
                {filtered.slice(0, 6).map((i, index) => (
                  <article className="occasionCard" key={i.id}>
                    <div className="cardTop">
                      <span className={`dateTile tone${index % 3}`}>
                        <small>
                          {i.date.slice(5, 7) &&
                            monthNames[Number(i.date.slice(5, 7)) - 1].slice(
                              0,
                              3,
                            )}
                        </small>
                        <strong>{Number(i.date.slice(8))}</strong>
                      </span>
                      <span className="daysPill">
                        {i.days === 0 ? "Today!" : `${i.days} days away`}
                      </span>
                    </div>
                    <div className="cardTitle">
                      <h3>{i.name}</h3>
                      <p>
                        {i.type}
                        {i.number != null
                          ? ` · ${i.number}${i.type === "Anniversary" ? " years" : ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="cardFooter">
                      <span>
                        {events.find((e) => e.id === i.id)?.emailEnabled
                          ? "✉ Email selected"
                          : "In-app only"}
                      </span>
                      <button
                        onClick={() =>
                          setEditing(events.find((e) => e.id === i.id)!)
                        }
                        aria-label={`Edit ${i.name}`}
                      >
                        Edit ↗
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty">
                  <h3>A little space for someone special.</h3>
                  <p>Add a birthday or anniversary to get started.</p>
                </div>
              )}
              <div className="gentleBanner">
                <span aria-hidden="true">✳</span>
                <div>
                  <h3>A thoughtful moment starts with a little reminder.</h3>
                  <p>
                    Choose a monthly overview, a weekly heads-up, or a daily
                    countdown.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setView("preview")}
                >
                  Preview reminders ↗
                </button>
              </div>
            </>
          )}
          {view === "people" && (
            <>
              <div className="sectionTitle">
                <h2>Occasion settings</h2>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                  />{" "}
                  Include archived
                </label>
              </div>
              <div className="tableWrap">
                <table className="eventTable">
                  <thead>
                    <tr>
                      <th>Person / occasion</th>
                      <th>Date</th>
                      <th>Email</th>
                      <th>Text</th>
                      <th>Lead time</th>
                      <th>Daily</th>
                      <th>Monthly</th>
                      <th>Weekly</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events
                      .filter((e) => showArchived || !e.archived)
                      .map((e) => (
                        <tr key={e.id}>
                          <td>
                            <strong>{e.name}</strong>
                            <small>
                              {e.type}
                              {e.archived ? " · Archived" : ""}
                            </small>
                          </td>
                          <td>
                            {monthNames[e.month - 1].slice(0, 3)} {e.day}
                          </td>
                          <td>
                            <input
                              aria-label={`Email for ${e.name}`}
                              type="checkbox"
                              checked={e.emailEnabled}
                              onChange={(x) =>
                                change(e, "emailEnabled", x.target.checked)
                              }
                              disabled={busy}
                            />
                          </td>
                          <td>
                            <small>Coming soon</small>
                          </td>
                          <td>
                            {e.leadDays ?? "Default"}
                            {e.leadDays != null ? " days" : ""}
                          </td>
                          {(["daily", "monthly", "weekly"] as const).map(
                            (key) => (
                              <td key={key}>
                                <input
                                  type="checkbox"
                                  aria-label={`${key} for ${e.name}`}
                                  checked={e[key]}
                                  onChange={(x) =>
                                    change(e, key, x.target.checked)
                                  }
                                  disabled={busy}
                                />
                              </td>
                            ),
                          )}
                          <td>
                            <button
                              className="textButton"
                              onClick={() => setEditing(e)}
                              disabled={busy}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="eventCards">
                {events
                  .filter((e) => showArchived || !e.archived)
                  .map((e) => (
                    <article key={e.id} className="panel">
                      <div className="sectionTitle">
                        <h3>{e.name}</h3>
                        <button
                          className="textButton"
                          onClick={() => setEditing(e)}
                        >
                          Edit
                        </button>
                      </div>
                      <p>
                        {e.type} · {monthNames[e.month - 1]} {e.day}
                      </p>
                      <div className="mobileToggles">
                        {(
                          [
                            "emailEnabled",
                            "daily",
                            "monthly",
                            "weekly",
                          ] as const
                        ).map((key) => (
                          <Toggle
                            key={key}
                            label={key === "emailEnabled" ? "Email" : key}
                            checked={e[key]}
                            onChange={(v) => change(e, key, v)}
                            disabled={busy}
                          />
                        ))}
                      </div>
                      <p className="muted">
                        Lead time: {e.leadDays ?? "Default"} · Text: coming soon
                      </p>
                    </article>
                  ))}
              </div>
              {!events.length && (
                <div className="empty">
                  No occasions yet. Add one to get started.
                </div>
              )}
              <p className="footnote">
                Daily reminders count down inside the lead window. Monthly and
                weekly summaries use their own calendar windows.
              </p>
            </>
          )}
          {view === "preview" && (
            <div className="previewLayout">
              <section className="panel">
                <h2>Your email preview</h2>
                <p className="muted">
                  Select a date. The first of the month shows this month and
                  next month; Mondays add a weekly overview.
                </p>
                <label className="field">
                  Preview date
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </label>
                <div className="mailPreview">
                  <p className="mailLabel">REMEMBER · A LITTLE HEADS-UP</p>
                  <h3>Your reminders</h3>
                  {summary.sections.length ? (
                    summary.sections.map((s, index) => (
                      <div key={index} className="mailSection">
                        <h4>{s.title}</h4>
                        {s.items.map((i) => (
                          <p key={i.id}>
                            <strong>{i.name}</strong>
                            <span>
                              {i.type} · {shortDate(i.date)} ·{" "}
                              {i.days === 0 ? "today" : `${i.days} days away`}
                            </span>
                          </p>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="muted">
                      No email reminders qualify on this date. Try an event day,
                      a Monday, or the first of a month. Check whether reminders
                      are paused.
                    </p>
                  )}
                </div>
                <button
                  className="primary"
                  disabled={
                    !user || busy || !emailReady || !summary.sections.length
                  }
                  onClick={testEmail}
                >
                  Send me this test email
                </button>
                <p className="footnote">
                  {!user
                    ? "Sign in to send a test email."
                    : !emailReady
                      ? "Email sending has not been configured by the owner yet."
                      : `Sent only to ${user.email}. Maximum 3 tests per day.`}{" "}
                  Automatic sending is not enabled.
                </p>
              </section>
              <aside className="panel history">
                <h2>Recent test sends</h2>
                {history.length ? (
                  history.map((h) => (
                    <div className="historyRow" key={h.id}>
                      <strong>{h.date}</strong>
                      <span>{h.status}</span>
                      <small>{new Date(h.createdAt).toLocaleString()}</small>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Your requested test emails will appear here.
                  </p>
                )}
                <p className="footnote">
                  “Accepted” means the provider accepted the request, not that
                  the email reached your inbox.
                </p>
              </aside>
            </div>
          )}
          {view === "settings" && (
            <section className="panel settingsPanel">
              <h2>Your reminder preferences</h2>
              <p className="muted">
                Reminders are for you. The people you track do not need contact
                details or accounts.
              </p>
              <div className="formGrid">
                <label className="field">
                  Timezone
                  <input
                    value={settings.timezone}
                    onChange={(e) =>
                      setSettings({ ...settings, timezone: e.target.value })
                    }
                    placeholder="America/Denver"
                  />
                </label>
                <label className="field">
                  Preferred send time
                  <input
                    type="time"
                    value={settings.sendTime}
                    onChange={(e) =>
                      setSettings({ ...settings, sendTime: e.target.value })
                    }
                  />
                  <small>Saved for future automatic reminders.</small>
                </label>
                <label className="field">
                  Default advance notice (days)
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={settings.defaultLeadDays}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultLeadDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  Reminder email
                  <input
                    readOnly
                    value={user?.email || "Your verified Google email"}
                  />
                  <small>Uses your verified sign-in address.</small>
                </label>
              </div>
              <div className="preferenceToggles">
                <Toggle
                  label="Enable email reminders"
                  checked={settings.emailEnabled}
                  onChange={(v) =>
                    setSettings({ ...settings, emailEnabled: v })
                  }
                />
                <Toggle
                  label="Pause all reminders"
                  checked={settings.paused}
                  onChange={(v) => setSettings({ ...settings, paused: v })}
                />
              </div>
              <p className="footnote">
                For February 29 occasions, February 28 is observed in non-leap
                years. Text messages and payments are not enabled in this pilot.
              </p>
              <button
                className="primary"
                onClick={saveSettings}
                disabled={busy}
              >
                Save preferences
              </button>
              {user && (
                <div className="dangerZone">
                  <h3>Delete my app account</h3>
                  <p>
                    This removes your saved occasions and test history from
                    Remember.
                  </p>
                  <button
                    className="dangerButton"
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          "Permanently delete your Remember account and saved events?",
                        )
                      )
                        act(async (generation) => {
                          await api("/api/profile", "DELETE");
                          if (generation !== authGeneration.current) return;
                          await signOut(browserAuth());
                        });
                    }}
                  >
                    Delete account
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="footer">
            <span>Made for the moments that matter.</span>
            <span>Remember · Private pilot</span>
          </footer>
        </div>
      </main>
      {editing && (
        <EventModal
          event={editing}
          busy={busy}
          error={error}
          onClose={() => setEditing(null)}
          onSave={saveEvent}
          onDelete={() => removeEvent(editing)}
        />
      )}
    </div>
  );
}
function EventModal({
  event,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  event: ReminderEvent;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (event: ReminderEvent) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...event });
  const [validation, setValidation] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("#occasionDialog");
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      id="occasionDialog"
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            validateEvent(form);
            setValidation("");
            onSave(form);
          } catch (e) {
            setValidation(e instanceof Error ? e.message : "Invalid event.");
          }
        }}
      >
        <div className="modalHeader">
          <div>
            <p className="eyebrow">A DATE WORTH REMEMBERING</p>
            <h2>{event.id ? "Edit occasion" : "Add an occasion"}</h2>
          </div>
          <button
            type="button"
            className="close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {(validation || error) && (
          <p className="message error" role="alert">
            {validation || error}
          </p>
        )}
        <label className="field">
          Name or occasion
          <input
            autoFocus
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Someone special"
          />
        </label>
        <div className="formGrid">
          <label className="field">
            Event type
            <select
              aria-label="Event type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option>Birthday</option>
              <option>Anniversary</option>
            </select>
          </label>
          <label className="field">
            Month
            <select
              aria-label="Month"
              value={form.month}
              onChange={(e) =>
                setForm({ ...form, month: Number(e.target.value) })
              }
            >
              {monthNames.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Day
            <input
              required
              type="number"
              min="1"
              max="31"
              value={form.day}
              onChange={(e) =>
                setForm({ ...form, day: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Year (optional)
            <input
              type="number"
              min="1"
              max={new Date().getFullYear()}
              value={form.year ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  year: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
        </div>
        <label className="field">
          Lead time (days)
          <input
            type="number"
            min="0"
            max="365"
            placeholder="Use account default"
            value={form.leadDays ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                leadDays: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <div className="modalToggles">
          {(
            ["emailEnabled", "daily", "monthly", "weekly", "archived"] as const
          ).map((key) => (
            <Toggle
              key={key}
              label={
                key === "emailEnabled"
                  ? "Email reminder"
                  : key === "archived"
                    ? "Archive this event"
                    : `${key[0].toUpperCase() + key.slice(1)} reminders`
              }
              checked={form[key]}
              onChange={(v) => setForm({ ...form, [key]: v })}
            />
          ))}
        </div>
        <label className="field">
          Private notes
          <textarea
            maxLength={2000}
            value={form.notes || ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="A gift idea, a favorite treat…"
          />
        </label>
        <div className="modalFooter">
          {event.id && (
            <button
              type="button"
              className="dangerButton"
              onClick={onDelete}
              disabled={busy}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save occasion"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
