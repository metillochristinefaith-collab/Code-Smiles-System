# Slots Quick Reference Card

## One-Time Setup

```bash
node migrate-time-slots.js
```

Done! Slots are now persistent and dynamic.

---

## Check Slots Status

```bash
# View all slots
node check-slots.js

# View slots for specific date
node check-slots.js 2026-05-25

# Recalculate slots for date (if out of sync)
node check-slots.js recalc 2026-05-25

# Recalculate all slots
node check-slots.js recalc-all
```

---

## How Slots Work

| Action | Effect |
|--------|--------|
| Book appointment | `slots_available -= 1` |
| Cancel appointment | `slots_available += 1` |
| Slot fully booked | `slots_available = 0` (slot persists) |
| Slot created | `slots_available = 4` (default) |

---

## API Endpoints

### Get Available Times
```
GET /api/scheduling/available-times?date=2026-05-25
```

Response includes:
- `slotsLeft` - available slots (0-4)
- `slotsBooked` - booked slots (0-4)
- `slotsTotal` - max capacity (always 4)

### Book Appointment
```
POST /api/scheduling/book
```
Automatically decreases slot by 1

### Cancel Appointment
```
DELETE /api/scheduling/booking/:id
```
Automatically increases slot by 1

---

## Database

### Table: `time_slots`

```sql
SELECT * FROM time_slots 
WHERE appointment_date = '2026-05-25'
ORDER BY appointment_time;
```

**Columns:**
- `appointment_date` - Date (YYYY-MM-DD)
- `appointment_time` - Time (HH:MM)
- `slots_total` - Max capacity (always 4)
- `slots_available` - Free slots (0-4)
- `slots_booked` - Taken slots (0-4)
- `last_updated` - Last modification time

---

## Slot Manager Methods

```javascript
const SlotManager = require('./slot-manager');

// Initialize/get slot
await SlotManager.initializeSlot('2026-05-25', '09:00');

// Decrease slot (when booking)
await SlotManager.decreaseSlot('2026-05-25', '09:00');

// Increase slot (when cancelling)
await SlotManager.increaseSlot('2026-05-25', '09:00');

// Get slot info
await SlotManager.getSlot('2026-05-25', '09:00');

// Get all slots for date
await SlotManager.getSlotsForDate('2026-05-25');

// Get available slots for date
await SlotManager.getAvailableSlotsForDate('2026-05-25');

// Recalculate slots for date
await SlotManager.recalculateSlotsForDate('2026-05-25');

// Recalculate all slots
await SlotManager.recalculateAllSlots();

// Get statistics
await SlotManager.getSlotStats('2026-05-01', '2026-05-31');
```

---

## Files

| File | Purpose |
|------|---------|
| `slot-manager.js` | Core slot logic |
| `scheduling-api.js` | Updated API endpoints |
| `migrate-time-slots.js` | One-time setup |
| `check-slots.js` | View/manage slots |
| `init-db.js` | Updated schema |
| `SLOT_MANAGEMENT.md` | Full documentation |
| `SETUP_SLOTS.md` | Setup guide |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Table doesn't exist | `node migrate-time-slots.js` |
| Slots out of sync | `node check-slots.js recalc-all` |
| Slots not updating | Check SlotManager import in scheduling-api.js |
| Want to see logs | Check console output when booking/cancelling |

---

## Key Points

✅ Slots **NEVER** get deleted  
✅ Slots **ALWAYS** persist  
✅ Slots **AUTOMATICALLY** decrease when booked  
✅ Slots **AUTOMATICALLY** increase when cancelled  
✅ Max **4 slots** per time slot  
✅ **Real-time** accuracy  

---

## Example Workflow

```
1. Patient books 09:00 AM slot
   → slots_available: 4 → 3
   → slots_booked: 0 → 1

2. Check available times
   → Shows 3 slots left for 09:00 AM

3. Patient cancels
   → slots_available: 3 → 4
   → slots_booked: 1 → 0

4. Check available times
   → Shows 4 slots left for 09:00 AM
```

---

## That's It!

Your slots are now:
- Persistent
- Dynamic
- Accurate
- Automatic

No more manual slot management! 🎉
