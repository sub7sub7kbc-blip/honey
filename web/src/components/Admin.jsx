import { useEffect, useState } from 'react';
import { api, fmt, resolvePhoto } from '../api';

const TABS = ['Dashboard', 'Orders', 'Products', 'Customers', 'Homepage & Slider', 'Settings & Security'];
const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function Admin({ shop, reloadShop }) {
  const [token, setToken] = useState(localStorage.getItem('goldenhive-admin') || '');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [curPin, setCurPin] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState('Dashboard');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [settings, setSettings] = useState(shop?.settings || {});
  const [editProduct, setEditProduct] = useState(null);

  useEffect(() => { if (shop?.settings) setSettings(shop.settings); }, [shop]);
  useEffect(() => { if (token) loadAll(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    try {
      const o = await api.adminOrders(token);
      setOrders(o.orders);
      const c = await api.adminCustomers(token);
      setCustomers(c.customers);
    } catch (e) { setErr(e.message); if (e.message.includes('expired') || e.message.includes('required')) logout(); }
  }
  function logout() { localStorage.removeItem('goldenhive-admin'); setToken(''); api.adminLogout(token).catch(() => {}); }

  async function doLogin(e) {
    e.preventDefault(); setErr('');
    try { const d = await api.adminLogin({ pin }); localStorage.setItem('goldenhive-admin', d.token); setToken(d.token); }
    catch (e2) { setErr(e2.message); }
  }
  async function doSetPin(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api.adminSetPin({ currentPin: curPin, newPin }); setMsg('Admin PIN set. Use it to log in.'); setNewPin(''); setCurPin(''); }
    catch (e2) { setErr(e2.message); }
  }
  async function saveSettings(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api.adminSaveSettings(token, settings); setMsg('Settings saved.'); reloadShop(); }
    catch (e2) { setErr(e2.message); }
  }
  async function saveProduct(p) {
    setErr('');
    try {
      if (p.id) await api.adminUpdateProduct(token, p.id, p);
      else await api.adminSaveProduct(token, p);
      setEditProduct(null); setMsg('Product saved.'); reloadShop();
    } catch (e2) { setErr(e2.message); }
  }
  async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    await api.adminDeleteProduct(token, id); reloadShop();
  }
  async function uploadPhoto(id, file) {
    const reader = new FileReader();
    reader.onload = async () => {
      try { await api.adminUploadPhoto(token, id, reader.result); setMsg('Photo uploaded.'); reloadShop(); }
      catch (e2) { setErr(e2.message); }
    };
    reader.readAsDataURL(file);
  }

  if (!token) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: '30px auto' }}>
        <h2>Admin Panel</h2>
        <p className="muted">Locked by PIN. Only the shop owner can open it.</p>
        {err && <div className="err">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        <form onSubmit={doLogin}>
          <label>Admin PIN</label>
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="4–8 digits" required />
          <div style={{ marginTop: 12 }}><button className="btn">Login to Admin</button></div>
        </form>
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />
        <h3>First time? Set your PIN</h3>
        <p className="muted">No PIN exists yet — set one now. Keep it secret.</p>
        <form onSubmit={doSetPin}>
          <label>New PIN (4–8 digits)</label>
          <input inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} required />
          <div style={{ marginTop: 12 }}><button className="btn ghost">Set PIN</button></div>
        </form>
      </div>
    );
  }

  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + o.totalPkr, 0);
  const pendingPay = orders.filter((o) => o.paymentStatus === 'pending').length;
  const filtered = orders.filter((o) =>
    (status === 'all' || o.status === status) &&
    (!search || o.code.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.phone.includes(search)));

  return (
    <div>
      <div className="row" style={{ alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Admin Panel</h2>
        <div style={{ textAlign: 'right' }}><button className="btn ghost small" onClick={logout}>Logout</button></div>
      </div>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok-msg">{msg}</div>}
      <div className="tabs">{TABS.map((t) => (
        <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
      ))}</div>

      {tab === 'Dashboard' && (<div>
        <div className="stat-grid">
          <div className="stat"><b>{orders.length}</b><span>Total orders</span></div>
          <div className="stat"><b>{fmt(revenue)}</b><span>Revenue (excl. cancelled)</span></div>
          <div className="stat"><b>{pendingPay}</b><span>Payments pending</span></div>
          <div className="stat"><b>{customers.length}</b><span>Customers</span></div>
        </div>
        <div className="panel">
          <h3>Setup checklist</h3>
          <ul>
            <li>{settings.whatsapp_number ? '✓' : '○'} WhatsApp number {settings.whatsapp_number ? 'set' : '— not set yet'}</li>
            <li>{shop?.products?.every((p) => p.pricePkr) ? '✓' : '○'} Product prices {shop?.products?.every((p) => p.pricePkr) ? 'set' : '— some show "Price coming soon"'}</li>
            <li>{settings.easypaisa_number || settings.jazzcash_number ? '✓' : '○'} Payment numbers {settings.easypaisa_number || settings.jazzcash_number ? 'set' : '— not set yet'}</li>
          </ul>
          <h3>Latest orders</h3>
          {orders.slice(0, 5).map((o) => <p key={o.id}>{o.code} — {o.customerName} — {fmt(o.totalPkr)} — {o.status} / {o.paymentStatus}</p>)}
          {orders.length === 0 && <p className="muted">No orders yet.</p>}
        </div>
      </div>)}

      {tab === 'Orders' && (<div className="panel">
        <div className="row">
          <input placeholder="Search order ID, name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn ghost small" onClick={loadAll}>Refresh</button>
        </div>
        {filtered.length === 0 ? <p className="muted">No orders match.</p> : (
          <div style={{ overflowX: 'auto' }}><table>
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
            <tbody>{filtered.map((o) => (
              <tr key={o.id}>
                <td>{o.code}<br /><span className="muted">{new Date(o.createdAt).toLocaleString()}</span></td>
                <td>{o.customerName}<br /><span className="muted">{o.phone}</span><br /><span className="muted">{o.city} — {o.address}</span></td>
                <td>{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}<br /><span className="muted">{o.transactionId ? `TID: ${o.transactionId}` : ''} {o.paidFrom ? `from ${o.paidFrom}` : ''}</span></td>
                <td>{fmt(o.totalPkr)}</td>
                <td><select value={o.paymentStatus} onChange={async (e) => { await api.adminSetPayment(token, o.code, e.target.value); loadAll(); }}>
                  <option value="pending">Pending</option><option value="paid">Paid</option>
                </select><br /><span className="muted">{o.paymentMethod}</span></td>
                <td><select value={o.status} onChange={async (e) => { await api.adminSetOrderStatus(token, o.code, e.target.value); loadAll(); }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select></td>
                <td>{settings.whatsapp_number && <a target="_blank" rel="noreferrer" href={`https://wa.me/${o.phone.replace(/\D/g, '')}`}>WhatsApp</a>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>)}

      {tab === 'Products' && (<div>
        <button className="btn" onClick={() => setEditProduct({ name: '', type: 'sidr', size: '500g', pricePkr: null, compareAtPkr: null, photo: '', badge: '', description: '', stock: 100, displayOrder: 99, accent: '#b5772e', blossomLabel: '', tagline: '' })}>+ Add product</button>
        {editProduct && <ProductForm p={editProduct} onSave={saveProduct} onCancel={() => setEditProduct(null)} onPhoto={uploadPhoto} />}
        <div className="grid" style={{ marginTop: 14 }}>
          {shop?.products?.map((p) => (
            <div className="card" key={p.id}>
              <div className="accent-bar" style={{ background: p.accent }} />
              {p.photo && <img src={resolvePhoto(p.photo)} alt={p.name} />}
              <div className="card-body">
                <h3>{p.name}</h3><p className="size">{p.size} • Stock {p.stock}</p>
                <div className="price-row"><span className="price">{p.pricePkr ? fmt(p.pricePkr) : 'Price coming soon'}</span></div>
                <div className="row">
                  <button className="btn ghost small" onClick={() => setEditProduct({ ...p })}>Edit</button>
                  <button className="btn ghost small" onClick={() => deleteProduct(p.id)}>Delete</button>
                  <label className="btn ghost small" style={{ textAlign: 'center' }}>Photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && uploadPhoto(p.id, e.target.files[0])} /></label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>)}

      {tab === 'Customers' && (<div className="panel">
        {customers.length === 0 ? <p className="muted">No customers yet.</p> : (
          <table><thead><tr><th>Phone</th><th>Name</th><th>Orders</th><th>Total spent</th><th>Last order</th></tr></thead>
          <tbody>{customers.map((c) => (
            <tr key={c.phone}><td>{c.phone}</td><td>{c.name}</td><td>{c.orders}</td><td>{fmt(c.total_spent)}</td><td>{c.last_order ? new Date(c.last_order).toLocaleString() : ''}</td></tr>
          ))}</tbody></table>
        )}
      </div>)}

      {tab === 'Homepage & Slider' && (<form className="panel" onSubmit={saveSettings}>
        <label>Shop name</label><input value={settings.shop_name || ''} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} />
        <label>Tagline</label><input value={settings.tagline || ''} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
        <label>Announcement bar</label><input value={settings.announcement || ''} onChange={(e) => setSettings({ ...settings, announcement: e.target.value })} />
        <label>Shop heading</label><input value={settings.shop_heading || ''} onChange={(e) => setSettings({ ...settings, shop_heading: e.target.value })} />
        <label>Story text</label><textarea rows={3} value={settings.story_text || ''} onChange={(e) => setSettings({ ...settings, story_text: e.target.value })} />
        <label>Footer text</label><input value={settings.footer_text || ''} onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })} />
        <div className="row">
          <div><label>Slider on/off</label><select value={settings.slider_enabled || 'true'} onChange={(e) => setSettings({ ...settings, slider_enabled: e.target.value })}><option value="true">On</option><option value="false">Off</option></select></div>
          <div><label>Slider speed (ms)</label><input type="number" value={settings.slider_speed_ms || '4200'} onChange={(e) => setSettings({ ...settings, slider_speed_ms: e.target.value })} /></div>
        </div>
        <label>Slide taglines (JSON, one per honey type)</label><textarea rows={4} value={settings.slide_taglines || ''} onChange={(e) => setSettings({ ...settings, slide_taglines: e.target.value })} />
        <div style={{ marginTop: 14 }}><button className="btn">Save homepage</button></div>
      </form>)}

      {tab === 'Settings & Security' && (<div>
        <form className="panel" onSubmit={saveSettings}>
          <h3>Shop settings</h3>
          <label>WhatsApp number</label><input value={settings.whatsapp_number || ''} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="03xx-xxxxxxx" />
          <div className="row">
            <div><label>EasyPaisa number</label><input value={settings.easypaisa_number || ''} onChange={(e) => setSettings({ ...settings, easypaisa_number: e.target.value })} /></div>
            <div><label>EasyPaisa title</label><input value={settings.easypaisa_title || ''} onChange={(e) => setSettings({ ...settings, easypaisa_title: e.target.value })} /></div>
          </div>
          <div className="row">
            <div><label>JazzCash number</label><input value={settings.jazzcash_number || ''} onChange={(e) => setSettings({ ...settings, jazzcash_number: e.target.value })} /></div>
            <div><label>JazzCash title</label><input value={settings.jazzcash_title || ''} onChange={(e) => setSettings({ ...settings, jazzcash_title: e.target.value })} /></div>
          </div>
          <label>Bank details</label><textarea rows={2} value={settings.bank_details || ''} onChange={(e) => setSettings({ ...settings, bank_details: e.target.value })} />
          <div className="row">
            <div><label>Delivery fee (Rs)</label><input type="number" value={settings.delivery_fee || '250'} onChange={(e) => setSettings({ ...settings, delivery_fee: e.target.value })} /></div>
            <div><label>Free delivery above (Rs)</label><input type="number" value={settings.free_above || '5000'} onChange={(e) => setSettings({ ...settings, free_above: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 14 }}><button className="btn">Save settings</button></div>
        </form>
        <form className="panel" style={{ marginTop: 16 }} onSubmit={async (e) => {
          e.preventDefault(); setErr(''); setMsg('');
          try { await api.adminSetPin({ currentPin: curPin, newPin }); setMsg('PIN changed.'); setCurPin(''); setNewPin(''); }
          catch (e2) { setErr(e2.message); }
        }}>
          <h3>Change admin PIN</h3>
          <label>Current PIN</label><input type="password" inputMode="numeric" value={curPin} onChange={(e) => setCurPin(e.target.value)} required />
          <label>New PIN (4–8 digits)</label><input inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} required />
          <div style={{ marginTop: 12 }}><button className="btn ghost">Change PIN</button></div>
        </form>
      </div>)}
    </div>
  );
}

function ProductForm({ p, onSave, onCancel }) {
  const [f, setF] = useState({ ...p, pricePkr: p.pricePkr ?? '', compareAtPkr: p.compareAtPkr ?? '' });
  return (
    <form className="panel" style={{ marginTop: 14 }} onSubmit={(e) => {
      e.preventDefault();
      onSave({ ...f, pricePkr: f.pricePkr === '' ? null : parseInt(f.pricePkr, 10), compareAtPkr: f.compareAtPkr === '' ? null : parseInt(f.compareAtPkr, 10), stock: parseInt(f.stock, 10) || 0, displayOrder: parseInt(f.displayOrder, 10) || 0 });
    }}>
      <h3>{p.id ? 'Edit product' : 'Add product'}</h3>
      <div className="row">
        <div><label>Name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></div>
        <div><label>Type</label><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['sidr', 'acacia', 'multiflora', 'sarson', 'comb'].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label>Size</label><input value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} required /></div>
      </div>
      <div className="row">
        <div><label>Price (Rs, empty = Price coming soon)</label><input type="number" value={f.pricePkr} onChange={(e) => setF({ ...f, pricePkr: e.target.value })} /></div>
        <div><label>Compare-at price (Rs)</label><input type="number" value={f.compareAtPkr} onChange={(e) => setF({ ...f, compareAtPkr: e.target.value })} /></div>
        <div><label>Stock</label><input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
      </div>
      <label>Photo URL</label><input value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })} />
      <div className="row">
        <div><label>Badge</label><input value={f.badge} onChange={(e) => setF({ ...f, badge: e.target.value })} /></div>
        <div><label>Blossom label</label><input value={f.blossomLabel} onChange={(e) => setF({ ...f, blossomLabel: e.target.value })} /></div>
        <div><label>Accent colour</label><input value={f.accent} onChange={(e) => setF({ ...f, accent: e.target.value })} /></div>
      </div>
      <label>Description</label><textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn">Save product</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
