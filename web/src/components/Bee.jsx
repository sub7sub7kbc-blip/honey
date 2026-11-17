// Honey bee — detailed realistic illustration (side profile, facing right).
// Gradient amber body with dark bands, veined translucent wings, compound eye,
// antennae, legs and a soft fur texture. Used by the slider and the honey journey.
export default function Bee({ cls = '', width = 84, height = 56 }) {
  return (
    <span className={cls} aria-hidden="true">
      <svg viewBox="0 0 120 80" width={width} height={height}>
        <defs>
          <radialGradient id="beeBody" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#f7c04a" />
            <stop offset="55%" stopColor="#dd9a17" />
            <stop offset="100%" stopColor="#7a4d06" />
          </radialGradient>
          <radialGradient id="beeEye" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#8a6238" />
            <stop offset="60%" stopColor="#3a2410" />
            <stop offset="100%" stopColor="#1c0f02" />
          </radialGradient>
          <linearGradient id="beeWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity=".92" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity=".28" />
          </linearGradient>
          <clipPath id="beeAbdomenClip">
            <ellipse cx="46" cy="46" rx="32" ry="21" />
          </clipPath>
          <filter id="beeFur" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
          </filter>
        </defs>
        <polygon points="4,44 14,40 14,52" fill="#2a1a05" />
        <ellipse cx="46" cy="46" rx="32" ry="21" fill="url(#beeBody)" filter="url(#beeFur)" />
        <g clipPath="url(#beeAbdomenClip)" fill="#2e1c05" opacity=".88">
          <path d="M28 24 Q 22 46 28 68 L 38 68 Q 32 46 38 24 Z" />
          <path d="M46 24 Q 42 46 46 68 L 56 68 Q 52 46 56 24 Z" />
          <path d="M63 25 Q 60 46 63 67 L 71 67 Q 68 46 71 25 Z" />
        </g>
        <ellipse cx="80" cy="42" rx="17" ry="16" fill="#b97a1e" filter="url(#beeFur)" />
        <path d="M70 56 L 66 70 M79 58 L 79 72 M88 56 L 93 69 M56 60 L 52 71" stroke="#2e1c05" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse className="bee-wing" cx="64" cy="20" rx="30" ry="10" fill="url(#beeWing)" stroke="#cbb98d" strokeWidth=".8" transform="rotate(-16 64 20)" />
        <ellipse className="bee-wing wing2" cx="84" cy="16" rx="32" ry="11" fill="url(#beeWing)" stroke="#cbb98d" strokeWidth=".8" transform="rotate(-12 84 16)" />
        <g stroke="rgba(120,90,40,.55)" strokeWidth=".7" fill="none">
          <path d="M78 32 L 48 12 M78 32 L 60 8 M78 32 L 72 10" />
          <path d="M94 30 L 64 4 M94 30 L 78 2 M94 30 L 92 4" />
        </g>
        <circle cx="99" cy="38" r="12" fill="#33200a" />
        <ellipse cx="101" cy="36" rx="6" ry="8" fill="url(#beeEye)" />
        <circle cx="103" cy="33" r="1.8" fill="#ffffff" opacity=".9" />
        <path d="M96 27 Q 100 14 110 12 M100 26 Q 108 16 116 16" stroke="#2e1c05" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="110" cy="12" r="1.7" fill="#2e1c05" />
        <circle cx="116" cy="16" r="1.7" fill="#2e1c05" />
        <path d="M108 47 Q 112 53 110 57" stroke="#2e1c05" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}
