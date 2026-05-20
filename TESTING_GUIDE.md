# Dynamic Timeline Booking System - Testing Guide

## Quick Start

### Prerequisites
- Node.js installed
- PostgreSQL running with the dental clinic database
- Backend server running on `http://localhost:3000`

---

## Automated Testing

### Run the Overlap Detection Test

This test verifies that the dynamic timeline booking system correctly blocks time slots based on approved appointments.

**Terminal 1: Start the Backend Server**
```bash
cd dental-backend
npm start
```

Wait for the server to start. You should see:
```
✓ Server running on http://localhost:3000
✓ Scheduler started
```

**Terminal 2: Run the Test**
```bash
cd dental-backend
node test-dynamic-overlap.js
```

**Expected Output:**
```
════════════════════════════════════════════════════════════════════════════════
  DYNAMIC TIMELINE OVERLAP TEST SUITE
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Test Date: 2026-09-01
[...] [INFO] Test Dentist: Dr. Raphoncel Eduria (ID: 3)

════════════════════════════════════════════════════════════════════════════════
  STEP 1: Create Test Appointment
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Creating approved appointment for Dr. Raphoncel Eduria
[...] [INFO] Date: 2026-09-01, Time: 09:00, Service: Wisdom Tooth Removal
[...] [INFO] ✓ Appointment created: ID 12345
[...] [INFO]   Date: 2026-09-01
[...] [INFO]   Time: 09:00
[...] [INFO]   Duration: 70 minutes
[...] [INFO]   Blocked window: 09:00 - 10:10 (70 minutes total)

════════════════════════════════════════════════════════════════════════════════
  STEP 2: Query Available Times for Wisdom Tooth Removal
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Fetching available times for Wisdom Tooth Removal on 2026-09-01
[...] [INFO] ✓ Received 24 time slots
[...] [INFO]   Service duration: 60 min
[...] [INFO]   Total blocked duration: 70 min

[...] [INFO] Slot Status:
[...] [INFO]   Blocked (slotsLeft=0): 09:00 AM, 09:30 AM, 10:00 AM
[...] [INFO]   Available (slotsLeft=1): 10:30 AM, 11:00 AM, ...
[...] [INFO]   Not found: None

[...] [INFO] ✓ All slot blocking expectations met!

════════════════════════════════════════════════════════════════════════════════
  STEP 3: Query Available Times for Clear Aligners (Different Dentist)
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Fetching available times for Clear Aligners on 2026-09-01
[...] [INFO] (Clear Aligners are handled by Dr. Christine Faith Metillo, not Dr. Eduria)
[...] [INFO] ✓ Received 24 time slots
[...] [INFO]   Dentist: Dr. Christine Faith Metillo

[...] [INFO] ✓ 09:00 AM is AVAILABLE for Clear Aligners (slotsLeft=1)
[...] [INFO]   This confirms that Dr. Eduria's Wisdom Tooth Removal appointment
[...] [INFO]   does NOT block Dr. Metillo's schedule.

════════════════════════════════════════════════════════════════════════════════
  STEP 4: Cleanup Test Data
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Deleting test appointment ID 12345
[...] [INFO] ✓ Test appointment deleted

════════════════════════════════════════════════════════════════════════════════
  TEST SUMMARY
════════════════════════════════════════════════════════════════════════════════

[...] [INFO] Tests Passed: 2
[...] [INFO] Tests Failed: 0
[...] [SUCCESS] ✓ ALL TESTS PASSED!
```

**Exit Code**: 0 (success)

---

## Manual Testing

### Test 1: Patient Books an Appointment

**Steps:**
1. Open the booking frontend in your browser
2. Log in as a patient (or create a new account)
3. Select a service: **Oral Surgery → Wisdom Tooth Removal**
4. Select date: **September 1, 2026**
5. View available times
6. Book at **9:00 AM**
7. Submit the booking

**Expected Results:**
- ✓ Appointment is created with status "Pending"
- ✓ Appointment appears in patient's "My Appointments"
- ✓ Staff receives a notification

**Verify in Database:**
```sql
SELECT id, patient_name, treatment, appointment_date, appointment_time, 
       duration_minutes, status, dentist_id, dentist_name
FROM appointments
WHERE appointment_date = '2026-09-01' 
  AND treatment = 'Wisdom Tooth Removal'
ORDER BY appointment_time DESC
LIMIT 1;
```

