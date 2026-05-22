-- ═══════════════════════════════════════════════════════════════════════════════
-- COMPOSITE BOOKING SYSTEM - DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════════
-- This schema extends the existing booking system to support:
-- 1. Multiple services in a single booking session
-- 2. Separate appointment scheduling for each service
-- 3. Independent dentist assignment per service
-- 4. Unified booking ID with individual appointment IDs
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMPOSITE BOOKINGS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Main booking record that groups multiple service appointments together
-- One composite booking = one patient session = multiple appointments

CREATE TABLE IF NOT EXISTS composite_bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CB-2026-05-22-001"
  patient_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name VARCHAR(255) NOT NULL,
  patient_email VARCHAR(255) NOT NULL,
  patient_phone VARCHAR(20),
  
  -- Booking metadata
  booking_type VARCHAR(50) NOT NULL,  -- 'Patient' or 'Walk-in' or 'Registered'
  intake_priority VARCHAR(50) DEFAULT 'Standard',  -- 'Standard' or 'Urgent'
  intake_source VARCHAR(100),  -- 'Front desk', 'Phone call', 'Staff referral', 'Online'
  
  -- Service count and total duration
  service_count INT NOT NULL DEFAULT 1,  -- Number of services (1-3)
  total_duration_minutes INT NOT NULL,  -- Sum of all service durations + buffers
  
  -- Status tracking
  overall_status VARCHAR(50) DEFAULT 'Pending',  -- 'Pending', 'Approved', 'Partially Approved', 'Completed', 'Cancelled'
  approval_status JSONB DEFAULT '{}',  -- Track approval status per appointment
  
  -- Notes and metadata
  patient_notes TEXT,
  staff_notes TEXT,
  reschedule_reason TEXT,
  is_reschedule BOOLEAN DEFAULT FALSE,
  original_booking_id VARCHAR(50),  -- Reference to original booking if this is a reschedule
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INT REFERENCES users(id),  -- Staff member who created booking
  
  CONSTRAINT valid_service_count CHECK (service_count >= 1 AND service_count <= 3)
);

