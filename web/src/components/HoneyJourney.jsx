// "From flower to jar" — an animated honey-making journey.
// One bee flies from the flower to the hive while the 5 steps light up in turn.
import Bee from './Bee';

const STEPS = [
  { n: 1, title: 'Nectar from the flower', text: 'The bee sits on a blossom and sips sweet nectar.', icon: 'flower' },
  { n: 2, title: 'Flying home', text: 'Wings buzzing, she carries the nectar back to the hive.', icon: 'wings' },
  { n: 3, title: 'Into the hive', text: 'She returns to her home — the beehive.', icon: 'hive' },
  { n: 4, title: 'Honey in the comb', text: 'Nectar ripens into golden honey inside the wax comb.', icon: 'comb' },
  { n: 5, title: 'Pure honey in the jar', text: 'Raw, unprocessed honey, packed fresh for you.', icon: 'jar' },
];

function Icon({ kind }) {
  if (kind === 'flower') return (
    <svg viewBox="0 0 48 48" width="34" height="34">
      <path d="M24 26 V44" stroke="#2e7d32" strokeWidth="3" fill="none" />
      <path d="M24 34 q-8 -2 -10 -8 q8 -2 10 8" fill="#7a9a4d" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="24" cy="13" rx="6" ry="9" fill="#f2c94c" transform={`rotate(${a} 24 24)`} />
      ))}
      <circle cx="24" cy="24" r="6" fill="#e9a820" stroke="#b5772e" strokeWidth="1.5" />
    </svg>
  );
  if (kind === 'wings') return (
    <svg viewBox="0 0 48 48" width="34" height="34">
      <ellipse cx="18" cy="16" rx="10" ry="6" fill="#ffffff" stroke="#d9a441" strokeWidth="1.5" transform="rotate(-25 18 16)" />
      <ellipse cx="31" cy="14" rx="9" ry="5.5" fill="#ffffff" stroke="#d9a441" strokeWidth="1.5" transform="rotate(20 31 14)" />
      <ellipse cx="24" cy="30" rx="12" ry="8" fill="#e9a820" />
      <path d="M18 23 q-2 7 0 14 M26 22 q-2 8 0 15" stroke="#4a2f14" strokeWidth="3" fill="none" />
    </svg>
  );
  if (kind === 'hive') return (
    <svg viewBox="0 0 48 48" width="34" height="34">
      <path d="M12 40 q0 -22 12 -26 q12 4 12 26 z" fill="#d9a441" />
      <path d="M13 26 h22 M14 33 h20 M17 19 h14" stroke="#b5772e" strokeWidth="2.5" fill="none" />
      <circle cx="24" cy="11" r="2.5" fill="#4a2f14" />
    </svg>
  );
  if (kind === 'comb') return (
    <svg viewBox="0 0 48 48" width="34" height="34">
      <polygon points="24,6 39,15 39,33 24,42 9,33 9,15" fill="#e9a820" stroke="#b5772e" strokeWidth="2" />
      <polygon points="24,14 32,19 32,29 24,34 16,29 16,19" fill="#f6d47c" stroke="#b5772e" strokeWidth="1.5" />
    </svg>
  );
  return (
    <svg viewBox="0 0 48 48" width="34" height="34">
      <rect x="12" y="18" width="24" height="22" rx="6" fill="#f6d47c" stroke="#b5772e" strokeWidth="2" />
      <rect x="14" y="12" width="20" height="7" rx="3" fill="#b5772e" />
      <path d="M18 26 q6 4 12 0" stroke="#e9a820" strokeWidth="3" fill="none" />
    </svg>
  );
}

export default function HoneyJourney() {
  return (
    <div className="section reveal">
      <h2>From flower to jar — how our honey is made</h2>
      <p className="sub">Watch one little bee make your honey.</p>
      <div className="journey panel">
        <div className="journey-sky">
          <svg className="journey-path" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 22 Q 25 6, 50 18 T 96 16" fill="none" stroke="#d9a441" strokeWidth="0.7" strokeDasharray="2 2" />
          </svg>
          <span className="journey-flower" aria-hidden="true">
            <svg viewBox="0 0 48 48" width="52" height="52">
              <path d="M24 26 V46" stroke="#2e7d32" strokeWidth="3" fill="none" />
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="24" cy="13" rx="6" ry="9" fill="#f2c94c" transform={`rotate(${a} 24 24)`} />
              ))}
              <circle cx="24" cy="24" r="6" fill="#e9a820" stroke="#b5772e" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="journey-hive" aria-hidden="true">
            <svg viewBox="0 0 60 56" width="62" height="58">
              <path d="M8 52 q0 -30 22 -38 q22 8 22 38 z" fill="#d9a441" />
              <path d="M10 36 h40 M12 44 h36 M18 26 h24" stroke="#b5772e" strokeWidth="3" fill="none" />
              <ellipse cx="30" cy="12" rx="7" ry="4" fill="#b5772e" />
            </svg>
          </span>
          <Bee cls="journey-bee" width={40} height={28} />
        </div>
        <div className="journey-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className={'journey-step s' + (i + 1)}>
              <span className="journey-num">{s.n}</span>
              <Icon kind={s.icon} />
              <b>{s.title}</b>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
