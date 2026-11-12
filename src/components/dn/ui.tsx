import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function DnPage({
  children,
  variant = "plain",
}: {
  children: ReactNode;
  variant?: "plain" | "snow";
}) {
  return <div className={`dnPage dnPage-${variant}`}>{children}</div>;
}

export function DnAppBar({
  onBackToReminders,
  trailing,
}: {
  onBackToReminders: () => void;
  trailing?: ReactNode;
}) {
  return (
    <header className="dnAppBar">
      <button type="button" className="dnAppBrand" onClick={onBackToReminders}>
        <span className="dnAppMark" aria-hidden />
        remember gifts
      </button>
      <div className="dnAppBarTrail">
        {trailing}
        <button type="button" className="dnTextBtn" onClick={onBackToReminders}>
          Reminders
        </button>
      </div>
    </header>
  );
}

export function DnHero({
  title,
  subtitle,
  banner,
}: {
  title: string;
  subtitle?: string;
  banner?: ReactNode;
}) {
  return (
    <div className="dnHero">
      <h1 className="dnHeroTitle">{title}</h1>
      {subtitle ? <p className="dnHeroSub">{subtitle}</p> : null}
      {banner}
    </div>
  );
}

export function DnCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`dnCard ${className}`.trim()}>{children}</section>;
}

export function DnTitle({
  children,
  as: Tag = "h2",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return <Tag className="dnTitle">{children}</Tag>;
}

export function DnSub({ children }: { children: ReactNode }) {
  return <p className="dnSub">{children}</p>;
}

export function DnProgress({ value }: { value: number }) {
  return (
    <div className="dnProgress" aria-hidden>
      <div className="dnProgressFill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function DnField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="dnField">
      <span className="srOnly">{label}</span>
      {children}
    </label>
  );
}

export function DnInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function DnTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

export function DnCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="dnCheck">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

export function DnContinue({
  children = "Continue",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`dnContinue ${className}`.trim()} {...props}>
      {children} <span aria-hidden>›</span>
    </button>
  );
}

export function DnBack(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="dnBack" aria-label="Back" {...props}>
      ‹
    </button>
  );
}

export function DnStepNav({
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
}: {
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  return (
    <div className="dnNav">
      <DnBack onClick={onBack} />
      <DnContinue onClick={onContinue} disabled={continueDisabled}>
        {continueLabel}
      </DnContinue>
    </div>
  );
}

export function DnChip({
  active,
  static: isStatic,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  static?: boolean;
}) {
  if (isStatic) {
    return <span className="dnChip static">{children}</span>;
  }
  return (
    <button
      type="button"
      className={`dnChip${active ? " on" : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DnChipGrid({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="dnChipGrid" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function DnChoice({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button type="button" className={`dnChoice${active ? " on" : ""}`} {...props}>
      {children}
    </button>
  );
}

export function DnChoiceStack({
  children,
  label,
  columns = 1,
}: {
  children: ReactNode;
  label: string;
  columns?: 1 | 2;
}) {
  return (
    <div
      className={columns === 2 ? "dnBudgetGrid" : "dnStackChoices"}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function DnMenuButton({
  primary,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={`dnMenuBtn${primary ? " dnMenuPrimary" : ""}`}
      {...props}
    >
      {children}
      <span aria-hidden>›</span>
    </button>
  );
}

export function DnLink(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="dnLinkBtn" {...props} />;
}

export function DnTextButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className="dnTextBtn" {...props} />;
}

export function DnRule() {
  return <hr className="dnRule" />;
}
