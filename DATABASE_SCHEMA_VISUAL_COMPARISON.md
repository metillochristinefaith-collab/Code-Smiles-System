# Code Smiles Database - Visual Schema Comparison
## Before & After Transformation

---

## 🔴 CURRENT SCHEMA (Denormalized)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USERS TABLE                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ id | first_name | last_name | email | role | password | phone   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         ↓                                    ↓                          │
│    ┌─────────────────────────┐      ┌──────────────────────────┐       │
│    │  APPOINTMENTS           │      │  COMPOSITE_BOOKINGS      │       │
│    ├─────────────────────────┤      ├──────────────────────────┤       │
│    │ id                      │      │ id                       │       │
│    │ patient_id              │      │ patient_id               │       │
│    │ patient_name ❌         │      │ patient_name ❌          │       │
│    │ dentist_id              │      │ dentist_id               │       │
│    │ dentist_name ❌         │      │ dentist_name ❌          │       │
│    │ treatment (text) ❌     │      │ booking_type             │       │
│    │ appointment_date        │      │ service_count            │       │
│    │ appointment_time        │      │ total_duration_minutes   │       │
│    │ duration_minutes        │      │ overall_status           │       │
│    │ status                  │      │ created_at               │       │
│    │ confirmation_status     │      └──────────────────────────┘       │
│    │ notes                   │              ↓                          │
│    └─────────────────────────┘      ┌──────────────────────────────┐   │
│                                     │ COMPOSITE_BOOKING_APPTS      │   │
│                                     ├──────────────────────────────┤   │
│                                     │ id                           │   │
│                                     │ composite_booking_id         │   │
│                                     │ service_name (text) ❌       │   │
│                                     │ dentist_id                   │   │
│                                     │ dentist_name (text) ❌       │   │
│                                     │ appointment_date             │   │
│                                     │ appointment_time             │   │
│                                     │ appointment_end_time         │   │
│                                     │ appointment_status           │   │
│                                     │ confirmation_status          │   │
│                                     └──────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SERVICE_DENTIST_MAPPING                                         │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ id | dentist_id | service_name (text) ❌ | is_primary     │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ❌ PROBLEMS:                                                          │
│  • Patient name stored in 4 tables (users, appointments,               │
│    composite_bookings, prescriptions, billing)                         │
│  • Dentist name stored in 3 tables (users, appointments,               │
│    composite_booking_appointments)                                     │
│  • Service name stored as text (no master table)                       │
│  • Two separate booking systems (appointments vs composite_bookings)   │
│  • Inconsistent use of IDs vs text fields                              │
│  • Hard to update (change patient name = 4+ updates)                   │
│  • Hard to query (need UNION for all bookings)                         │
│  • No audit trail                                                      │
│  • No conflict detection function                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🟢 NEW SCHEMA (Normalized)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MASTER DATA TABLES                                    │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐                    │
│  │    SERVICES          │  │     DENTISTS         │                    │
│  ├──────────────────────┤  ├──────────────────────┤                    │
│  │ service_id (PK)      │  │ dentist_id (PK)      │                    │
│  │ service_name ✅      │  │ user_id (FK)         │                    │
│  │ category             │  │ specialization       │                    │
│  │ duration_minutes     │  │ license_number       │                    │
│  │ price                │  │ years_experience     │                    │
│  │ description          │  │ is_active            │                    │
│  │ is_active            │  └──────────────────────┘                    │
│  └──────────────────────┘           ↓                                  │
│           ↓                    ┌──────────────────────┐                │
│           │                    │  DENTIST_SERVICES    │                │
│           │                    ├──────────────────────┤                │
│           │                    │ dentist_id (FK)      │                │
│           │                    │ service_id (FK)      │                │
│           │                    │ is_primary           │                │
│           │                    │ is_available         │                │
│           │                    └──────────────────────┘                │
│           │                           ↑                                │
│           └───────────────────────────┘                                │
│                                                                        │
│  ┌──────────────────────┐                                             │
│  │     PATIENTS         │                                             │
│  ├──────────────────────┤                                             │
│  │ patient_id (PK)      │                                             │
│  │ user_id (FK)         │                                             │
│  │ date_of_birth        │                                             │
│  │ gender               │                                             │
│  │ blood_type           │                                             │
│  │ allergies            │                                             │
│  │ medical_conditions   │                                             │
│  │ is_active            │                                             │
│  └──────────────────────┘                                             │
│           ↓                                                            │
└───────────┼────────────────────────────────────────────────────────────┘
            │
            ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    BOOKING TABLES (UNIFIED)                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      BOOKINGS (Header)                             │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ booking_id (PK)                                              │ │ │
