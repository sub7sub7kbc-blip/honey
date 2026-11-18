// WhatsApp order: a direct order form for one product. The customer fills
// their name, phone and address (with the free map + postal-code auto-fill),
// then the order opens in WhatsApp as a ready message to the shop.
// The shop's WhatsApp number comes from Admin → Settings; until the owner
// adds it, the send button stays disabled with a clear note.
import { useState } from 'react';
import { fmt, deliveryFor } from '../api';
import AddressPicker from './AddressPicker';

export default function WhatsAppOrderModal({ product: p, qty: initialQty, customer, settings, onClose }) {
  const [qty, setQty] = useState(initialQty || 1);
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [note, setNote] = useState('');
  const [addr, setAddr] = useState({ city: customer?.city || '', postcode: '', address: customer?.address || '', lat: null, lon: null });
  const [err, setErr] = useState('');

  const whatsappNumber = (settings?.whatsapp_number || '').replace(/\D/g, '');
  const subtotal = p.pricePkr ? p.pricePkr * qty : 0;
  const delivery = p.pricePkr ? deliveryFor(subtotal, settings) : 0;
  const total = subtotal + delivery;

  function send() {
    if (!name.trim() || !phone.trim() || !addr.address.trim()) { setErr('Name, mobile number and address are required.'); return; }
    if (!whatsappNumber) { setErr('WhatsApp number is being set up — please contact the shop.'); return; }
    const lines = [
      `New WhatsApp order — ${p.name} ${p.size}`,
      `Product: ${p.name} ${p.size} x${qty} — ${fmt(subtotal)}`,
      `Delivery: ${delivery === 0 ? 'FREE' : fmt(delivery)}`,
      `Total: ${fmt(total)}`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `City: ${addr.city || ''}${addr.postcode ? ` (${addr.postcode})` : ''}`,
      `Address: ${addr.address.trim()}`,
      addr.lat && addr.lon ? `Location: https://maps.google.com/?q=${addr.lat},${addr.lon}` : '',
      note.trim() ? `Note: ${note.trim()}` : '',
      'Payment: Cash on Delivery',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines)}`, '_blank');
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Order on WhatsApp</h2>
        <p className="sub">{p.name} {p.size} — {fmt(p.pricePkr)} each</p>
        {err && <div className="err">{err}</div>}
        {!whatsappNumber && <div className="ok-msg">WhatsApp number is being set up — please contact the shop to order.</div>}
        <div className="row">
          <div><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><label>Mobile number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
        </div>
        <AddressPicker value={addr} onChange={setAddr} idPrefix="wa" />
        <label>Note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="qty-row qty-step" style={{ margin: '12px 0' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
        </div>
        <p>Subtotal: <b>{fmt(subtotal)}</b></p>
        <p>Delivery: <b>{delivery === 0 ? 'FREE' : fmt(delivery)}</b> <span className="muted">(free above Rs 5,000)</span></p>
        <p><b>Total: {fmt(total)}</b></p>
        <button className="btn" disabled={!whatsappNumber} onClick={send}>Send order on WhatsApp</button>
        <div style={{ marginTop: 12 }}><button className="btn ghost small" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}
