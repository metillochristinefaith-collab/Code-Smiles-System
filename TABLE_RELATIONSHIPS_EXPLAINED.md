# Code Smiles - Table Relationships Explained
## Understanding Single vs. Multi-Service Bookings

---

## 🎯 THE THREE MAIN TABLES

### 1. `appointments` - Single Service Bookings
**Purpose**: Stores individual service bookings (one service per booking)

```
appointments
├── id (Primary Key)
├── appointment_id (Unique ID, e.g., APT-2026-05-24-0001)
├── patient_id (FK → users.id)
├── dentist_id (FK → dentist.dentist_id)
├── treatment (Service name, e.g., "Dental Cleaning")
├── appointment_date (e.g., 2026-05-25)
├── appointment_time (e.g., 09:00)
├── duration_minutes (e.g., 45)
├── status (Pending/Approved/Completed/Cancelled)
└── created_at
```

**Example Record:**
```
id: 1
appointment_id: APT-2026-05-24-0001
patient_id: 5
dentist_id: 2
treatment: Dental Cleaning
appointment_date: 2026-05-25
appointment_time: 09:00
duration_minutes: 45
status: Approved
```

**When Used**: Patient or staff books ONE service

---

### 2. `composite_bookings` - Multi-Service Booking Headers
**Purpose**: Stores the header/summary for multi-service bookings (2-3 services)

```
composite_bookings
├── id (Primary Key)
├── booking_id (Unique ID, e.g., CB-2026-05-24-0001)
├── patient_id (FK → users.id, nullable for staff bookings)
├── patient_name (e.g., "John Doe")
├── patient_email
├── patient_phone
├── booking_type (Patient/Walk-in/Registered)
├── intake_priority (Standard/Urgent)
├── intake_source (Online/Front desk/Phone call/Staff referral)
├── service_count (1, 2, or 3)
├── total_duration_minutes (e.g., 105)
├── overall_status (Pending/Approved/Partially Approved/Completed/Cancelled)
└── created_at
```

**Example Record:**
```
id: 1
booking_id: CB-2026-05-24-0001
patient_id: 5
patient_name: John Doe
patient_email: john@example.com
patient_phone: 1234567890
booking_type: Patient
service_count: 2
total_duration_minutes: 105
overall_status: Pending
```

**When Used**: Patient or staff books 2-3 services in one booking session

---

### 3. `composite_booking_appointments` - Individual Services
**Purpose**: Stores each individual service within a multi-service booking

```
composite_booking_appointments
├── id (Primary Key)
├── composite_booking_id (FK → composite_bookings.id)
├── booking_id (FK → composite_bookings.booking_id)
├── appointment_id (Unique ID, e.g., CBA-2026-05-24-0001-01)
├── appointment_sequence (1, 2, or 3)
├── service_name (e.g., "Dental Cleaning")
├── service_category (e.g., "General Dentistry")
├── service_duration_minutes (e.g., 45)
├── appointment_date (e.g., 2026-05-25)
├── appointment_time (e.g., 09:00)
├── appointment_end_time (e.g., 09:45)
├── dentist_id (FK → dentist.dentist_id)
├── dentist_name (e.g., "Dr. Smith")
├── dentist_specialty (e.g., "General Dentistry")
├── appointment_status (Pending/Approved/Completed/Cancelled)
└── created_at
```

**Example Records (for one multi-service booking):**
```
Record 1:
id: 1
composite_booking_id: 1
booking_id: CB-2026-05-24-0001
appointment_id: CBA-2026-05-24-0001-01
appointment_sequence: 1
service_name: Dental Cleaning
appointment_date: 2026-05-25
appointment_time: 09:00
appointment_end_time: 09:45
dentist_id: 2
dentist_name: Dr. Smith

Record 2:
id: 2
composite_booking_id: 1
booking_id: CB-2026-05-24-0001
appointment_id: CBA-2026-05-24-0001-02
appointment_sequence: 2
service_name: Teeth Whitening
appointment_date: 2026-05-25
appointment_time: 10:00
appointment_end_time: 11:00
dentist_id: 3
dentist_name: Dr. Johnson
```

**When Used**: Each service in a multi-service booking gets its own record

---

## 🔗 HOW THEY RELATE

### Single Service Booking Flow
```
Patient Books 1 Service
        ↓
    appointments table
        ↓
    1 record created
        ↓
    appointment_id: APT-2026-05-24-0001
```

### Multi-Service Booking Flow
```
Patient Books 2-3 Services
        ↓
    composite_bookings table
        ↓
    1 header record created
    booking_id: CB-2026-05-24-0001
        ↓
    composite_booking_appointments table
        ↓
    2-3 individual records created
    appointment_id: CBA-2026-05-24-0001-01
    appointment_id: CBA-2026-05-24-0001-02
    (all linked via booking_id)
```

---