Expected output:
```
id  | patient_name | treatment              | appointment_date | appointment_time | duration_minutes | status  | dentist_id | dentist_name
----|--------------|------------------------|------------------|------------------|------------------|---------|------------|---------------------------
123 | John Doe     | Wisdom Tooth Removal   | 2026-09-01       | 09:00:00         | 70               | Pending | NULL       | NULL
```

---

### Test 2: Staff Approves and Assigns Dentist

**Steps:**
1. Log in as staff
2. Navigate to **Appointment Management**
3. Find the appointment from Test 1
4. Click **Approve**
5. Select dentist: **Dr. Raphoncel Eduria**
6. Click **Confirm**

**Expected Results:**
- ✓ Appointment status changes to "Approved"
- ✓ Dentist ID (3) and name are saved
- ✓ Patient receives a notification

**Verify in Database:**
```sql
SELECT id, patient_name, treatment, appointment_date, appointment_time, 
       duration_minutes, status, dentist_id, dentist_name
FROM appointments
WHERE id = 123;
```

Expected output:
```
id  | patient_name | treatment              | appointment_date | appointment_time | duration_minutes | status   | dentist_id | dentist_name
----|--------------|------------------------|------------------|------------------|------------------|----------|------------|---------------------------
123 | John Doe     | Wisdom Tooth Removal   | 2026-09-01       | 09:00:00         | 70               | Approved | 3          | Dr. Raphoncel Eduria
```

---

### Test 3: Slot Blocking Verification

**Steps:**
1. Open the booking frontend
2. Log in as a different patient
3. Select: **Oral Surgery → Wisdom Tooth Removal**
4. Select date: **September 1, 2026**
5. View available times

**Expected Results:**
- ✓ Slots **9:00 AM, 9:30 AM, 10:00 AM** show **slotsLeft = 0** (BLOCKED)
- ✓ Slots **10:30 AM onwards** show **slotsLeft = 1** (AVAILABLE)
- ✓ Cannot book at 9:00 AM, 9:30 AM, or 10:00 AM

**Verify via API:**
```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-09-01&service=Wisdom%20Tooth%20Removal"
```

Expected response (partial):
```json
{
  "date": "2026-09-01",
  "service": "Wisdom Tooth Removal",
  "dentist": "Dr. Raphoncel Eduria",
  "dentist_id": 3,
  "service_duration": 60,
  "total_blocked_duration": 70,
  "availableTimes": [
    {
      "time": "09:00 AM",
      "slotsLeft": 0,
      "slotsBooked": 1
    },
    {
      "time": "09:30 AM",
      "slotsLeft": 0,
      "slotsBooked": 1
    },
    {
      "time": "10:00 AM",
      "slotsLeft": 0,
      "slotsBooked": 1
    },
    {
      "time": "10:30 AM",
      "slotsLeft": 1,
      "slotsBooked": 0
    },
    ...
  ]
}
```

---

### Test 4: Different Dentist Not Blocked

**Steps:**
1. Open the booking frontend
2. Log in as a patient
3. Select: **Orthodontics → Clear Aligners**
4. Select date: **September 1, 2026**
5. View available times

**Expected Results:**
- ✓ Slot **9:00 AM** shows **slotsLeft = 1** (AVAILABLE)
- ✓ Can book at 9:00 AM for Clear Aligners
- ✓ This confirms Dr. Eduria's appointment doesn't block Dr. Metillo's schedule

**Verify via API:**
```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-09-01&service=Clear%20Aligners"
```

Expected response (partial):
```json
{
  "date": "2026-09-01",
  "service": "Clear Aligners",
  "dentist": "Dr. Christine Faith Metillo",
  "dentist_id": 6,
  "service_duration": 45,
  "total_blocked_duration": 55,
  "availableTimes": [
    {
      "time": "09:00 AM",
      "slotsLeft": 1,
      "slotsBooked": 0
    },
    ...
  ]
}
```

---

### Test 5: Walk-in Appointment Auto-Assignment

**Steps:**
1. Log in as staff
2. Create a walk-in appointment for **Pediatric Care → Pediatric Check-up**
3. Date: **September 2, 2026**, Time: **10:00 AM**
4. Submit the booking

