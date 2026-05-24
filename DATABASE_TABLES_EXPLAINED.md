# Database Tables Explained - Composite Booking System

## 🎯 Overview

There are **3 related tables** for the composite booking system:

1. **`appointments`** - Single service bookings
2. **`composite_bookings`** - Multi-service booking headers
3. **`composite_booking_appointments`** - Individual appointments within multi-service bookings

---

## 📊 Table 1: `appointments` (Original)

**Purpose**: Stores **single service bookings**

**When Used**: When a patient books ONE service

**Example Data**:
```
id | patient_id | full_name      | treatment           | appointment_date | appointment_time | duration_minutes | status
1  | 5          | John Doe       | Dental Cleaning     | 2026-05-28       | 09:00            | 45               | Approved
2  | 6          | Jane Smith     | Teeth Whitening     | 2026-05-28       | 10:00            | 60               | Pending
```

**Columns**:
- `id` - Unique appointment ID
- `patient_id` - Which patient
- `full_name` - Patient name
- `treatment` - Service name
- `appointment_date` - Date
- `appointment_time` - Time
- `duration_minutes` - How long
- `status` - Approved/Pending/Completed
- `dentist_id` - Which dentist
- `dentist_name` - Dentist name

---

## 📊 Table 2: `composite_bookings` (New)

**Purpose**: Stores the **header/summary** of multi-service bookings

**When Used**: When a patient books 2-3 services together

**Example Data**:
```
id | booking_id        | patient_id | patient_name  | service_count | total_duration_minutes | booking_type | overall_status
1  | CB-2026-05-28-001 | 7          | Raphonced    | 2             | 65                     | Patient      | Pending
2  | CB-2026-05-28-002 | 8          | Jane Smith    | 3             | 120                    | Patient      | Approved
```

**Columns**:
- `id` - Unique booking ID (internal)
- `booking_id` - Human-readable booking ID (e.g., "CB-2026-05-28-001")
- `patient_id` - Which patient
- `patient_name` - Patient name
- `service_count` - How many services (2-3)
- `total_duration_minutes` - Total time for all services
- `booking_type` - Patient or Walk-in
- `overall_status` - Status of entire booking
- `created_at` - When created

**Think of it as**: The "booking envelope" that contains multiple appointments

---

## 📊 Table 3: `composite_booking_appointments` (New)

**Purpose**: Stores **individual appointments** within a multi-service booking

**When Used**: Each service in a multi-service booking gets its own record here

**Example Data**:
```
id | composite_booking_id | booking_id        | appointment_id      | service_name      | appointment_date | appointment_time | appointment_end_time | dentist_name | dentist_specialty
1  | 1                    | CB-2026-05-28-001 | CBA-2026-05-28-001-01 | Dental Cleaning   | 2026-05-28       | 09:00            | 09:45                | Dr. Johnson  | General Dentistry
2  | 1                    | CB-2026-05-28-001 | CBA-2026-05-28-001-02 | Digital X-Rays    | 2026-05-28       | 09:45            | 10:05                | Dr. Johnson  | General Dentistry
```

**Columns**:
- `id` - Unique record ID
- `composite_booking_id` - Links to `composite_bookings` table
- `booking_id` - The booking ID (e.g., "CB-2026-05-28-001")
- `appointment_id` - Unique appointment ID (e.g., "CBA-2026-05-28-001-01")
- `service_name` - Service name
- `appointment_date` - Date
- `appointment_time` - Start time
- `appointment_end_time` - End time ← NEW
- `dentist_name` - Dentist name
- `dentist_specialty` - Dentist specialty ← NEW
- `appointment_status` - Status of this appointment

**Think of it as**: The "individual items" inside the booking envelope

---

## 🔗 How They're Connected

```
composite_bookings (Header)
    ↓
    ├─→ composite_booking_appointments (Item 1)
    │   └─ Service: Dental Cleaning
    │   └─ Time: 09:00 - 09:45
    │
    └─→ composite_booking_appointments (Item 2)
        └─ Service: Digital X-Rays
        └─ Time: 09:45 - 10:05
```

