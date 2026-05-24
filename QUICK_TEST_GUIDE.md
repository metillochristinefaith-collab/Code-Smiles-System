# Quick Test Guide - Booking System (For Defense)

## Pre-Defense Checklist (5 minutes)

- [ ] Backend server running on port 5000
- [ ] Frontend running on port 4200
- [ ] Database connected and populated
- [ ] Browser console open (F12) to see logs

---

## Test Scenario 1: Single Service Booking (Patient) - 2 minutes

### Steps:
1. Navigate to **Patient Booking** page
2. Select category: **"General Dentistry"**
3. Select service: **"Dental Cleaning"** (45 mins)
4. Click **"Proceed to Scheduling"**
5. **✅ VERIFY**: Calendar appears
6. Select a date (e.g., May 28, 2026)
7. **✅ VERIFY**: Time slots load (should see multiple times like "09:00 AM", "09:30 AM", etc.)
8. Select a time slot (e.g., "09:00 AM")
9. Click **"Proceed to Patient Details"**
10. Fill in:
    - First Name: John
    - Last Name: Doe
    - Email: john@example.com
    - Phone: 09123456789
    - Age: 30
11. Click **"Complete Booking"**
12. **✅ VERIFY**: Success modal appears with booking confirmation

**Expected Result**: ✅ Booking successful, confirmation shown

---

## Test Scenario 2: Multi-Service Booking (Patient) - 3 minutes

### Steps:
1. Navigate to **Patient Booking** page
2. Select category: **"General Dentistry"**
3. Select services:
   - **"Dental Cleaning"** (45 mins) ✅
   - **"Digital X-Rays"** (20 mins) ✅
   - Total: 65 mins (within 120 min limit)
4. Click **"Proceed to Scheduling"**
5. **✅ VERIFY**: Multi-service scheduling appears (Step 2.5)
6. For Service 1 (Dental Cleaning):
   - Select date: May 28, 2026
   - **✅ VERIFY**: Time slots load
   - Select time: 09:00 AM
   - Click **"Proceed to Next Service"**
7. For Service 2 (Digital X-Rays):
   - Select date: May 28, 2026
   - **✅ VERIFY**: Time slots load
   - Select time: 10:30 AM (after Dental Cleaning ends)
   - Click **"Proceed to Patient Details"**
8. Fill in patient details (same as Scenario 1)
9. Click **"Complete Booking"**
10. **✅ VERIFY**: Success modal appears

**Expected Result**: ✅ Multi-service booking successful

---

## Test Scenario 3: Staff Booking (Walk-in) - 2 minutes

### Steps:
1. Navigate to **Staff Booking** page
2. Select booking type: **"Walk-in"**
3. Select intake priority: **"Standard"**
4. Select intake source: **"Front desk"**
5. Fill in patient details:
   - Name: Jane Smith
   - Phone: 09987654321
   - Email: (leave empty - auto-generated)
   - Age: 25
6. Select category: **"Cosmetic Arts"**
7. Select service: **"Teeth Whitening"** (60 mins)
8. Click **"Proceed to Scheduling"**
9. Select date: May 29, 2026
10. **✅ VERIFY**: Time slots load
11. Select time: 02:00 PM
12. Click **"Proceed to Patient Details"**
13. Click **"Submit"**
14. **✅ VERIFY**: Success message appears

**Expected Result**: ✅ Staff booking successful

---

## Test Scenario 4: Multi-Service Staff Booking - 3 minutes

### Steps:
1. Navigate to **Staff Booking** page
2. Select booking type: **"Walk-in"**
3. Fill in patient details (same as Scenario 3)
4. Select category: **"Oral Surgery"**
5. Select services:
   - **"Surgical Tooth Extraction"** (60 mins) ✅
   - **"Minor Oral Surgery"** (45 mins) ✅
   - Total: 105 mins (within 120 min limit)
6. Click **"Proceed to Scheduling"**
7. For Service 1:
   - Select date: May 29, 2026
   - **✅ VERIFY**: Time slots load
   - Select time: 10:00 AM
   - Click **"Proceed to Next Service"**
8. For Service 2:
   - Select date: May 29, 2026
   - **✅ VERIFY**: Time slots load
   - Select time: 11:30 AM
   - Click **"Proceed to Patient Details"**
9. Click **"Submit"**
10. **✅ VERIFY**: Success message appears

**Expected Result**: ✅ Multi-service staff booking successful

---

## Test Scenario 5: Double-Booking Prevention - 2 minutes

### Steps:
1. Complete a booking (use Scenario 1)
2. Try to book the same dentist at the same time
3. Select same date and time as previous booking
4. **✅ VERIFY**: Time slot shows as unavailable (slotsLeft = 0)
5. Try to select a different time
6. **✅ VERIFY**: Can book at different time successfully

**Expected Result**: ✅ Double-booking prevented, alternative times available

---

## Test Scenario 6: Max Services Constraint - 1 minute

### Steps:
1. Navigate to **Patient Booking** page
2. Select category: **"General Dentistry"**
3. Try to select 4 services
4. **✅ VERIFY**: Alert appears: "Maximum 3 services allowed"
5. Select 3 services with total > 120 mins
6. **✅ VERIFY**: Alert appears: "Total duration cannot exceed 120 minutes"

**Expected Result**: ✅ Constraints enforced

---

## Browser Console Logs to Look For

### Successful Booking Flow:
```
[STAFF-BOOKING] Fetching slots for date: 2026-05-28, service: Dental Cleaning
[STAFF-BOOKING] Slots response: {...}
[STAFF-BOOKING] Loaded 24 slots
[STAFF-BOOKING] Submitting SINGLE service booking: {...}
[STAFF-BOOKING] Single booking successful: {...}
```

### Multi-Service Booking:
```
[STAFF-BOOKING] loadAvailableSlotsForMultiService called for service: Dental Cleaning
[STAFF-BOOKING] Slots API response: {...}
[STAFF-BOOKING] Processed slots: 24 slots available
[STAFF-BOOKING] Submitting MULTI-SERVICE booking: {...}
[STAFF-BOOKING] Multi-service booking successful: {...}
```

### Error Scenarios:
```
[STAFF-BOOKING] Error fetching available slots: {...}
[STAFF-BOOKING] Multi-service booking failed: {...}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Time slots not loading | Check browser console for API errors. Verify backend is running. |
| Submit button disabled | Verify all required fields are filled. Check validation errors. |
| "Booking failed" error | Check backend logs. Verify database connection. |
| Double-booking allowed | Check if existing appointments are in "Approved" or "Pending" status. |
| Services exceed 120 mins | Verify constraint logic in `toggleService()` method. |

---

## Key Files to Monitor

- **Frontend Logs**: Browser console (F12)
- **Backend Logs**: Terminal running `npm start` in dental-backend
- **Database**: Check `appointments` and `composite_bookings` tables

---

## Success Criteria for Defense

✅ All 6 test scenarios pass  
✅ No console errors  
✅ Time slots load within 2 seconds  
✅ Bookings submit successfully  
✅ Double-booking prevention works  
✅ Multi-service constraints enforced  

---

**Good luck! You've got this! 🚀**
