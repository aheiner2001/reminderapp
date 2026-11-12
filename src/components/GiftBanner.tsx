/** Festive gift illustration matching assets PDF Secret Santa screenshots. */
export default function GiftBanner({
  variant = "default",
}: {
  variant?: "default" | "compact" | "santa";
}) {
  return (
    <div className={`giftBanner giftBanner-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 420 88" className="giftBannerSvg" role="presentation">
        <g transform="translate(28 18)">
          <rect x="0" y="18" width="48" height="42" rx="4" fill="#5b8def" />
          <rect x="20" y="18" width="8" height="42" fill="#f5d76e" />
          <rect x="0" y="34" width="48" height="8" fill="#f5d76e" />
          <path
            d="M24 18 C18 6 10 8 12 16 C14 8 22 10 24 18 C26 10 34 8 36 16 C38 8 30 6 24 18"
            fill="#f5d76e"
          />
        </g>
        <g transform="translate(92 10)">
          <rect x="0" y="22" width="56" height="48" rx="4" fill="#e85d4c" />
          <rect x="24" y="22" width="8" height="48" fill="#ffe08a" />
          <rect x="0" y="40" width="56" height="8" fill="#ffe08a" />
          <path
            d="M28 22 C20 4 8 8 12 20 C16 6 26 10 28 22 C30 10 40 6 44 20 C48 8 36 4 28 22"
            fill="#ffe08a"
          />
        </g>
        <g transform="translate(168 22)">
          <rect x="0" y="16" width="40" height="36" rx="3" fill="#3d6fd8" />
          <rect x="16" y="16" width="7" height="36" fill="#ffd45a" />
          <rect x="0" y="30" width="40" height="7" fill="#ffd45a" />
          <path
            d="M20 16 C15 6 8 8 10 15 C12 7 18 9 20 16 C22 9 28 7 30 15 C32 8 25 6 20 16"
            fill="#ffd45a"
          />
        </g>
        {variant !== "compact" && (
          <>
            <g transform="translate(230 8)">
              <path
                d="M18 8 L22 20 L34 20 L24 28 L28 40 L18 32 L8 40 L12 28 L2 20 L14 20 Z"
                fill="#3f7cf0"
                opacity="0.35"
              />
            </g>
            <g transform="translate(270 14)">
              <rect x="0" y="20" width="50" height="44" rx="4" fill="#f0a06a" />
              <rect x="21" y="20" width="8" height="44" fill="#ffe08a" />
              <rect x="0" y="36" width="50" height="8" fill="#ffe08a" />
              <path
                d="M25 20 C18 6 8 8 11 18 C14 7 22 10 25 20 C28 10 36 7 39 18 C42 8 32 6 25 20"
                fill="#ffe08a"
              />
            </g>
            {variant === "santa" && (
              <g transform="translate(340 6)">
                <path d="M10 48 L42 48 L36 18 L16 18 Z" fill="#e85d4c" />
                <ellipse cx="26" cy="18" rx="14" ry="7" fill="#fff" />
                <circle cx="40" cy="16" r="5" fill="#fff" />
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  );
}
