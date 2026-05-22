# Dual Flow Testing Guide

## Quick Start

The booking system now supports two flows:

### Flow 1: Single Service (1 Service)
**When to use**: Patient/staff selects only 1 service

**Steps**:
1. Select 1 service from category
2. Click "Continue to Scheduling"
3. **Step 2**: Pick date and time (ONCE)
4. **Step 3**: Enter patient/staff details
5. **Step 4**: Review and confirm
6. Submit → Creates 1 appointment

**Expected Result**: 
- Simple, fast booking
- 1 appointment created
- Same date/time for the service

---

### Flow 2: Multi-Service (2-3 Services)
**When to use**: Patient/staff selects 2 or 3 services

**Steps**:
1. Select 2-3 services from category (max 120 min total)
2. Click "Continue to Scheduling"
3. **Step 2.5 - Service 1**: Pick date and time for first service
4. Click "Next Service"
5. **Step 2.5 - Service 2**: Pick date and time for second service (can be different)
6. Click "Next Service" or "Continue to Details" (if last service)
7. **Step 2.5 - Service 3** (if selected): Pick date and time for third service
8. Click "Continue to Details"
9. **Step 3**: Enter patient/staff details
10. **Step 4**: Review all 3 appointments separately
11. Submit → Creates 3 separate appointments

**Expected Result**:
- Each service has its own date/time
- Calendar resets between services
- Review shows all appointments separately
- 3 appointments created with same booking ID

---

## Test Scenarios

### Scenario 1: Book 1 Service (Dental Cleaning)

**Patient Booking**:
1. Go to Patient Booking
2. Select "General Dentistry"
3. Select "Dental Cleaning" (45 min)
4. Click "Continue to Scheduling"
5. Should see Step 2 (date/time picker)
6. Pick May 25 from calendar
7. Pick 9:00 AM from available slots
8. Click "Next: Your Details"
9. Enter patient details
10. Click "Next: Review & Confirm"
11. Review shows:
    - Date: May 25, 2026
    - Time: 9:00 AM
    - Duration: 45 minutes
    - 1 service selected
12. Click "Submit Booking Request"
13. Should see success modal

**Expected**: 1 appointment created

---

### Scenario 2: Book 2 Services (Cleaning + Whitening)

**Patient Booking**:
1. Go to Patient Booking
2. Select "General Dentistry"
3. Select "Dental Cleaning" (45 min)
4. Select "Cosmetic Arts" category
5. Select "Teeth Whitening" (60 min)
6. Total: 105 min ✓
7. Click "Continue to Scheduling"
8. Should see Step 2.5 (multi-service scheduling)
9. Progress shows "1 of 2 services scheduled"

**Service 1 (Dental Cleaning)**:
10. Pick May 25 from calendar
11. Pick 9:00 AM from available slots
12. Click "Next Service"
13. Calendar resets

**Service 2 (Teeth Whitening)**:
14. Pick May 25 from calendar (same day, different time)
15. Pick 10:30 AM from available slots
16. Click "Continue to Details"
17. Enter patient details
18. Click "Next: Review & Confirm"
19. Review shows:
    - Appointment 1: Dental Cleaning - May 25 @ 9:00 AM
    - Appointment 2: Teeth Whitening - May 25 @ 10:30 AM
    - 2 services selected
20. Click "Submit Booking Request"
21. Should see success modal

**Expected**: 2 separate appointments created

---

### Scenario 3: Book 3 Services (Different Days)

**Staff Booking**:
1. Go to Staff Booking
2. Select "General Dentistry"
3. Select "Dental Cleaning" (45 min)
4. Select "Oral Consultation" (15 min)
5. Select "Digital X-Rays" (20 min)
6. Total: 80 min ✓
7. Click "Continue to Scheduling"
8. Should see Step 2.5 (multi-service scheduling)

**Service 1 (Dental Cleaning)**:
9. Pick May 25 from calendar
10. Pick 9:00 AM
11. Click "Next Service"

**Service 2 (Oral Consultation)**:
12. Pick May 26 from calendar (different day)
13. Pick 10:00 AM
14. Click "Next Service"

**Service 3 (Digital X-Rays)**:
15. Pick May 27 from calendar (different day)
16. Pick 2:00 PM
17. Click "Continue to Details"
18. Enter staff details (name, phone, email, age)
19. Select booking type, priority, source
20. Click "Next: Review"
21. Review shows:
    - Appointment 1: Dental Cleaning - May 25 @ 9:00 AM
    - Appointment 2: Oral Consultation - May 26 @ 10:00 AM
    - Appointment 3: Digital X-Rays - May 27 @ 2:00 PM
22. Click "Submit Appointment"
23. Should see success message

**Expected**: 3 separate appointments created on different days

---

### Scenario 4: Exceed 120 Minutes (Should Fail)

**Patient Booking**:
1. Select "General Dentistry"
2. Select "Dental Cleaning" (45 min)
3. Select "Cosmetic Arts"
4. Select "Teeth Whitening" (60 min)
5. Select "Smile Makeover" (120 min)
6. Total: 225 min ✗
7. "Smile Makeover" button should be DISABLED
8. Cannot select it

**Expected**: Cannot exceed 120 minutes

---

### Scenario 5: Exceed 3 Services (Should Fail)

**Patient Booking**:
1. Select "General Dentistry"
2. Select "Dental Cleaning" (45 min)
3. Select "Oral Consultation" (15 min)
4. Select "Digital X-Rays" (20 min)
5. Total: 3 services selected
6. Try to select another service
7. Button should be DISABLED
8. Alert: "Maximum 3 services allowed"

**Expected**: Cannot select more than 3 services

---

## Key Differences to Verify

### Single Service Flow
- ✅ Step 2 shows simple date/time picker
- ✅ Only one date/time selection
- ✅ Review shows single appointment
- ✅ Fast and straightforward

### Multi-Service Flow
- ✅ Step 2.5 shows individual scheduling
- ✅ Progress indicator shows "X of Y services"
- ✅ Calendar resets between services
- ✅ Each service can have different date/time
- ✅ Review shows all appointments separately
- ✅ Each appointment has its own details

---

## Common Issues to Check

### Issue 1: Calendar Not Resetting
**Expected**: Calendar should reset to current month when moving to next service
**Check**: After clicking "Next Service", calendar should show current month again

### Issue 2: Slots Not Loading
**Expected**: Available slots should load when date is selected
**Check**: After selecting date, slots should appear in right panel

### Issue 3: Review Not Showing All Appointments
**Expected**: Multi-service review should show all appointments separately
**Check**: Review step should have multiple appointment cards

### Issue 4: Submission Failing
**Expected**: Should submit successfully and create appointments
**Check**: Success modal should appear with booking ID

---

## Success Criteria

✅ Single service booking works as before
✅ Multi-service booking allows 2-3 services
✅ Each service can have different date/time
✅ Calendar resets between services
✅ Review shows all appointments separately
✅ Submission creates correct number of appointments
✅ No errors in browser console
✅ Build completes without errors

---

## Rollback Plan

If issues occur:
1. Revert to previous patient-booking.ts and patient-booking.html
2. Revert to previous staff-booking.ts and staff-booking.html
3. Rebuild and redeploy

---

**Last Updated**: May 22, 2026
**Status**: Ready for Testing

