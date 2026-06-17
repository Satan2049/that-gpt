type Props = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 40, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cn-night" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1A2233" />
          <stop offset="1" stopColor="#0E1420" />
        </linearGradient>
        <linearGradient id="cn-nest" x1="20" y1="34" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8945A" />
          <stop offset="1" stopColor="#6E5434" />
        </linearGradient>
        <linearGradient id="cn-bird" x1="26" y1="24" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8E4DC" />
          <stop offset="1" stopColor="#A8A49C" />
        </linearGradient>
        <radialGradient
          id="cn-moon"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(48 16) scale(8)"
        >
          <stop stopColor="#D8DEE8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#D8DEE8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#cn-night)" />
      <circle cx="48" cy="16" r="8" fill="url(#cn-moon)" />
      <circle cx="48" cy="16" r="3.2" fill="#C8D0DC" opacity="0.55" />

      {/* Sparse stars — quiet, not cute */}
      <circle cx="14" cy="14" r="0.7" fill="#8A96AA" opacity="0.7" />
      <circle cx="22" cy="10" r="0.5" fill="#8A96AA" opacity="0.5" />
      <circle cx="54" cy="28" r="0.5" fill="#8A96AA" opacity="0.45" />

      {/* Nest — woven, weighted */}
      <path
        d="M15 36C16 43 23 49 32 49.5C41 49 48 43 49 36C47 41 40 46 32 46C24 46 17 41 15 36Z"
        fill="url(#cn-nest)"
        opacity="0.95"
      />
      <path
        d="M18 34.5C22 38 27 40 32 40C37 40 42 38 46 34.5"
        stroke="#8A6A42"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M20 32C24 35 28 36.5 32 36.5C36 36.5 40 35 44 32"
        stroke="#9A784C"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M17 37.5L21 35.5M43 35.5L47 37.5"
        stroke="#5C4528"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Bird — restrained silhouette, not cartoon */}
      <ellipse cx="32" cy="31.5" rx="8.5" ry="7.5" fill="url(#cn-bird)" />
      <path
        d="M24.5 31C23 29 24.5 27 26.5 28.2C25.5 29.2 25 30.5 24.5 31Z"
        fill="#8C8880"
      />
      <circle cx="35.5" cy="29" r="1.1" fill="#1A2233" />
      <circle cx="35.9" cy="28.7" r="0.35" fill="#E8E4DC" opacity="0.8" />
      <path d="M38.5 31.5L42 30.8L38.5 33.2Z" fill="#3A3530" />
      <path
        d="M29.5 23.5C30.5 22 32 21.8 33 23"
        stroke="#C8C4BC"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Dry parody: a whisper of chat in the dark */}
      <rect x="41" y="20" width="13" height="7.5" rx="2" fill="#1E2838" stroke="#3A4A62" strokeWidth="0.6" />
      <path d="M41 25.5L38 27.5V24.8Z" fill="#1E2838" stroke="#3A4A62" strokeWidth="0.6" />
      <circle cx="44.2" cy="23.7" r="0.65" fill="#7DA0FF" opacity="0.85" />
      <circle cx="47.5" cy="23.7" r="0.65" fill="#7DA0FF" opacity="0.55" />
      <circle cx="50.8" cy="23.7" r="0.65" fill="#7DA0FF" opacity="0.3" />
    </svg>
  );
}