CREATE INDEX idx_composite_bookings_patient_id ON composite_bookings(patient_id);
CREATE INDEX idx_composite_bookings_booking_id ON composite_bookings(booking_id);
CREATE INDEX idx_composite_bookings_status ON composite_bookings(overall_status);
CREATE INDEX idx_composite_bookings_created_at ON composite_bookings(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COMPOSITE BOOKING APPOINTMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Individual appointments within a composite booking
-- Each service gets its own appointment with independent dentist and time slot

CREATE TABLE IF NOT EXISTS composite_booking_appointments (
  id SERIAL PRIMARY KEY,
  appointment_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CBA-2026-05-22-001-01"
  composite_booking_id INT NOT NULL REFERENCES composite_bookings(id) ON DELETE CASCADE,
  
  -- Service information
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(100) NOT NULL,
  service_duration_minutes INT NOT NULL,
  
  -- Dentist assignment (independent per service)
  dentist_id INT NOT NULL REFERENCES dentist(id),
  dentist_name VARCHAR(255) NOT NULL,
  dentist_specialty VARCHAR(100),
  
  -- Appointment scheduling (independent per service)
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_end_time TIME NOT NULL,
  
  -- Status tracking (independent per appointment)
  appointment_status VARCHAR(50) DEFAULT 'Pending',  -- 'Pending', 'Approved', 'Completed', 'Cancelled', 'No-show'
  confirmation_status VARCHAR(50) DEFAULT 'Not Confirmed',  -- 'Not Confirmed', 'Confirmed', 'Reschedule Requested'
  
  -- Reminders
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_3h_sent BOOLEAN DEFAULT FALSE,
  
  -- Appointment-specific notes
  appointment_notes TEXT,
  
  -- Sequence information
  appointment_sequence INT NOT NULL,  -- 1, 2, or 3 (order within composite booking)
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_appointment_sequence CHECK (appointment_sequence >= 1 AND appointment_sequence <= 3)
);

CREATE INDEX idx_composite_booking_appointments_composite_id ON composite_booking_appointments(composite_booking_id);
CREATE INDEX idx_composite_booking_appointments_appointment_id ON composite_booking_appointments(appointment_id);
CREATE INDEX idx_composite_booking_appointments_dentist_id ON composite_booking_appointments(dentist_id);
CREATE INDEX idx_composite_booking_appointments_date ON composite_booking_appointments(appointment_date);
CREATE INDEX idx_composite_booking_appointments_status ON composite_booking_appointments(appointment_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMPOSITE BOOKING AUDIT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Track all changes to composite bookings for audit trail

CREATE TABLE IF NOT EXISTS composite_booking_audit_log (
  id SERIAL PRIMARY KEY,
  composite_booking_id INT NOT NULL REFERENCES composite_bookings(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,  -- 'Created', 'Approved', 'Cancelled', 'Rescheduled', etc.
  action_by INT REFERENCES users(id),
  action_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_composite_booking_audit_log_booking_id ON composite_booking_audit_log(composite_booking_id);
CREATE INDEX idx_composite_booking_audit_log_created_at ON composite_booking_audit_log(created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DENTIST AVAILABILITY CACHE TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Cache dentist availability for faster lookups during multi-service booking

CREATE TABLE IF NOT EXISTS dentist_availability_cache (
  id SERIAL PRIMARY KEY,
  dentist_id INT NOT NULL REFERENCES dentist(id) ON DELETE CASCADE,
  availability_date DATE NOT NULL,
  available_slots JSONB NOT NULL,  -- Array of available time slots
  last_updated TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(dentist_id, availability_date)
);

CREATE INDEX idx_dentist_availability_cache_dentist_date ON dentist_availability_cache(dentist_id, availability_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SERVICE-DENTIST MAPPING TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Explicit mapping of services to dentists (for easier management)

CREATE TABLE IF NOT EXISTS service_dentist_mapping (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(100) NOT NULL,
  dentist_id INT NOT NULL REFERENCES dentist(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT TRUE,  -- Primary dentist for this service
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(service_name, dentist_id)
);

CREATE INDEX idx_service_dentist_mapping_service ON service_dentist_mapping(service_name);
CREATE INDEX idx_service_dentist_mapping_dentist ON service_dentist_mapping(dentist_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COMPOSITE BOOKING CONFLICT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Track scheduling conflicts and resolution attempts

CREATE TABLE IF NOT EXISTS composite_booking_conflicts (
  id SERIAL PRIMARY KEY,
  composite_booking_id INT REFERENCES composite_bookings(id) ON DELETE CASCADE,
  appointment_id INT REFERENCES composite_booking_appointments(id) ON DELETE CASCADE,
  conflict_type VARCHAR(100) NOT NULL,  -- 'Dentist Overlap', 'Room Conflict', 'Duration Mismatch'
  conflict_details JSONB,
  resolution_status VARCHAR(50) DEFAULT 'Unresolved',  -- 'Unresolved', 'Resolved', 'Escalated'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_composite_booking_conflicts_booking_id ON composite_booking_conflicts(composite_booking_id);
CREATE INDEX idx_composite_booking_conflicts_status ON composite_booking_conflicts(resolution_status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Link existing appointments to composite bookings (optional)
-- ═══════════════════════════════════════════════════════════════════════════════
-- For backward compatibility, existing single-service appointments can be
-- wrapped in composite bookings with service_count = 1

-- ALTER TABLE appointments ADD COLUMN composite_booking_id INT REFERENCES composite_bookings(id);
-- ALTER TABLE appointments ADD COLUMN appointment_sequence INT DEFAULT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA: Service-Dentist Mapping
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary) VALUES
-- General Dentistry → Dr. Raphoncel Eduria (D3)
('Oral Consultation', 'General Dentistry', 3, TRUE),
('Dental Cleaning', 'General Dentistry', 3, TRUE),
('Digital X-Rays', 'General Dentistry', 3, TRUE),
('Tooth Fillings', 'General Dentistry', 3, TRUE),
('Fluoride Treatment', 'General Dentistry', 3, TRUE),
('Dental Sealants', 'General Dentistry', 3, TRUE),
('Simple Tooth Extraction', 'General Dentistry', 3, TRUE),
('Emergency Dental Care', 'General Dentistry', 3, TRUE),

-- Cosmetic Arts → Dr. Derence Acojedo (D2)
('Teeth Whitening', 'Cosmetic Arts', 2, TRUE),
('Dental Veneers', 'Cosmetic Arts', 2, TRUE),
('Dental Bonding', 'Cosmetic Arts', 2, TRUE),
('Smile Makeover', 'Cosmetic Arts', 2, TRUE),
('Tooth Contouring', 'Cosmetic Arts', 2, TRUE),
('Gum Contouring', 'Cosmetic Arts', 2, TRUE),

-- Orthodontics → Dr. Christine Faith Metillo (D6)
('Traditional Braces', 'Orthodontics', 6, TRUE),
('Ceramic Braces', 'Orthodontics', 6, TRUE),
('Self-Ligating Braces', 'Orthodontics', 6, TRUE),
('Clear Aligners', 'Orthodontics', 6, TRUE),
('Retainers', 'Orthodontics', 6, TRUE),
('Orthodontic Consultation', 'Orthodontics', 6, TRUE),

-- Oral Surgery → Dr. Raphoncel Eduria (D3)
('Surgical Tooth Extraction', 'Oral Surgery', 3, TRUE),
('Wisdom Tooth Removal', 'Oral Surgery', 3, TRUE),
('Cyst Removal', 'Oral Surgery', 3, TRUE),
('Minor Oral Surgery', 'Oral Surgery', 3, TRUE),
('Frenectomy', 'Oral Surgery', 3, TRUE),

-- Dental Implants → Dr. Christine Faith Metillo (D6)
('Implant Consultation', 'Dental Implants', 6, TRUE),
('Single Tooth Implant', 'Dental Implants', 6, TRUE),
('Multiple Tooth Implant', 'Dental Implants', 6, TRUE),
('Implant Crown Placement', 'Dental Implants', 6, TRUE),
('Implant Maintenance', 'Dental Implants', 6, TRUE),

-- Pediatric Care → Dr. Nico Bongolto (D5)
('Pediatric Check-up', 'Pediatric Care', 5, TRUE),
('Pediatric Cleaning', 'Pediatric Care', 5, TRUE),
('Fluoride for Kids', 'Pediatric Care', 5, TRUE),
('Baby Tooth Extraction', 'Pediatric Care', 5, TRUE),
('Space Maintainers', 'Pediatric Care', 5, TRUE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check service-dentist mapping
-- SELECT service_name, service_category, dentist_id, is_primary FROM service_dentist_mapping ORDER BY service_category;

-- Check composite bookings
-- SELECT * FROM composite_bookings;

-- Check composite booking appointments
-- SELECT * FROM composite_booking_appointments;

-- Check conflicts
-- SELECT * FROM composite_booking_conflicts WHERE resolution_status = 'Unresolved';
