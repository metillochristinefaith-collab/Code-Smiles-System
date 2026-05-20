# Dynamic Slot Management System

## Overview

The Code Smiles dental clinic now has a **persistent, dynamic slot management system** that:

✅ **Never deletes slots** - slots persist in the database forever  
✅ **Dynamically decreases** available slots when appointments are booked  
✅ **Dynamically increases** available slots when appointments are cancelled  
✅ **Tracks max 4 slots per time** - one slot per dentist  
✅ **Provides real-time availability** - always accurate slot counts  

---

## How It Works

### Slot Lifecycle

1. **Slot Creation**: When an appointment is booked for a time that doesn't have a slot record yet, a new slot is automatically created with 4 available slots.

2. **Slot Decrease**: When an appointment is created or approved:
   - `slots_available` decreases by 1
   - `slots_booked` increases by 1
   - `last_updated` is set to NOW()

3. **Slot Increase**: When an appointment is cancelled:
   - `slots_available` increases by 1
   - `slots_booked` decreases by 1
   - `last_updated` is set to NOW()

4. **Slot Persistence**: Slots are NEVER deleted. Even if all slots are booked, the slot record remains with `slots_available = 0`.

### Database Schema

```sql
CREATE TABLE time_slots (
  id                SERIAL        PRIMARY KEY,
  appointment_date  DATE          NOT NULL,
  appointment_time  TIME          NOT NULL,
  slots_total       INTEGER       NOT NULL DEFAULT 4,
  slots_available   INTEGER       NOT NULL DEFAULT 4,
  slots_booked      INTEGER       NOT NULL DEFAULT 0,
  last_updated      TIMESTAMP     NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(appointment_date, appointment_time)
);
```

---

## Setup Instructions

### Step 1: Update Database Schema

Run the migration to create the `time_slots` table:

```bash
node migrate-time-slots.js
```

This will:
- Create the `time_slots` table
- Scan all existing appointments
- Sync slot availability based on current bookings
- Display summary statistics

### Step 2: Verify Setup

Check the slots:

```bash
node check-slots.js
```

This shows all slots with their current availability.

---

## API Endpoints

### 1. Get Available Times for a Date

```
GET /api/scheduling/available-times?date=YYYY-MM-DD
```

**Response:**
```json
{
  "date": "2026-05-25",
  "availableTimes": [
    {
      "time": "09:00 AM",
      "time24": "09:00",
      "slotsLeft": 4,
      "slotsBooked": 0,
      "slotsTotal": 4
    },
    {
      "time": "09:30 AM",
      "time24": "09:30",
      "slotsLeft": 2,
      "slotsBooked": 2,
      "slotsTotal": 4
    }
  ],
  "count": 24
}
```

### 2. Book an Appointment

```
POST /api/scheduling/book
```

**Request:**
```json
{
  "dentist_id": "D1",
  "date": "2026-05-25",
  "start_time": "09:00",
  "service": "Dental Cleaning",
  "patient_name": "John Doe",
  "phone": "555-1234",
  "email": "john@example.com"
}
```

**Effect:**
- Appointment is created with status "Pending"
- `slots_available` for that time decreases by 1
- `slots_booked` increases by 1

### 3. Cancel an Appointment

```
DELETE /api/scheduling/booking/:id
```

**Effect:**
- Appointment status changes to "Cancelled by Patient"
- `slots_available` for that time increases by 1
- `slots_booked` decreases by 1

---

## Slot Manager API

The `SlotManager` class provides utility functions:

### Initialize or Get a Slot

```javascript
const slot = await SlotManager.initializeSlot('2026-05-25', '09:00');
// Returns: { id, appointment_date, appointment_time, slots_total, slots_available, slots_booked }
```

### Decrease Available Slots

```javascript
await SlotManager.decreaseSlot('2026-05-25', '09:00');
// slots_available -= 1, slots_booked += 1
```

### Increase Available Slots

```javascript
await SlotManager.increaseSlot('2026-05-25', '09:00');
// slots_available += 1, slots_booked -= 1
```

### Get Slot for Specific Date/Time

```javascript
const slot = await SlotManager.getSlot('2026-05-25', '09:00');
```

### Get All Slots for a Date

```javascript
const slots = await SlotManager.getSlotsForDate('2026-05-25');
```

### Get Available Slots for a Date

```javascript
const availableSlots = await SlotManager.getAvailableSlotsForDate('2026-05-25');
// Only returns slots where slots_available > 0
```

### Recalculate Slots for a Date

