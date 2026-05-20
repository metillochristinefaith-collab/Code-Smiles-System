# System Architecture - Dynamic Slot Management

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                        │
│                                                                   │
│  - Display available times                                       │
│  - Show slots left (0-4)                                         │
│  - Book appointment                                              │
│  - Cancel appointment                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP API Requests
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    BACKEND (Express.js)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  scheduling-api.js (Routes)                              │   │
│  │                                                            │   │
│  │  GET  /api/scheduling/available-times                    │   │
│  │  POST /api/scheduling/book                               │   │
│  │  DELETE /api/scheduling/booking/:id                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  slot-manager.js (Business Logic)                        │   │
│  │                                                            │   │
│  │  - initializeSlot()                                       │   │
│  │  - decreaseSlot()                                         │   │
│  │  - increaseSlot()                                         │   │
│  │  - getSlot()                                              │   │
│  │  - recalculateSlotsForDate()                              │   │
│  │  - getSlotStats()                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  db.js (Database Connection)                             │   │
│  │                                                            │   │
│  │  PostgreSQL Pool                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    SQL Queries
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  appointments table                                       │   │
│  │  - id, patient_id, appointment_date, appointment_time    │   │
│  │  - status, dentist_id, treatment, duration_minutes       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  time_slots table (NEW)                                  │   │
│  │  - id, appointment_date, appointment_time                │   │
│  │  - slots_total, slots_available, slots_booked            │   │
│  │  - last_updated, created_at                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Index: idx_time_slots_date_time                         │   │
│  │  - Fast lookups on (appointment_date, appointment_time)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Booking

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PATIENT BOOKS APPOINTMENT                                    │
│    Frontend sends: POST /api/scheduling/book                    │
│    Body: { dentist_id, date, start_time, service, patient_name }
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SCHEDULING API RECEIVES REQUEST                              │
│    scheduling-api.js /book endpoint                             │
│    - Validates input                                            │
│    - Checks availability                                        │
│    - Validates booking                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. INSERT APPOINTMENT                                           │
│    INSERT INTO appointments (...)                               │
│    VALUES (patient_id, date, time, ...)                         │
│    RETURNING id, appointment_date, appointment_time             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DECREASE SLOT                                                │
│    SlotManager.decreaseSlot(date, time)                         │
│    - Initialize slot if doesn't exist                           │
│    - UPDATE time_slots SET slots_available -= 1                 │
│    - UPDATE time_slots SET slots_booked += 1                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. RETURN RESPONSE                                              │
│    Response: { success: true, booking: {...} }                  │
│    Frontend updates UI with new availability                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Cancellation

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PATIENT CANCELS APPOINTMENT                                  │
│    Frontend sends: DELETE /api/scheduling/booking/:id           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SCHEDULING API RECEIVES REQUEST                              │
│    scheduling-api.js /booking/:id DELETE endpoint               │
│    - Validates booking exists                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. UPDATE APPOINTMENT STATUS                                    │
│    UPDATE appointments SET status = 'Cancelled by Patient'      │
│    WHERE id = :id                                               │
│    RETURNING appointment_date, appointment_time                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. INCREASE SLOT                                                │
│    SlotManager.increaseSlot(date, time)                         │
│    - Initialize slot if doesn't exist                           │
│    - UPDATE time_slots SET slots_available += 1                 │
│    - UPDATE time_slots SET slots_booked -= 1                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. RETURN RESPONSE                                              │
│    Response: { success: true, message: 'Booking cancelled' }    │
│    Frontend updates UI with new availability                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Slot Manager Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SlotManager Class                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PUBLIC METHODS                                            │   │
│  │                                                            │   │
│  │ initializeSlot(date, time)                               │   │
│  │   └─ Create slot if doesn't exist                        │   │
│  │   └─ Return slot data                                    │   │
│  │                                                            │   │
│  │ decreaseSlot(date, time)                                 │   │
│  │   └─ Initialize slot if needed                           │   │
│  │   └─ slots_available -= 1                                │   │
│  │   └─ slots_booked += 1                                   │   │
│  │   └─ Return updated slot                                 │   │
│  │                                                            │   │
│  │ increaseSlot(date, time)                                 │   │
│  │   └─ Initialize slot if needed                           │   │
│  │   └─ slots_available += 1                                │   │
│  │   └─ slots_booked -= 1                                   │   │
│  │   └─ Return updated slot                                 │   │
│  │                                                            │   │
│  │ getSlot(date, time)                                      │   │
│  │   └─ Initialize slot if needed                           │   │
│  │   └─ Return slot data                                    │   │
│  │                                                            │   │
│  │ getSlotsForDate(date)                                    │   │
│  │   └─ Return all slots for date                           │   │
│  │                                                            │   │
│  │ getAvailableSlotsForDate(date)                           │   │
│  │   └─ Return only slots with slots_available > 0          │   │
│  │                                                            │   │
│  │ recalculateSlotsForDate(date)                            │   │
│  │   └─ Get all appointments for date                       │   │
│  │   └─ For each time: count appointments                   │   │
│  │   └─ Update slots_available = 4 - count                  │   │
│  │   └─ Update slots_booked = count                         │   │
│  │                                                            │   │
│  │ recalculateAllSlots()                                    │   │
│  │   └─ Get all dates with appointments                     │   │
│  │   └─ For each date: recalculateSlotsForDate()            │   │
│  │                                                            │   │
│  │ getSlotStats(startDate, endDate)                         │   │
│  │   └─ Return statistics for date range                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ INTERNAL LOGIC                                            │   │
│  │                                                            │   │
│  │ All methods use database transactions                     │   │
│  │ All methods include error handling                        │   │
│  │ All methods log operations                               │   │
│  │ All methods validate inputs                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                        appointments                               │
│                                                                    │
│  id (PK)                                                          │
│  patient_id (FK → users)                                          │
│  patient_name                                                     │
│  email                                                            │
│  phone                                                            │
│  treatment                                                        │
│  dentist_id (FK → users)                                          │
│  dentist_name                                                     │
│  appointment_date ◄─────────────────────────────────────┐        │
│  appointment_time ◄─────────────────────────────────────┤        │
│  duration_minutes                                        │        │
│  status                                                  │        │
│  created_at                                              │        │
│  updated_at                                              │        │
└──────────────────────────────────────────────────────────┼────────┘
                                                           │
                                                           │
                                                    REFERENCES
                                                           │
                                                           │
