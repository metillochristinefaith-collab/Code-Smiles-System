# Code Smiles - Database Redesign & Normalization
## Professional, Scalable, and Normalized Schema

---

## 📊 CURRENT STATE ANALYSIS

### Current Issues
1. **Denormalization**: Text fields repeated across tables
   - `patient_name` stored in `appointments`, `composite_bookings`, `prescriptions`, `billing`
   - `dentist_name` stored in `appointments`, `composite_booking_appointments`, `prescriptions`
   - `service_name` stored in `composite_booking_appointments` (no master table)

2. **Missing Master Tables**
   - No `services` table (only `service_dentist_mapping`)
   - No `dentists` table (only `users` with role='Admin')
   - No `patients` table (only `users` with role='Patient')

3. **Architectural Issues**
   - Two separate booking tables: `appointments` and `composite_bookings`
   - Inconsistent foreign key usage (some use IDs, some use names)
   - Service information scattered across multiple tables

4. **Scalability Problems**
   - Updating a patient name requires changes in 4+ tables
   - Updating a service name requires changes in multiple tables
   - No single source of truth for services

---

## ✅ RECOMMENDED REDESIGN

### Architecture Decision: Unified Booking System

**Recommendation**: Merge `appointments` and `composite_bookings` into a unified `bookings` table with a `booking_services` junction table.

**Why**:
- ✅ Single source of truth for all bookings
- ✅ Eliminates duplicate logic
- ✅ Easier to query and maintain
- ✅ Scales better for future features (group bookings, recurring appointments)
- ✅ Cleaner data model

---

## 🗄️ NORMALIZED DATABASE SCHEMA

### Master Tables (New)

#### 1. `services` - Master Service Catalog
```sql
CREATE TABLE services (
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
```

**Purpose**: Single source of truth for all services
**Benefits**: 
- Update service info once, reflects everywhere
- Easy to add pricing and descriptions
- Track service availability

---

#### 2. `dentists` - Dentist Profiles
```sql
CREATE TABLE dentists (
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
```

**Purpose**: Dentist-specific information separate from user accounts
**Benefits**:
- Dentist profile independent of user account
- Track specialization, license, experience
- Manage availability and capacity

---

#### 3. `patients` - Patient Profiles
```sql
CREATE TABLE patients (
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
```

**Purpose**: Patient-specific information separate from user accounts
**Benefits**:
- Medical history in one place
- Track preferred dentist
- Manage patient status

---

#### 4. `dentist_services` - Dentist-Service Mapping
```sql
CREATE TABLE dentist_services (
  dentist_service_id SERIAL PRIMARY KEY,
  dentist_id INTEGER NOT NULL REFERENCES dentists(dentist_id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(dentist_id, service_id)
);
```

**Purpose**: Which dentist can perform which service
**Benefits**:
- Flexible service-dentist relationships
- Easy to add/remove services from dentist
- Track primary specialization

---

### Core Booking Tables (Redesigned)

#### 5. `bookings` - Unified Booking Header
```sql
CREATE TABLE bookings (
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
```

**Purpose**: Header for all bookings (single or multi-service)
**Benefits**:
- Single booking table for all scenarios
- Unified booking number format
- Easy to query all bookings for a patient

---

#### 6. `booking_services` - Individual Services in Booking
```sql
CREATE TABLE booking_services (
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

CREATE INDEX idx_booking_services_dentist_date ON booking_services(dentist_id, appointment_date);
CREATE INDEX idx_booking_services_status ON booking_services(service_status);
```

**Purpose**: Individual services within a booking
**Benefits**:
- Each service has independent date/time
- Each service has independent status
- Easy to check for conflicts
- Supports 1-3 services per booking

---

### Supporting Tables (Improved)

#### 7. `booking_audit_log` - Audit Trail
```sql
CREATE TABLE booking_audit_log (
  audit_id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  action_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_audit_booking_id ON booking_audit_log(booking_id);
```

**Purpose**: Track all changes to bookings
**Benefits**:
- Complete audit trail
- JSONB for flexible details
- Easy to query history

---

#### 8. `time_slots` - Available Slots (Improved)
```sql
CREATE TABLE time_slots (
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
```

**Purpose**: Track available time slots per dentist
**Benefits**:
- Per-dentist availability
- Support for blocked slots
- Easy to find available slots

---

## 📋 COMPLETE NORMALIZED SCHEMA

