# Testing Instructions - Booking Logic Fix

## Quick Start

### Step 1: Start the Backend
```bash
cd dental-backend
npm start
```

Expected output:
```
Server running on port 3000
Database connected
```

### Step 2: Start the Frontend
```bash
cd dental-frontend
npm start
```

Expected output:
```
Angular development server running
http://localhost:4200
```

### Step 3: Open in Browser
Navigate to: `http://localhost:4200`

---

## Manual Testing

### Test 1: Staff Booking Calendar

**Steps:**
1. Click "Staff Booking" in the navigation
2. Select a service category (e.g., "General Dentistry")
3. Look at the calendar for May 2026

**Expected Results:**
- ✅ May 24 (Friday) shows as available
- ✅ May 25 (Saturday) shows as unavailable/grayed out
- ✅ May 26 (Sunday) shows as unavailable/grayed out
- ✅ May 27 (Monday) shows as available
- ✅ May 28 (Tuesday) shows as available

**If you see:**
- ❌ May 24 & 28 blocked → Fix not applied
- ❌ May 25-26 available → Fix not applied
- ✅ All weekdays available, weekends blocked → Fix working!

---

### Test 2: Patient Booking Calendar

**Steps:**
1. Click "Patient Booking" in the navigation
2. Select a service category (e.g., "General Dentistry")
3. Look at the calendar for May 2026

**Expected Results:**
- ✅ Same as Staff Booking
- ✅ May 24 (Friday) shows as available
- ✅ May 25 (Saturday) shows as unavailable
- ✅ May 26 (Sunday) shows as unavailable
- ✅ May 27 (Monday) shows as available
- ✅ May 28 (Tuesday) shows as available

**Verification:**
- Staff and Patient booking should show the same calendar

---

### Test 3: Time Slot Availability

**Steps:**
1. Go to Staff Booking
2. Select a service
3. Click on May 24 (Friday)
4. Check if time slots appear

**Expected Results:**
- ✅ Time slots appear (9:00 AM, 9:30 AM, 10:00 AM, etc.)
- ✅ Slots are based on real appointments
- ✅ Lunch break (12:00-1:00 PM) is excluded
- ✅ Operating hours respected (8:00 AM - 8:30 PM)

**If you see:**
- ❌ No time slots → Check backend is running
- ❌ Slots during lunch → Backend issue
- ✅ Proper time slots → Working correctly!

---

### Test 4: Booking a Slot

**Steps:**
1. Go to Staff Booking
2. Select a service
3. Select May 24 (Friday)
4. Select a time slot (e.g., 9:00 AM)
5. Fill in patient details
6. Submit booking

**Expected Results:**
- ✅ Booking succeeds
- ✅ Confirmation message appears
- ✅ Appointment appears in staff appointments

---

### Test 5: Rescheduling

**Steps:**
1. Go to Staff Appointments
2. Click on an appointment
3. Click "Reschedule"
4. Check the calendar

**Expected Results:**
- ✅ Calendar shows all non-past dates (including weekends for rescheduling)
- ✅ Can select any available date
- ✅ Time slots appear when date is selected

---

## Automated Testing

### Test 1: Slot Availability Test
```bash
cd dental-backend
node test-slot-availability.js
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║         SLOT AVAILABILITY TEST                             ║
╚════════════════════════════════════════════════════════════╝

[1/5] Clearing test data...
✓ Test data cleared

[2/5] Initializing slot...
✓ Slot initialized: 4/4 available

[3/5] Booking 4 appointments (should all succeed)...
  ✓ Booking 1: 3/4 slots remaining
  ✓ Booking 2: 2/4 slots remaining
  ✓ Booking 3: 1/4 slots remaining
  ✓ Booking 4: 0/4 slots remaining

[4/5] Attempting to book 5th appointment (should fail)...
✓ CORRECT: Slot is full (0/4)
✓ 5th booking would be rejected

[5/5] Cancelling one appointment and verifying slot opens up...
✓ After cancellation: 1/4 slots available
✓ CORRECT: Slot is now available for new booking

Cleaning up test data...
✓ Cleanup complete

╔════════════════════════════════════════════════════════════╗
║         ✅ ALL TESTS PASSED                               ║
╚════════════════════════════════════════════════════════════╝
```