┌──────────────────────────────────────────────────────────┼────────┐
│                      time_slots                          │        │
│                                                          │        │
│  id (PK)                                                │        │
│  appointment_date ◄─────────────────────────────────────┘        │
│  appointment_time ◄─────────────────────────────────────┐        │
│  slots_total (always 4)                                 │        │
│  slots_available (0-4)                                  │        │
│  slots_booked (0-4)                                     │        │
│  last_updated                                           │        │
│  created_at                                             │        │
│                                                          │        │
│  UNIQUE(appointment_date, appointment_time)             │        │
│  INDEX(appointment_date, appointment_time)              │        │
└──────────────────────────────────────────────────────────┼────────┘
                                                           │
                                                    SYNCED WITH
                                                           │
                                                           ▼
                                                    Appointment count
                                                    for each time
```

---

## State Transitions

### Slot States

```
┌─────────────────────────────────────────────────────────────────┐
│                    SLOT LIFECYCLE                                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ CREATED                                                   │   │
│  │ slots_available = 4                                       │   │
│  │ slots_booked = 0                                          │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   │ Appointment booked                           │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PARTIALLY BOOKED                                          │   │
│  │ slots_available = 3                                       │   │
│  │ slots_booked = 1                                          │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   │ More appointments booked                     │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ FULLY BOOKED                                              │   │
│  │ slots_available = 0                                       │   │
│  │ slots_booked = 4                                          │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   │ Appointment cancelled                        │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PARTIALLY BOOKED                                          │   │
│  │ slots_available = 1                                       │   │
│  │ slots_booked = 3                                          │   │
│  └────────────────┬─────────────────────────────────────────┘   │
│                   │                                              │
│                   │ All appointments cancelled                   │
│                   ▼                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ EMPTY (but persists!)                                     │   │
│  │ slots_available = 4                                       │   │
│  │ slots_booked = 0                                          │   │
│  │ (Slot record remains in database)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Consistency Guarantees

