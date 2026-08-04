import { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * PaymentPage - simulated payment processing UI for cab bookings.
 * Allows passengers to look up their booking and submit a mock payment.
 * No real card processing occurs; this demonstrates the UI flow.
 */

const FARE_PER_KM = 3.5;
const BASE_FARE = 5.0;

// Approximate distance between Auckland suburbs in km
function estimateFare(from, to) {
  if (!from || !to) return null;
  const hash = (from + to).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const km = 3 + (hash % 25);
  return { km, fare: (BASE_FARE + km * FARE_PER_KM).toFixed(2) };
}

function CardDisplay({ number, name, expiry }) {
  const formatted = number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() || '**** **** **** ****';
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
      borderRadius: 16, padding: '28px 28px 20px', color: '#fff',
      fontFamily: 'monospace', marginBottom: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,.15)' }} />
      <div style={{ position: 'absolute', top: 10, right: 30, width: 70, height: 70, borderRadius: '50%', background: 'rgba(59,130,246,.10)' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', letterSpacing: 2 }}>CABSONLINE PAYMENT</div>
      <div style={{ fontSize: '1.4rem', letterSpacing: 3, margin: '20px 0 10px' }}>{formatted}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
        <span>{name || 'CARD HOLDER'}</span>
        <span>{expiry || 'MM/YY'}</span>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const [brnInput, setBrnInput] = useState('');
  const [booking, setBooking] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [cardErrors, setCardErrors] = useState({});
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState(null);

  async function lookupBooking() {
    setLookupError('');
    setBooking(null);
    setPayResult(null);
    const trimmed = brnInput.trim().toUpperCase();
    if (!trimmed) { setLookupError('Please enter a booking reference number.'); return; }
    if (!/^BRN\d{5}$/.test(trimmed)) { setLookupError('Invalid format. Use BRN00001.'); return; }

    setLookupLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').eq('brn', trimmed).maybeSingle();
    setLookupLoading(false);

    if (error) { setLookupError(error.message); return; }
    if (!data) { setLookupError(`No booking found for ${trimmed}.`); return; }
    setBooking(data);
  }

  function handleCardChange(e) {
    let { name, value } = e.target;
    if (name === 'number') value = value.replace(/\D/g, '').slice(0, 16);
    if (name === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (name === 'cvv') value = value.replace(/\D/g, '').slice(0, 4);
    setCard(c => ({ ...c, [name]: value }));
    if (cardErrors[name]) setCardErrors(prev => ({ ...prev, [name]: '' }));
  }

  function validateCard() {
    const errs = {};
    if (card.number.replace(/\s/g, '').length < 16) errs.number = 'Enter a valid 16-digit card number.';
    if (!card.name.trim()) errs.name = 'Card holder name is required.';
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) errs.expiry = 'Use MM/YY format.';
    if (card.cvv.length < 3) errs.cvv = 'CVV must be 3–4 digits.';
    return errs;
  }

  async function handlePay(e) {
    e.preventDefault();
    const errs = validateCard();
    if (Object.keys(errs).length > 0) { setCardErrors(errs); return; }

    setPayLoading(true);
    // Simulate a 1.5s processing delay
    await new Promise(r => setTimeout(r, 1500));
    setPayLoading(false);

    const fare = estimateFare(booking.sbname, booking.dsbname);
    setPayResult({ success: true, amount: fare?.fare || '25.00', brn: booking.brn });
  }

  const fare = booking ? estimateFare(booking.sbname, booking.dsbname) : null;

  return (
    <>
      <div className="page-hero">
        <h1>Payment</h1>
        <p>Secure payment processing for your CabsOnline booking</p>
      </div>

      {/* Lookup */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Find Your Booking</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
            <label className="form-label">Booking Reference Number</label>
            <input
              className={`form-input ${lookupError ? 'error' : ''}`}
              type="text"
              value={brnInput}
              onChange={e => { setBrnInput(e.target.value); setLookupError(''); }}
              placeholder="BRN00001"
              onKeyDown={e => e.key === 'Enter' && lookupBooking()}
            />
            {lookupError && <span className="form-error">{lookupError}</span>}
          </div>
          <div style={{ paddingTop: 24 }}>
            <button className="btn btn-primary" onClick={lookupBooking} disabled={lookupLoading}>
              {lookupLoading ? 'Looking up...' : 'Find Booking'}
            </button>
          </div>
        </div>
      </div>

      {booking && !payResult && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Booking summary */}
          <div className="card">
            <h2 className="card-title">Booking Summary</h2>
            {[
              ['Reference', booking.brn],
              ['Customer', booking.cname],
              ['From', booking.sbname || 'Not specified'],
              ['To', booking.dsbname || 'Not specified'],
              ['Date & Time', `${booking.pickup_date} ${booking.pickup_time}`],
              ['Status', booking.status],
            ].map(([label, val]) => (
              <div className="conf-row" key={label} style={{ marginBottom: 8 }}>
                <span className="conf-label" style={{ minWidth: 110, fontSize: 13 }}>{label}:</span>
                <span className="conf-value" style={{ fontSize: 13 }}>{val}</span>
              </div>
            ))}
            {fare && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--primary-50)', borderRadius: 8, border: '1px solid var(--primary-200)' }}>
                <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4 }}>Estimated Fare</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-700)' }}>NZD ${fare.fare}</div>
                <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 2 }}>~{fare.km} km at $3.50/km + $5.00 base</div>
              </div>
            )}
          </div>

          {/* Payment form */}
          <div className="card">
            <h2 className="card-title">Card Details</h2>
            <CardDisplay number={card.number} name={card.name} expiry={card.expiry} />
            <form onSubmit={handlePay} noValidate>
              <div className="form-grid" style={{ gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Card Number <span className="required">*</span></label>
                  <input
                    className={`form-input ${cardErrors.number ? 'error' : ''}`}
                    name="number" value={card.number} onChange={handleCardChange}
                    placeholder="1234 5678 9012 3456" maxLength={16}
                  />
                  {cardErrors.number && <span className="form-error">{cardErrors.number}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Card Holder Name <span className="required">*</span></label>
                  <input
                    className={`form-input ${cardErrors.name ? 'error' : ''}`}
                    name="name" value={card.name} onChange={handleCardChange}
                    placeholder="Name on card"
                  />
                  {cardErrors.name && <span className="form-error">{cardErrors.name}</span>}
                </div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Expiry <span className="required">*</span></label>
                    <input
                      className={`form-input ${cardErrors.expiry ? 'error' : ''}`}
                      name="expiry" value={card.expiry} onChange={handleCardChange}
                      placeholder="MM/YY"
                    />
                    {cardErrors.expiry && <span className="form-error">{cardErrors.expiry}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV <span className="required">*</span></label>
                    <input
                      className={`form-input ${cardErrors.cvv ? 'error' : ''}`}
                      name="cvv" type="password" value={card.cvv} onChange={handleCardChange}
                      placeholder="•••" maxLength={4}
                    />
                    {cardErrors.cvv && <span className="form-error">{cardErrors.cvv}</span>}
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '13px', marginTop: 4 }}
                  disabled={payLoading}
                >
                  {payLoading ? 'Processing Payment...' : `Pay NZD $${fare?.fare || '—'}`}
                </button>
                <p style={{ fontSize: 11, color: 'var(--neutral-400)', textAlign: 'center' }}>
                  This is a simulated payment — no real charges are made.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {payResult?.success && (
        <div className="confirmation-box">
          <div className="conf-title">Payment Successful!</div>
          <div className="conf-row">
            <span className="conf-label">Booking Reference:</span>
            <span className="conf-value" style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{payResult.brn}</span>
          </div>
          <div className="conf-row">
            <span className="conf-label">Amount Paid:</span>
            <span className="conf-value">NZD ${payResult.amount}</span>
          </div>
          <div className="conf-row">
            <span className="conf-label">Payment Method:</span>
            <span className="conf-value">Credit Card ending in {card.number.slice(-4)}</span>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-outline btn-sm" onClick={() => { setBooking(null); setBrnInput(''); setCard({ number:'',name:'',expiry:'',cvv:'' }); setPayResult(null); }}>
              Pay Another Booking
            </button>
          </div>
        </div>
      )}
    </>
  );
}
