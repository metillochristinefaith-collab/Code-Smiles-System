-- ═══════════════════════════════════════════════════════════════════════════════
-- CODE SMILES - QUICK FIX FOR DEFENSE (May 25, 2026)
-- Add missing tables and columns needed for booking system
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. CREATE COMPOSITE_BOOKINGS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS composite_bookings (
  id                      VARCHAR(50)   PRIMARY KEY,
  patient_id              INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  patient_name            VARCHAR(200)  NOT NULL,
  email                   VARCHAR(255),
  phone                   VARCHAR(20),
  booking_type            VARCHAR(50)   NOT NULL DEFAULT 'Patient' CHECK (booking_type IN ('Patient', 'Walk-in', 'Registered')),
  intake_priority         VARCHAR(50)   NOT NULL DEFAULT 'Standard' CHECK (intake_priority IN ('Standard', 'Urgent', 'Emergency')),
  intake_source           VARCHAR(50)   NOT NULL DEFAULT 'Online' CHECK (intake_source IN ('Online', 'Front desk', 'Phone call', 'Staff referral')),
  service_count           INTEGER       NOT NULL CHECK (service_count BETWEEN 1 AND 3),
  total_duration_minutes  INTEGER       NOT NULL CHECK (total_duration_minutes <= 120),
  overall_status          VARCHAR(50)   NOT NULL DEFAULT 'Pending' CHECK (overall_status IN ('Pending', 'Approved', 'Partially Approved', 'Completed', 'Cancelled')),
  patient_notes           TEXT,
  staff_notes             TEXT,
  created_by              INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- 2. CREATE COMPOSITE_BOOKING_APPOINTMENTS TABLE (if not exists)
CREATE TABLE IF NOT EXISTS composite_booking_appointments (
  id                      SERIAL        PRIMARY KEY,
  composite_booking_id    VARCHAR(50)   NOT NULL REFERENCES composite_bookings(id) ON DELETE CASCADE,
  appointment_sequence    INTEGER       NOT NULL CHECK (appointment_sequence BETWEEN 1 AND 3),
  service_name            VARCHAR(255)  NOT NULL,
  dentist_id              INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  dentist_name            VARCHAR(200),
  appointment_date        DATE          NOT NULL,
  appointment_time        TIME          NOT NULL,
  appointment_end_time    TIME          NOT NULL,
  appointment_status      VARCHAR(50)   NOT NULL DEFAULT 'Pending' CHECK (appointment_status IN ('Pending', 'Approved', 'Completed', 'Cancelled', 'No-show')),
  confirmation_status     VARCHAR(20)   NOT NULL DEFAULT 'Not Confirmed' CHECK (confirmation_status IN ('Not Confirmed', 'Confirmed', 'Reschedule Requested')),
  reminder_24h_sent       BOOLEAN       NOT NULL DEFAULT FALSE,
  reminder_3h_sent        BOOLEAN       NOT NULL DEFAULT FALSE,
  cancellation_reason     TEXT,
  created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(composite_booking_id, appointment_sequence)
);

-- 3. CREATE SERVICE_DENTIST_MAPPING TABLE (if not exists)
CREATE TABLE IF NOT EXISTS service_dentist_mapping (
  id                  SERIAL        PRIMARY KEY,
  dentist_id          INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_name        VARCHAR(255)  NOT NULL,
  service_category    VARCHAR(100),
  is_primary          BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(dentist_id, service_name)
);

-- 4. ADD MISSING COLUMNS TO APPOINTMENTS TABLE (if not exists)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) NOT NULL DEFAULT 'Standard' CHECK (urgency IN ('Standard', 'Urgent', 'Emergency'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'Patient' CHECK (booking_type IN ('Patient', 'Walk-in', 'Registered'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS intake_source VARCHAR(50) DEFAULT 'Online' CHECK (intake_source IN ('Online', 'Front desk', 'Phone call', 'Staff referral'));

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_composite_bookings_patient_id ON composite_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_composite_bookings_created_at ON composite_bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_composite_bookings_status ON composite_bookings(overall_status);
CREATE INDEX IF NOT EXISTS idx_composite_booking_appointments_booking_id ON composite_booking_appointments(composite_booking_id);
CREATE INDEX IF NOT EXISTS idx_composite_booking_appointments_dentist_date ON composite_booking_appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_service_dentist_mapping_dentist ON service_dentist_mapping(dentist_id);
CREATE INDEX IF NOT EXISTS idx_service_dentist_mapping_service ON service_dentist_mapping(service_name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DEFAULT SERVICES (Optional - for testing)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert default services for each dentist
INSERT INTO service_dentist_mapping (dentist_id, service_name, service_category, is_primary, is_active)
SELECT u.id, 'Oral Consultation', 'General Dentistry', TRUE, TRUE
FROM users u WHERE u.role = 'Admin' AND u.email LIKE '%@codesmiles.com'
ON CONFLICT (dentist_id, service_name) DO NOTHING;

INSERT INTO service_dentist_mapping (dentist_id, service_name, service_category, is_primary, is_active)
SELECT u.id, 'Dental Cleaning', 'General Dentistry', TRUE, TRUE
FROM users u WHERE u.role = 'Admin' AND u.email LIKE '%@codesmiles.com'
ON CONFLICT (dentist_id, service_name) DO NOTHING;

INSERT INTO service_dentist_mapping (dentist_id, service_name, service_category, is_primary, is_active)
SELECT u.id, 'Digital X-Rays', 'General Dentistry', FALSE, TRUE
FROM users u WHERE u.role = 'Admin' AND u.email LIKE '%@codesmiles.com'
ON CONFLICT (dentist_id, service_name) DO NOTHING;

INSERT INTO service_dentist_mapping (dentist_id, service_name, service_category, is_primary, is_active)
SELECT u.id, 'Tooth Fillings', 'General Dentistry', FALSE, TRUE
FROM users u WHERE u.role = 'Admin' AND u.email LIKE '%@codesmiles.com'
ON CONFLICT (dentist_id, service_name) DO NOTHING;

INSERT INTO service_dentist_mapping (dentist_id, service_name, service_category, is_primary, is_active)
SELECT u.id, 'Teeth Whitening', 'Cosmetic Arts', FALSE, TRUE
FROM users u WHERE u.role = 'Admin' AND u.email LIKE '%@codesmiles.com'
ON CONFLICT (dentist_id, service_name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('composite_bookings', 'composite_booking_appointments', 'service_dentist_mapping')
ORDER BY table_name;

-- Check services available
SELECT DISTINCT service_name, service_category FROM service_dentist_mapping ORDER BY service_name;

-- Check dentists and their services
SELECT u.first_name, u.last_name, COUNT(sdm.service_name) as service_count
FROM users u
LEFT JOIN service_dentist_mapping sdm ON u.id = sdm.dentist_id
WHERE u.role = 'Admin'
GROUP BY u.id, u.first_name, u.last_name;

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF QUICK FIX SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