## 📊 VISUAL RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE SERVICE BOOKING                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  appointments                                               │
│  ├── id: 1                                                  │
│  ├── appointment_id: APT-2026-05-24-0001                   │
│  ├── patient_id: 5                                          │
│  ├── treatment: Dental Cleaning                             │
│  ├── appointment_date: 2026-05-25                           │
│  ├── appointment_time: 09:00                                │
│  └── status: Approved                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  MULTI-SERVICE BOOKING                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  composite_bookings                                         │
│  ├── id: 1                                                  │
│  ├── booking_id: CB-2026-05-24-0001                        │
│  ├── patient_id: 5                                          │
│  ├── service_count: 2                                       │
│  ├── total_duration_minutes: 105                            │
│  └── overall_status: Pending                                │
│         ↓                                                    │
│         ├─ composite_booking_appointments                   │
│         │  ├── id: 1                                        │
│         │  ├── composite_booking_id: 1                      │
│         │  ├── booking_id: CB-2026-05-24-0001              │
│         │  ├── appointment_id: CBA-2026-05-24-0001-01      │
│         │  ├── appointment_sequence: 1                      │
│         │  ├── service_name: Dental Cleaning               │
│         │  ├── appointment_date: 2026-05-25                │
│         │  ├── appointment_time: 09:00                      │
│         │  ├── dentist_id: 2                                │
│         │  └── appointment_status: Pending                  │
│         │                                                   │
│         └─ composite_booking_appointments                   │
│            ├── id: 2                                        │
│            ├── composite_booking_id: 1                      │
│            ├── booking_id: CB-2026-05-24-0001              │
│            ├── appointment_id: CBA-2026-05-24-0001-02      │
│            ├── appointment_sequence: 2                      │
│            ├── service_name: Teeth Whitening               │
│            ├── appointment_date: 2026-05-25                │
│            ├── appointment_time: 10:00                      │
│            ├── dentist_id: 3                                │
│            └── appointment_status: Pending                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 KEY LINKING FIELDS

### Single Service Booking
- **Primary ID**: `appointments.appointment_id`
- **Patient Link**: `appointments.patient_id` → `users.id`
- **Dentist Link**: `appointments.dentist_id` → `dentist.dentist_id`

### Multi-Service Booking
- **Booking Header ID**: `composite_bookings.booking_id`
- **Booking Header PK**: `composite_bookings.id`
- **Patient Link**: `composite_bookings.patient_id` → `users.id`
- **Service Link**: `composite_booking_appointments.composite_booking_id` → `composite_bookings.id`
- **Booking Link**: `composite_booking_appointments.booking_id` → `composite_bookings.booking_id`
- **Dentist Link**: `composite_booking_appointments.dentist_id` → `dentist.dentist_id`

---

## 📝 SQL QUERIES TO UNDERSTAND RELATIONSHIPS

### Query 1: Get All Single Service Bookings for a Patient
```sql
SELECT 
  a.appointment_id,
  a.treatment,
  a.appointment_date,
  a.appointment_time,
  a.duration_minutes,
  a.status
FROM appointments a
WHERE a.patient_id = 5
ORDER BY a.appointment_date DESC;
```

### Query 2: Get All Multi-Service Bookings for a Patient
```sql
SELECT 
  cb.booking_id,
  cb.service_count,
  cb.total_duration_minutes,
  cb.overall_status,
  cb.created_at
FROM composite_bookings cb
WHERE cb.patient_id = 5
ORDER BY cb.created_at DESC;
```

### Query 3: Get All Services in a Multi-Service Booking
```sql
SELECT 
  cba.appointment_sequence,
  cba.service_name,
  cba.appointment_date,
  cba.appointment_time,
  cba.appointment_end_time,
  cba.dentist_name,
  cba.appointment_status
FROM composite_booking_appointments cba
WHERE cba.booking_id = 'CB-2026-05-24-0001'
ORDER BY cba.appointment_sequence;
```

### Query 4: Get Booking Summary (Header + Services)
```sql
SELECT 
  cb.booking_id,
  cb.patient_name,
  cb.service_count,
  cb.total_duration_minutes,
  cb.overall_status,
  COUNT(cba.id) as appointment_count,
  STRING_AGG(cba.service_name, ', ') as services
FROM composite_bookings cb
LEFT JOIN composite_booking_appointments cba ON cb.id = cba.composite_booking_id
WHERE cb.booking_id = 'CB-2026-05-24-0001'
GROUP BY cb.id;
```

