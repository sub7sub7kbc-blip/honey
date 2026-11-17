import { useEffect, useRef, useState } from 'react';
import { api, fmt, resolvePhoto } from '../api';
import { BEE_FLY } from '../beeFly';

const TYPES = ['sidr', 'acacia', 'multiflora', 'sarson', 'comb'];

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
        <div className="bee bee1"><img src={BEE_FLY} alt="" /></div>
        <div className="bee bee2"><img src={BEE_FLY} alt="" /></div>
        <div className="bee bee3"><img src={BEE_FLY} alt="" /></div>
        <div className="bee bee4"><img src={BEE_FLY} alt="" /></div>
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
