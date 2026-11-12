/** Festive gift illustration matching assets PDF Secret Santa screenshots. */
export default function GiftBanner({
  variant = "default",
}: {
  variant?: "default" | "compact" | "santa";
}) {
  return (
    <div className={`giftBanner giftBanner-${variant}`} aria-hidden="true">
      <div className="giftShelf">
        <svg viewBox="0 0 420 100" className="giftBannerSvg" role="presentation">
          <rect x="0" y="78" width="420" height="14" rx="4" fill="#c9daf8" />
          <rect x="8" y="72" width="28" height="10" rx="3" fill="#6f92e8" />
          <g transform="translate(48 12)">
            <rect x="0" y="22" width="52" height="44" rx="4" fill="#5b8def" />
            <rect x="22" y="22" width="8" height="44" fill="#f5d76e" />
            <rect x="0" y="40" width="52" height="8" fill="#f5d76e" />
            <path
              d="M26 22 C18 6 8 8 12 18 C15 7 23 10 26 22 C29 10 37 7 40 18 C44 8 34 6 26 22"
              fill="#f5d76e"
            />
          </g>
          <g transform="translate(120 4)">
            <rect x="0" y="24" width="60" height="50" rx="4" fill="#e85d4c" />
            <rect x="26" y="24" width="8" height="50" fill="#ffe08a" />
            <rect x="0" y="42" width="60" height="8" fill="#ffe08a" />
            <path
              d="M30 24 C20 4 6 8 12 20 C16 6 26 10 30 24 C34 10 44 6 48 20 C54 8 40 4 30 24"
              fill="#ffe08a"
            />
          </g>
          <g transform="translate(200 18)">
            <rect x="0" y="20" width="44" height="40" rx="3" fill="#3d6fd8" />
            <rect x="18" y="20" width="7" height="40" fill="#ffd45a" />
            <rect x="0" y="36" width="44" height="7" fill="#ffd45a" />
            <path
              d="M22 20 C16 6 8 8 10 17 C13 7 19 10 22 20 C25 10 31 7 34 17 C36 8 28 6 22 20"
              fill="#ffd45a"
            />
          </g>
          {variant !== "compact" && (
            <>
              <g transform="translate(260 10)">
                <rect x="0" y="24" width="54" height="44" rx="4" fill="#f0a06a" />
                <rect x="23" y="24" width="8" height="44" fill="#ffe08a" />
                <rect x="0" y="40" width="54" height="8" fill="#ffe08a" />
                <path
                  d="M27 24 C18 6 8 8 12 20 C15 7 24 10 27 24 C30 10 39 7 42 20 C46 8 36 6 27 24"
                  fill="#ffe08a"
                />
              </g>
              {variant === "santa" && (
                <g transform="translate(330 8)">
                  <path d="M12 54 L48 54 L40 18 L20 18 Z" fill="#e85d4c" />
                  <ellipse cx="30" cy="18" rx="16" ry="8" fill="#fff" />
                  <circle cx="46" cy="16" r="6" fill="#fff" />
                  <path
                    d="M56 40 c8 2 10 14 2 20 c-2-8-8-12-14-12 4-4 8-8 12-8z"
                    fill="#2f9e4f"
                  />
                </g>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
