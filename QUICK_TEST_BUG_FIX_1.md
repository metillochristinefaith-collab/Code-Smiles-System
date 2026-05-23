# Quick Test: Bug Fix #1 (Race Condition)

## ⚡ Quick Start (5 minutes)

### Step 1: Start Backend (Terminal 1)
```bash
cd dental-backend
node index.js
```

Wait for: `Server listening on port 3000`

### Step 2: Run Automated Test (Terminal 2)
```bash
cd dental-backend
node test-race-condition-fix.js
```

### Expected Output:
```
✅ RACE CONDITION FIX WORKING!
   - First request succeeded
   - Second request failed with SERIALIZATION_CONFLICT
   - No double-booking occurred
```

**Result: PASS ✅**

---

## 🔍 Manual Verification (Alternative)

### Terminal 1: First Booking
```bash
curl -X POST http://localhost:3000/add-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Patient A",
    "phone": "1234567890",
    "email": "patientA@test.com",
    "appointment_date": "2026-06-20",
    "appointment_time": "10:00",
    "treatment": "Dental Cleaning",
    "booking_type": "Walk-in"
  }'
```

Response: `200` ✅

### Terminal 2: Concurrent Booking (Type quickly!)
```bash
curl -X POST http://localhost:3000/add-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Patient B",
    "phone": "9876543210",
    "email": "patientB@test.com",
    "appointment_date": "2026-06-20",
    "appointment_time": "10:00",
    "treatment": "Dental Cleaning",
    "booking_type": "Walk-in"
  }'
```

Response: `409` with "The appointment slot was just booked" ✅

---

## ✔️ Confirm Fix

### Backend Logs Should Show:
```
⚠️ Serialization conflict detected. Another booking was concurrent.
```

### Database Should Show:
Only **1** appointment at 10:00 (not 2)

```sql
SELECT COUNT(*) FROM appointments 
WHERE appointment_date = '2026-06-20' AND appointment_time = '10:00';
-- Result: 1
```

---

## ✅ If Everything Passes:

**The race condition fix is working!**

**Next**: Bug Fix #2 (Slot Manager Atomicity)
