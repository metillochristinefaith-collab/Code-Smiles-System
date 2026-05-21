# Double Booking Fix - Testing Guide

## Quick Start

### Step 1: Start Backend
```bash
cd dental-backend
npm start
```

### Step 2: Start Frontend
```bash
cd dental-frontend
npm start
```

### Step 3: Open Browser
Navigate to: `http://localhost:4200`

---

## Manual Test Cases

### Test 1: Prevent Double-Booking (Pending)

**Objective:** Verify that you can't book the same time slot twice

**Steps:**
1. Go to Staff Booking
2. Select "General Dentistry"
3. Select May 25, 2026
4. Select 9:00 AM
5. Fill in patient details (e.g., "John Doe")
6. Click "Submit Booking"
7. **Expected:** ✅ Booking succeeds (Pending status)

8. Try to book the same slot again:
   - Select May 25, 2026
   - Select 9:00 AM
   - Fill in different patient details (e.g., "Jane Smith")
   - Click "Submit Booking"
9. **Expected:** ❌ Error message appears:
   ```
   Time slot conflict! This dentist already has an appointment 
   from 09:00 to 10:00 on this date.
   ```

---

### Test 2: Prevent Double-Booking (Approved)

**Objective:** Verify that approved appointments also block slots

**Steps:**
1. Go to Staff Appointments
2. Find the appointment from Test 1 (John Doe, May 25, 9:00 AM)
3. Click on it
4. Click "Approve" button
5. **Expected:** ✅ Appointment status changes to "Approved"

6. Try to book the same slot again:
   - Go to Staff Booking
   - Select "General Dentistry"
   - Select May 25, 2026
   - Select 9:00 AM
   - Fill in patient details (e.g., "Bob Johnson")
   - Click "Submit Booking"
7. **Expected:** ❌ Error message appears (same as Test 1)

---

### Test 3: Prevent Overlapping Appointments

**Objective:** Verify that overlapping times are blocked

**Steps:**
1. Go to Staff Booking
2. Select "General Dentistry"
3. Select May 25, 2026
4. Select 9:00 AM
5. Fill in patient details (e.g., "Alice")
6. Click "Submit Booking"
7. **Expected:** ✅ Booking succeeds

8. Try to book overlapping time:
   - Select May 25, 2026
   - Select 9:30 AM (overlaps with 9:00-10:00)
   - Fill in patient details (e.g., "Bob")
   - Click "Submit Booking"
9. **Expected:** ❌ Error message appears:
   ```
   Time slot conflict! This dentist already has an appointment 
   from 09:00 to 10:00 on this date.
   ```

---

### Test 4: Allow Non-Overlapping Appointments

**Objective:** Verify that non-overlapping times are allowed

**Steps:**
1. Go to Staff Booking
2. Select "General Dentistry"
3. Select May 25, 2026
4. Select 9:00 AM
5. Fill in patient details (e.g., "Charlie")
6. Click "Submit Booking"
7. **Expected:** ✅ Booking succeeds

8. Book non-overlapping time:
   - Select May 25, 2026
   - Select 10:15 AM (no overlap with 9:00-10:00)
   - Fill in patient details (e.g., "Diana")
   - Click "Submit Booking"
9. **Expected:** ✅ Booking succeeds (no error)

---

### Test 5: Different Dentists Can Book Same Time

**Objective:** Verify that different dentists can have appointments at same time

**Steps:**
1. Go to Staff Booking
2. Select "General Dentistry" (Dr. Raphoncel Eduria)
3. Select May 25, 2026
4. Select 9:00 AM
5. Fill in patient details (e.g., "Eve")
6. Click "Submit Booking"
7. **Expected:** ✅ Booking succeeds

8. Book same time with different dentist:
   - Select "Cosmetic Arts" (Dr. Derence Acojedo)
   - Select May 25, 2026
   - Select 9:00 AM
   - Fill in patient details (e.g., "Frank")
   - Click "Submit Booking"
9. **Expected:** ✅ Booking succeeds (different dentist)

---

### Test 6: Availability Calendar Updates

**Objective:** Verify that calendar shows slots as unavailable after booking

**Steps:**
1. Go to Patient Booking
2. Select "General Dentistry"
3. Look at May 25, 2026 calendar
4. **Expected:** ✅ May 25 shows as available