│  │  │ booking_number (UNIQUE) - e.g., BK-2026-05-24-0001          │ │ │
│  │  │ patient_id (FK) ✅                                           │ │ │
│  │  │ booking_type (Patient/Walk-in/Registered)                   │ │ │
│  │  │ intake_priority (Standard/Urgent/Emergency)                 │ │ │
│  │  │ intake_source (Online/Front desk/Phone/Staff)               │ │ │
│  │  │ service_count (1-3)                                          │ │ │
│  │  │ total_duration_minutes (≤120)                                │ │ │
│  │  │ booking_status (Pending/Approved/Completed/Cancelled)       │ │ │
│  │  │ patient_notes                                                │ │ │
│  │  │ staff_notes                                                  │ │ │
│  │  │ created_by (FK)                                              │ │ │
│  │  │ created_at, updated_at                                       │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│           ↓                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                  BOOKING_SERVICES (Details)                        │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ booking_service_id (PK)                                      │ │ │
│  │  │ booking_id (FK) ✅                                           │ │ │
│  │  │ service_id (FK) ✅                                           │ │ │
│  │  │ dentist_id (FK) ✅                                           │ │ │
│  │  │ service_sequence (1-3)                                       │ │ │
│  │  │ appointment_date                                             │ │ │
│  │  │ appointment_start_time                                       │ │ │
│  │  │ appointment_end_time                                         │ │ │
│  │  │ service_status (Pending/Approved/Completed/Cancelled)       │ │ │
│  │  │ confirmation_status (Not Confirmed/Confirmed/Reschedule)    │ │ │
│  │  │ reminder_24h_sent, reminder_3h_sent                          │ │ │
│  │  │ service_notes                                                │ │ │
│  │  │ created_at, updated_at                                       │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│           ↓                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                  BOOKING_AUDIT_LOG (History)                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ audit_id (PK)                                                │ │ │
│  │  │ booking_id (FK)                                              │ │ │
│  │  │ action (Created/Updated/Approved/Cancelled)                 │ │ │
│  │  │ action_by (FK)                                               │ │ │
│  │  │ action_details (JSONB) - Full change history                │ │ │
│  │  │ created_at                                                   │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    TIME_SLOTS (Availability)                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ slot_id (PK)                                                 │ │ │
│  │  │ dentist_id (FK)                                              │ │ │
│  │  │ slot_date                                                    │ │ │
│  │  │ slot_start_time                                              │ │ │
│  │  │ slot_end_time                                                │ │ │
│  │  │ is_available                                                 │ │ │
│  │  │ is_blocked (for maintenance/breaks)                          │ │ │
│  │  │ block_reason                                                 │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ✅ IMPROVEMENTS:                                                       │
│  • Single booking table (no UNION needed)                               │
│  • Each service has independent date/time/dentist/status                │
│  • Proper foreign keys (IDs, not text)                                  │
│  • Full audit trail (JSONB)                                             │
│  • Conflict detection function                                          │
│  • Helper views for common queries                                      │
│  • Scalable to future features                                          │
│  • Professional database design                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 SIDE-BY-SIDE COMPARISON

### Single-Service Booking Example

