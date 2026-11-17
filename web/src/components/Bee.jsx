// Little honey bee (pure SVG, no image needed). Used by the slider and the honey journey.
// Drawn big and clear on purpose: fat striped body, big wings, antennae, head + eye.
export default function Bee({ cls = '', width = 48, height = 34 }) {
  return (
    <span className={cls} aria-hidden="true">
      <svg viewBox="0 0 62 42" width={width} height={height}>
        <ellipse className="bee-wing" cx="22" cy="9" rx="11" ry="6" fill="#ffffff" opacity=".9" />
        <ellipse className="bee-wing wing2" cx="35" cy="8" rx="10" ry="5.5" fill="#ffffff" opacity=".65" />
        <path d="M46 14 q4 -5 8 -5 M48 16 q5 -3 8 -2" stroke="#4a2f14" strokeWidth="1.8" fill="none" />
        <circle cx="55" cy="8" r="1.6" fill="#4a2f14" />
        <circle cx="57" cy="13" r="1.6" fill="#4a2f14" />
        <ellipse cx="28" cy="24" rx="16" ry="11" fill="#e9a820" />
        <path d="M20 14 q-3 10 0 20 M29 13 q-3 11 0 22 M38 14 q-3 10 0 20" stroke="#4a2f14" strokeWidth="4" fill="none" />
        <path d="M12 26 l-5 3" stroke="#4a2f14" strokeWidth="2.4" />
        <path d="M20 34 l-2 4 M28 35 l0 4 M36 34 l2 4" stroke="#4a2f14" strokeWidth="2" fill="none" />
        <circle cx="44" cy="22" r="7" fill="#4a2f14" />
        <circle cx="46.5" cy="19.5" r="1.8" fill="#ffffff" />
        <circle cx="47" cy="20" r="0.9" fill="#222222" />
      </svg>
    </span>
  );
}
