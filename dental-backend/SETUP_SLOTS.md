# Quick Setup: Dynamic Slot Management

## What's New?

Your appointment system now has **persistent, dynamic slots** that:
- ✅ Never get deleted
- ✅ Decrease when appointments are booked
- ✅ Increase when appointments are cancelled
- ✅ Max 4 slots per time (one per dentist)

---

## Setup (One-Time)

### 1. Run the Migration

```bash
node migrate-time-slots.js
```

This will:
- Create the `time_slots` table
- Sync all existing appointments
- Show you the current slot status

**Output example:**
```
═══════════════════════════════════════════════════════════
  MIGRATION COMPLETE ✓
═══════════════════════════════════════════════════════════

Slot Statistics:
  Total time slots:    48
  Total capacity:      192 appointments
  Currently booked:    12 appointments
  Currently available: 180 slots

Slots will now:
  ✓ PERSIST (never deleted)
  ✓ DECREASE when appointments are booked
  ✓ INCREASE when appointments are cancelled
  ✓ TRACK max 4 slots per time slot
```

### 2. Verify It Works

```bash
node check-slots.js
```

This shows all your slots. You should see something like:

```
📊 All Time Slots:

  Date       | Slots | Capacity | Booked | Available
  -----------|-------|----------|--------|----------
  2026-05-25 |  24   |    96    |   12   |    84
  2026-05-24 |  20   |    80    |    8   |    72
```

---

## How It Works

### When Someone Books an Appointment

1. Appointment is created in the database
2. Slot for that date/time automatically decreases by 1
3. Frontend shows updated availability

**Example:**
- Before: 09:00 AM has 4 slots available
- After booking: 09:00 AM has 3 slots available

### When Someone Cancels an Appointment

1. Appointment status changes to "Cancelled"
2. Slot for that date/time automatically increases by 1
3. Frontend shows updated availability

**Example:**
- Before: 09:00 AM has 3 slots available
- After cancelling: 09:00 AM has 4 slots available

---

## Check Slot Status

### View All Slots

```bash
node check-slots.js
```

### View Slots for a Specific Date

```bash
node check-slots.js 2026-05-25
```

Output:
```
📅 Slots for 2026-05-25:

  Time       | Booked | Available | Total
  -----------|--------|-----------|-------
  09:00      |   1    |     3     |   4
  09:30      |   0    |     4     |   4
  10:00      |   2    |     2     |   4
  10:30      |   0    |     4     |   4
```

### Recalculate Slots (if out of sync)

```bash
# For a specific date
node check-slots.js recalc 2026-05-25

# For all dates
node check-slots.js recalc-all
```

---

## API Changes

### Get Available Times (Updated)

```
GET /api/scheduling/available-times?date=2026-05-25
```

**Response now includes:**
```json
{
  "date": "2026-05-25",
  "availableTimes": [
    {
      "time": "09:00 AM",
      "time24": "09:00",
      "slotsLeft": 3,
      "slotsBooked": 1,
      "slotsTotal": 4
    }
  ]
}
```

### Book Appointment (Automatic Slot Update)

```
POST /api/scheduling/book
```

When you book, the slot automatically decreases. No extra code needed!

### Cancel Appointment (Automatic Slot Update)

```
DELETE /api/scheduling/booking/:id
```

When you cancel, the slot automatically increases. No extra code needed!

---

## Files Added

1. **`slot-manager.js`** - Core slot management logic
2. **`migrate-time-slots.js`** - One-time setup script
3. **`check-slots.js`** - Utility to view/manage slots
4. **`SLOT_MANAGEMENT.md`** - Full documentation
5. **`SETUP_SLOTS.md`** - This file

---

## Troubleshooting

### "time_slots table doesn't exist"

Run the migration:
```bash
node migrate-time-slots.js
```

### Slots seem out of sync

Recalculate all slots:
```bash
node check-slots.js recalc-all
```

### Want to see detailed logs

Check the console output when:
- Booking an appointment
- Cancelling an appointment
- Running `check-slots.js`

You'll see messages like:
```
[SlotManager] ✓ Slot decreased: 2026-05-25 09:00 | Available: 3/4
[SlotManager] ✓ Slot increased: 2026-05-25 09:00 | Available: 4/4
```

---

## That's It!

Your slots are now:
- ✅ Persistent (never deleted)
- ✅ Dynamic (decrease/increase automatically)
- ✅ Accurate (always in sync with appointments)
- ✅ Limited (max 4 per time slot)

No more manual slot management needed! 🎉
