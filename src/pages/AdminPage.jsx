import { useState } from 'react';
import { searchBookings, assignBooking } from '../lib/bookingUtils';
import { supabase } from '../lib/supabase';

/**
 * AdminPage - search bookings, view results table, and assign taxis.
 * Corresponds to admin.html / admin.js / admin.php from Part 1.
 */
export default function AdminPage() {
  const [bsearch, setBsearch] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notification, setNotification] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    setSearchError('');
    setNotification('');
    const trimmed = bsearch.trim();

    if (trimmed && !/^BRN\d{5}$/.test(trimmed)) {
      setSearchError('Invalid format. Reference number must follow the format BRN00001 (e.g. BRN00001).');
      return;
    }

    setLoading(true);
    try {
      const results = await searchBookings(trimmed);
      setBookings(results);
      setHasSearched(true);
    } catch (err) {
      setSearchError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(brn) {
    // Fetch available drivers for optional assignment
    const { data: driverList } = await supabase
      .from('drivers')
      .select('driver_id, name, vehicle_model')
      .eq('is_available', true);

    const driverIds = (driverList || []).map(d => d.driver_id);
    const chosen = driverIds.length > 0
      ? prompt(`Assign driver (available: ${driverIds.join(', ')})\nLeave empty to skip driver assignment:`)
      : null;

    const driverId = chosen && driverIds.includes(chosen.trim()) ? chosen.trim() : null;

    try {
      await assignBooking(brn, driverId);
      setBookings(prev =>
        prev.map(b => b.brn === brn ? { ...b, status: 'assigned', driver_id: driverId } : b)
      );
      setNotification(`Congratulations! Booking request ${brn} has been assigned!`);

      if (driverId) {
        await supabase.from('drivers').update({ is_available: false }).eq('driver_id', driverId);
      }
    } catch (err) {
      setSearchError(err.message || 'Assignment failed.');
    }
  }

  return (
    <>
      <div className="page-hero">
        <h1>Admin Dashboard</h1>
        <p>Search booking requests and assign taxis</p>
      </div>

      {/* Search form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Search Bookings</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Reference Number</label>
            <input
              className={`form-input ${searchError ? 'error' : ''}`}
              type="text"
              name="bsearch"
              id="bsearch"
              value={bsearch}
              onChange={e => { setBsearch(e.target.value); setSearchError(''); }}
              placeholder="BRN00001 or leave empty for upcoming bookings"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            {searchError && <span className="form-error">{searchError}</span>}
          </div>
          <div style={{ paddingTop: 24 }}>
            <input
              type="button"
              name="sbutton"
              className="btn btn-primary"
              value={loading ? 'Searching...' : 'Search Bookings'}
              onClick={handleSearch}
              disabled={loading}
            />
          </div>
        </div>
        {!bsearch && (
          <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 8 }}>
            Leave empty to show unassigned bookings with pickup within the next 2 hours.
          </p>
        )}
      </div>

      {/* Results */}
      <div className="content">
        {notification && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <div className="alert-title">{notification}</div>
          </div>
        )}

        {hasSearched && (
          <>
            {bookings.length === 0 ? (
              <div className="alert alert-info">No bookings found.</div>
            ) : (
              <div className="card">
                <h2 className="card-title">Results ({bookings.length})</h2>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Booking Reference Number</th>
                        <th>Customer Name</th>
                        <th>Phone</th>
                        <th>Pickup Suburb</th>
                        <th>Destination Suburb</th>
                        <th>Pickup Date and Time</th>
                        <th>Status</th>
                        <th>Assign</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.brn}>
                          <td style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{b.brn}</td>
                          <td>{b.cname}</td>
                          <td>{b.phone}</td>
                          <td>{b.sbname || '—'}</td>
                          <td>{b.dsbname || '—'}</td>
                          <td>{b.pickup_date} {b.pickup_time}</td>
                          <td id={`status-${b.brn}`}>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                          </td>
                          <td id={`btn-${b.brn}`}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleAssign(b.brn)}
                              disabled={b.status === 'assigned'}
                            >
                              {b.status === 'assigned' ? 'Assigned' : 'Assign'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
