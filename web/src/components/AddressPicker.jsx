// Address picker: free map (Leaflet + OpenStreetMap) with village/city search
// (Nominatim, free) and postal-code auto-detection.
//
// The customer searches their village or city, picks a suggestion, and the
// form fills itself: city, postal code, address, and a pin on the map. They
// can also tap the map (or drag the pin) to set their exact location — the
// address and postal code are filled back from the map (reverse geocoding).
//
// The postal code is NEVER typed by the customer and NEVER guessed from a
// city list: it only comes from the map detector (Nominatim), so it is always
// the real post office code for that exact area. Until a village is selected
// (or the map is tapped) the field stays empty and read-only. If Nominatim
// has no postcode for the selected place (e.g. Murree), a verified real
// post office code is used as a last resort (PK_CITY_POSTCODES in api.js) —
// never from merely typing a city name.
//
// Nominatim is free for light use (max 1 request/second, debounced here).
// Map tiles: OpenStreetMap, free, attribution shown on the map.
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PK_CITY_POSTCODES } from '../api';

const PAKISTAN_CENTER = [30.3753, 69.3451];
const PAKISTAN_ZOOM = 6;

// Last-resort real post office code for a city/town, used only when the map
// detector (Nominatim) returns no postcode for the selected place.
function postcodeForCity(city) {
  if (!city) return '';
  const key = city.trim().toLowerCase();
  if (PK_CITY_POSTCODES[key]) return PK_CITY_POSTCODES[key];
  const hit = Object.keys(PK_CITY_POSTCODES).find((k) => key.startsWith(k) || k.startsWith(key));
  return hit ? PK_CITY_POSTCODES[hit] : '';
}

function placeCity(a) {
  return a.city || a.town || a.village || a.municipality || a.county || a.state || '';
}

export default function AddressPicker({ value, onChange, idPrefix = 'addr' }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markerObj = useRef(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const debounceRef = useRef(null);

  const set = (patch) => onChange({ ...value, ...patch });

  // --- Leaflet map (created once, when the component mounts) ---
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(PAKISTAN_CENTER, PAKISTAN_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const pin = L.divIcon({ className: '', html: '<div class="map-pin"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });
    const marker = L.marker(value?.lat && value?.lon ? [value.lat, value.lon] : PAKISTAN_CENTER, { icon: pin, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      set({ lat: ll.lat, lon: ll.lng });
      reverseGeocode(ll.lat, ll.lng);
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      set({ lat: e.latlng.lat, lon: e.latlng.lng });
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
    mapObj.current = map;
    markerObj.current = marker;
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => { clearTimeout(t); map.remove(); mapObj.current = null; markerObj.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the pin + map when a place is chosen (lat/lon change).
  useEffect(() => {
    const map = mapObj.current, marker = markerObj.current;
    if (!map || !marker || !value?.lat || !value?.lon) return;
    marker.setLatLng([value.lat, value.lon]);
    map.setView([value.lat, value.lon], Math.max(map.getZoom(), 13));
  }, [value?.lat, value?.lon]);

  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18`);
      const data = await res.json();
      const a = data.address || {};
      const city = placeCity(a);
      set({
        city: city || value.city || '',
        postcode: a.postcode || postcodeForCity(city) || '',
        address: data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : value.address || '',
      });
    } catch { /* keep the pin where it is; the user can type the address */ }
  }

  function searchPlaces(q) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setSuggestions([]); setSearching(false); return; }
    setSearching(true); setSearchErr('');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=pk&limit=5&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSearchErr('Search did not work — please type your city and postal code below.');
        setSuggestions([]);
      } finally { setSearching(false); }
    }, 500);
  }

  function pickPlace(p) {
    const a = p.address || {};
    const city = placeCity(a);
    const postcode = a.postcode || postcodeForCity(city) || '';
    set({
      city,
      postcode,
      address: p.display_name ? p.display_name.split(',').slice(0, 3).join(', ') : '',
      lat: parseFloat(p.lat), lon: parseFloat(p.lon),
    });
    setQuery(p.display_name ? p.display_name.split(',').slice(0, 2).join(', ') : '');
    setSuggestions([]);
  }

  function onCityChange(city) {
    // Typing a city name never fills the postal code — the code only comes
    // from the map detector (search pick or map tap), so it is always the
    // real post office code for that exact area.
    set({ city });
  }

  return (
    <div className="addr-picker">
      <label>Search your village / city</label>
      <input
        value={query}
        placeholder="e.g. Lahore, or your village name"
        autoComplete="off"
        onChange={(e) => { setQuery(e.target.value); searchPlaces(e.target.value); }}
      />
      {searching && <p className="muted" style={{ fontSize: 13, margin: '4px 0' }}>Searching…</p>}
      {searchErr && <p className="err" style={{ fontSize: 13 }}>{searchErr}</p>}
      {suggestions.length > 0 && (
        <div className="addr-suggest">
          {suggestions.map((s) => (
            <button type="button" key={s.place_id} onClick={() => pickPlace(s)}>
              {s.display_name}
            </button>
          ))}
        </div>
      )}
      <div ref={mapRef} className="addr-map" aria-label="Map — tap to set your location" />
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>Tap the map (or drag the pin) to set your exact location. Map: OpenStreetMap, free.</p>
      <div className="row">
        <div>
          <label>City</label>
          <input value={value.city || ''} onChange={(e) => onCityChange(e.target.value)} placeholder="City / village" required />
        </div>
        <div>
          <label>Postal code</label>
          <input
            value={value.postcode || ''}
            readOnly
            placeholder="Select your village on the map"
            inputMode="numeric"
            title="Auto-filled from the map — select your village or tap the map"
            style={{ background: 'var(--cream2)' }}
          />
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>Postal code is filled automatically from the map — it is the real post office code for your area. Select your village above or tap the map.</p>
      <label>Full address</label>
      <input value={value.address || ''} onChange={(e) => set({ address: e.target.value })} placeholder="House / street / area" required />
    </div>
  );
}
