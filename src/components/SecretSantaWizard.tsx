"use client";

import { useState } from "react";
import GiftBanner from "./dn/GiftBanner";
import {
  DnCard,
  DnCheck,
  DnChoice,
  DnChoiceStack,
  DnChip,
  DnChipGrid,
  DnField,
  DnHero,
  DnInput,
  DnLink,
  DnProgress,
  DnStepNav,
  DnSub,
  DnTextarea,
  DnTitle,
} from "./dn/ui";

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

const DATE_PRESETS = ["2026-12-19", "2026-12-24", "2026-12-25"] as const;

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface WizardResult {
  organizerName: string;
  includeOrganizer: boolean;
  celebrationLabel: string;
  celebrationDate?: string;
  budgetNote: string;
  inviteMessage: string;
}

function formatPreset(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SecretSantaWizard({
  initialName,
  onCancel,
  onOpenCelebrations,
  onComplete,
}: {
  initialName: string;
  onCancel: () => void;
  onOpenCelebrations: () => void;
  onComplete: (result: WizardResult) => void | Promise<void>;
}) {
  const [step, setStep] = useState<WizardStep>(0);
  const [organizerName, setOrganizerName] = useState(initialName);
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

  const progress = ((step + 1) / 6) * 100;
  const celebrationLabel =
    celebration === "Other"
      ? customCelebration.trim() || "Celebration"
      : celebration;
  const budgetNote =
    budget === "Other" ? customBudget.trim() || "Flexible" : budget;
  const celebrationDate =
    dateChoice === "other" ? customDate || undefined : dateChoice;

  return (
    <div className="dnWizard">
      <DnHero
        title="Secret Santa Generator"
        subtitle="Organize your Secret Santa using Email, Text Message, or a link."
        banner={<GiftBanner variant={step >= 2 ? "santa" : "default"} />}
      />
      <DnProgress value={progress} />
      <DnCard className="dnWizardCard">
        {step === 0 && (
          <>
            <DnTitle>What&apos;s your name?</DnTitle>
            <DnField label="Your name">
              <DnInput
                value={organizerName}
                placeholder="Enter your name"
                onChange={(e) => setOrganizerName(e.target.value)}
              />
            </DnField>
            <DnCheck checked={includeOrganizer} onChange={setIncludeOrganizer}>
              Include me (the organizer) in the draw
            </DnCheck>
            <p className="dnHint">
              Did you draw names last year? Reuse a group from{" "}
              <DnLink onClick={onOpenCelebrations}>My celebrations</DnLink>.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <DnTitle>What are you celebrating?</DnTitle>
            <DnChipGrid label="Celebration type">
              {CELEBRATIONS.map((label) => (
                <DnChip
                  key={label}
                  active={celebration === label}
                  onClick={() => setCelebration(label)}
                >
                  {label}
                  {label === "Other" ? " ✎" : ""}
                </DnChip>
              ))}
            </DnChipGrid>
            {celebration === "Other" && (
              <DnField label="Custom celebration">
                <DnInput
                  value={customCelebration}
                  placeholder="Name your celebration"
                  onChange={(e) => setCustomCelebration(e.target.value)}
                />
              </DnField>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <DnTitle>
              When are you celebrating {celebrationLabel}{" "}
              {celebrationDate?.slice(0, 4) || "2026"}?
            </DnTitle>
            <DnChoiceStack label="Celebration date">
              {DATE_PRESETS.map((iso) => (
                <DnChoice
                  key={iso}
                  active={dateChoice === iso}
                  onClick={() => setDateChoice(iso)}
                >
                  {formatPreset(iso)}
                </DnChoice>
              ))}
              <DnChoice
                active={dateChoice === "other"}
                onClick={() => setDateChoice("other")}
              >
                Other ✎
              </DnChoice>
            </DnChoiceStack>
            {dateChoice === "other" && (
              <DnField label="Custom date">
                <DnInput
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              </DnField>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <DnTitle>How much should people spend?</DnTitle>
            <DnChoiceStack label="Budget" columns={2}>
              {BUDGETS.map((amount) => (
                <DnChoice
                  key={amount}
                  active={budget === amount}
                  onClick={() => setBudget(amount)}
                >
                  {amount === "Other" ? "Other ✎" : amount}
                </DnChoice>
              ))}
            </DnChoiceStack>
            {budget === "Other" && (
              <DnField label="Custom budget">
                <DnInput
                  value={customBudget}
                  placeholder="e.g. $40 or bring a homemade gift"
                  onChange={(e) => setCustomBudget(e.target.value)}
                />
              </DnField>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <DnTitle>What&apos;s your message for the group?</DnTitle>
            <DnField label="Invite message">
              <DnTextarea
                className="dnMessageBox"
                value={inviteMessage}
                rows={4}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </DnField>
          </>
        )}

        {step === 5 && (
          <>
            <DnTitle>Ready to create {celebrationLabel}?</DnTitle>
            <DnSub>
              {organizerName || "You"}
              {includeOrganizer ? " (in the draw)" : ""} · {celebrationLabel} ·{" "}
              {celebrationDate ? formatPreset(celebrationDate) : "No date"} ·{" "}
              {budgetNote}
            </DnSub>
          </>
        )}

        <DnStepNav
          onBack={() => {
            if (step === 0) onCancel();
            else setStep((s) => (s - 1) as WizardStep);
          }}
          continueLabel={step === 5 ? "Create celebration" : "Continue"}
          onContinue={() => {
            if (step < 5) {
              setStep((s) => (s + 1) as WizardStep);
              return;
            }
            void onComplete({
              organizerName,
              includeOrganizer,
              celebrationLabel,
              celebrationDate,
              budgetNote,
              inviteMessage,
            });
          }}
        />
      </DnCard>
    </div>
  );
}
