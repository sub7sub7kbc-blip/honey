import { useEffect, useMemo, useState } from 'react';
import { api, fmt, resolvePhoto } from './api';
import Slider from './components/Slider';
import HoneyJourney from './components/HoneyJourney';
import Admin from './components/Admin';
import { AuthModal, MyAccount } from './components/Auth';

const TYPES = [
  { id: 'sidr', name: 'Sidr Honey' }, { id: 'acacia', name: 'Acacia Honey' },
  { id: 'multiflora', name: 'Multiflora Honey' }, { id: 'sarson', name: 'Sarson Honey' },
  { id: 'comb', name: 'Raw Honeycomb' },
];
const PAYMENTS = [
  { id: 'cod', name: 'Cash on Delivery' }, { id: 'easypaisa', name: 'EasyPaisa' },
  { id: 'jazzcash', name: 'JazzCash' }, { id: 'bank', name: 'Bank Transfer' },
];

function loadCart() { try { return JSON.parse(localStorage.getItem('goldenhive-cart') || '[]'); } catch { return []; } }

export default function App() {
  const [shop, setShop] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [view, setView] = useState('shop');
  const [cart, setCart] = useState(loadCart);
  const [customer, setCustomer] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [trackQ, setTrackQ] = useState('');
  const [tracked, setTracked] = useState(null);
  const [orderDone, setOrderDone] = useState(null);

  const settings = shop?.settings || {};
  const products = shop?.products || [];

  async function load() {
    try { setShop(await api.getShop()); setLoadErr(''); }
    catch (e) { setLoadErr(e.message); }
  }
  useEffect(() => { load(); }, []);
  // Scroll reveal: fade sections in as they enter the viewport.
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [view, products.length]);
  useEffect(() => { localStorage.setItem('goldenhive-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => {
    const t = localStorage.getItem('goldenhive-token');
    if (t) api.me(t).then((d) => setCustomer(d.customer)).catch(() => localStorage.removeItem('goldenhive-token'));
  }, []);

  const cartCount = cart.reduce((a, i) => a + i.qty, 0);
  function addToCart(p, qty = 1) {
    setCart((c) => {
      const f = c.find((i) => i.productId === p.id);
      if (f) return c.map((i) => (i.productId === p.id ? { ...i, qty: Math.min(99, i.qty + qty) } : i));
      return [...c, { productId: p.id, name: p.name, size: p.size, pricePkr: p.pricePkr, qty }];
    });
  }
  function buyNow(p) { addToCart(p); setShowCart(false); setShowCheckout(true); }
  function logout() { localStorage.removeItem('goldenhive-token'); setCustomer(null); setView('shop'); }

  const whatsappNumber = (settings.whatsapp_number || '').replace(/\D/g, '');
  function whatsappLink(order) {
    if (!whatsappNumber) return null;
    const lines = [`New order ${order.code}`, `Name: ${order.customerName}`, `Phone: ${order.phone}`,
      `Address: ${order.address}`, `Items: ${order.items.map((i) => `${i.name} ${i.size || ''} x${i.qty} — ${fmt(i.pricePkr * i.qty)}`).join(', ')}`,
      `Total: ${fmt(order.totalPkr)} (delivery ${fmt(order.deliveryFee)})`,
      `Payment: ${order.paymentMethod} (${order.paymentStatus})`,
      order.transactionId ? `Transaction ID: ${order.transactionId}` : '', order.paidFrom ? `Paid from: ${order.paidFrom}` : '']
      .filter(Boolean).join('\n');
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines)}`;
  }

  return (
    <div>
      <div className="topbar">{settings.announcement || '100% Pure Honey — Lab Tested'}</div>
      <header className="header">
        <div className="logo" onClick={() => setView('shop')}>Golden<span>Hive</span></div>
        <nav className="nav">
          <button className={view === 'shop' ? 'active' : ''} onClick={() => setView('shop')}>Shop</button>
          <button className={view === 'builder' ? 'active' : ''} onClick={() => setView('builder')}>Order Builder</button>
          <button className={view === 'custom' ? 'active' : ''} onClick={() => setView('custom')}>Custom Order</button>
          <button className={view === 'track' ? 'active' : ''} onClick={() => setView('track')}>Track Order</button>
          <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>
        </nav>
        <div className="header-right">
          {customer
            ? <button className="btn ghost small" onClick={() => setView('account')}>My Account — {customer.name.split(' ')[0]}</button>
            : <button className="btn ghost small" onClick={() => setShowAuth(true)}>Login / Signup</button>}
          <button className="btn small" onClick={() => setShowCart(true)}>Cart <span className="cart-count">{cartCount}</span></button>
        </div>
      </header>

      <div className="wrap">
        {loadErr && <div className="err">Could not load the shop: {loadErr}. Check that the API is running and VITE_API_URL is set.</div>}
        {view === 'shop' && (
          <>
            {settings.slider_enabled !== 'false' && <Slider products={products} settings={settings} onAdd={addToCart} onBuyNow={buyNow} />}
            <div className="section reveal">
              <h2>{settings.shop_heading || 'Pure honey, from hive to your home'}</h2>
              <p className="sub">{settings.tagline || '100% Pure Honey'} — no account, no password needed to order. Track by your mobile number or order ID.</p>
              <div className="row" style={{ marginBottom: 16 }}>
                <button className="btn" onClick={() => setView('builder')}>Build My Order</button>
                <button className="btn ghost" onClick={() => setView('custom')}>Custom Order</button>
              </div>
              <div className="grid">
                {products.map((p) => (
                  <div className="card" key={p.id}>
                    <div className="accent-bar" style={{ background: p.accent }} />
                    {p.photo && <img src={resolvePhoto(p.photo)} alt={p.name} className={'ph-' + p.size} />}
                    <div className="card-body">
                      <h3>{p.name}</h3>
                      <p className="size">{p.size} • {p.blossomLabel}</p>
                      <p className="muted" style={{ fontSize: 13 }}>{p.tagline}</p>
                      <div className="price-row">
                        {p.pricePkr
                          ? <><span className="price">{fmt(p.pricePkr)}</span>{p.compareAtPkr && <><span className="compare">{fmt(p.compareAtPkr)}</span><span className="save">Save {Math.round((1 - p.pricePkr / p.compareAtPkr) * 100)}%</span></>}</>
                          : <span className="coming">Price coming soon</span>}
                      </div>
                      {p.badge && <p><span className="save">{p.badge}</span></p>}
                      <div className="qty-row">
                        <button className="btn small" disabled={!p.pricePkr} onClick={() => addToCart(p)}>Add to Cart</button>
                        <button className="btn ghost small" disabled={!p.pricePkr} onClick={() => buyNow(p)}>Buy Now</button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="card" style={{ background: 'var(--cream2)' }}>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minHeight: 170 }}>
                    <h3>Can't decide?</h3>
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>Build your own order — pick the honey, size and quantity.</p>
                    <button className="btn" onClick={() => setView('builder')}>Build My Order →</button>
                  </div>
                </div>
              </div>
            </div>
            <HoneyJourney />
            <div className="section reveal">
              <h2>Order karna bohat asaan hai</h2>
              <div className="steps">
                <div className="step"><b>1. Choose honey</b><span>Pick a honey type and size, or build a custom order.</span></div>
                <div className="step"><b>2. Add to cart</b><span>Checkout with your name, number and address.</span></div>
                <div className="step"><b>3. Pay your way</b><span>COD, EasyPaisa, JazzCash or Bank Transfer.</span></div>
                <div className="step"><b>4. Track it</b><span>Track by the mobile number you ordered with, or your order ID.</span></div>
              </div>
            </div>
            <div className="section panel reveal">
              <h2 style={{ marginTop: 0 }}>Our story</h2>
              <p>{settings.story_text}</p>
              <p>{(function () { try { return JSON.parse(settings.story_points || '[]'); } catch { return []; } })().map((s) => <span key={s} className="save" style={{ marginRight: 6 }}>{s}</span>)}</p>
            </div>
          </>
        )}

        {view === 'builder' && <OrderBuilder products={products} onAdd={(p, q) => { addToCart(p, q); setShowCart(true); }} onBuy={(p, q) => { addToCart(p, q); setShowCheckout(true); }} />}
        {view === 'custom' && <CustomOrder products={products} customer={customer} onDone={(o) => { setOrderDone(o); setView('shop'); }} />}
        {view === 'track' && <TrackView trackQ={trackQ} setTrackQ={setTrackQ} tracked={tracked} setTracked={setTracked} />}
        {view === 'account' && customer && <MyAccount customer={customer} token={localStorage.getItem('goldenhive-token')} onLogout={logout} onProfile={setCustomer} />}
        {view === 'admin' && <Admin shop={shop} reloadShop={load} />}
      </div>

      <div className="mobile-bar">
        <button className="btn" onClick={() => setView('builder')}>Order Now</button>
        <button className="btn ghost" onClick={() => setView('custom')}>Custom Order</button>
        <button className="btn ghost" onClick={() => setShowCart(true)}>Cart ({cartCount})</button>
      </div>

      <footer className="footer">
        <nav>
          <button onClick={() => setView('shop')}>Shop</button>
          <button onClick={() => setView('builder')}>Order Builder</button>
          <button onClick={() => setView('custom')}>Custom Order</button>
          <button onClick={() => setView('track')}>Track Order</button>
          <button onClick={() => setView('admin')}>Admin</button>
        </nav>
        <p>{settings.footer_text || 'GoldenHive — 100% pure honey, delivered across Pakistan.'}</p>
        <p className="muted">We accept: Cash on Delivery • EasyPaisa • JazzCash • Bank Transfer</p>
        <p className="muted">© 2026 GoldenHive. All rights reserved.</p>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLoggedIn={(c) => { setCustomer(c); setShowAuth(false); }} />}
      {showCart && <CartModal cart={cart} setCart={setCart} onClose={() => setShowCart(false)} onCheckout={() => { setShowCart(false); setShowCheckout(true); }} />}
      {showCheckout && <CheckoutModal cart={cart} setCart={setCart} customer={customer} settings={settings} onClose={() => setShowCheckout(false)} onDone={(o) => { setShowCheckout(false); setOrderDone(o); }} />}
      {orderDone && <OrderDoneModal order={orderDone} whatsapp={whatsappLink(orderDone)} onClose={() => setOrderDone(null)} />}
    </div>
  );
}

function OrderBuilder({ products, onAdd, onBuy }) {
  const [type, setType] = useState('sidr');
  const [size, setSize] = useState('500g');
  const [qty, setQty] = useState(1);
  const product = products.find((p) => p.type === type && p.size === size);
  const total = product?.pricePkr ? product.pricePkr * qty : null;
  return (
    <div className="section">
      <h2>Order Builder — build your own order</h2>
      <p className="sub">Step 1 honey, Step 2 size, Step 3 quantity. Live total on the side.</p>
      <div className="builder">
        <div className="panel">
          <label>Step 1 — Choose honey</label>
          <div className="chips">{TYPES.map((t) => (
            <button key={t.id} className={'chip' + (type === t.id ? ' active' : '')} onClick={() => { setType(t.id); if (t.id === 'comb') setSize('400g'); else if (size === '400g') setSize('500g'); }}>{t.name}</button>
          ))}</div>
          <label>Step 2 — Choose size</label>
          <div className="chips">{(type === 'comb' ? ['400g'] : ['250g', '500g', '1kg']).map((s) => (
            <button key={s} className={'chip' + (size === s ? ' active' : '')} onClick={() => setSize(s)}>{s}</button>
          ))}{type === 'comb' && <span className="muted"> Honeycomb comes in 400g only.</span>}</div>
          <label>Step 3 — Quantity</label>
          <div className="qty-row qty-step">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span>
            <button onClick={() => setQty(Math.min(99, qty + 1))}>+</button>
          </div>
        </div>
        <div className="panel total-box">
          <h3>Your order</h3>
          {product ? (<>
            <p><b>{product.name}</b> — {product.size} × {qty}</p>
            <p className="muted">{product.blossomLabel}</p>
            <p className="price"><span key={total} className="price-change">{total ? fmt(total) : 'Price coming soon'}</span></p>
            <div className="row">
              <button className="btn" disabled={!total} onClick={() => onAdd(product, qty)}>Add to Cart</button>
              <button className="btn ghost" disabled={!total} onClick={() => onBuy(product, qty)}>Buy Now</button>
            </div>
          </>) : <p className="muted">Pick a honey and size.</p>}
        </div>
      </div>
    </div>
  );
}

function CustomOrder({ products, customer, onDone }) {
  const [type, setType] = useState('sidr');
  const [grams, setGrams] = useState(500);
  const [jar, setJar] = useState('glass');
  const [packaging, setPackaging] = useState('standard');
  const [purpose, setPurpose] = useState('home');
  const [giftNote, setGiftNote] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const estimate = useMemo(() => {
    const rows = products.filter((p) => p.type === type && p.pricePkr);
    if (!rows.length) return null;
    const g = (s) => (s === '1kg' ? 1000 : s === '500g' ? 500 : s === '250g' ? 250 : 400);
    const rate = Math.min(...rows.map((r) => r.pricePkr / g(r.size)));
    return Math.round(rate * grams / 10) * 10;
  }, [products, type, grams]);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.target);
    try {
      const data = await api.placeCustomOrder({
        honeyType: type, grams, jar, packaging, purpose, giftNote,
        customerName: f.get('name'), phone: f.get('phone'), city: f.get('city'),
        address: f.get('address'), note: f.get('note') || '',
        paymentMethod: f.get('payment'), transactionId: f.get('tid') || '', paidFrom: f.get('paidFrom') || '',
        customerId: customer?.id,
      });
      onDone(data.order);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <div className="section">
      <h2>Custom Order</h2>
      <p className="sub">Any honey, 100g to 5kg, your jar, your packing.</p>
      <div className="builder">
        <div className="panel">
          <label>Honey type</label>
          <div className="chips">{TYPES.map((t) => (
            <button key={t.id} className={'chip' + (type === t.id ? ' active' : '')} onClick={() => { setType(t.id); if (t.id === 'comb') setGrams((g) => Math.min(g, 400)); }}>{t.name}</button>
          ))}</div>
          <label>Quantity: {grams}g ({type === 'comb' ? '100g – 400g (honeycomb)' : '100g – 5kg'})</label>
          <input type="range" min="100" max={type === 'comb' ? 400 : 5000} step="50" value={grams} onChange={(e) => setGrams(parseInt(e.target.value, 10))} />
          <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">100g</span><span className="muted">{type === 'comb' ? '400g' : '5kg'}</span></div>
          <div className="chips">{[250, 500, 1000, 2000, 5000].filter((g) => type !== 'comb' || g <= 400).map((g) => (
            <button key={g} className={'chip' + (grams === g ? ' active' : '')} onClick={() => setGrams(g)}>{g >= 1000 ? g / 1000 + 'kg' : g + 'g'}</button>
          ))}</div>
          <div className="row">
            <div><label>Jar</label><select value={jar} onChange={(e) => setJar(e.target.value)}><option value="glass">Glass jar</option><option value="plastic">Plastic jar</option><option value="squeeze">Squeeze bottle</option></select></div>
            <div><label>Packing</label><select value={packaging} onChange={(e) => setPackaging(e.target.value)}><option value="standard">Standard</option><option value="gift">Gift box</option></select></div>
            <div><label>Purpose</label><select value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="home">Home</option><option value="gift">Gift</option><option value="business">Business</option></select></div>
          </div>
          {(packaging === 'gift' || purpose === 'gift') && (<><label>Gift note</label><input value={giftNote} onChange={(e) => setGiftNote(e.target.value)} placeholder="Write your gift message" /></>)}
        </div>
        <div className="panel total-box">
          <h3>Live estimate</h3>
          <p className="price"><span key={estimate} className="price-change">{estimate ? fmt(estimate) : 'Price coming soon — set prices in Admin first'}</span></p>
          <p className="muted">+ delivery (free above Rs 5,000)</p>
          <button className="btn" disabled={!estimate} onClick={() => setShowForm(true)}>Continue to details</button>
        </div>
      </div>
      {showForm && (
        <form className="panel" style={{ marginTop: 16 }} onSubmit={submit}>
          <h3>Your details & payment</h3>
          {err && <div className="err">{err}</div>}
          <div className="row">
            <div><label>Full name</label><input name="name" defaultValue={customer?.name || ''} required /></div>
            <div><label>Mobile number</label><input name="phone" defaultValue={customer?.phone || ''} required /></div>
          </div>
          <div className="row">
            <div><label>City</label><input name="city" defaultValue={customer?.city || ''} /></div>
            <div><label>Address</label><input name="address" defaultValue={customer?.address || ''} required /></div>
          </div>
          <label>Special instructions</label><input name="note" placeholder="Anything special?" />
          <label>Payment method</label>
          <select name="payment">{PAYMENTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <p className="muted">For EasyPaisa / JazzCash / Bank Transfer, pay first, then enter the Transaction ID and the number you paid from.</p>
          <div className="row">
            <div><label>Transaction ID (prepaid only)</label><input name="tid" /></div>
            <div><label>Paid-from number (prepaid only)</label><input name="paidFrom" /></div>
          </div>
          <div style={{ marginTop: 14 }}><button className="btn" disabled={busy}>{busy ? 'Placing…' : 'Place custom order'}</button></div>
        </form>
      )}
    </div>
  );
}

function CartModal({ cart, setCart, onClose, onCheckout }) {
  const total = cart.reduce((a, i) => a + i.pricePkr * i.qty, 0);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Your Cart</h2>
        {cart.length === 0 ? <p className="muted">Your cart is empty.</p> : (<>
          {cart.map((i) => (
            <div key={i.productId} className="row" style={{ alignItems: 'center', borderBottom: '1px solid var(--line)', padding: '8px 0' }}>
              <span style={{ flex: 2 }}>{i.name} — {i.size}</span>
              <span className="qty-row qty-step"><button onClick={() => setCart(cart.map((x) => (x.productId === i.productId ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>−</button><span>{i.qty}</span><button onClick={() => setCart(cart.map((x) => (x.productId === i.productId ? { ...x, qty: x.qty + 1 } : x)))}>+</button></span>
              <b>{fmt(i.pricePkr * i.qty)}</b>
              <button className="btn ghost small" onClick={() => setCart(cart.filter((x) => x.productId !== i.productId))}>Remove</button>
            </div>
          ))}
          <p><b>Subtotal: <span key={total} className="price-change">{fmt(total)}</span></b> <span className="muted">+ delivery (free above Rs 5,000)</span></p>
          <button className="btn" onClick={onCheckout}>Checkout</button>
        </>)}
        <div style={{ marginTop: 12 }}><button className="btn ghost small" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}

function CheckoutModal({ cart, setCart, customer, settings, onClose, onDone }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState('cod');
  const total = cart.reduce((a, i) => a + i.pricePkr * i.qty, 0);
  const payInfo = { easypaisa: [settings.easypaisa_number, settings.easypaisa_title], jazzcash: [settings.jazzcash_number, settings.jazzcash_title], bank: [settings.bank_details, ''] }[payment];

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.target);
    try {
      const data = await api.placeOrder({
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
        customerName: f.get('name'), phone: f.get('phone'), city: f.get('city'),
        address: f.get('address'), note: f.get('note') || '', paymentMethod: payment,
        transactionId: f.get('tid') || '', paidFrom: f.get('paidFrom') || '',
        customerId: customer?.id,
      });
      setCart([]); onDone(data.order);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Checkout</h2>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="row">
            <div><label>Full name</label><input name="name" defaultValue={customer?.name || ''} required /></div>
            <div><label>Mobile number</label><input name="phone" defaultValue={customer?.phone || ''} required /></div>
          </div>
          <div className="row">
            <div><label>City</label><input name="city" defaultValue={customer?.city || ''} /></div>
            <div><label>Address</label><input name="address" defaultValue={customer?.address || ''} required /></div>
          </div>
          <label>Note (optional)</label><input name="note" />
          <label>Payment method</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {payment !== 'cod' && (
            <div className="ok-msg">
              {payInfo && payInfo[0] ? <>Pay to: <b>{payInfo[0]}</b>{payInfo[1] ? ` (${payInfo[1]})` : ''}<br /></> : <>Payment number is being set up — please contact the shop.<br /></>}
              Then enter the Transaction ID and the number you paid from below.
            </div>
          )}
          {payment !== 'cod' && (<div className="row">
            <div><label>Transaction ID</label><input name="tid" placeholder="At least 4 characters" /></div>
            <div><label>Paid-from number</label><input name="paidFrom" placeholder="At least 10 digits" /></div>
          </div>)}
          <p><b>Total: <span key={total} className="price-change">{fmt(total)}</span></b> <span className="muted">+ delivery (free above Rs 5,000)</span></p>
          <button className="btn" disabled={busy || !cart.length}>{busy ? 'Placing order…' : 'Place order'}</button>
        </form>
        <div style={{ marginTop: 12 }}><button className="btn ghost small" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}

function OrderDoneModal({ order, whatsapp, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Order placed! 🎉</h2>
        <p>Your order ID is <b>{order.code}</b> — save it. Track it with your mobile number or this code.</p>
        <p>Total: <b>{fmt(order.totalPkr)}</b> • Payment: {order.paymentMethod} ({order.paymentStatus})</p>
        {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><button className="btn">Send order on WhatsApp</button></a>}
        {!whatsapp && <p className="muted">WhatsApp number is being set up by the shop.</p>}
        <div style={{ marginTop: 12 }}><button className="btn ghost" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function TrackView({ trackQ, setTrackQ, tracked, setTracked }) {
  const [err, setErr] = useState('');
  async function go(e) {
    e.preventDefault(); setErr('');
    try { const d = await api.track(trackQ); setTracked(d.orders); if (!d.orders.length) setErr('No order found for this number or code.'); }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <div className="section">
      <h2>Track Order</h2>
      <p className="sub">No account, no password — just the mobile number you ordered with, or your order ID.</p>
      <form onSubmit={go} className="row">
        <input value={trackQ} onChange={(e) => setTrackQ(e.target.value)} placeholder="0300-1234567 or GH-00001" />
        <button className="btn">Track</button>
      </form>
      {err && <div className="err">{err}</div>}
      {tracked?.map((o) => (
        <div className="panel" key={o.id} style={{ marginTop: 16 }}>
          <h3>{o.code} — {fmt(o.totalPkr)}</h3>
          <p>{o.customerName} • {o.phone} • {o.city} — {o.address}</p>
          <p>Payment: {o.paymentMethod} ({o.paymentStatus}) {o.transactionId ? `• TID: ${o.transactionId}` : ''}</p>
          <p>Items: {o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</p>
          <div className="timeline">
            {o.timeline?.map((t, i) => <div key={i}><b>{t.status}</b> — {new Date(t.created_at).toLocaleString()}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
