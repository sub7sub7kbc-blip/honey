import { useEffect, useState } from 'react';
import { api, fmt } from '../api';

export function AuthModal({ onClose, onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const data = mode === 'login'
        ? await api.login({ phone, password })
        : await api.signup({ name, phone, password, city, address });
      localStorage.setItem('goldenhive-token', data.token);
      onLoggedIn(data.customer);
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{mode === 'login' ? 'Login' : 'Sign up'}</h2>
        <p className="muted">{mode === 'login' ? 'Login with your mobile number and password.' : 'Create your account — name, mobile number, password and address.'}</p>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          {mode === 'signup' && (<><label>Full name</label><input value={name} onChange={(e) => setName(e.target.value)} required /></>)}
          <label>Mobile number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {mode === 'signup' && (<>
            <div className="row">
              <div><label>City (optional)</label><input value={city} onChange={(e) => setCity(e.target.value)} /></div>
              <div><label>Address (optional)</label><input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </div>
          </>)}
          <div style={{ marginTop: 16 }}><button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}</button></div>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          {mode === 'login' ? <>No account yet? <a href="#" onClick={(e) => { e.preventDefault(); setMode('signup'); }}>Sign up</a></> : <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); }}>Login</a></>}
        </p>
        <p className="muted">Guest checkout also works — no login needed to order.</p>
        <button className="btn ghost small" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function MyAccount({ customer, token, onLogout, onProfile }) {
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState(customer.name);
  const [city, setCity] = useState(customer.city || '');
  const [address, setAddress] = useState(customer.address || '');
  const [cur, setCur] = useState('');
  const [npw, setNpw] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.myOrders(token).then((d) => setOrders(d.orders)).catch(() => {}); }, [token]);

  async function saveProfile(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { const d = await api.updateProfile(token, { name, city, address }); onProfile(d.customer); setMsg('Profile updated.'); }
    catch (e2) { setErr(e2.message); }
  }
  async function changePw(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api.changePassword(token, { currentPassword: cur, newPassword: npw }); setMsg('Password changed.'); setCur(''); setNpw(''); }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <div>
      <h2>My Account — {customer.name}</h2>
      <p className="muted">{customer.phone}</p>
      {err && <div className="err">{err}</div>}
      {msg && <div className="ok-msg">{msg}</div>}
      <h3>My Orders</h3>
      {orders.length === 0 ? <p className="muted">No orders yet.</p> : (
        <table><thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
        <tbody>{orders.map((o) => (
          <tr key={o.id}><td>{o.code}</td><td>{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</td>
          <td>{fmt(o.totalPkr)}</td><td>{o.status}</td><td>{o.paymentMethod} / {o.paymentStatus}</td></tr>
        ))}</tbody></table>
      )}
      <div className="builder" style={{ marginTop: 20 }}>
        <form className="panel" onSubmit={saveProfile}>
          <h3>My Profile</h3>
          <label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} />
          <label>City</label><input value={city} onChange={(e) => setCity(e.target.value)} />
          <label>Address</label><input value={address} onChange={(e) => setAddress(e.target.value)} />
          <div style={{ marginTop: 12 }}><button className="btn small">Save profile</button></div>
        </form>
        <form className="panel" onSubmit={changePw}>
          <h3>Change password</h3>
          <label>Current password</label><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <label>New password</label><input type="password" value={npw} onChange={(e) => setNpw(e.target.value)} />
          <div style={{ marginTop: 12 }}><button className="btn small">Change password</button></div>
        </form>
      </div>
      <div style={{ marginTop: 16 }}><button className="btn ghost" onClick={onLogout}>Logout</button></div>
    </div>
  );
}
