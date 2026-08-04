import { supabase } from './supabase';

/**
 * Generate the next BRN in format BRN00001.
 * Reads the max existing id from bookings to compute the next sequence.
 */
export async function generateBRN() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const nextId = (data?.id ?? 0) + 1;
  return 'BRN' + String(nextId).padStart(5, '0');
}

/**
 * Insert a new booking into Supabase.
 */
export async function createBooking(formData) {
  const brn = await generateBRN();
  const now = new Date();
  const bookingDate = formatDate(now);
  const bookingTime = formatTime(now);

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      brn,
      cname: formData.cname,
      phone: formData.phone,
      unumber: formData.unumber || '',
      snumber: formData.snumber,
      stname: formData.stname,
      sbname: formData.sbname || '',
      dsbname: formData.dsbname || '',
      pickup_date: formData.date,
      pickup_time: formData.time,
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: 'unassigned',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search bookings. If brn is provided, return that record.
 * If empty, return unassigned bookings with pickup within 2 hours.
 */
export async function searchBookings(brn) {
  if (brn) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('brn', brn.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    return data ? [data] : [];
  }

  // Return unassigned bookings with pickup within 2 hours
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'unassigned');

  if (error) throw error;

  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return (data || []).filter(b => {
    const dt = parseDDMMYYYY(b.pickup_date, b.pickup_time);
    return dt >= now && dt <= twoHoursLater;
  });
}

/**
 * Assign a booking (update status to 'assigned', optionally set driver).
 */
export async function assignBooking(brn, driverId = null) {
  const update = { status: 'assigned' };
  if (driverId) update.driver_id = driverId;

  const { error } = await supabase
    .from('bookings')
    .update(update)
    .eq('brn', brn);

  if (error) throw error;
}

/** Format Date as DD/MM/YYYY */
export function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format Date as HH:MM */
export function formatTime(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Parse DD/MM/YYYY + HH:MM into a Date */
export function parseDDMMYYYY(dateStr, timeStr) {
  if (!dateStr || !timeStr) return new Date(NaN);
  const [dd, mm, yyyy] = dateStr.split('/');
  return new Date(`${yyyy}-${mm}-${dd}T${timeStr}`);
}