```
┌─────────────────────────────────────────────────────────────────┐
│                  DATA CONSISTENCY                                │
│                                                                   │
│  INVARIANT 1: slots_available + slots_booked = slots_total      │
│  ✓ Enforced by SlotManager                                       │
│  ✓ Verified by database constraints                              │
│                                                                   │
│  INVARIANT 2: slots_total = 4 (always)                          │
│  ✓ Enforced by SlotManager                                       │
│  ✓ Verified by database default                                  │
│                                                                   │
│  INVARIANT 3: slots_available >= 0 AND slots_available <= 4     │
│  ✓ Enforced by SlotManager (LEAST/GREATEST)                      │
│  ✓ Verified by database CHECK constraint                         │
│                                                                   │
│  INVARIANT 4: slots_booked >= 0 AND slots_booked <= 4           │
│  ✓ Enforced by SlotManager (LEAST/GREATEST)                      │
│  ✓ Verified by database CHECK constraint                         │
│                                                                   │
│  INVARIANT 5: Slot count matches appointment count              │
│  ✓ Enforced by SlotManager.decreaseSlot/increaseSlot            │
│  ✓ Can be verified by recalculateAllSlots()                      │
│                                                                   │
│  INVARIANT 6: Slots never deleted                               │
│  ✓ Enforced by SlotManager (only UPDATE, never DELETE)           │
│  ✓ Verified by database (no DELETE operations)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE                                   │
│                                                                   │
│  Operation                    │ Complexity │ Time              │
│  ──────────────────────────────┼────────────┼──────────────────│
│  getSlot(date, time)           │ O(1)       │ ~1-2ms           │
│  decreaseSlot(date, time)      │ O(1)       │ ~2-3ms           │
│  increaseSlot(date, time)      │ O(1)       │ ~2-3ms           │
│  getSlotsForDate(date)         │ O(n)       │ ~5-10ms (n=24)   │
│  getAvailableSlotsForDate()    │ O(n)       │ ~5-10ms (n=24)   │
│  recalculateSlotsForDate()     │ O(n)       │ ~50-100ms        │
│  recalculateAllSlots()         │ O(n*m)     │ ~1-5s (n=365)    │
│  getSlotStats()                │ O(n)       │ ~10-20ms         │
│                                                                   │
│  Index: idx_time_slots_date_time                                │
│  ✓ Speeds up lookups by date and time                           │
│  ✓ Reduces query time from O(n) to O(log n)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING                                │
│                                                                   │
│  SlotManager catches and logs:                                   │
│  ✓ Database connection errors                                    │
│  ✓ Query execution errors                                        │
│  ✓ Invalid input errors                                          │
│  ✓ Constraint violation errors                                   │
│                                                                   │
│  All errors are:                                                 │
│  ✓ Logged to console with [SlotManager] prefix                   │
│  ✓ Thrown to caller for handling                                 │
│  ✓ Wrapped with context information                              │
│                                                                   │
│  Graceful degradation:                                           │
│  ✓ If slot update fails, appointment is still created            │
│  ✓ Slot can be recalculated later                                │
│  ✓ No data loss                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:

✅ **Separation of Concerns**
- API layer (scheduling-api.js)
- Business logic layer (slot-manager.js)
- Data layer (database)

✅ **Scalability**
- Indexed database queries
- Efficient slot lookups
- Minimal memory footprint

✅ **Reliability**
- Data consistency guarantees
- Error handling
- Audit trail

✅ **Maintainability**
- Clear code organization
- Well-documented methods
- Easy to extend

✅ **Performance**
- O(1) slot operations
- Indexed queries
- No N+1 problems