5. Click on May 25
6. **Expected:** ✅ Time slots appear (9:00 AM, 9:30 AM, etc.)

7. Go to Staff Booking and book 9:00 AM slot (as in Test 1)

8. Go back to Patient Booking
9. Select "General Dentistry"
10. Click on May 25
11. **Expected:** ❌ 9:00 AM slot should NOT appear in available times
    (or show as unavailable/booked)

---

### Test 7: Pending Appointments Block Availability

**Objective:** Verify that pending appointments block slots in availability

**Steps:**
1. Go to Staff Booking
2. Select "General Dentistry"
3. Select May 26, 2026
4. Select 10:00 AM
5. Fill in patient details
6. Click "Submit Booking"
7. **Expected:** ✅ Booking succeeds (Pending status)

8. Go to Patient Booking
9. Select "General Dentistry"
10. Click on May 26
11. **Expected:** ❌ 10:00 AM should NOT appear in available times
    (pending appointments should block slots)

---

## Expected Behavior Summary

| Test | Scenario | Expected Result |
|------|----------|-----------------|
| 1 | Double-book pending | ❌ Error |
| 2 | Double-book approved | ❌ Error |
| 3 | Overlapping times | ❌ Error |
| 4 | Non-overlapping times | ✅ Success |
| 5 | Different dentists | ✅ Success |
| 6 | Calendar updates | ✅ Slots disappear |
| 7 | Pending blocks slots | ✅ Slots blocked |

---

## Error Message Verification

When a double-booking is attempted, you should see:

```
Time slot conflict! This dentist already has an appointment 
from [START_TIME] to [END_TIME] on this date.

Conflict Details:
- Existing appointment: [START_TIME] - [END_TIME]
- Existing treatment: [TREATMENT_NAME]
- Existing status: [Pending/Approved]
- Proposed time: [START_TIME] - [END_TIME]
```

---

## Browser Console Checks

Open DevTools (F12) and check Console tab:

### Expected Logs (Success)
```
[OVERLAP CHECK] Checking for conflicts with dentist 3...
[OVERLAP CHECK] Found 0 existing appointments for this dentist on this date
[OVERLAP CHECK] ✓ No conflicts found. Proceeding with booking.
Appointment created with ID: 123
```

### Expected Logs (Conflict)
```
[OVERLAP CHECK] Checking for conflicts with dentist 3...
[OVERLAP CHECK] Found 1 existing appointments for this dentist on this date
[OVERLAP CHECK] ❌ CONFLICT DETECTED!
  Existing: 09:00 - 10:00 (Dental Cleaning, Pending)
  Proposed: 09:00 - 10:00
```

---

## Debugging

### Issue: Bookings still allow double-booking

**Check:**
1. Verify backend is running: `curl http://localhost:3000/api/scheduling/services`
2. Check browser console for errors
3. Check backend logs for overlap check messages
4. Verify changes were saved to index.js

### Issue: Pending appointments don't block slots

**Check:**
1. Verify scheduling-api.js was updated
2. Check that status filter includes 'Pending'
3. Restart backend after changes
4. Clear browser cache

### Issue: Error message doesn't appear

**Check:**
1. Open browser DevTools (F12)
2. Check Network tab for API response
3. Look for 409 status code
4. Check Console for JavaScript errors

---

## Success Criteria

✅ **All tests pass if:**
1. Can't book same time twice (Pending)
2. Can't book same time twice (Approved)
3. Can't book overlapping times
4. Can book non-overlapping times
5. Different dentists can book same time
6. Calendar updates after booking
7. Pending appointments block slots
8. Error messages are clear and helpful

❌ **Tests fail if:**
1. Can book same time twice
2. Pending appointments don't block slots
3. No error messages appear
4. Calendar doesn't update
5. Console shows errors

---

## Rollback (If Needed)

If you need to revert the changes:

```bash
# Revert index.js
git checkout dental-backend/index.js

# Revert scheduling-api.js
git checkout dental-backend/scheduling-api.js

# Restart backend
npm start
```

---

## Performance Notes

- Overlap checking adds a database query per booking
- Query is indexed on (appointment_date, dentist_id, status)
- Should have minimal performance impact
- Transaction ensures atomicity

---

## Conclusion

Follow these test cases to verify that the double-booking fix is working correctly. All tests should pass before deploying to production.
