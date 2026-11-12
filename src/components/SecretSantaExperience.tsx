"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import GiftBanner from "./GiftBanner";
import GroupDrawPanel from "./GroupDrawPanel";
import WishlistReservationList from "./WishlistReservationList";
import type { GroupDraw } from "../lib/draws";
import type { GroupCircle, ReminderEvent, WishlistItem } from "../lib/reminders";
import { daysBetween, localDate, nextOccurrence } from "../lib/reminders";

const CELEBRATIONS = [
  "Secret Santa",
  "Christmas",
  "Hanukkah",
  "Thanksgiving",
  "New Year's Eve",
  "Eid",
  "Kwanzaa",
  "Valentine's Day",
  "Christmas in July",
  "Halloween",
  "Mother's Day",
  "Diwali",
  "Father's Day",
  "Eid al-Adha",
  "Purim",
  "Easter",
  "Other",
] as const;

const BUDGETS = ["$100", "$50", "$30", "$25", "$20", "Other"] as const;

const DATE_PRESETS = [
  "2026-12-19",
  "2026-12-24",
  "2026-12-25",
] as const;

type HubView = "menu" | "create" | "join" | "detail" | "wishlist";
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const MN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPreset(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface SecretSantaExperienceProps {
  user: User | null;
  groups: GroupCircle[];
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  setGroups: React.Dispatch<React.SetStateAction<GroupCircle[]>>;
  events: ReminderEvent[];
  today: string;
  timezone: string;
  wishlistItems: WishlistItem[];
  setWishlistItems: React.Dispatch<React.SetStateAction<WishlistItem[]>>;
  newWishTitle: string;
  setNewWishTitle: (v: string) => void;
  newWishUrl: string;
  setNewWishUrl: (v: string) => void;
  newWishNotes: string;
  setNewWishNotes: (v: string) => void;
  memberWishlists: Record<string, WishlistItem[]>;
  selectedWishlistOwnerUid: string;
  openMemberWishlist: (uid: string) => void;
  changeReservation: (
    ownerUid: string,
    itemId: string,
    action: "reserve" | "unreserve",
  ) => Promise<void> | void;
  createGroup: (name: string) => Promise<GroupCircle>;
  joinGroup: (code: string) => Promise<GroupCircle>;
  saveWishlist: (items: WishlistItem[]) => Promise<void>;
  saveDraw: (groupId: string, draw: GroupDraw) => Promise<void>;
  toast: (msg: string) => void;
  act: (fn: () => Promise<void>) => Promise<void>;
}

export default function SecretSantaExperience(props: SecretSantaExperienceProps) {
  const {
    user,
    groups,
    selectedGroupId,
    setSelectedGroupId,
    setGroups,
    events,
    today,
    timezone,
    wishlistItems,
    setWishlistItems,
    newWishTitle,
    setNewWishTitle,
    newWishUrl,
    setNewWishUrl,
    newWishNotes,
    setNewWishNotes,
    memberWishlists,
    selectedWishlistOwnerUid,
    openMemberWishlist,
    changeReservation,
    createGroup,
    joinGroup,
    saveWishlist,
    saveDraw,
    toast,
    act,
  } = props;

  const [view, setView] = useState<HubView>("menu");
  const [step, setStep] = useState<WizardStep>(0);
  const [organizerName, setOrganizerName] = useState(
    user?.displayName || user?.email?.split("@")[0] || "",
  );
  const [includeOrganizer, setIncludeOrganizer] = useState(true);
  const [celebration, setCelebration] = useState<string>("Secret Santa");
  const [customCelebration, setCustomCelebration] = useState("");
  const [dateChoice, setDateChoice] = useState<string>(DATE_PRESETS[2]);
  const [customDate, setCustomDate] = useState("");
  const [budget, setBudget] = useState<string>("$25");
  const [customBudget, setCustomBudget] = useState("");
  const [inviteMessage, setInviteMessage] = useState(
    "✨ You've been invited to make a wish list and draw a name for Secret Santa 2026!",
  );
  const [joinCode, setJoinCode] = useState("");

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  const progress = ((step + 1) / 6) * 100;

  const celebrationLabel =
    celebration === "Other" ? customCelebration.trim() || "Celebration" : celebration;
  const budgetNote =
    budget === "Other" ? customBudget.trim() || "Flexible" : budget;
  const celebrationDate =
    dateChoice === "other" ? customDate || undefined : dateChoice;

  async function finishCreate() {
    const name = `${celebrationLabel}${organizerName.trim() ? ` — ${organizerName.trim()}` : ""}`;
    await act(async () => {
      const grp = await createGroup(name.trim() || "Secret Santa");
      const setupDraw: GroupDraw = {
        status: "setup",
        celebrationDate,
        budgetNote,
        exclusions: [],
        assignments: {},
      };
      await saveDraw(grp.id, setupDraw);
      setGroups((prev) =>
        prev.map((g) => (g.id === grp.id ? { ...g, draw: setupDraw } : g)),
      );
      setSelectedGroupId(grp.id);
      setView("detail");
      setStep(0);
      toast(`Created ${celebrationLabel}! Share code ${grp.code}`);
    });
  }

  return (
    <div className="dnShell">
      {view === "menu" && (
        <section className="dnCard dnMenu">
          <GiftBanner />
          <h1 className="dnTitle">Secret Santa Generator</h1>
          <p className="dnSub">
            Organize your Secret Santa using Email, Text Message, or a link.
          </p>
          <div className="dnMenuList">
            <button
              type="button"
              className="dnMenuBtn dnMenuPrimary"
              onClick={() => {
                setStep(0);
                setView("create");
              }}
            >
              Create a new celebration
              <span aria-hidden>›</span>
            </button>
            <button
              type="button"
              className="dnMenuBtn"
              onClick={() => setView("wishlist")}
            >
              Create a wish list
              <span aria-hidden>›</span>
            </button>
            <hr className="dnRule" />
            <button
              type="button"
              className="dnMenuBtn"
              disabled={!groups.length}
              onClick={() => {
                if (selected) setSelectedGroupId(selected.id);
                setView("detail");
              }}
            >
              My celebrations
              <span aria-hidden>›</span>
            </button>
            <button
              type="button"
              className="dnMenuBtn"
              onClick={() => setView("wishlist")}
            >
              My wish lists
              <span aria-hidden>›</span>
            </button>
            <button
              type="button"
              className="dnMenuBtn"
              onClick={() => setView("join")}
            >
              Join with a code
              <span aria-hidden>›</span>
            </button>
            <hr className="dnRule" />
            <button
              type="button"
              className="dnMenuBtn"
              onClick={() => toast(user ? `Signed in as ${user.email}` : "Use Google sign-in in the header.")}
            >
              {user ? "Account connected" : "Sign in or create account"}
              <span aria-hidden>›</span>
            </button>
          </div>
          <GiftBanner variant="compact" />
        </section>
      )}

      {view === "create" && (
        <section className="dnWizard">
          <GiftBanner variant={step >= 2 ? "santa" : "default"} />
          <div className="dnProgress" aria-hidden>
            <div className="dnProgressFill" style={{ width: `${progress}%` }} />
          </div>
          <div className="dnCard dnWizardCard">
            {step === 0 && (
              <>
                <h2 className="dnTitle">What&apos;s your name?</h2>
                <label className="dnField">
                  <span className="srOnly">Your name</span>
                  <input
                    value={organizerName}
                    placeholder="Enter your name"
                    onChange={(e) => setOrganizerName(e.target.value)}
                  />
                </label>
                <label className="dnCheck">
                  <input
                    type="checkbox"
                    checked={includeOrganizer}
                    onChange={(e) => setIncludeOrganizer(e.target.checked)}
                  />
                  Include me (the organizer) in the draw
                </label>
                <p className="dnHint">
                  Did you draw names last year? Reuse a group from{" "}
                  <button type="button" className="dnLinkBtn" onClick={() => setView("detail")}>
                    My celebrations
                  </button>
                  .
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="dnTitle">What are you celebrating?</h2>
                <div className="dnChipGrid" role="group" aria-label="Celebration type">
                  {CELEBRATIONS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`dnChip ${celebration === label ? "on" : ""}`}
                      onClick={() => setCelebration(label)}
                    >
                      {label}
                      {label === "Other" ? " ✎" : ""}
                    </button>
                  ))}
                </div>
                {celebration === "Other" && (
                  <label className="dnField">
                    <span className="srOnly">Custom celebration</span>
                    <input
                      value={customCelebration}
                      placeholder="Name your celebration"
                      onChange={(e) => setCustomCelebration(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="dnTitle">
                  When are you celebrating {celebrationLabel}{" "}
                  {celebrationDate?.slice(0, 4) || "2026"}?
                </h2>
                <div className="dnStackChoices" role="group" aria-label="Celebration date">
                  {DATE_PRESETS.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      className={`dnChoice ${dateChoice === iso ? "on" : ""}`}
                      onClick={() => setDateChoice(iso)}
                    >
                      {formatPreset(iso)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`dnChoice ${dateChoice === "other" ? "on" : ""}`}
                    onClick={() => setDateChoice("other")}
                  >
                    Other ✎
                  </button>
                </div>
                {dateChoice === "other" && (
                  <label className="dnField">
                    <span className="srOnly">Custom date</span>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="dnTitle">How much should people spend?</h2>
                <div className="dnBudgetGrid" role="group" aria-label="Budget">
                  {BUDGETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={`dnChoice ${budget === amount ? "on" : ""}`}
                      onClick={() => setBudget(amount)}
                    >
                      {amount === "Other" ? "Other ✎" : amount}
                    </button>
                  ))}
                </div>
                {budget === "Other" && (
                  <label className="dnField">
                    <span className="srOnly">Custom budget</span>
                    <input
                      value={customBudget}
                      placeholder="e.g. $40 or bring a homemade gift"
                      onChange={(e) => setCustomBudget(e.target.value)}
                    />
                  </label>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="dnTitle">What&apos;s your message for the group?</h2>
                <label className="dnField dnMessage">
                  <span className="srOnly">Invite message</span>
                  <textarea
                    value={inviteMessage}
                    rows={4}
                    onChange={(e) => setInviteMessage(e.target.value)}
                  />
                </label>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className="dnTitle">Ready to create {celebrationLabel}?</h2>
                <ul className="dnSummary">
                  <li>
                    <b>Organizer</b> {organizerName || "You"}
                    {includeOrganizer ? " (in the draw)" : " (not in the draw)"}
                  </li>
                  <li>
                    <b>Celebration</b> {celebrationLabel}
                  </li>
                  <li>
                    <b>Date</b>{" "}
                    {celebrationDate ? formatPreset(celebrationDate) : "Not set"}
                  </li>
                  <li>
                    <b>Budget</b> {budgetNote}
                  </li>
                  <li>
                    <b>Message</b> {inviteMessage}
                  </li>
                </ul>
              </>
            )}

            <div className="dnNav">
              <button
                type="button"
                className="dnBack"
                aria-label="Back"
                onClick={() => {
                  if (step === 0) setView("menu");
                  else setStep((s) => (s - 1) as WizardStep);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="dnContinue"
                onClick={() => {
                  if (step < 5) setStep((s) => (s + 1) as WizardStep);
                  else void finishCreate();
                }}
              >
                {step === 5 ? "Create celebration" : "Continue"} <span aria-hidden>›</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "join" && (
        <section className="dnCard dnJoin">
          <GiftBanner variant="compact" />
          <h2 className="dnTitle">Join a celebration</h2>
          <p className="dnSub">Enter the invite code from your organizer.</p>
          <label className="dnField">
            <span className="srOnly">Invite code</span>
            <input
              value={joinCode}
              placeholder="e.g. FAM778"
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </label>
          <div className="dnNav">
            <button type="button" className="dnBack" onClick={() => setView("menu")} aria-label="Back">
              ‹
            </button>
            <button
              type="button"
              className="dnContinue"
              onClick={() =>
                void act(async () => {
                  const grp = await joinGroup(joinCode.trim());
                  setSelectedGroupId(grp.id);
                  setJoinCode("");
                  setView("detail");
                  toast(`Joined "${grp.name}"!`);
                })
              }
            >
              Continue <span aria-hidden>›</span>
            </button>
          </div>
        </section>
      )}

      {view === "wishlist" && (
        <section className="dnWishShell">
          <div className="dnCard dnWishCard">
            <GiftBanner variant="compact" />
            <h2 className="dnTitle">My wish lists</h2>
            <p className="dnSub">
              Add gifts with shop links so your Secret Santa knows what you love.
            </p>
            {wishlistItems.length === 0 ? (
              <div className="dnEmptyWish">
                <b>Add at least 3 gifts</b>
                <small>Tell people what you really like!</small>
              </div>
            ) : (
              <ul className="dnWishList">
                {wishlistItems.map((item) => (
                  <li key={item.id}>
                    <div>
                      <b>{item.title}</b>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          View item ↗
                        </a>
                      )}
                      {item.notes && <small>{item.notes}</small>}
                      {item.reservedByUid && (
                        <span className="dnReserved">Someone reserved this</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="dnTextBtn"
                      onClick={() =>
                        void act(async () => {
                          const updated = wishlistItems.filter((w) => w.id !== item.id);
                          setWishlistItems(updated);
                          await saveWishlist(updated);
                          toast("Removed.");
                        })
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="dnWishForm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newWishTitle.trim()) return;
                void act(async () => {
                  const newItem: WishlistItem = {
                    id: crypto.randomUUID(),
                    title: newWishTitle.trim(),
                    url: newWishUrl.trim() || undefined,
                    notes: newWishNotes.trim() || undefined,
                    createdAt: new Date().toISOString(),
                  };
                  const updated = [...wishlistItems, newItem];
                  setWishlistItems(updated);
                  await saveWishlist(updated);
                  setNewWishTitle("");
                  setNewWishUrl("");
                  setNewWishNotes("");
                  toast("Added to your wish list!");
                });
              }}
            >
              <input
                value={newWishTitle}
                placeholder="Gift idea (e.g. Toast Lamp)"
                required
                onChange={(e) => setNewWishTitle(e.target.value)}
              />
              <input
                type="url"
                value={newWishUrl}
                placeholder="https:// shop link"
                onChange={(e) => setNewWishUrl(e.target.value)}
              />
              <input
                value={newWishNotes}
                placeholder="Size, color, notes"
                onChange={(e) => setNewWishNotes(e.target.value)}
              />
              <button type="submit" className="dnContinue">
                Add gift <span aria-hidden>›</span>
              </button>
            </form>
            <button type="button" className="dnTextBtn" onClick={() => setView("menu")}>
              ‹ Back to menu
            </button>
          </div>
        </section>
      )}

      {view === "detail" && selected && (
        <div className="dnDetail">
          <div className="dnDetailBar">
            <button type="button" className="dnTextBtn" onClick={() => setView("menu")}>
              ‹ Menu
            </button>
            <div className="dnCelebrationTabs">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`dnChip ${selectedGroupId === g.id || (!selectedGroupId && g.id === selected.id) ? "on" : ""}`}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
            <button type="button" className="dnTextBtn" onClick={() => { setStep(0); setView("create"); }}>
              + New
            </button>
          </div>

          {(() => {
            const grp = groups.find((g) => g.id === selectedGroupId) ?? selected;
            const groupEvents = events.filter(
              (e) => !e.archived && e.sharedGroupIds?.includes(grp.id),
            );
            const currentUid = user?.uid ?? grp.ownerUid;
            const selectedWishlistMember = grp.members[selectedWishlistOwnerUid];
            const t = today || localDate(new Date(), timezone);

            return (
              <>
                <section className="dnCard">
                  <GiftBanner variant="santa" />
                  <div className="dnDetailHead">
                    <div>
                      <p className="dnEyebrow">Your celebration</p>
                      <h2 className="dnTitle">{grp.name}</h2>
                      <p className="dnSub">
                        Invite code{" "}
                        <strong className="dnCode">{grp.code}</strong>
                        <button
                          type="button"
                          className="dnLinkBtn"
                          onClick={() => {
                            void navigator.clipboard.writeText(grp.code);
                            toast("Invite code copied!");
                          }}
                        >
                          Copy
                        </button>
                      </p>
                      {grp.draw?.budgetNote && (
                        <p className="dnMeta">Budget: {grp.draw.budgetNote}</p>
                      )}
                      {grp.draw?.celebrationDate && (
                        <p className="dnMeta">
                          Date: {formatPreset(grp.draw.celebrationDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <h3 className="dnSection">Members</h3>
                  <div className="dnChipGrid">
                    {Object.values(grp.members || {}).map((m) => (
                      <span key={m.uid} className="dnChip static">
                        {m.name}
                      </span>
                    ))}
                  </div>
                </section>

                <GroupDrawPanel
                  group={grp}
                  currentUid={currentUid}
                  isOwner={currentUid === grp.ownerUid}
                  wishlistsByUid={{ [currentUid]: wishlistItems }}
                  onSaveDraw={async (draw) => {
                    await saveDraw(grp.id, draw);
                    setGroups((current) =>
                      current.map((item) =>
                        item.id === grp.id ? { ...item, draw } : item,
                      ),
                    );
                    toast(
                      draw.status === "setup"
                        ? "Name draw cleared."
                        : draw.status === "locked"
                          ? "Name draw locked."
                          : "Names drawn!",
                    );
                  }}
                  onViewWishlist={openMemberWishlist}
                />

                <section className="dnCard dnWishCard">
                  <h3 className="dnSection">Wish lists</h3>
                  <p className="dnSub">No duplicate gifts — reserve an item privately.</p>
                  <div className="wishlistMemberTabs">
                    {Object.values(grp.members)
                      .filter((member) => member.uid !== currentUid)
                      .map((member) => (
                        <button
                          key={member.uid}
                          type="button"
                          className={`dnChip ${selectedWishlistOwnerUid === member.uid ? "on" : ""}`}
                          onClick={() => openMemberWishlist(member.uid)}
                        >
                          {member.name}
                        </button>
                      ))}
                    <button
                      type="button"
                      className="dnChip"
                      onClick={() => setView("wishlist")}
                    >
                      Edit my list
                    </button>
                  </div>
                  {selectedWishlistMember && (
                    <WishlistReservationList
                      items={memberWishlists[selectedWishlistMember.uid] ?? []}
                      ownerUid={selectedWishlistMember.uid}
                      currentUid={currentUid}
                      onReservation={(itemId, action) =>
                        changeReservation(
                          selectedWishlistMember.uid,
                          itemId,
                          action,
                        )
                      }
                    />
                  )}
                </section>

                <section className="dnCard">
                  <h3 className="dnSection">Shared occasions</h3>
                  {groupEvents.length === 0 ? (
                    <p className="dnSub">No shared birthdays yet. Opt in from an occasion.</p>
                  ) : (
                    <div className="groupSharedFeed">
                      {groupEvents.map((ev) => {
                        const nextDate = nextOccurrence(ev, t);
                        const days = daysBetween(t, nextDate);
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
                            </div>
                            <span className={`pill ${days <= 7 ? "hot" : ""}`}>
                              {days === 0 ? "Today" : `in ${days} days`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            );
          })()}
        </div>
      )}

      {view === "detail" && !selected && (
        <section className="dnCard">
          <p className="dnSub">No celebrations yet.</p>
          <button type="button" className="dnContinue" onClick={() => setView("create")}>
            Create a new celebration ›
          </button>
        </section>
      )}
    </div>
  );
}