### Master Data Tables
```
services
├── service_id (PK)
├── service_name (UNIQUE)
├── category
├── duration_minutes
├── price
├── description
└── is_active

dentists
├── dentist_id (PK)
├── user_id (FK → users, UNIQUE)
├── specialization
├── license_number (UNIQUE)
├── years_experience
├── bio
├── is_active
└── max_patients_per_day

patients
├── patient_id (PK)
├── user_id (FK → users, UNIQUE)
├── date_of_birth
├── gender
├── blood_type
├── allergies
├── medical_conditions
├── emergency_contact_name
├── emergency_contact_phone
├── preferred_dentist_id (FK → dentists)
└── is_active

dentist_services
├── dentist_service_id (PK)
├── dentist_id (FK → dentists)
├── service_id (FK → services)
├── is_primary
└── is_available
```

### Booking Tables
```
bookings
├── booking_id (PK)
├── booking_number (UNIQUE)
├── patient_id (FK → patients)
├── booking_type
├── intake_priority
├── intake_source
├── service_count
├── total_duration_minutes
├── booking_status
├── patient_notes
├── staff_notes
├── created_by (FK → users)
├── created_at
└── updated_at

booking_services
├── booking_service_id (PK)
├── booking_id (FK → bookings)
├── service_id (FK → services)
├── dentist_id (FK → dentists)
├── service_sequence
├── appointment_date
├── appointment_start_time
├── appointment_end_time
├── service_status
├── confirmation_status
├── reminder_24h_sent
├── reminder_3h_sent
├── service_notes
├── created_at
└── updated_at

booking_audit_log
├── audit_id (PK)
├── booking_id (FK → bookings)
├── action
├── action_by (FK → users)
├── action_details (JSONB)
└── created_at

time_slots
├── slot_id (PK)
├── dentist_id (FK → dentists)
├── slot_date
├── slot_start_time
├── slot_end_time
├── is_available
├── is_blocked
├── block_reason
├── created_at
└── updated_at
```

---

## 🔄 RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USERS (Core)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ id (PK) | first_name | last_name | email | role | password  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│         ↓                                    ↓                      │
│    ┌─────────────┐                    ┌──────────────┐             │
│    │  PATIENTS   │                    │  DENTISTS    │             │
│    ├─────────────┤                    ├──────────────┤             │
│    │ patient_id  │                    │ dentist_id   │             │
│    │ user_id (FK)│                    │ user_id (FK) │             │
│    │ DOB         │                    │ specialty    │             │
│    │ allergies   │                    │ license      │             │
│    └─────────────┘                    └──────────────┘             │
│         ↓                                    ↓                      │
│         │                    ┌───────────────┴────────────────┐    │
│         │                    ↓                                ↓    │
│         │            ┌──────────────────┐          ┌─────────────┐│
│         │            │ DENTIST_SERVICES │          │  SERVICES   ││
│         │            ├──────────────────┤          ├─────────────┤│
│         │            │ dentist_id (FK)  │          │ service_id  ││
│         │            │ service_id (FK)  │          │ name        ││
│         │            │ is_primary       │          │ category    ││
│         │            └──────────────────┘          │ duration    ││
│         │                    ↑                     │ price       ││
│         │                    │                     └─────────────┘│
│         │                    └─────────────────────────────────────┤
│         │                                                          │
│         └──────────────────────┬──────────────────────────────────┘
│                                ↓
│                        ┌──────────────────┐
│                        │    BOOKINGS      │
│                        ├──────────────────┤
│                        │ booking_id (PK)  │
│                        │ patient_id (FK)  │
│                        │ booking_number   │
│                        │ booking_type     │
│                        │ service_count    │
│                        │ booking_status   │
│                        └──────────────────┘
│                                ↓
│                        ┌──────────────────────────┐
│                        │  BOOKING_SERVICES        │
│                        ├──────────────────────────┤
│                        │ booking_service_id (PK)  │
│                        │ booking_id (FK)          │
│                        │ service_id (FK)          │
│                        │ dentist_id (FK)          │
│                        │ appointment_date         │
│                        │ appointment_start_time   │
│                        │ appointment_end_time     │
│                        │ service_status           │
│                        └──────────────────────────┘
│                                ↓
│                        ┌──────────────────────┐
│                        │ BOOKING_AUDIT_LOG    │
│                        ├──────────────────────┤
│                        │ audit_id (PK)        │
│                        │ booking_id (FK)      │
│                        │ action               │
│                        │ action_by (FK)       │
│                        │ action_details (JSON)│
│                        └──────────────────────┘

