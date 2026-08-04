import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * DriversPage - querying service for drivers.
 * Shows all registered drivers, their availability, and allows
 * dispatchers to toggle availability and view driver details.
 */
export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    setLoading(true);
    const { data, error: err } = await supabase.from('drivers').select('*').order('driver_id');
    if (err) { setError(err.message); } else { setDrivers(data || []); }
    setLoading(false);
  }

  async function toggleAvailability(driver) {
    setUpdating(driver.id);
    const { error: err } = await supabase
      .from('drivers')
      .update({ is_available: !driver.is_available })
      .eq('id', driver.id);

    if (!err) {
      setDrivers(prev =>
        prev.map(d => d.id === driver.id ? { ...d, is_available: !d.is_available } : d)
      );
    }
    setUpdating(null);
  }

  const filtered = drivers.filter(d => {
    const matchFilter = filter === 'all' || (filter === 'available' ? d.is_available : !d.is_available);
    const matchSearch = !searchTerm ||
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.driver_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const available = drivers.filter(d => d.is_available).length;

  return (
    <>
      <div className="page-hero">
        <h1>Driver Directory</h1>
        <p>Query driver availability and manage dispatch assignments</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{drivers.length}</div>
          <div className="stat-label">Total Drivers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success-600)' }}>{available}</div>
          <div className="stat-label">Available Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--warning-600)' }}>{drivers.length - available}</div>
          <div className="stat-label">On Trip</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="Search by name, ID, or plate..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="tabs" style={{ marginBottom: 0, flex: 'none' }}>
            {['all', 'available', 'busy'].map(f => (
              <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchDrivers}>Refresh</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Loading drivers...</span></div>
        ) : filtered.length === 0 ? (
          <div className="alert alert-info">No drivers match your search.</div>
        ) : (
          <div className="driver-grid">
            {filtered.map(driver => (
              <div key={driver.id} className="driver-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="driver-name">{driver.name}</div>
                  <span className={`badge badge-${driver.is_available ? 'available' : 'busy'}`}>
                    {driver.is_available ? 'Available' : 'On Trip'}
                  </span>
                </div>

                <div className="driver-detail">
                  ID: <span>{driver.driver_id}</span>
                </div>
                <div className="driver-detail">
                  Phone: <span>{driver.phone}</span>
                </div>
                <div className="driver-detail">
                  Vehicle: <span>{driver.vehicle_model}</span>
                </div>
                <div className="driver-detail">
                  Plate: <span>{driver.vehicle_plate}</span>
                </div>
                <div className="driver-detail">
                  Location: <span>{driver.current_lat?.toFixed(4)}, {driver.current_lng?.toFixed(4)}</span>
                </div>

                <button
                  className={`btn btn-sm ${driver.is_available ? 'btn-outline' : 'btn-success'}`}
                  style={{ marginTop: 4 }}
                  onClick={() => toggleAvailability(driver)}
                  disabled={updating === driver.id}
                >
                  {updating === driver.id ? 'Updating...' : driver.is_available ? 'Mark as On Trip' : 'Mark as Available'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