#### BEFORE (Current)
```
APPOINTMENTS table:
┌─────────────────────────────────────────────────────────────────┐
│ id: 1                                                           │
│ patient_id: 5                                                   │
│ patient_name: "John Doe" ❌ (stored here)                       │
│ dentist_id: 3                                                   │
│ dentist_name: "Dr. Smith" ❌ (stored here)                      │
│ treatment: "Dental Cleaning" ❌ (text, not ID)                  │
│ appointment_date: 2026-05-25                                    │
│ appointment_time: 09:00                                         │
│ duration_minutes: 45                                            │
│ status: Pending                                                 │
│ confirmation_status: Not Confirmed                              │
│ notes: "Patient has sensitive teeth"                            │
└─────────────────────────────────────────────────────────────────┘

To get full details, need to JOIN with:
- users (for patient name) ❌ Already have it
- users (for dentist name) ❌ Already have it
- service_dentist_mapping (for service details) ❌ Not available
```

#### AFTER (New)
```
BOOKINGS table:
┌─────────────────────────────────────────────────────────────────┐
│ booking_id: 1                                                   │
│ booking_number: BK-2026-05-24-0001                              │
│ patient_id: 5 ✅ (ID only)                                      │
│ booking_type: Patient                                           │
│ service_count: 1                                                │
│ total_duration_minutes: 45                                      │
│ booking_status: Pending                                         │
│ patient_notes: "Patient has sensitive teeth"                    │
│ created_at: 2026-05-24 14:30:00                                 │
└─────────────────────────────────────────────────────────────────┘

BOOKING_SERVICES table:
┌─────────────────────────────────────────────────────────────────┐
│ booking_service_id: 1                                           │
│ booking_id: 1                                                   │
│ service_id: 2 ✅ (ID, not text)                                 │
│ dentist_id: 3 ✅ (ID)                                           │
│ service_sequence: 1                                             │
│ appointment_date: 2026-05-25                                    │
│ appointment_start_time: 09:00                                   │
│ appointment_end_time: 09:45                                     │
│ service_status: Pending                                         │
│ confirmation_status: Not Confirmed                              │
│ created_at: 2026-05-24 14:30:00                                 │
└─────────────────────────────────────────────────────────────────┘

To get full details, JOIN with:
- patients (for patient info) ✅ Proper FK
- services (for service details) ✅ Proper FK
- dentists (for dentist info) ✅ Proper FK
- users (for names) ✅ Clean JOIN chain
```

---

### Multi-Service Booking Example

#### BEFORE (Current)
```
COMPOSITE_BOOKINGS table:
┌──────────────────────────────────────────────────────────────────┐
│ id: CB-001                                                       │
│ patient_id: 5                                                    │
│ patient_name: "John Doe" ❌ (stored here)                        │
│ dentist_id: 3                                                    │
│ dentist_name: "Dr. Smith" ❌ (stored here)                       │
│ booking_type: Patient                                            │
│ service_count: 2                                                 │
│ total_duration_minutes: 105                                      │
│ overall_status: Pending                                          │
│ created_at: 2026-05-24 14:30:00                                  │
└──────────────────────────────────────────────────────────────────┘

COMPOSITE_BOOKING_APPOINTMENTS table (2 rows):
┌──────────────────────────────────────────────────────────────────┐
│ Row 1:                                                           │
│ id: 1                                                            │
│ composite_booking_id: CB-001                                     │
│ service_name: "Dental Cleaning" ❌ (text)                        │
│ dentist_id: 3                                                    │
│ dentist_name: "Dr. Smith" ❌ (stored here too)                   │
│ appointment_date: 2026-05-25                                     │
│ appointment_time: 09:00                                          │
│ appointment_end_time: 09:45                                      │
│ appointment_status: Pending                                      │
│ confirmation_status: Not Confirmed                               │
│                                                                  │
│ Row 2:                                                           │
│ id: 2                                                            │
│ composite_booking_id: CB-001                                     │
│ service_name: "Tooth Filling" ❌ (text)                          │
│ dentist_id: 4                                                    │
│ dentist_name: "Dr. Johnson" ❌ (stored here too)                 │
│ appointment_date: 2026-05-25                                     │
│ appointment_time: 10:00                                          │
│ appointment_end_time: 11:00                                      │
│ appointment_status: Pending                                      │
│ confirmation_status: Not Confirmed                               │
└──────────────────────────────────────────────────────────────────┘

❌ PROBLEMS:
- Patient name stored in 2 tables
- Dentist name stored in 2 tables
- Service names stored as text (no master table)
- Need to query 2 tables to get all services
- Hard to check for conflicts (complex logic)
```

