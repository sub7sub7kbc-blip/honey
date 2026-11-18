// Product detail: opens when a product is clicked — the full product with a
// big photo, a zoom lightbox, and every way to order (Add to Cart, Buy Now,
// WhatsApp Order). The photo zooms in a fullscreen lightbox with + / −
// controls; the image scrolls inside the lightbox when zoomed, so it works
// on phones as well as on desktop.
import { useState } from 'react';
import { fmt, resolvePhoto, deliveryFor } from '../api';

export default function ProductDetail({ product: p, settings, onClose, onAdd, onBuyNow, onWhatsApp }) {
  const [qty, setQty] = useState(1);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const subtotal = p.pricePkr ? p.pricePkr * qty : 0;
  const delivery = p.pricePkr ? deliveryFor(subtotal, settings) : 0;
  const hasWhatsApp = !!(settings?.whatsapp_number || '').replace(/\D/g, '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost small" onClick={onClose} style={{ float: 'right' }}>Close ✕</button>
        <div className="detail-grid">
          <div>
            {p.photo && (
              <img
                src={resolvePhoto(p.photo)}
                alt={p.name}
                className="detail-img"
                onClick={() => { setZoom(1); setZoomOpen(true); }}
                title="Tap to zoom"
              />
            )}
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>Tap the photo to zoom.</p>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>{p.name}</h2>
            <p className="size">{p.size} • {p.blossomLabel}</p>
            {p.badge && <p><span className="save">{p.badge}</span></p>}
            <div className="price-row">
              {p.pricePkr
                ? <><span className="price">{fmt(p.pricePkr)}</span>{p.compareAtPkr && <><span className="compare">{fmt(p.compareAtPkr)}</span><span className="save">Save {Math.round((1 - p.pricePkr / p.compareAtPkr) * 100)}%</span></>}</>
                : <span className="coming">Price coming soon</span>}
            </div>
            {p.description && <p>{p.description}</p>}
            {p.tagline && <p className="muted">{p.tagline}</p>}
            <p className="muted" style={{ fontSize: 13 }}>Delivery: {delivery === 0 ? 'FREE' : fmt(delivery)} (free above Rs 5,000) • Stock: {p.stock}</p>
            <div className="qty-row qty-step" style={{ margin: '12px 0' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
              <b style={{ marginLeft: 8 }}>{p.pricePkr ? fmt(subtotal + delivery) : ''}</b>
            </div>
            <div className="qty-row">
              <button className="btn" disabled={!p.pricePkr} onClick={() => { onAdd(p, qty); onClose(); }}>Add to Cart</button>
              <button className="btn ghost" disabled={!p.pricePkr} onClick={() => onBuyNow(p, qty)}>Buy Now</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn" disabled={!p.pricePkr || !hasWhatsApp} onClick={() => onWhatsApp(p, qty)}>Order on WhatsApp</button>
              {!hasWhatsApp && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>WhatsApp number is being set up — please check back soon.</p>}
            </div>
          </div>
        </div>
      </div>
      {zoomOpen && (
        <div className="zoom-lightbox" onClick={() => setZoomOpen(false)}>
          <div className="zoom-bar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoom(Math.max(1, zoom - 0.5))}>−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(3, zoom + 0.5))}>+</button>
            <button onClick={() => setZoom(1)}>Reset</button>
            <button onClick={() => setZoomOpen(false)}>Close ✕</button>
          </div>
          <div className="zoom-stage" onClick={(e) => e.stopPropagation()}>
            <img src={resolvePhoto(p.photo)} alt={p.name} style={{ transform: `scale(${zoom})` }} />
          </div>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>Use + / − to zoom. Scroll inside the photo to see every part.</p>
        </div>
      )}
    </div>
  );
}
