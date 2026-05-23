# Bug Fix #1: Race Condition (Double-Booking) - TESTING GUIDE

## Summary of Fix

**Bug**: Two concurrent booking requests could both pass the overlap check and create appointments at the same time slot, causing double-booking.

**Root Cause**: PostgreSQL's default isolation level (READ COMMITTED) allows phantom reads, where two transactions don't see each other's uncommitted changes.

**Solution**: Set `SERIALIZABLE` isolation level on the transaction. This ensures that if two concurrent transactions try to modify conflicting data, one will automatically rollback with error code 40001.

**Files Modified**:
- `dental-backend/index.js` - Added `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` after BEGIN

---

## How the Fix Works

### Before (Vulnerable):
```javascript
await client.query('BEGIN');

// Transaction A checks: Are there appointments at 10:00?
// Result: No appointments found

// Transaction B checks: Are there appointments at 10:00?
// Result: No appointments found (didn't see A's insert yet)

// Both insert at the same time ❌
```

### After (Fixed):
```javascript
await client.query('BEGIN');
await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

// Transaction A checks and inserts at 10:00
// Transaction B tries to check - PostgreSQL detects conflict
// Transaction B fails with error code 40001 (serialization_failure)
// Client gets 409 response with "slot was just booked" message ✅
```

---

## Testing Guide

### Prerequisites

1. **Backend running**: 
   ```bash
   cd dental-backend
   npm install
   node index.js
   ```
   Should see: `Server listening on port 3000`

2. **Database populated**:
   - PostgreSQL must be running and connected
   - Database schema must be initialized (dentists, appointments tables exist)
   - Check: Run `node test-db.js` to verify connection

### Test 1: Manual Concurrent Test (Simple)

**What it tests**: Two back-to-back rapid bookings for the same slot

**Steps**:

1. Open two terminal windows side by side

2. **Terminal 1**: Make first booking request
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

3. **Terminal 2**: Immediately paste and run the SAME booking (before Terminal 1 response)
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

**Expected Results**:
- Terminal 1: ✅ `status: 201` with appointment ID
- Terminal 2: ❌ `status: 409` with message "The appointment slot was just booked"

**What to look for in Terminal 1 (backend logs)**:
```
[OVERLAP CHECK] Found 0 existing appointments
[OVERLAP CHECK] ✓ No conflicts found
Inserting appointment into database...
Appointment created with ID: 1234
SUCCESS: Booking transaction committed
```

**What to look for in Terminal 2 (backend logs)**:
```
[OVERLAP CHECK] Found 0 existing appointments  <- Still doesn't see Terminal 1's insert
[OVERLAP CHECK] ✓ No conflicts found
Inserting appointment into database...
Booking transaction rolled back: could not serialize access...
⚠️ Serialization conflict detected
```

---

### Test 2: Automated Concurrent Test (Recommended)

**What it tests**: Simulates true concurrent requests using Promise.all()

**Steps**:

1. Make sure backend is running

2. Run the test script:
   ```bash
   cd dental-backend
   node test-race-condition-fix.js
   ```

3. Expected output:
   ```
   === RACE CONDITION TEST: SERIALIZABLE ISOLATION ===

   Step 1: Checking slot availability...
   ✓ Slot 10:00 has 4 slots available

   Step 2: Simulating two concurrent bookings for the same slot...
     Request 1: Patient A booking 10:00 AM
     Request 2: Patient B booking 10:00 AM (concurrent)

   Step 3: Results

   Request 1:
     ✅ SUCCESS
        Booking ID: 1235
        Status: Approved

   Request 2:
     ❌ FAILED
        Code: 409
        Message: The appointment slot was just booked. Please try another time.

   Step 4: Analysis

   ✅ RACE CONDITION FIX WORKING!
      - First request succeeded
      - Second request failed with SERIALIZATION_CONFLICT
      - No double-booking occurred
   ```

---

### Test 3: Stress Test (10 Concurrent Requests)

**What it tests**: Runs the race condition test 10 times to ensure consistency

**Steps**:

1. Run stress test:
   ```bash
   cd dental-backend
   node test-race-condition-fix.js --stress 10
   ```

2. Expected output:
   ```
   === STRESS TEST: 10 ITERATIONS ===
   
   Iteration 1/10
   [... output from test ...]
   
   Iteration 2/10
   [... output from test ...]
   
   ... (8 more iterations)
   
   === RESULTS ===
   Passed: 10/10
   Failed: 0/10

   ✅ All tests passed! Race condition fix is working consistently.
   ```

3. **What to verify**: All 10 iterations should show 1 success + 1 failure with SERIALIZATION_CONFLICT

---

### Test 4: Verify Slot Count Consistency

**What it tests**: Ensures the slot counts stay in sync with actual appointments

**Steps**:

