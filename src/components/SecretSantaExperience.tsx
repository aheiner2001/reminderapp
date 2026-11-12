"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import GiftBanner from "./dn/GiftBanner";
import {
  DnAppBar,
  DnCard,
  DnChip,
  DnChipGrid,
  DnContinue,
  DnField,
  DnHero,
  DnInput,
  DnMenuButton,
  DnPage,
  DnRule,
  DnStepNav,
  DnSub,
  DnTextButton,
  DnTitle,
} from "./dn/ui";
import GroupDrawPanel from "./GroupDrawPanel";
import WishlistReservationList from "./WishlistReservationList";
import SecretSantaWizard, { type WizardResult } from "./SecretSantaWizard";
import type { GroupDraw } from "../lib/draws";
import type { GroupCircle, ReminderEvent, WishlistItem } from "../lib/reminders";
import { daysBetween, localDate, nextOccurrence } from "../lib/reminders";

type HubView = "menu" | "create" | "join" | "detail" | "wishlist";

const MN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatPreset(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
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
  onExit: () => void;
  onSignIn?: () => void;
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
    onExit,
    onSignIn,
  } = props;

  const [view, setView] = useState<HubView>("menu");
  const [joinCode, setJoinCode] = useState("");

  const selected = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId],
  );

  async function finishCreate(result: WizardResult) {
    const name = `${result.celebrationLabel}${
      result.organizerName.trim() ? ` — ${result.organizerName.trim()}` : ""
    }`;
    await act(async () => {
      const grp = await createGroup(name.trim() || "Secret Santa");
      const setupDraw: GroupDraw = {
        status: "setup",
        celebrationDate: result.celebrationDate,
        budgetNote: result.budgetNote,
        exclusions: [],
        assignments: {},
      };
      await saveDraw(grp.id, setupDraw);
      setGroups((prev) =>
        prev.map((g) => (g.id === grp.id ? { ...g, draw: setupDraw } : g)),
      );
      setSelectedGroupId(grp.id);
      setView("detail");
      toast(`Created ${result.celebrationLabel}! Share code ${grp.code}`);
    });
  }

  const pageVariant = view === "wishlist" ? "snow" : "plain";

  return (
    <DnPage variant={pageVariant}>
      <DnAppBar
        onBackToReminders={onExit}
        trailing={
          user ? (
            <span className="dnAccountChip">{user.email?.split("@")[0]}</span>
          ) : (
            <DnTextButton onClick={onSignIn}>Sign in</DnTextButton>
          )
        }
      />

      <main className="dnMain">
        {view === "menu" && (
          <>
            <DnHero
              title="Secret Santa Generator"
              subtitle="Organize your Secret Santa using Email, Text Message, or a link."
              banner={<GiftBanner />}
            />
            <DnCard className="dnMenu">
              <div className="dnMenuList">
                <DnMenuButton
                  primary
                  onClick={() => setView("create")}
                >
                  Create a new celebration
                </DnMenuButton>
                <DnMenuButton onClick={() => setView("wishlist")}>
                  Create a wish list
                </DnMenuButton>
                <DnRule />
                <DnMenuButton
                  disabled={!groups.length}
                  onClick={() => {
                    if (selected) setSelectedGroupId(selected.id);
                    setView("detail");
                  }}
                >
                  My celebrations
                </DnMenuButton>
                <DnMenuButton onClick={() => setView("wishlist")}>
                  My wish lists
                </DnMenuButton>
                <DnMenuButton onClick={() => setView("join")}>
                  Join with a code
                </DnMenuButton>
                <DnRule />
                <DnMenuButton
                  onClick={() =>
                    user
                      ? toast(`Signed in as ${user.email}`)
                      : onSignIn?.() ?? toast("Use Sign in in the top bar.")
                  }
                >
                  {user ? "Account connected" : "Sign in or create account"}
                </DnMenuButton>
              </div>
              <GiftBanner variant="compact" />
            </DnCard>
          </>
        )}

        {view === "create" && (
          <SecretSantaWizard
            initialName={
              user?.displayName || user?.email?.split("@")[0] || ""
            }
            onCancel={() => setView("menu")}
            onOpenCelebrations={() => setView("detail")}
            onComplete={finishCreate}
          />
        )}

        {view === "join" && (
          <>
            <DnHero
              title="Join a celebration"
              subtitle="Enter the invite code from your organizer."
              banner={<GiftBanner variant="compact" />}
            />
            <DnCard>
              <DnField label="Invite code">
                <DnInput
                  value={joinCode}
                  placeholder="e.g. FAM778"
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </DnField>
              <DnStepNav
                onBack={() => setView("menu")}
                continueLabel="Continue"
                onContinue={() =>
                  void act(async () => {
                    const grp = await joinGroup(joinCode.trim());
                    setSelectedGroupId(grp.id);
                    setJoinCode("");
                    setView("detail");
                    toast(`Joined "${grp.name}"!`);
                  })
                }
              />
            </DnCard>
          </>
        )}

        {view === "wishlist" && (
          <DnCard className="dnWishCard">
            <GiftBanner variant="compact" />
            <DnTitle>My wish lists</DnTitle>
            <DnSub>
              Add gifts with shop links so your Secret Santa knows what you love.
            </DnSub>
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
                    <DnTextButton
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
                    </DnTextButton>
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
              <DnInput
                value={newWishTitle}
                placeholder="Gift idea (e.g. Toast Lamp)"
                required
                onChange={(e) => setNewWishTitle(e.target.value)}
              />
              <DnInput
                type="url"
                value={newWishUrl}
                placeholder="https:// shop link"
                onChange={(e) => setNewWishUrl(e.target.value)}
              />
              <DnInput
                value={newWishNotes}
                placeholder="Size, color, notes"
                onChange={(e) => setNewWishNotes(e.target.value)}
              />
              <DnContinue type="submit">Add gift</DnContinue>
            </form>
            <DnTextButton onClick={() => setView("menu")}>‹ Back to menu</DnTextButton>
          </DnCard>
        )}

        {view === "detail" && selected && (
          <div className="dnDetail">
            <div className="dnDetailBar">
              <DnTextButton onClick={() => setView("menu")}>‹ Menu</DnTextButton>
              <div className="dnCelebrationTabs">
                {groups.map((g) => (
                  <DnChip
                    key={g.id}
                    active={
                      selectedGroupId === g.id ||
                      (!selectedGroupId && g.id === selected.id)
                    }
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    {g.name}
                  </DnChip>
                ))}
              </div>
              <DnTextButton onClick={() => setView("create")}>+ New</DnTextButton>
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
                  <DnHero
                    title={grp.name}
                    subtitle={`Invite code ${grp.code}`}
                    banner={<GiftBanner variant="santa" />}
                  />
                  <DnCard>
                    <div className="dnDetailHead">
                      <button
                        type="button"
                        className="dnLinkBtn"
                        onClick={() => {
                          void navigator.clipboard.writeText(grp.code);
                          toast("Invite code copied!");
                        }}
                      >
                        Copy invite code
                      </button>
                      {grp.draw?.budgetNote && (
                        <p className="dnMeta">Budget: {grp.draw.budgetNote}</p>
                      )}
                      {grp.draw?.celebrationDate && (
                        <p className="dnMeta">
                          Date: {formatPreset(grp.draw.celebrationDate)}
                        </p>
                      )}
                    </div>
                    <h3 className="dnSection">Members</h3>
                    <DnChipGrid label="Members">
                      {Object.values(grp.members || {}).map((m) => (
                        <DnChip key={m.uid} static>
                          {m.name}
                        </DnChip>
                      ))}
                    </DnChipGrid>
                  </DnCard>

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

                  <DnCard className="dnWishCard">
                    <h3 className="dnSection">Wish lists</h3>
                    <DnSub>No duplicate gifts — reserve an item privately.</DnSub>
                    <div className="wishlistMemberTabs">
                      {Object.values(grp.members)
                        .filter((member) => member.uid !== currentUid)
                        .map((member) => (
                          <DnChip
                            key={member.uid}
                            active={selectedWishlistOwnerUid === member.uid}
                            onClick={() => openMemberWishlist(member.uid)}
                          >
                            {member.name}
                          </DnChip>
                        ))}
                      <DnChip onClick={() => setView("wishlist")}>Edit my list</DnChip>
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
                  </DnCard>

                  <DnCard>
                    <h3 className="dnSection">Shared occasions</h3>
                    {groupEvents.length === 0 ? (
                      <DnSub>No shared birthdays yet. Opt in from an occasion.</DnSub>
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
                  </DnCard>
                </>
              );
            })()}
          </div>
        )}

        {view === "detail" && !selected && (
          <DnCard>
            <DnSub>No celebrations yet.</DnSub>
            <DnContinue onClick={() => setView("create")}>
              Create a new celebration
            </DnContinue>
          </DnCard>
        )}
      </main>
    </DnPage>
  );
}
