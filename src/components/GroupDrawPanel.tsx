"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildGroupDrawPayload,
  type DrawExclusion,
  type GroupDraw,
} from "../lib/draws";
import type { GroupCircle, WishlistItem } from "../lib/reminders";

interface GroupDrawPanelProps {
  group: GroupCircle;
  currentUid: string;
  isOwner: boolean;
  wishlistsByUid: Record<string, WishlistItem[]>;
  onSaveDraw: (draw: GroupDraw) => void | Promise<void>;
  onViewWishlist: (uid: string) => void;
}

const emptyDraw = (): GroupDraw => ({
  status: "setup",
  exclusions: [],
  assignments: {},
});

export default function GroupDrawPanel({
  group,
  currentUid,
  isOwner,
  wishlistsByUid,
  onSaveDraw,
  onViewWishlist,
}: GroupDrawPanelProps) {
  const [draft, setDraft] = useState<GroupDraw>(group.draw ?? emptyDraw());
  const [firstUid, setFirstUid] = useState("");
  const [secondUid, setSecondUid] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const members = useMemo(() => Object.values(group.members || {}), [group.members]);

  useEffect(() => {
    setDraft(group.draw ?? emptyDraw());
    setError("");
  }, [group.id, group.draw]);

  const save = async (draw: GroupDraw) => {
    setSaving(true);
    setError("");
    try {
      await onSaveDraw(draw);
      setDraft(draw);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the draw.");
    } finally {
      setSaving(false);
    }
  };

  const addExclusion = () => {
    if (!firstUid || !secondUid || firstUid === secondUid) {
      setError("Choose two different members.");
      return;
    }
    const exists = draft.exclusions.some(
      (pair) =>
        (pair.aUid === firstUid && pair.bUid === secondUid) ||
        (pair.aUid === secondUid && pair.bUid === firstUid),
    );
    if (exists) {
      setError("That exclusion is already listed.");
      return;
    }
    setDraft({
      ...draft,
      exclusions: [...draft.exclusions, { aUid: firstUid, bUid: secondUid }],
    });
    setFirstUid("");
    setSecondUid("");
    setError("");
  };

  const drawNames = () => {
    try {
      const next = buildGroupDrawPayload(
        currentUid,
        members.map((member) => member.uid),
        {
          celebrationDate: draft.celebrationDate,
          budgetNote: draft.budgetNote?.trim() || undefined,
          exclusions: draft.exclusions,
        },
      );
      void save(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not draw names.");
    }
  };

  const recipientUid = draft.assignments[currentUid];
  const recipient = recipientUid ? group.members[recipientUid] : undefined;
  const memberName = (uid: string) => group.members[uid]?.name ?? "Unknown member";
  const setup = draft.status === "setup";

  return (
    <section className="card drawPanel" aria-labelledby={`draw-title-${group.id}`}>
      <div className="drawHeading">
        <div>
          <span className="drawEyebrow">Secret Santa</span>
          <h2 id={`draw-title-${group.id}`}>Name draw</h2>
          <p className="note">
            Set the celebration details, add any exclusions, then draw one name for every member.
          </p>
        </div>
        <span className={`drawStatus ${draft.status}`}>
          {draft.status === "setup" ? "Not drawn" : draft.status === "locked" ? "Locked" : "Drawn"}
        </span>
      </div>

      {setup && isOwner && (
        <div className="drawSetup">
          <div className="drawFields">
            <label className="f">
              Celebration date
              <input
                type="date"
                value={draft.celebrationDate ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, celebrationDate: event.target.value || undefined })
                }
              />
            </label>
            <label className="f">
              Budget note
              <input
                value={draft.budgetNote ?? ""}
                maxLength={120}
                placeholder="e.g. Around $25"
                onChange={(event) => setDraft({ ...draft, budgetNote: event.target.value })}
              />
            </label>
          </div>

          <div className="drawExclusions">
            <h3>Exclusions</h3>
            <p className="note">Keep two members from drawing each other.</p>
            <div className="drawPair">
              <label>
                <span className="srOnly">First member</span>
                <select value={firstUid} onChange={(event) => setFirstUid(event.target.value)}>
                  <option value="">Choose member</option>
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid}>{member.name}</option>
                  ))}
                </select>
              </label>
              <span aria-hidden="true">and</span>
              <label>
                <span className="srOnly">Second member</span>
                <select value={secondUid} onChange={(event) => setSecondUid(event.target.value)}>
                  <option value="">Choose member</option>
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid}>{member.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn" onClick={addExclusion}>Add</button>
            </div>
            {draft.exclusions.length > 0 && (
              <ul className="drawExclusionList">
                {draft.exclusions.map((pair: DrawExclusion) => (
                  <li key={`${pair.aUid}-${pair.bUid}`}>
                    <span>{memberName(pair.aUid)} + {memberName(pair.bUid)}</span>
                    <button
                      type="button"
                      aria-label={`Remove exclusion for ${memberName(pair.aUid)} and ${memberName(pair.bUid)}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          exclusions: draft.exclusions.filter((item) => item !== pair),
                        })
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="btn p drawPrimary"
            disabled={saving || members.length < 2}
            onClick={drawNames}
          >
            Draw names
          </button>
          {members.length < 2 && <small>Add at least two members before drawing.</small>}
        </div>
      )}

      {setup && !isOwner && (
        <div className="drawWaiting">
          <b>Waiting for the organizer</b>
          <small>The organizer will set up and run the name draw.</small>
        </div>
      )}

      {!setup && recipient && (
        <div className="drawReveal" aria-live="polite">
          <small>Your Secret Santa name</small>
          <p>You are gifting <strong>{recipient.name}</strong></p>
          <button
            type="button"
            className="btn"
            onClick={() => onViewWishlist(recipient.uid)}
          >
            View wishlist{wishlistsByUid[recipient.uid]?.length ? ` (${wishlistsByUid[recipient.uid].length})` : ""}
          </button>
        </div>
      )}

      {!setup && !recipient && (
        <p className="drawWaiting">Your assignment is not available. Ask the organizer to redraw.</p>
      )}

      {!setup && isOwner && (
        <div className="drawOwnerActions">
          {draft.status === "drawn" ? (
            <>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ ...draft, status: "locked" })}>
                Lock draw
              </button>
              <button
                type="button"
                className="btn d"
                disabled={saving}
                onClick={() => {
                  if (window.confirm("Clear this draw? Members will lose their assignments.")) {
                    void save({
                      status: "setup",
                      celebrationDate: draft.celebrationDate,
                      budgetNote: draft.budgetNote,
                      exclusions: draft.exclusions,
                      assignments: {},
                    });
                  }
                }}
              >
                Clear draw
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" disabled={saving} onClick={() => void save({ ...draft, status: "drawn" })}>
                Unlock
              </button>
              <button type="button" className="btn d" disabled>Clear draw</button>
            </>
          )}
        </div>
      )}

      {error && <p className="err drawError" role="alert">{error}</p>}
    </section>
  );
}
