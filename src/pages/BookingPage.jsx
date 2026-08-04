import { useState, useEffect } from 'react';
import { createBooking, formatDate, formatTime } from '../lib/bookingUtils';

/**
 * BookingPage - allows passengers to submit a taxi booking request.
 * Corresponds to the booking.html / booking.js from Part 1, rebuilt in React.
 */
export default function BookingPage() {
  const [form, setForm] = useState({
    cname: '', phone: '', unumber: '', snumber: '',
    stname: '', sbname: '', dsbname: '', date: '', time: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [serverError, setServerError] = useState('');

  // Pre-fill date/time with current values
  useEffect(() => {
    const now = new Date();
    setForm(f => ({ ...f, date: formatDate(now), time: formatTime(now) }));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.cname.trim()) errs.cname = 'Customer name is required.';
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^\d{10,12}$/.test(form.phone.trim()))
      errs.phone = 'Phone must be 10–12 digits, numbers only.';
    if (!form.snumber.trim()) errs.snumber = 'Street number is required.';
    if (!form.stname.trim()) errs.stname = 'Street name is required.';
    if (!form.date.trim()) errs.date = 'Pick-up date is required.';
    if (!form.time.trim()) errs.time = 'Pick-up time is required.';

    if (form.date && form.time) {
      const parts = form.date.split('/');
      if (parts.length !== 3) {
        errs.date = 'Date must be in DD/MM/YYYY format.';
      } else {
        const [dd, mm, yyyy] = parts;
        const pickup = new Date(`${yyyy}-${mm}-${dd}T${form.time}`);
        if (isNaN(pickup.getTime())) {
          errs.date = 'Invalid date or time.';
        } else if (pickup < new Date()) {
          errs.date = 'Pick-up date and time cannot be in the past.';
        }
      }
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setConfirmation(null);
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const result = await createBooking(form);
      setConfirmation(result);
      setForm(f => ({ ...f, cname: '', phone: '', unumber: '', snumber: '', stname: '', sbname: '', dsbname: '' }));
    } catch (err) {
      setServerError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-hero">
        <h1>Book a Cab</h1>
        <p>Fast, reliable taxi service across Auckland and surrounding areas</p>
      </div>

      <div className="card">
        <h2 className="card-title">Booking Request</h2>

        {serverError && (
          <div className="alert alert-error">
            <div className="alert-title">Booking Failed</div>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Customer Name <span className="required">*</span></label>
              <input
                className={`form-input ${errors.cname ? 'error' : ''}`}
                type="text" name="cname" value={form.cname} onChange={handleChange}
                placeholder="Full name"
              />
              {errors.cname && <span className="form-error">{errors.cname}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span className="required">*</span></label>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                type="text" name="phone" value={form.phone} onChange={handleChange}
                placeholder="10–12 digit number"
              />
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>
          </div>

          <div className="form-grid form-grid-3" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Unit Number</label>
              <input className="form-input" type="text" name="unumber" value={form.unumber} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Street Number <span className="required">*</span></label>
              <input
                className={`form-input ${errors.snumber ? 'error' : ''}`}
                type="text" name="snumber" value={form.snumber} onChange={handleChange}
              />
              {errors.snumber && <span className="form-error">{errors.snumber}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Street Name <span className="required">*</span></label>
              <input
                className={`form-input ${errors.stname ? 'error' : ''}`}
                type="text" name="stname" value={form.stname} onChange={handleChange}
              />
              {errors.stname && <span className="form-error">{errors.stname}</span>}
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Pickup Suburb</label>
              <input className="form-input" type="text" name="sbname" value={form.sbname} onChange={handleChange} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label className="form-label">Destination Suburb</label>
              <input className="form-input" type="text" name="dsbname" value={form.dsbname} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>

          <div className="form-grid form-grid-2" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Pick-up Date <span className="required">*</span></label>
              <input
                className={`form-input ${errors.date ? 'error' : ''}`}
                type="text" name="date" value={form.date} onChange={handleChange}
                placeholder="DD/MM/YYYY"
              />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Pick-up Time <span className="required">*</span></label>
              <input
                className={`form-input ${errors.time ? 'error' : ''}`}
                type="time" name="time" value={form.time} onChange={handleChange}
              />
              {errors.time && <span className="form-error">{errors.time}</span>}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '13px' }}>
              {loading ? 'Submitting...' : 'Book Cab'}
            </button>
          </div>
        </form>

        {confirmation && (
          <div className="confirmation-box" id="reference">
            <div className="conf-title">Thank you for your booking!</div>
            <div className="conf-row">
              <span className="conf-label">Booking reference number:</span>
              <span className="conf-value" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{confirmation.brn}</span>
            </div>
            <div className="conf-row">
              <span className="conf-label">Pickup time:</span>
              <span className="conf-value">{confirmation.pickup_time}</span>
            </div>
            <div className="conf-row">
              <span className="conf-label">Pickup date:</span>
              <span className="conf-value">{confirmation.pickup_date}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