### Query 5: Check for Double-Booking Conflicts
```sql
-- Check if dentist has overlapping appointments
SELECT 
  'composite' as source,
  cba.appointment_id,
  cba.service_name,
  cba.appointment_date,
  cba.appointment_time,
  cba.appointment_end_time,
  cba.dentist_id
FROM composite_booking_appointments cba
WHERE cba.dentist_id = 2 
  AND cba.appointment_date = '2026-05-25'
  AND cba.appointment_status IN ('Pending', 'Approved')

UNION ALL

SELECT 
  'single' as source,
  a.appointment_id,
  a.treatment,
  a.appointment_date,
  a.appointment_time,
  CONCAT(LPAD(FLOOR((EXTRACT(HOUR FROM a.appointment_time::time) * 60 + EXTRACT(MINUTE FROM a.appointment_time::time) + a.duration_minutes) / 60)::int, 2, '0'), ':', LPAD(((EXTRACT(HOUR FROM a.appointment_time::time) * 60 + EXTRACT(MINUTE FROM a.appointment_time::time) + a.duration_minutes) % 60)::int, 2, '0')) as end_time,
  a.dentist_id
FROM appointments a
WHERE a.dentist_id = 2 
  AND a.appointment_date = '2026-05-25'
  AND a.status IN ('Pending', 'Approved', 'Confirmed')

ORDER BY appointment_time;
```

---

## 🎯 WHY THREE TABLES?

### Reason 1: Data Normalization
- **Single bookings** are simple: 1 service = 1 record
- **Multi-service bookings** are complex: 1 booking = multiple services
- Separate tables prevent data duplication

### Reason 2: Query Efficiency
- Can quickly find all single bookings: `SELECT * FROM appointments`
- Can quickly find all multi-service bookings: `SELECT * FROM composite_bookings`
- Can get all services in a booking: `SELECT * FROM composite_booking_appointments WHERE booking_id = ?`

### Reason 3: Validation & Constraints
- Can validate each service independently
- Can check for conflicts across both tables
- Can track status of each service separately

### Reason 4: Audit Trail
- Can see when each service was created
- Can see status changes for each service
- Can track which dentist was assigned to which service

---

## 💡 IMPORTANT NOTES

### Booking ID Format
- **Single Service**: `APT-2026-05-24-0001` (appointment ID)
- **Multi-Service Header**: `CB-2026-05-24-0001` (composite booking ID)
- **Multi-Service Service**: `CBA-2026-05-24-0001-01` (composite booking appointment ID)

### Status Fields
- **Single Booking**: `appointments.status`
- **Multi-Service Booking**: `composite_bookings.overall_status` (header) + `composite_booking_appointments.appointment_status` (each service)

### Dentist Assignment
- **Single Booking**: One dentist per booking
- **Multi-Service Booking**: Different dentist per service (if needed)

### Duration Calculation
- **Single Booking**: `duration_minutes` field
- **Multi-Service Booking**: `total_duration_minutes` = sum of all services + buffers

---

## 🔍 DEBUGGING TIPS

### To Find All Bookings for a Patient
```sql
-- Single service bookings
SELECT 'single' as type, appointment_id as id, treatment as service, appointment_date, appointment_time
FROM appointments
WHERE patient_id = 5

UNION ALL

-- Multi-service bookings
SELECT 'multi' as type, booking_id as id, STRING_AGG(service_name, ', ') as service, 
       MIN(appointment_date) as appointment_date, MIN(appointment_time) as appointment_time
FROM composite_booking_appointments
WHERE composite_booking_id IN (SELECT id FROM composite_bookings WHERE patient_id = 5)
GROUP BY booking_id;
```

### To Check Dentist Schedule
```sql
-- All appointments for a dentist on a specific date
SELECT 
  appointment_time,
  appointment_end_time,
  service_name,
  'composite' as source
FROM composite_booking_appointments
WHERE dentist_id = 2 AND appointment_date = '2026-05-25'

UNION ALL

SELECT 
  appointment_time,
  CONCAT(LPAD(FLOOR((EXTRACT(HOUR FROM appointment_time::time) * 60 + EXTRACT(MINUTE FROM appointment_time::time) + duration_minutes) / 60)::int, 2, '0'), ':', LPAD(((EXTRACT(HOUR FROM appointment_time::time) * 60 + EXTRACT(MINUTE FROM appointment_time::time) + duration_minutes) % 60)::int, 2, '0')) as end_time,
  treatment,
  'single' as source
FROM appointments
WHERE dentist_id = 2 AND appointment_date = '2026-05-25'

ORDER BY appointment_time;
```

---

## ✨ SUMMARY

| Aspect | Single Service | Multi-Service |
|--------|---|---|
| **Table** | `appointments` | `composite_bookings` + `composite_booking_appointments` |
| **Records** | 1 record | 1 header + 2-3 service records |
| **Booking ID** | `APT-...` | `CB-...` (header) + `CBA-...-01/02/03` (services) |
| **Services** | 1 | 2-3 |
| **Duration** | Single value | Sum of all services |
| **Dentist** | 1 per booking | Can be different per service |
| **Status** | Single status | Header status + individual service status |

---

**Last Updated**: May 24, 2026
**System**: Code Smiles Dental Booking
**Defense Date**: May 25, 2026
