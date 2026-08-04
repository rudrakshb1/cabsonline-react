import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabase';
import { parseDDMMYYYY } from '../lib/bookingUtils';

// Fix Leaflet default icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const bookingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

// Auckland suburb coordinate lookup (approximate)
const suburbCoords = {
  'auckland cbd': [-36.8485, 174.7633],
  'city centre': [-36.8485, 174.7633],
  'northcote': [-36.8003, 174.7507],
  'takapuna': [-36.7883, 174.7718],
  'newmarket': [-36.8696, 174.7756],
  'parnell': [-36.8585, 174.7779],
  'ponsonby': [-36.8560, 174.7491],
  'devonport': [-36.8299, 174.7997],
  'henderson': [-36.8769, 174.6308],
  'manukau': [-36.9939, 174.8796],
  'albany': [-36.7273, 174.7040],
  'botany': [-36.9219, 174.9141],
  'mt eden': [-36.8826, 174.7580],
  'remuera': [-36.8805, 174.7957],
  'howick': [-36.9038, 174.9322],
};

function getSuburbCoords(suburb) {
  if (!suburb) return null;
  const key = suburb.toLowerCase().trim();
  return suburbCoords[key] || null;
}

/**
 * TrackPage - map-based interaction for monitoring bookings and driver locations.
 * Shows drivers and upcoming booking pickup points on an interactive map.
 */
export default function TrackPage() {
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brn, setBrn] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [activeTab, setActiveTab] = useState('map');

  const AUCKLAND_CENTER = [-36.8509, 174.7645];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    const [{ data: driverData }, { data: bookingData }] = await Promise.all([
      supabase.from('drivers').select('*'),
      supabase.from('bookings').select('*').eq('status', 'unassigned'),
    ]);
    setDrivers(driverData || []);

    const now = new Date();
    const upcoming = (bookingData || []).filter(b => {
      const dt = parseDDMMYYYY(b.pickup_date, b.pickup_time);
      return dt >= now;
    });
    setBookings(upcoming);
    setLoading(false);
  }

  async function trackBooking() {
    setTrackError('');
    setTrackResult(null);
    if (!brn.trim()) { setTrackError('Please enter a booking reference number.'); return; }
    if (!/^BRN\d{5}$/.test(brn.trim())) { setTrackError('Invalid format. Use BRN00001.'); return; }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('brn', brn.trim().toUpperCase())
      .maybeSingle();

    if (error) { setTrackError(error.message); return; }
    if (!data) { setTrackError(`No booking found for ${brn.trim().toUpperCase()}.`); return; }

    let driver = null;
    if (data.driver_id) {
      const { data: d } = await supabase.from('drivers').select('*').eq('driver_id', data.driver_id).maybeSingle();
      driver = d;
    }
    setTrackResult({ booking: data, driver });
  }

  return (
    <>
      <div className="page-hero">
        <h1>Live Map & Tracking</h1>
        <p>Monitor driver locations and track your booking in real time</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>Live Map</button>
        <button className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`} onClick={() => setActiveTab('track')}>Track Booking</button>
      </div>

      {activeTab === 'map' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="card-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Auckland — Live Overview</h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--neutral-500)' }}>
              <span>🟢 Drivers ({drivers.filter(d => d.is_available).length} available)</span>
              <span>🔵 Pickup points ({bookings.length})</span>
            </div>
          </div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /><span>Loading map data...</span></div>
          ) : (
            <div className="map-container">
              <MapContainer center={AUCKLAND_CENTER} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                />
                {drivers.map(d => (
                  <Marker key={d.id} position={[d.current_lat, d.current_lng]} icon={driverIcon}>
                    <Popup>
                      <strong>{d.name}</strong><br />
                      ID: {d.driver_id}<br />
                      {d.vehicle_model} ({d.vehicle_plate})<br />
                      <span style={{ color: d.is_available ? 'green' : 'orange' }}>
                        {d.is_available ? 'Available' : 'On Trip'}
                      </span>
                    </Popup>
                  </Marker>
                ))}
                {bookings.map(b => {
                  const coords = getSuburbCoords(b.sbname);
                  if (!coords) return null;
                  return (
                    <Marker key={b.brn} position={coords} icon={bookingIcon}>
                      <Popup>
                        <strong>{b.brn}</strong><br />
                        {b.cname}<br />
                        Pickup: {b.sbname || 'Unknown'}<br />
                        Destination: {b.dsbname || '—'}<br />
                        Time: {b.pickup_date} {b.pickup_time}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 10 }}>
            Map refreshes every 30 seconds. Driver positions are approximate.
          </p>
        </div>
      )}

      {activeTab === 'track' && (
        <div className="card">
          <h2 className="card-title">Track Your Booking</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Booking Reference Number</label>
              <input
                className={`form-input ${trackError ? 'error' : ''}`}
                type="text"
                value={brn}
                onChange={e => { setBrn(e.target.value); setTrackError(''); }}
                placeholder="BRN00001"
                onKeyDown={e => e.key === 'Enter' && trackBooking()}
              />
              {trackError && <span className="form-error">{trackError}</span>}
            </div>
            <div style={{ paddingTop: 24 }}>
              <button className="btn btn-primary" onClick={trackBooking}>Track</button>
            </div>
          </div>

          {trackResult && (
            <div>
              <div className={`alert alert-${trackResult.booking.status === 'assigned' ? 'success' : 'info'}`}>
                <div className="alert-title">Booking {trackResult.booking.brn}</div>
                Status: <strong>{trackResult.booking.status}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 12 }}>Booking Details</h3>
                  {[
                    ['Customer', trackResult.booking.cname],
                    ['Phone', trackResult.booking.phone],
                    ['Pickup', `${trackResult.booking.snumber} ${trackResult.booking.stname}${trackResult.booking.sbname ? ', ' + trackResult.booking.sbname : ''}`],
                    ['Destination', trackResult.booking.dsbname || '—'],
                    ['Date & Time', `${trackResult.booking.pickup_date} ${trackResult.booking.pickup_time}`],
                  ].map(([label, val]) => (
                    <div className="conf-row" key={label}>
                      <span className="conf-label" style={{ minWidth: 100, fontSize: 13 }}>{label}:</span>
                      <span className="conf-value" style={{ fontSize: 13 }}>{val}</span>
                    </div>
                  ))}
                </div>

                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 12 }}>Driver Info</h3>
                  {trackResult.driver ? (
                    <>
                      {[
                        ['Driver', trackResult.driver.name],
                        ['ID', trackResult.driver.driver_id],
                        ['Phone', trackResult.driver.phone],
                        ['Vehicle', trackResult.driver.vehicle_model],
                        ['Plate', trackResult.driver.vehicle_plate],
                      ].map(([label, val]) => (
                        <div className="conf-row" key={label}>
                          <span className="conf-label" style={{ minWidth: 80, fontSize: 13 }}>{label}:</span>
                          <span className="conf-value" style={{ fontSize: 13 }}>{val}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ color: 'var(--neutral-400)', fontSize: 13 }}>
                      {trackResult.booking.status === 'assigned'
                        ? 'Driver assigned — details not available.'
                        : 'No driver assigned yet. Your booking is in the queue.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
