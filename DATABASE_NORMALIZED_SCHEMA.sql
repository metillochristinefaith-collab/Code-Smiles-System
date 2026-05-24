-- ═══════════════════════════════════════════════════════════════════════════════
-- CODE SMILES DENTAL BOOKING SYSTEM - NORMALIZED DATABASE SCHEMA
-- Version: 2.0 (Redesigned & Normalized)
-- Date: May 24, 2026
-- ═══════════════════════════════════════════════════════════════════════════════

-- NOTE: This schema assumes the users table already exists from init-db.js
-- This script creates the new normalized tables

-- ═══════════════════════════════════════════════════════════════════════════════
-- MASTER DATA TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. SERVICES - Master Service Catalog
-- Single source of truth for all services offered by the clinic
CREATE TABLE IF NOT EXISTS services (
  service_id SERIAL PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);

-- ─────────────────────────────────────────────────────────────────────────────

-- 2. DENTISTS - Dentist Profiles
-- Dentist-specific information separate from user accounts
CREATE TABLE IF NOT EXISTS dentists (
  dentist_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  specialization VARCHAR(255),
  license_number VARCHAR(100) UNIQUE,
  years_experience INTEGER,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_patients_per_day INTEGER DEFAULT 10,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dentists_user_id ON dentists(user_id);
CREATE INDEX idx_dentists_active ON dentists(is_active);

-- ─────────────────────────────────────────────────────────────────────────────

-- 3. PATIENTS - Patient Profiles
-- Patient-specific information separate from user accounts
CREATE TABLE IF NOT EXISTS patients (
  patient_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IN ('Male','Female','Other','Prefer not to say')),
  blood_type VARCHAR(10),
  allergies TEXT,
  medical_conditions TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  preferred_dentist_id INTEGER REFERENCES dentists(dentist_id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_active ON patients(is_active);

-- ─────────────────────────────────────────────────────────────────────────────

-- 4. DENTIST_SERVICES - Dentist-Service Mapping
-- Which dentist can perform which service
CREATE TABLE IF NOT EXISTS dentist_services (
  dentist_service_id SERIAL PRIMARY KEY,
  dentist_id INTEGER NOT NULL REFERENCES dentists(dentist_id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(dentist_id, service_id)
);

CREATE INDEX idx_dentist_services_dentist ON dentist_services(dentist_id);
CREATE INDEX idx_dentist_services_service ON dentist_services(service_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- CORE BOOKING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5. BOOKINGS - Unified Booking Header
-- Single table for all bookings (single-service or multi-service)
CREATE TABLE IF NOT EXISTS bookings (
  booking_id SERIAL PRIMARY KEY,
  booking_number VARCHAR(50) NOT NULL UNIQUE,  -- e.g., BK-2026-05-24-0001
  patient_id INTEGER NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
  booking_type VARCHAR(50) NOT NULL DEFAULT 'Patient' 
    CHECK (booking_type IN ('Patient', 'Walk-in', 'Registered')),
  intake_priority VARCHAR(50) NOT NULL DEFAULT 'Standard'
    CHECK (intake_priority IN ('Standard', 'Urgent', 'Emergency')),
  intake_source VARCHAR(50) NOT NULL DEFAULT 'Online'
    CHECK (intake_source IN ('Online', 'Front desk', 'Phone call', 'Staff referral')),
  service_count INTEGER NOT NULL CHECK (service_count BETWEEN 1 AND 3),
  total_duration_minutes INTEGER NOT NULL CHECK (total_duration_minutes <= 120),
  booking_status VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (booking_status IN ('Pending', 'Approved', 'Partially Approved', 'Completed', 'Cancelled')),
  patient_notes TEXT,
  staff_notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_patient_id ON bookings(patient_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_bookings_booking_number ON bookings(booking_number);

-- ─────────────────────────────────────────────────────────────────────────────

-- 6. BOOKING_SERVICES - Individual Services in Booking
-- Each service in a booking gets its own record with independent date/time
CREATE TABLE IF NOT EXISTS booking_services (
  booking_service_id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(service_id) ON DELETE RESTRICT,
  dentist_id INTEGER NOT NULL REFERENCES dentists(dentist_id) ON DELETE RESTRICT,
  service_sequence INTEGER NOT NULL CHECK (service_sequence BETWEEN 1 AND 3),
  appointment_date DATE NOT NULL,
  appointment_start_time TIME NOT NULL,
  appointment_end_time TIME NOT NULL,
  service_status VARCHAR(50) NOT NULL DEFAULT 'Pending'
    CHECK (service_status IN ('Pending', 'Approved', 'Completed', 'Cancelled', 'No-show')),
  confirmation_status VARCHAR(20) NOT NULL DEFAULT 'Not Confirmed'
    CHECK (confirmation_status IN ('Not Confirmed', 'Confirmed', 'Reschedule Requested')),
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_3h_sent BOOLEAN NOT NULL DEFAULT FALSE,
  service_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, service_sequence)
);

CREATE INDEX idx_booking_services_booking_id ON booking_services(booking_id);
CREATE INDEX idx_booking_services_dentist_date ON booking_services(dentist_id, appointment_date);
CREATE INDEX idx_booking_services_status ON booking_services(service_status);
CREATE INDEX idx_booking_services_service_id ON booking_services(service_id);

-- ─────────────────────────────────────────────────────────────────────────────

-- 7. BOOKING_AUDIT_LOG - Audit Trail
-- Track all changes to bookings for compliance and debugging
CREATE TABLE IF NOT EXISTS booking_audit_log (
  audit_id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  action_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_audit_booking_id ON booking_audit_log(booking_id);
CREATE INDEX idx_booking_audit_created_at ON booking_audit_log(created_at);

-- ─────────────────────────────────────────────────────────────────────────────

-- 8. TIME_SLOTS - Available Slots (Improved)
-- Track available time slots per dentist
CREATE TABLE IF NOT EXISTS time_slots (
  slot_id SERIAL PRIMARY KEY,
  dentist_id INTEGER NOT NULL REFERENCES dentists(dentist_id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_start_time TIME NOT NULL,
  slot_end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,  -- For maintenance, breaks
  block_reason VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(dentist_id, slot_date, slot_start_time)
);

CREATE INDEX idx_time_slots_dentist_date ON time_slots(dentist_id, slot_date);
CREATE INDEX idx_time_slots_available ON time_slots(is_available, is_blocked);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS VARCHAR AS $$
DECLARE
  booking_num VARCHAR;
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM bookings
  WHERE DATE(created_at) = CURRENT_DATE;
  
  booking_num := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '-' || 
                 LPAD(today_count::TEXT, 4, '0');
  
  RETURN booking_num;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────

-- Function to check for appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_dentist_id INTEGER,
  p_appointment_date DATE,
  p_appointment_start_time TIME,
  p_appointment_end_time TIME,
  p_exclude_booking_service_id INTEGER DEFAULT NULL
)
RETURNS TABLE(
  has_conflict BOOLEAN,
  conflicting_service_id INTEGER,
  conflicting_service_name VARCHAR,
  conflicting_start_time TIME,
  conflicting_end_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as has_conflict,
    bs.booking_service_id,
    s.service_name,
    bs.appointment_start_time,
    bs.appointment_end_time
  FROM booking_services bs
  JOIN services s ON bs.service_id = s.service_id
  WHERE bs.dentist_id = p_dentist_id
    AND bs.appointment_date = p_appointment_date
    AND bs.service_status IN ('Pending', 'Approved')
    AND (p_exclude_booking_service_id IS NULL OR bs.booking_service_id != p_exclude_booking_service_id)
    -- Check for overlap with 10-minute buffer
    AND (
      (p_appointment_start_time < bs.appointment_end_time + INTERVAL '10 minutes'
       AND p_appointment_end_time + INTERVAL '10 minutes' > bs.appointment_start_time)
    );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEWS FOR COMMON QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Complete Booking Details
CREATE OR REPLACE VIEW v_booking_details AS
SELECT 
  b.booking_id,
  b.booking_number,
  b.booking_type,
  b.booking_status,
  b.service_count,
  b.total_duration_minutes,
  u_patient.first_name || ' ' || u_patient.last_name as patient_name,
  u_patient.email as patient_email,
  u_patient.phone as patient_phone,
  bs.service_sequence,
  s.service_name,
  s.category,
  s.duration_minutes,
  s.price,
  u_dentist.first_name || ' ' || u_dentist.last_name as dentist_name,
  d.specialization,
  bs.appointment_date,
  bs.appointment_start_time,
  bs.appointment_end_time,
  bs.service_status,
  bs.confirmation_status,
  b.created_at,
  b.updated_at
FROM bookings b
JOIN patients p ON b.patient_id = p.patient_id
JOIN users u_patient ON p.user_id = u_patient.id
JOIN booking_services bs ON b.booking_id = bs.booking_id
JOIN services s ON bs.service_id = s.service_id
JOIN dentists d ON bs.dentist_id = d.dentist_id
JOIN users u_dentist ON d.user_id = u_dentist.id;

-- ─────────────────────────────────────────────────────────────────────────────

-- View: Dentist Schedule
CREATE OR REPLACE VIEW v_dentist_schedule AS
SELECT 
  d.dentist_id,
  u.first_name || ' ' || u.last_name as dentist_name,
  d.specialization,
  bs.appointment_date,
  bs.appointment_start_time,
  bs.appointment_end_time,
  s.service_name,
  s.category,
  u_patient.first_name || ' ' || u_patient.last_name as patient_name,
  bs.service_status,
  b.booking_number
FROM booking_services bs
JOIN bookings b ON bs.booking_id = b.booking_id
JOIN services s ON bs.service_id = s.service_id
JOIN dentists d ON bs.dentist_id = d.dentist_id
JOIN users u ON d.user_id = u.id
JOIN patients p ON b.patient_id = p.patient_id
JOIN users u_patient ON p.user_id = u_patient.id
WHERE bs.service_status IN ('Pending', 'Approved')
ORDER BY bs.appointment_date, bs.appointment_start_time;

-- ─────────────────────────────────────────────────────────────────────────────

-- View: Available Slots
CREATE OR REPLACE VIEW v_available_slots AS
SELECT 
  ts.slot_id,
  d.dentist_id,
  u.first_name || ' ' || u.last_name as dentist_name,
  d.specialization,
  ts.slot_date,
  ts.slot_start_time,
  ts.slot_end_time,
  ts.is_available,
  ts.is_blocked,
  ts.block_reason
FROM time_slots ts
JOIN dentists d ON ts.dentist_id = d.dentist_id
JOIN users u ON d.user_id = u.id
WHERE ts.is_available = TRUE
  AND ts.is_blocked = FALSE
ORDER BY ts.slot_date, ts.slot_start_time;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA INSERTION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert sample services
INSERT INTO services (service_name, category, duration_minutes, price, description)
VALUES 
  ('Oral Consultation', 'General Dentistry', 15, 50.00, 'Initial consultation with dentist'),
  ('Dental Cleaning', 'General Dentistry', 45, 100.00, 'Professional teeth cleaning'),
  ('Digital X-Rays', 'General Dentistry', 20, 75.00, 'Digital radiography'),
  ('Tooth Fillings', 'General Dentistry', 60, 150.00, 'Cavity filling procedure'),
  ('Teeth Whitening', 'Cosmetic Arts', 60, 200.00, 'Professional teeth whitening'),
  ('Dental Veneers', 'Cosmetic Arts', 90, 500.00, 'Cosmetic veneer placement'),
  ('Traditional Braces', 'Orthodontics', 90, 300.00, 'Braces installation'),
  ('Clear Aligners', 'Orthodontics', 45, 250.00, 'Clear aligner consultation'),
  ('Surgical Tooth Extraction', 'Oral Surgery', 60, 400.00, 'Surgical extraction procedure'),
  ('Wisdom Tooth Removal', 'Oral Surgery', 90, 500.00, 'Wisdom tooth extraction'),
  ('Single Tooth Implant', 'Dental Implants', 90, 800.00, 'Implant placement'),
  ('Pediatric Check-up', 'Pediatric Care', 20, 60.00, 'Children dental check-up')
ON CONFLICT (service_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION QUERIES (For existing data)
-- ═══════════════════════════════════════════════════════════════════════════════

-- NOTE: These queries should be run AFTER the new tables are created
-- They migrate data from the old schema to the new schema

-- Migrate dentists from users table
-- INSERT INTO dentists (user_id, specialization, is_active)
-- SELECT id, 'General Dentistry', TRUE
-- FROM users WHERE role = 'Admin'
-- ON CONFLICT (user_id) DO NOTHING;

-- Migrate patients from users table
-- INSERT INTO patients (user_id, is_active)
-- SELECT id, TRUE
-- FROM users WHERE role = 'Patient'
-- ON CONFLICT (user_id) DO NOTHING;

-- Migrate dentist services from service_dentist_mapping
-- INSERT INTO dentist_services (dentist_id, service_id, is_primary, is_available)
-- SELECT d.dentist_id, s.service_id, sdm.is_primary, sdm.is_active
-- FROM service_dentist_mapping sdm
-- JOIN dentists d ON sdm.dentist_id = d.dentist_id
-- JOIN services s ON LOWER(sdm.service_name) = LOWER(s.service_name)
-- ON CONFLICT (dentist_id, service_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