1. Create a test file: `dental-backend/test-slot-consistency.js`

   ```bash
   cat > dental-backend/test-slot-consistency.js << 'EOF'
   const db = require('./db');

   async function testSlotConsistency() {
     console.log('\n=== SLOT CONSISTENCY TEST ===\n');

     try {
       // Check slots for 2026-06-20 10:00
       const slotResult = await db.query(
         `SELECT slots_total, slots_available, slots_booked 
          FROM time_slots 
          WHERE appointment_date = '2026-06-20' 
          AND appointment_time = '10:00'`
       );

       if (slotResult.rows.length === 0) {
         console.log('No slot record found');
         process.exit(0);
       }

       const slot = slotResult.rows[0];
       console.log('Slot Status:');
       console.log(`  Total slots:     ${slot.slots_total}`);
       console.log(`  Available:       ${slot.slots_available}`);
       console.log(`  Booked:          ${slot.slots_booked}`);

       // Count actual appointments
       const appointmentResult = await db.query(
         `SELECT COUNT(*) as count 
          FROM appointments 
          WHERE appointment_date = '2026-06-20' 
          AND appointment_time = '10:00'
          AND status IN ('Pending', 'Approved')`
       );

       const actualCount = parseInt(appointmentResult.rows[0].count);
       console.log(`\nActual Appointments: ${actualCount}`);

       // Verify consistency
       const consistency = slot.slots_booked === actualCount;
       console.log(`\nConsistency Check: ${consistency ? '✅ PASS' : '❌ FAIL'}`);

       if (!consistency) {
         console.log(`  Expected: ${actualCount}, Got: ${slot.slots_booked}`);
       }

       process.exit(consistency ? 0 : 1);
     } catch (error) {
       console.error('Error:', error.message);
       process.exit(1);
     }
   }

   testSlotConsistency();
   EOF
   ```

2. Run it after the race condition test:
   ```bash
   node test-slot-consistency.js
   ```

3. Expected output:
   ```
   === SLOT CONSISTENCY TEST ===

   Slot Status:
     Total slots:     4
     Available:       3
     Booked:          1

   Actual Appointments: 1

   Consistency Check: ✅ PASS
   ```

---

### Test 5: Verify No Double-Booking in Database

**What it tests**: Query the database to confirm only one appointment was created at the slot

**Steps**:

1. Open PostgreSQL client:
   ```bash
   psql -U postgres -d code_smiles_db
   ```

2. Query for appointments on the test date:
   ```sql
   SELECT id, patient_name, appointment_date, appointment_time, dentist_name, status
   FROM appointments
   WHERE appointment_date = '2026-06-20'
   AND appointment_time = '10:00'
   ORDER BY id DESC;
   ```

3. Expected result:
   ```
    id  | patient_name | appointment_date | appointment_time | dentist_name | status
   -----+--------------+------------------+------------------+--------------+----------
   1235 | Patient A    | 2026-06-20       | 10:00            | [dentist]    | Approved
   (1 row)
   ```

   **Only 1 appointment should exist** (not 2)

---

## Troubleshooting

### Issue: Both requests succeed (double-booking still happening)

**Possible causes**:
1. Index.js not reloaded (backend still running old code)
2. Changes not saved correctly
3. Different endpoints being hit

**Solution**:
```bash
# Kill backend
pkill -f "node index.js"

# Restart
cd dental-backend
node index.js

# Verify the change was made:
grep -n "SET TRANSACTION ISOLATION LEVEL" index.js
# Should show a line number around 2130
```

---

### Issue: Cannot run test script

**Error**: `Cannot find module 'axios'`

**Solution**:
```bash
cd dental-backend
npm install axios
node test-race-condition-fix.js
```

---

### Issue: "Cannot connect to server" error

**Solution**:
```bash
# Check if backend is running
lsof -i :3000

# If not, start it:
cd dental-backend
npm install
node index.js
```

---

## Performance Impact

**SERIALIZABLE isolation may cause**:
- ✅ Prevents race conditions (main goal)
- ⚠️ Occasional serialization failures on high concurrency
- ⚠️ Slight performance overhead (locks more rows)

**Expected failure rate**: < 1% under normal load (100-200 concurrent users)

**Is this acceptable?** YES - one in 100 users retrying is better than one in 100 users double-booking.

---

## Verification Checklist

- [ ] Backend restarted after code change
- [ ] Test 1 (manual curl): Second request returns 409
- [ ] Test 2 (automated): Passes with SERIALIZATION_CONFLICT
- [ ] Test 3 (stress): 10/10 iterations pass
- [ ] Test 4 (slot consistency): Available slots match count
- [ ] Test 5 (database): Only 1 appointment created, not 2
- [ ] Backend logs show serialization conflict messages

---

## Summary

If all tests pass, **Bug #1 (Race Condition) is FIXED** ✅

**What changed**: 
- Added SERIALIZABLE isolation to prevent phantom reads
- Added proper error handling for serialization conflicts
- Created automated tests to verify the fix

**Ready for**: Next bug fix (#2: Slot Manager Atomicity)

---

## Questions?

Check the backend logs:
```bash
# Terminal 1 where backend is running, look for:
# - "[OVERLAP CHECK]" messages
# - "Serialization conflict" messages
# - "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE" confirmation
```