TIME_SLOTS (Separate)
├── slot_id (PK)
├── dentist_id (FK → dentists)
├── slot_date
├── slot_start_time
├── slot_end_time
├── is_available
└── is_blocked
```

---

## 🔍 KEY IMPROVEMENTS

### 1. Normalization
| Issue | Before | After |
|-------|--------|-------|
| Patient name | Stored in 4 tables | Stored in `patients` table only |
| Dentist name | Stored in 3 tables | Stored in `dentists` table only |
| Service name | Stored in 2 tables | Stored in `services` table only |
| Service duration | Stored in 2 tables | Stored in `services` table only |

### 2. Foreign Keys
| Relationship | Before | After |
|--------------|--------|-------|
| Booking → Patient | `patient_id` + `patient_name` | `patient_id` only (FK) |
| Service → Dentist | Text mapping | `dentist_services` junction table |
| Booking → Service | `service_name` text | `service_id` (FK) |

### 3. Scalability
| Scenario | Before | After |
|----------|--------|-------|
| Add new service | Update 2+ tables | Add 1 row to `services` |
| Update service price | Manual updates | Single update in `services` |
| Change dentist specialty | Update `users` table | Update `dentists` table |
| Query all bookings for patient | Join 2-3 tables | Single table query |

### 4. Data Integrity
| Aspect | Before | After |
|--------|--------|-------|
| Service consistency | Possible duplicates | UNIQUE constraint |
| Dentist availability | Manual tracking | `time_slots` table |
| Booking history | Limited | Full audit log with JSONB |
| Conflict detection | Complex logic | Simple date/time query |

---

## 📝 MIGRATION STRATEGY

### Phase 1: Create New Tables (No Data Loss)
```sql
-- Create all new master tables
CREATE TABLE services (...);
CREATE TABLE dentists (...);
CREATE TABLE patients (...);
CREATE TABLE dentist_services (...);
CREATE TABLE bookings (...);
CREATE TABLE booking_services (...);
CREATE TABLE booking_audit_log (...);
CREATE TABLE time_slots (...);
```

### Phase 2: Migrate Data
```sql
-- Migrate services from service_dentist_mapping
INSERT INTO services (service_name, category, duration_minutes)
SELECT DISTINCT service_name, service_category, 45  -- Default duration
FROM service_dentist_mapping;

-- Migrate dentists from users
INSERT INTO dentists (user_id, specialization)
SELECT id, 'General Dentistry'  -- Default
FROM users WHERE role = 'Admin';

-- Migrate patients from users
INSERT INTO patients (user_id)
SELECT id FROM users WHERE role = 'Patient';

-- Migrate bookings from appointments + composite_bookings
INSERT INTO bookings (booking_number, patient_id, booking_type, ...)
SELECT ...; -- Complex migration logic

-- Migrate booking services
INSERT INTO booking_services (booking_id, service_id, dentist_id, ...)
SELECT ...; -- Complex migration logic
```

### Phase 3: Verify & Cutover
```sql
-- Verify data integrity
SELECT COUNT(*) FROM bookings;
SELECT COUNT(*) FROM booking_services;
SELECT COUNT(*) FROM services;