#### AFTER (New)
```
BOOKINGS table (1 row):
┌──────────────────────────────────────────────────────────────────┐
│ booking_id: 2                                                    │
│ booking_number: BK-2026-05-24-0002                               │
│ patient_id: 5 ✅ (ID only)                                       │
│ booking_type: Patient                                            │
│ service_count: 2                                                 │
│ total_duration_minutes: 105                                      │
│ booking_status: Pending                                          │
│ created_at: 2026-05-24 14:30:00                                  │
└──────────────────────────────────────────────────────────────────┘

BOOKING_SERVICES table (2 rows):
┌──────────────────────────────────────────────────────────────────┐
│ Row 1:                                                           │
│ booking_service_id: 1                                            │
│ booking_id: 2                                                    │
│ service_id: 2 ✅ (ID)                                            │
│ dentist_id: 3 ✅ (ID)                                            │
│ service_sequence: 1                                              │
│ appointment_date: 2026-05-25                                     │
│ appointment_start_time: 09:00                                    │
│ appointment_end_time: 09:45                                      │
│ service_status: Pending                                          │
│ confirmation_status: Not Confirmed                               │
│                                                                  │
│ Row 2:                                                           │
│ booking_service_id: 2                                            │
│ booking_id: 2                                                    │
│ service_id: 4 ✅ (ID)                                            │
│ dentist_id: 4 ✅ (ID)                                            │
│ service_sequence: 2                                              │
│ appointment_date: 2026-05-25                                     │
│ appointment_start_time: 10:00                                    │
│ appointment_end_time: 11:00                                      │
│ service_status: Pending                                          │
│ confirmation_status: Not Confirmed                               │
└──────────────────────────────────────────────────────────────────┘

✅ IMPROVEMENTS:
- Patient name stored in 1 table (patients)
- Dentist names stored in 1 table (dentists)
- Service names stored in 1 table (services)
- Single booking table (no UNION)
- Each service has independent date/time/dentist/status
- Easy to check for conflicts (simple query)
- Scalable to 3+ services
```

---

## 🔄 DATA FLOW COMPARISON

### BEFORE: Getting Patient's Bookings

```
Query 1: Get from appointments table
SELECT * FROM appointments WHERE patient_id = 5

Query 2: Get from composite_bookings table
SELECT * FROM composite_bookings WHERE patient_id = 5

Query 3: Get services for each composite booking
SELECT * FROM composite_booking_appointments WHERE composite_booking_id = 'CB-001'

❌ PROBLEM: Need 3+ queries, UNION results, manual processing
```

### AFTER: Getting Patient's Bookings

```
Query 1: Get all bookings with services
SELECT 
  b.booking_number, b.booking_status, b.service_count,
  bs.service_sequence, s.service_name, s.category,
  u_dentist.first_name || ' ' || u_dentist.last_name as dentist_name,
  bs.appointment_date, bs.appointment_start_time, bs.appointment_end_time
FROM bookings b
JOIN booking_services bs ON b.booking_id = bs.booking_id
JOIN services s ON bs.service_id = s.service_id
JOIN dentists d ON bs.dentist_id = d.dentist_id
JOIN users u_dentist ON d.user_id = u_dentist.id
WHERE b.patient_id = (SELECT patient_id FROM patients WHERE user_id = 5)
ORDER BY b.created_at DESC, bs.service_sequence

✅ BENEFIT: Single query, clean JOIN chain, all data in one result set
```

---

## 📈 NORMALIZATION IMPROVEMENTS

### Patient Name Storage

#### BEFORE
```
users table:
  id: 5, first_name: "John", last_name: "Doe"

appointments table:
  patient_name: "John Doe" ❌ (duplicate)

composite_bookings table:
  patient_name: "John Doe" ❌ (duplicate)

prescriptions table:
  patient_name: "John Doe" ❌ (duplicate)

billing table:
  patient_name: "John Doe" ❌ (duplicate)

❌ PROBLEM: Update patient name = 5 updates
```