**Expected Results:**
- ✓ Appointment is created with status "Approved" (walk-ins are auto-approved)
- ✓ Dentist is automatically assigned: **Dr. Nico Bongolto (ID: 5)**
- ✓ Duration is calculated: **20 min (service) + 10 min (buffer) = 30 min**

**Verify in Database:**
```sql
SELECT id, patient_name, treatment, appointment_date, appointment_time, 
       duration_minutes, status, dentist_id, dentist_name
FROM appointments
WHERE appointment_date = '2026-09-02' 
  AND treatment = 'Pediatric Check-up'
ORDER BY appointment_time DESC
LIMIT 1;
```

Expected output:
```
id  | patient_name | treatment            | appointment_date | appointment_time | duration_minutes | status   | dentist_id | dentist_name
----|--------------|----------------------|------------------|------------------|------------------|----------|------------|---------------------------
124 | Walk-in      | Pediatric Check-up   | 2026-09-02       | 10:00:00         | 30               | Approved | 5          | Dr. Nico Bongolto
```

---

## Troubleshooting

### Issue: Test fails with "Cannot connect to server"
**Solution**: Make sure the backend server is running on `http://localhost:3000`. Start it with `npm start` in the `dental-backend` directory.

### Issue: Test fails with "No dentist found for service"
**Solution**: Verify that the service name matches exactly with the SERVICE_DURATIONS keys. Check `scheduling-engine.js` for the correct service names.

### Issue: Slots not blocking correctly
**Solution**: 
1. Verify the appointment has status = 'Approved' in the database
2. Check that `duration_minutes` is calculated correctly (service + 10)
3. Verify the appointment date and time are correct

### Issue: Wrong dentist assigned
**Solution**: 
1. Check that the dentist name matches exactly with the DENTISTS config
2. Verify the service is mapped to the correct dentist in SERVICE_TO_CATEGORY
3. Use `findDentistForService()` to debug the mapping

### Issue: Lunch break not respected
**Solution**: 
1. Verify that slots don't include 12:00 PM - 1:00 PM
2. Check that the `overlapsLunchBreak()` function is working correctly
3. Verify the CLINIC_CONFIG lunch break times are correct

---

## API Testing with cURL

### Get Available Times
```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-09-01&service=Wisdom%20Tooth%20Removal"
```

### Get Dentist Schedule
```bash
curl "http://localhost:3000/api/scheduling/dentist-schedule?dentist_id=D3&date=2026-09-01"
```

### Get All Dentists
```bash
curl "http://localhost:3000/api/scheduling/dentists"
```

### Get All Services
```bash
curl "http://localhost:3000/api/scheduling/services"
```

### Book an Appointment
```bash
curl -X POST "http://localhost:3000/api/scheduling/book" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "Wisdom Tooth Removal",
    "date": "2026-09-01",
    "start_time": "10:30",
    "patient_name": "Jane Doe",
    "phone": "555-5678",
    "email": "jane@example.com"
  }'
```

---

## Performance Testing

### Load Test: Multiple Concurrent Bookings
```bash
# Create a load test script to simulate multiple concurrent bookings
# This helps verify that the system handles concurrent requests correctly
```

### Database Query Performance
```sql
-- Check query performance for available times
EXPLAIN ANALYZE
SELECT id, appointment_time, duration_minutes, treatment
FROM appointments
WHERE appointment_date = '2026-09-01'
  AND dentist_id = 3
  AND status = 'Approved'
ORDER BY appointment_time ASC;
```

---

## Cleanup

### Delete Test Appointments
```sql
DELETE FROM appointments
WHERE appointment_date = '2026-09-01'
  AND patient_name = 'Test Patient';
```

### Reset Database
```bash
# If needed, reset the database to a clean state
node init-db.js
```

---

## Success Criteria

All tests pass when:
- ✓ Automated test completes with exit code 0
- ✓ Slots are correctly blocked based on approved appointments
- ✓ Different dentists don't block each other
- ✓ Duration is calculated correctly (service + 10 min)
- ✓ Walk-in appointments are auto-assigned to correct dentist
- ✓ Staff can approve and assign dentist to appointments
- ✓ Pending appointments don't block slots

---

## Next Steps

1. Run the automated test: `node test-dynamic-overlap.js`
2. Perform manual tests following the steps above
3. Verify all success criteria are met
4. Deploy to production when ready

---

**Questions?** Check the IMPLEMENTATION_VERIFICATION.md document for more details.