---

### Test 2: Dynamic Overlap Test
```bash
cd dental-backend
node test-dynamic-overlap.js
```

**Expected Output:**
```
✓ All overlap detection tests passed
✓ Slot availability correctly calculated
✓ No false positives or negatives
```

---

### Test 3: Scheduling Engine Test
```bash
cd dental-backend
node test-scheduling-engine.js
```

**Expected Output:**
```
✓ Scheduling engine tests passed
✓ Time slot generation working
✓ Availability calculation correct
```

---

## Debugging

### If Tests Fail

**Check 1: Backend Running?**
```bash
curl http://localhost:3000/api/scheduling/services
```

Expected: JSON list of services

**Check 2: Database Connected?**
```bash
cd dental-backend
node test-db.js
```

Expected: Database connection successful

**Check 3: Frontend Errors?**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed API calls

---

## Verification Checklist

### Frontend
- [ ] Staff booking calendar shows correct dates
- [ ] Patient booking calendar shows correct dates
- [ ] Reschedule calendar shows correct dates
- [ ] Time slots appear when date selected
- [ ] Can book appointments
- [ ] Can reschedule appointments

### Backend
- [ ] API returns correct available times
- [ ] Slot management working
- [ ] Overlap detection working
- [ ] Database queries correct

### Integration
- [ ] Frontend and backend communicate
- [ ] Bookings saved to database
- [ ] Slots updated correctly
- [ ] No console errors

---

## Expected Behavior

### Calendar Display
```
May 2026
Su Mo Tu We Th Fr Sa
                1  2    ← Weekends (unavailable)
 3  4  5  6  7  8  9    ← All weekdays available
10 11 12 13 14 15 16    ← All weekdays available
17 18 19 20 21 22 23    ← All weekdays available
24 25 26 27 28 29 30    ← May 24, 27-28 available; 25-26 weekend
31                      ← Available
```

### Time Slots
```
May 24 (Friday) - Selected
Available Times:
- 09:00 AM ✓
- 09:30 AM ✓
- 10:00 AM ✓
- 10:30 AM ✓
- 11:00 AM ✓
- 11:30 AM ✓
- 01:00 PM ✓ (after lunch)
- 01:30 PM ✓
... (continues until 8:30 PM)
```

---

## Success Criteria

✅ **Fix is working if:**
1. May 24 & 28 show as available (not blocked)
2. May 25 & 26 show as unavailable (weekends)
3. Time slots appear for weekdays
4. Bookings can be made
5. All tests pass
6. No console errors

❌ **Fix is NOT working if:**
1. May 24 & 28 still blocked
2. May 25 & 26 show as available
3. No time slots appear
4. Tests fail
5. Console shows errors

---

## Troubleshooting

### Issue: May 24 & 28 still blocked

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart frontend (npm start)
3. Check file was saved: `grep "isWeekend" dental-frontend/src/app/staff-booking/staff-booking.ts`

### Issue: No time slots appear

**Solution:**
1. Check backend is running: `curl http://localhost:3000/api/scheduling/services`
2. Check database has appointments
3. Check browser console for errors

### Issue: Tests fail

**Solution:**
1. Check database connection: `node test-db.js`
2. Check database has test data
3. Check backend is running

---

## Support

If you encounter issues:

1. **Check the logs:**
   - Backend: Look for errors in terminal
   - Frontend: Open DevTools (F12) → Console

2. **Verify the fix:**
   - Read: `EXACT_CHANGES_MADE.md`
   - Check: `grep "isWeekend" dental-frontend/src/app/staff-booking/staff-booking.ts`

3. **Run tests:**
   - `node test-slot-availability.js`
   - `node test-dynamic-overlap.js`

4. **Review documentation:**
   - `BOOKING_LOGIC_FIX.md` - Detailed explanation
   - `VISUAL_GUIDE.md` - Visual comparison
   - `FIX_SUMMARY.md` - Quick summary

---

## Conclusion

The fix is complete and ready for testing. Follow these instructions to verify that:
1. The hardcoded date filtering has been removed
2. All weekdays show available slots
3. Weekends are properly blocked
4. Slot availability is based on real appointment data