-- Disable old tables (don't delete yet)
ALTER TABLE appointments DISABLE TRIGGER ALL;
ALTER TABLE composite_bookings DISABLE TRIGGER ALL;
```

### Phase 4: Update Application Code
- Update API endpoints to use new schema
- Update queries to use JOINs
- Update validation logic
- Test thoroughly

### Phase 5: Archive Old Tables
```sql
-- After 30 days of successful operation
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS composite_bookings CASCADE;
DROP TABLE IF EXISTS composite_booking_appointments CASCADE;
DROP TABLE IF EXISTS service_dentist_mapping CASCADE;
```

---

## 🔐 CONFLICT DETECTION QUERY

### Check for Overlapping Appointments
```sql
-- Find conflicts for a dentist on a specific date
SELECT 
  bs1.booking_service_id,
  bs1.appointment_date,
  bs1.appointment_start_time,
  bs1.appointment_end_time,
  s1.service_name,
  bs2.booking_service_id as conflicting_service_id,
  bs2.appointment_start_time as conflicting_start,
  bs2.appointment_end_time as conflicting_end,
  s2.service_name as conflicting_service
FROM booking_services bs1
JOIN booking_services bs2 ON bs1.dentist_id = bs2.dentist_id
  AND bs1.appointment_date = bs2.appointment_date
  AND bs1.booking_service_id != bs2.booking_service_id
  AND bs1.service_status IN ('Pending', 'Approved')
  AND bs2.service_status IN ('Pending', 'Approved')
JOIN services s1 ON bs1.service_id = s1.service_id
JOIN services s2 ON bs2.service_id = s2.service_id
WHERE bs1.dentist_id = $1
  AND bs1.appointment_date = $2
  -- Check for overlap (with 10-min buffer)
  AND (
    (bs1.appointment_start_time < bs2.appointment_end_time + INTERVAL '10 minutes'
     AND bs1.appointment_end_time + INTERVAL '10 minutes' > bs2.appointment_start_time)
  );
```

---

## 📊 QUERY EXAMPLES

### Get All Bookings for a Patient (with details)
```sql
SELECT 
  b.booking_number,
  b.booking_type,
  b.booking_status,
  b.service_count,
  b.total_duration_minutes,
  bs.service_sequence,
  s.service_name,
  s.category,
  s.duration_minutes,
  d.user_id as dentist_user_id,
  u.first_name || ' ' || u.last_name as dentist_name,
  bs.appointment_date,
  bs.appointment_start_time,
  bs.appointment_end_time,
  bs.service_status
FROM bookings b
JOIN booking_services bs ON b.booking_id = bs.booking_id
JOIN services s ON bs.service_id = s.service_id
JOIN dentists d ON bs.dentist_id = d.dentist_id
JOIN users u ON d.user_id = u.id
WHERE b.patient_id = $1
ORDER BY b.created_at DESC, bs.service_sequence;
```

### Get Available Slots for a Service
```sql
SELECT 
  ts.slot_id,
  ts.slot_date,
  ts.slot_start_time,
  ts.slot_end_time,
  u.first_name || ' ' || u.last_name as dentist_name,
  s.service_name
FROM time_slots ts
JOIN dentists d ON ts.dentist_id = d.dentist_id
JOIN users u ON d.user_id = u.id
JOIN dentist_services ds ON d.dentist_id = ds.dentist_id
JOIN services s ON ds.service_id = s.service_id
WHERE s.service_id = $1
  AND ts.slot_date = $2
  AND ts.is_available = TRUE
  AND ts.is_blocked = FALSE
  AND ds.is_available = TRUE
ORDER BY ts.slot_start_time;
```

### Get Dentist Schedule for a Day
```sql
SELECT 
  bs.appointment_start_time,
  bs.appointment_end_time,
  s.service_name,
  p.user_id as patient_user_id,
  u.first_name || ' ' || u.last_name as patient_name,
  bs.service_status
FROM booking_services bs
JOIN bookings b ON bs.booking_id = b.booking_id
JOIN services s ON bs.service_id = s.service_id
JOIN patients p ON b.patient_id = p.patient_id
JOIN users u ON p.user_id = u.id
WHERE bs.dentist_id = $1
  AND bs.appointment_date = $2
  AND bs.service_status IN ('Pending', 'Approved')
ORDER BY bs.appointment_start_time;
```

---

## ✨ BENEFITS SUMMARY

### For Development
- ✅ Cleaner code (no string concatenation for names)
- ✅ Easier to maintain (single source of truth)
- ✅ Better type safety (IDs instead of strings)
- ✅ Simpler queries (proper JOINs)

### For Operations
- ✅ Faster queries (indexed foreign keys)
- ✅ Better data integrity (constraints)
- ✅ Easier to audit (audit log table)
- ✅ Simpler backups (normalized structure)

### For Scalability
- ✅ Support for future features (group bookings, recurring)
- ✅ Better performance (proper indexing)
- ✅ Easier to add new services/dentists
- ✅ Support for multi-clinic expansion

### For Business
- ✅ Better reporting (clean data)
- ✅ Easier analytics (normalized structure)
- ✅ Better compliance (audit trail)
- ✅ Professional database design

---

## 🚀 IMPLEMENTATION ROADMAP

### Week 1: Design & Planning
- [ ] Review and approve schema
- [ ] Plan migration strategy
- [ ] Prepare rollback plan

### Week 2: Create New Tables
- [ ] Create all new master tables
- [ ] Create all new booking tables
- [ ] Add indexes and constraints
- [ ] Test schema integrity

### Week 3: Data Migration
- [ ] Migrate services
- [ ] Migrate dentists
- [ ] Migrate patients
- [ ] Migrate bookings
- [ ] Verify data integrity

### Week 4: Application Updates
- [ ] Update API endpoints
- [ ] Update queries
- [ ] Update validation logic
- [ ] Update error handling

### Week 5: Testing & QA
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] User acceptance testing

### Week 6: Deployment
- [ ] Deploy to staging
- [ ] Final verification
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 📞 NEXT STEPS

1. **Review this design** with your team
2. **Approve the schema** before implementation
3. **Plan the migration** with data backup strategy
4. **Update application code** to use new schema
5. **Test thoroughly** before production deployment
6. **Monitor performance** after migration

---

**Document Created**: May 24, 2026
**Status**: Ready for Implementation
**Complexity**: Medium (requires data migration)
**Estimated Timeline**: 6 weeks