**Relationship**:
- 1 `composite_bookings` record = 1 booking session
- Multiple `composite_booking_appointments` records = Multiple services in that booking
- All linked by `composite_booking_id` and `booking_id`

---

## 📋 Comparison Table

| Aspect | `appointments` | `composite_bookings` | `composite_booking_appointments` |
|--------|---|---|---|
| **Purpose** | Single service bookings | Multi-service booking header | Individual services in multi-service booking |
| **When Used** | 1 service | 2-3 services | Each service in multi-service |
| **Records** | 1 per booking | 1 per multi-service booking | Multiple per multi-service booking |
| **Example** | Dental Cleaning | Booking with 2 services | Dental Cleaning (service 1) |
| **Dentist** | Stored here | Not stored | Stored here |
| **Time** | Start time only | Not stored | Start + end time |

---

## 🎯 Real-World Example

### Scenario: Patient books 2 services

**Step 1**: Patient selects:
- Service 1: Dental Cleaning (45 mins)
- Service 2: Digital X-Rays (20 mins)

**Step 2**: System creates records:

**In `composite_bookings`**:
```
booking_id: CB-2026-05-28-0001
patient_name: John Doe
service_count: 2
total_duration_minutes: 65
overall_status: Pending
```

**In `composite_booking_appointments`**:
```
Record 1:
  appointment_id: CBA-2026-05-28-0001-01
  service_name: Dental Cleaning
  appointment_time: 09:00
  appointment_end_time: 09:45
  dentist_name: Dr. Johnson

Record 2:
  appointment_id: CBA-2026-05-28-0001-02
  service_name: Digital X-Rays
  appointment_time: 09:45
  appointment_end_time: 10:05
  dentist_name: Dr. Johnson
```

**NOT in `appointments` table** (because this is a multi-service booking)

---

## ✅ Why 3 Tables?

### **Separation of Concerns**
- `appointments` = Single service bookings (simple, original system)
- `composite_bookings` = Multi-service booking summary
- `composite_booking_appointments` = Individual services in multi-service booking

### **Data Integrity**
- Each table has specific data it needs
- No duplication
- Easy to query and update

### **Flexibility**
- Can query single bookings from `appointments`
- Can query multi-service bookings from `composite_bookings` + `composite_booking_appointments`
- Can track each service independently

### **Audit Trail**
- `composite_booking_audit_log` tracks changes to multi-service bookings
- `appointments` table has its own history

---

## 🔍 How to Query

### Query 1: Get all single service bookings
```sql
SELECT * FROM appointments WHERE status = 'Approved';
```

### Query 2: Get all multi-service bookings
```sql
SELECT * FROM composite_bookings WHERE overall_status = 'Pending';
```

### Query 3: Get all services in a specific multi-service booking
```sql
SELECT * FROM composite_booking_appointments 
WHERE composite_booking_id = 1;
```

### Query 4: Get complete multi-service booking details
```sql
SELECT 
  cb.booking_id,
  cb.patient_name,
  cba.service_name,
  cba.appointment_time,
  cba.appointment_end_time,
  cba.dentist_name
FROM composite_bookings cb
JOIN composite_booking_appointments cba 
  ON cb.id = cba.composite_booking_id
WHERE cb.booking_id = 'CB-2026-05-28-0001';
```

---

## 📊 Summary

| Table | Stores | Example |
|-------|--------|---------|
| `appointments` | Single service bookings | 1 Dental Cleaning appointment |
| `composite_bookings` | Multi-service booking header | Booking with 2 services |
| `composite_booking_appointments` | Individual services in multi-service booking | Service 1: Dental Cleaning, Service 2: X-Rays |

---

## ✅ For Your Defense

When demonstrating:
1. **Single service booking** → Data goes to `appointments` table
2. **Multi-service booking** → Data goes to `composite_bookings` + `composite_booking_appointments` tables

Both work correctly! The system automatically chooses the right table based on how many services are booked.

---

**Does this make sense now? The 3 tables work together to handle both single and multi-service bookings! 🎯**
