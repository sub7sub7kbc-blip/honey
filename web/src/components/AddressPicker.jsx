// Simple address fields — no map, no search. The customer just types their
// city and full address, so ordering is quick and easy. (The map + village
// search + auto postal code were removed on 2026-11-18 to keep the form easy.)
export default function AddressPicker({ value, onChange, idPrefix = 'addr' }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="addr-picker">
      <div className="row">
        <div>
          <label>City</label>
          <input
            value={value.city || ''}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Your city / village"
            required
          />
        </div>
      </div>
      <label>Full address</label>
      <input
        value={value.address || ''}
        onChange={(e) => set({ address: e.target.value })}
        placeholder="House / street / area"
        required
      />
    </div>
  );
}
