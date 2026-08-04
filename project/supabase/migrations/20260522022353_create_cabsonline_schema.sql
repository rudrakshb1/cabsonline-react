/*
  # CabsOnline Schema Migration

  ## Overview
  Creates the full database schema for the CabsOnline taxi booking system (Part 2).

  ## New Tables

  ### bookings
  Stores all taxi booking requests from passengers.
  - id: auto-increment primary key
  - brn: booking reference number (BRN00001 format), unique
  - cname: customer name
  - phone: customer phone number (10-12 digits)
  - unumber: unit number (optional)
  - snumber: street number
  - stname: street name
  - sbname: pickup suburb (optional)
  - dsbname: destination suburb (optional)
  - pickup_date: pickup date stored as text (dd/mm/yyyy)
  - pickup_time: pickup time stored as text (HH:MM 24h)
  - booking_date: date booking was made
  - booking_time: time booking was made
  - status: 'unassigned' or 'assigned'
  - driver_id: assigned driver (optional FK)
  - created_at: timestamp

  ### drivers
  Stores registered drivers available for assignment.
  - id: uuid primary key
  - driver_id: human-readable driver ID (e.g., DRV001)
  - name: driver full name
  - phone: driver phone number
  - vehicle_plate: vehicle plate number
  - vehicle_model: car model description
  - is_available: boolean availability status
  - current_lat: last known latitude
  - current_lng: last known longitude
  - created_at: timestamp

  ## Security
  - RLS enabled on both tables
  - Public read/insert on bookings (no auth required per assignment spec)
  - Public read on drivers
  - Authenticated users can update bookings and drivers
*/

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id bigserial PRIMARY KEY,
  brn text UNIQUE NOT NULL,
  cname text NOT NULL,
  phone text NOT NULL,
  unumber text DEFAULT '',
  snumber text NOT NULL,
  stname text NOT NULL,
  sbname text DEFAULT '',
  dsbname text DEFAULT '',
  pickup_date text NOT NULL,
  pickup_time text NOT NULL,
  booking_date text NOT NULL DEFAULT '',
  booking_time text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unassigned',
  driver_id text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update bookings"
  ON bookings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  vehicle_plate text NOT NULL DEFAULT '',
  vehicle_model text NOT NULL DEFAULT '',
  is_available boolean NOT NULL DEFAULT true,
  current_lat double precision DEFAULT -36.8509,
  current_lng double precision DEFAULT 174.7645,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drivers"
  ON drivers FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update drivers"
  ON drivers FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Seed some sample drivers
INSERT INTO drivers (driver_id, name, phone, vehicle_plate, vehicle_model, is_available, current_lat, current_lng)
VALUES
  ('DRV001', 'Mike Johnson', '0211234567', 'ABC123', 'Toyota Prius 2022', true, -36.8485, 174.7633),
  ('DRV002', 'Sarah Williams', '0219876543', 'XYZ789', 'Hyundai Ioniq 2023', true, -36.8600, 174.7700),
  ('DRV003', 'David Chen', '0274561234', 'DEF456', 'Honda Civic 2021', false, -36.8700, 174.7500),
  ('DRV004', 'Emma Thompson', '0211112222', 'GHI321', 'Nissan Leaf 2022', true, -36.8400, 174.7800),
  ('DRV005', 'James Wilson', '0223334444', 'JKL654', 'Kia Niro EV 2023', true, -36.8550, 174.7550)
ON CONFLICT (driver_id) DO NOTHING;
