import { useEffect, useRef, useState } from 'react';
import { api, fmt, resolvePhoto } from '../api';

const TYPES = ['sidr', 'acacia', 'multiflora', 'sarson', 'comb'];

// Little honey bee (pure SVG, no image needed) that flies across the slider.
function Bee({ cls }) {
  return (
    <span className={'bee ' + cls} aria-hidden="true">
      <svg viewBox="0 0 48 34" width="34" height="24">
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

export default function Slider({ products, settings, onAdd, onBuyNow }) {
  const slides = TYPES.map((t) => {
    const p = products.find((x) => x.type === t && x.size === '500g') || products.find((x) => x.type === t);
    return p ? { ...p } : null;
  }).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const speed = parseInt(settings.slider_speed_ms || '4200', 10);
  const enabled = settings.slider_enabled !== 'false';
  const taglines = (() => { try { return JSON.parse(settings.slide_taglines || '{}'); } catch { return {}; } })();

  useEffect(() => {
    if (!enabled || paused || slides.length < 2) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), speed);
    return () => clearTimeout(t);
  }, [idx, paused, enabled, speed, slides.length]);

  if (!slides.length) return null;
  const s = slides[idx % slides.length];
  return (
    <div className="slider"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx < -40) setIdx((i) => (i + 1) % slides.length);
        if (dx > 40) setIdx((i) => (i - 1 + slides.length) % slides.length);
        touchX.current = null; setPaused(false);
      }}>
      {slides.map((p, i) => (
        <div key={p.type} className={'slide' + (i === idx ? ' active' : '')} aria-hidden={i !== idx}>
          <div className="slide-text">
            <span className="pill">100% PURE HONEY</span>
            <h2>{p.name}</h2>
            <p>{taglines[p.type] || p.tagline || p.description}</p>
            <p className="muted">{p.blossomLabel} • {p.size}</p>
            <div className="slide-price">{p.pricePkr ? fmt(p.pricePkr) : 'Price coming soon'}</div>
            <div className="row">
              <button className="btn" disabled={!p.pricePkr} onClick={() => onAdd(p)}>Add to Cart</button>
              <button className="btn ghost" disabled={!p.pricePkr} onClick={() => onBuyNow(p)}>Order Now</button>
            </div>
          </div>
          <div className="slide-photo"><img src={resolvePhoto(p.photo)} alt={p.name} /></div>
        </div>
      ))}
      <div className="bees" aria-hidden="true">
        <Bee cls="bee1" /><Bee cls="bee2" /><Bee cls="bee3" /><Bee cls="bee4" />
      </div>
      <button className="slider-arrow prev" aria-label="Previous" onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}>‹</button>
      <button className="slider-arrow next" aria-label="Next" onClick={() => setIdx((i) => (i + 1) % slides.length)}>›</button>
      <div className="slider-dots">
        {slides.map((p, i) => (
          <button key={p.type} className={'dot' + (i === idx ? ' active' : '')} aria-label={p.name} onClick={() => setIdx(i)} />
        ))}
        <span className="dot-counter">{idx + 1} / {slides.length}</span>
      </div>
    </div>
  );
}