```javascript
await SlotManager.recalculateSlotsForDate('2026-05-25');
// Syncs slots with actual appointments for that date
```

### Recalculate All Slots

```javascript
await SlotManager.recalculateAllSlots();
// Syncs all slots in the database
```

### Get Slot Statistics

```javascript
const stats = await SlotManager.getSlotStats('2026-05-01', '2026-05-31');
// Returns: [{ appointment_date, total_slots, total_capacity, total_available, total_booked }]
```

---

## Management Commands

### View All Slots

```bash
node check-slots.js
```

Shows all slots grouped by date with capacity and availability.

### View Slots for Specific Date

```bash
node check-slots.js 2026-05-25
```

Shows all time slots for that date with detailed breakdown.

### Recalculate Slots for a Date

```bash
node check-slots.js recalc 2026-05-25
```

Syncs slots with actual appointments for that date. Useful if data gets out of sync.

### Recalculate All Slots

```bash
node check-slots.js recalc-all
```

Syncs all slots in the database. Use this if you suspect data inconsistency.

---

## Important Notes

### Slot Persistence

Slots are **NEVER deleted**. Even if:
- All 4 slots are booked (`slots_available = 0`)
- The date is in the past
- No appointments exist for that time

The slot record remains in the database with its current state.

### Automatic Slot Creation

Slots are automatically created when:
- An appointment is booked for a time that doesn't have a slot record yet
- The `available-times` endpoint is called for a date

### Slot Limits

- **Max slots per time**: 4 (one per dentist)
- **Min slots per time**: 0 (when fully booked)
- **Slot duration**: 30 minutes (9:00 AM, 9:30 AM, 10:00 AM, etc.)
- **Operating hours**: 9:00 AM - 9:00 PM (excluding 12:00 PM - 1:00 PM lunch break)

### Data Consistency

If you suspect slots are out of sync with appointments:

```bash
# Recalculate all slots
node check-slots.js recalc-all

# Or for a specific date
node check-slots.js recalc 2026-05-25
```

---

## Example Workflow

### 1. Patient Books an Appointment

```
POST /api/scheduling/book
{
  "dentist_id": "D1",
  "date": "2026-05-25",
  "start_time": "09:00",
  "service": "Dental Cleaning",
  "patient_name": "Alice"
}
```

**Result:**
- Appointment created (ID: 123)
- Slot for 2026-05-25 09:00 updated:
  - `slots_available`: 4 → 3
  - `slots_booked`: 0 → 1

### 2. Check Available Times

```
GET /api/scheduling/available-times?date=2026-05-25
```

**Response includes:**
```json
{
  "time": "09:00 AM",
  "slotsLeft": 3,
  "slotsBooked": 1,
  "slotsTotal": 4
}
```

### 3. Patient Cancels Appointment

```
DELETE /api/scheduling/booking/BOOK_123
```

**Result:**
- Appointment status: "Cancelled by Patient"
- Slot for 2026-05-25 09:00 updated:
  - `slots_available`: 3 → 4
  - `slots_booked`: 1 → 0

### 4. Check Available Times Again

```
GET /api/scheduling/available-times?date=2026-05-25
```

**Response includes:**
```json
{
  "time": "09:00 AM",
  "slotsLeft": 4,
  "slotsBooked": 0,
  "slotsTotal": 4
}
```

---

## Troubleshooting

### Slots Not Updating

If slots aren't updating when appointments are booked/cancelled:

1. Check that `slot-manager.js` is imported in `scheduling-api.js`
2. Verify the database connection is working
3. Run `node check-slots.js recalc-all` to sync all slots

### Slots Out of Sync

If slot counts don't match actual appointments:

```bash
node check-slots.js recalc-all
```

This will recalculate all slots based on current appointments.

### Missing Slots Table

If you get an error about `time_slots` table not existing:

```bash
node migrate-time-slots.js
```

This creates the table and syncs all existing appointments.

---

## Files

- **`slot-manager.js`** - Core slot management logic
- **`scheduling-api.js`** - Updated API endpoints with slot integration
- **`migrate-time-slots.js`** - Migration script to set up slots
- **`check-slots.js`** - Utility to view and manage slots
- **`SLOT_MANAGEMENT.md`** - This documentation

---

## Summary

Your slot system now:

✅ **Persists slots** - never deleted  
✅ **Decreases dynamically** - when appointments are booked  
✅ **Increases dynamically** - when appointments are cancelled  
✅ **Tracks max 4 slots** - per time slot  
✅ **Provides real-time data** - always accurate availability  

Slots are the source of truth for availability, and they're automatically kept in sync with appointments!