#### AFTER
```
users table:
  id: 5, first_name: "John", last_name: "Doe"

patients table:
  patient_id: 1, user_id: 5

bookings table:
  patient_id: 1 ✅ (FK only)

booking_services table:
  (no patient name) ✅

prescriptions table:
  patient_id: 1 ✅ (FK only)

billing table:
  patient_id: 1 ✅ (FK only)

✅ BENEFIT: Update patient name = 1 update (in users table)
```

---

## 🎯 KEY DIFFERENCES SUMMARY

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| **Booking Tables** | 2 separate (appointments, composite_bookings) | 1 unified (bookings) |
| **Service Details** | Text fields (service_name) | Foreign keys (service_id) |
| **Dentist Info** | Text fields (dentist_name) | Foreign keys (dentist_id) |
| **Patient Info** | Text fields (patient_name) | Foreign keys (patient_id) |
| **Conflict Detection** | Complex manual logic | Simple SQL function |
| **Audit Trail** | Limited | Full JSONB history |
| **Query Complexity** | Multiple queries + UNION | Single JOIN query |
| **Data Duplication** | High (names in 4+ tables) | None (proper normalization) |
| **Scalability** | Limited | Excellent |
| **Future Features** | Hard to add | Easy to add |

---

## ✨ VISUAL SUMMARY

### BEFORE: Scattered & Denormalized
```
┌─────────────────────────────────────────────────────────────────┐
│  USERS                                                          │
│  ├─ Patient: John Doe                                           │
│  └─ Dentist: Dr. Smith                                          │
│                                                                 │
│  APPOINTMENTS                                                   │
│  ├─ patient_name: "John Doe" ❌                                 │
│  ├─ dentist_name: "Dr. Smith" ❌                                │
│  └─ treatment: "Cleaning" ❌                                    │
│                                                                 │
│  COMPOSITE_BOOKINGS                                             │
│  ├─ patient_name: "John Doe" ❌                                 │
│  └─ dentist_name: "Dr. Smith" ❌                                │
│                                                                 │
│  COMPOSITE_BOOKING_APPOINTMENTS                                 │
│  ├─ service_name: "Cleaning" ❌                                 │
│  └─ dentist_name: "Dr. Smith" ❌                                │
│                                                                 │
│  SERVICE_DENTIST_MAPPING                                        │
│  └─ service_name: "Cleaning" ❌                                 │
│                                                                 │
│  ❌ Same data in 5+ places!                                     │
└─────────────────────────────────────────────────────────────────┘
```

### AFTER: Organized & Normalized
```
┌─────────────────────────────────────────────────────────────────┐
│  MASTER DATA (Single Source of Truth)                           │
│  ├─ USERS: John Doe, Dr. Smith                                  │
│  ├─ PATIENTS: patient_id → user_id                              │
│  ├─ DENTISTS: dentist_id → user_id                              │
│  └─ SERVICES: Cleaning, Filling, etc.                           │
│                                                                 │
│  BOOKING SYSTEM (Unified)                                       │
│  ├─ BOOKINGS: booking_id, patient_id ✅, service_count          │
│  ├─ BOOKING_SERVICES: service_id ✅, dentist_id ✅              │
│  ├─ BOOKING_AUDIT_LOG: Full history                             │
│  └─ TIME_SLOTS: Availability tracking                           │
│                                                                 │
│  ✅ Each data point stored once!                                │
│  ✅ Proper foreign keys everywhere!                             │
│  ✅ Easy to maintain and scale!                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 READY FOR IMPLEMENTATION

This visual comparison shows why the new schema is better:
- ✅ Cleaner structure
- ✅ No data duplication
- ✅ Proper relationships
- ✅ Easier to maintain
- ✅ Better performance
- ✅ Scalable design

**Next Step**: Review with team and approve for implementation!

---

*Document Created: May 24, 2026*
*Visual Schema Comparison Ready*
