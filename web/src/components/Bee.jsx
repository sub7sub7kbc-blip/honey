// Little honey bee (pure SVG, no image needed). Used by the slider and the honey journey.
export default function Bee({ cls = '', width = 34, height = 24 }) {
  return (
    <span className={cls} aria-hidden="true">
      <svg viewBox="0 0 48 34" width={width} height={height}>
        <ellipse className="bee-wing" cx="19" cy="8" rx="9" ry="5" fill="#ffffff" opacity=".85" />
        <ellipse className="bee-wing wing2" cx="30" cy="7" rx="8" ry="4.5" fill="#ffffff" opacity=".6" />
        <ellipse cx="24" cy="20" rx="13" ry="9" fill="#e9a820" />
        <path d="M18 12 q-2 8 0 16 M26 11 q-2 9 0 17" stroke="#4a2f14" strokeWidth="3.4" fill="none" />
        <circle cx="36" cy="18" r="5.5" fill="#4a2f14" />
        <circle cx="38" cy="16" r="1.2" fill="#ffffff" />
      </svg>
    </span>
  );
}
