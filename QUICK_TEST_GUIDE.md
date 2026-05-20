# Quick Test Guide - Walk-in Auto-Confirmation

## How to Test the Fix

### Option 1: Test via Frontend (Recommended)

1. **Open Staff Booking Page**
   - Go to: http://localhost:4200/staff-booking

2. **Book a Walk-in Appointment**
   - Booking type: Select "Walk-in"
   - Service: Select "General Dentistry" → "Dental Cleaning"
   - Date: Select May 26, 2026
   - Time: Select 09:00 AM
   - Patient name: "John Doe"
   - Phone: "09171234567"
   - Email: (optional)
   - Click "Submit Appointment"

3. **Expected Result**
   - ✅ See message: "✓ Walk-in Appointment Confirmed"
   - ✅ Status shows: "✓ Checked In" (in green)
   - ✅ Appointment is immediately confirmed

4. **Book a Registered Patient Appointment**
   - Booking type: Select "Registered patient"
   - Service: Select "General Dentistry" → "Dental Cleaning"
   - Date: Select May 26, 2026
   - Time: Select 10:00 AM
   - Patient name: "Jane Smith"
   - Phone: "09171234567"
   - Email: (optional)
   - Click "Submit Appointment"

5. **Expected Result**
   - ✅ See message: "Appointment Request Submitted"
   - ✅ Status shows: "Pending" (in amber)
   - ✅ Appointment is pending approval

### Option 2: Test via API (For Developers)

#### Test Walk-in Booking
```bash
curl -X POST http://localhost:3000/add-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Walk-in Test Patient",
    "phone": "09171234567",
    "email": "walkin@test.com",
    "treatment": "Dental Cleaning",
    "appointment_date": "2026-05-26",
    "appointment_time": "14:00",
    "duration_minutes": 45,
    "services": ["Dental Cleaning"],
    "booking_type": "Walk-in"
  }'
```

**Expected Response**:
```json
{
  "message": "Walk-in appointment confirmed!",
  "id": 102,
  "status": "Approved",
  "booking_type": "Walk-in"
}
```

#### Test Registered Patient Booking
```bash
curl -X POST http://localhost:3000/add-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Registered Test Patient",
    "phone": "09171234567",
    "email": "registered@test.com",
    "treatment": "Dental Cleaning",
    "appointment_date": "2026-05-26",
    "appointment_time": "15:00",
    "duration_minutes": 45,
    "services": ["Dental Cleaning"],
    "booking_type": "Registered patient"
  }'
```

**Expected Response**:
```json
{
  "message": "Appointment request submitted!",
  "id": 103,
  "status": "Pending",
  "booking_type": "Registered patient"
}
```

### Option 3: Check Database

#### View Recent Appointments
```bash
node -e "const pool = require('./db'); pool.query('SELECT id, patient_name, status, confirmation_status, appointment_date, appointment_time FROM appointments WHERE appointment_date = \\'2026-05-26\\' ORDER BY id DESC LIMIT 5').then(r => console.log(JSON.stringify(r.rows, null, 2))).catch(e => console.error(e.message))"
```

**Expected Output**:
```json
[
  {
    "id": 103,
    "patient_name": "Registered Test Patient",
    "status": "Pending",
    "confirmation_status": "Not Confirmed",
    "appointment_date": "2026-05-26",
    "appointment_time": "15:00"
  },
  {
    "id": 102,
    "patient_name": "Walk-in Test Patient",
    "status": "Approved",
    "confirmation_status": "Confirmed",
    "appointment_date": "2026-05-26",
    "appointment_time": "14:00"
  }
]
```

## What to Look For

### Walk-in Appointments ✅
- Status: `Approved`
- Confirmation: `Confirmed`
- Frontend message: "✓ Walk-in Appointment Confirmed"
- Status badge: Green "✓ Checked In"

### Registered Patient Appointments ⏳
- Status: `Pending`
- Confirmation: `Not Confirmed`
- Frontend message: "Appointment Request Submitted"
- Status badge: Amber "Pending"

## Troubleshooting

### Issue: Frontend shows error "booking_type is not a known property"
**Solution**: Clear browser cache and refresh
- Press Ctrl+Shift+Delete
- Clear cache
- Refresh page

### Issue: Backend returns 500 error
**Solution**: Check backend logs
- Look for error messages in terminal
- Verify database connection
- Check if `confirmation_status` column exists in appointments table

### Issue: Appointment created but status is wrong
**Solution**: Verify booking_type is being sent
- Check browser network tab (F12 → Network)
- Look for POST request to `/add-appointment`
- Verify `booking_type` field is in request body

## Success Criteria

✅ Walk-in appointments show "Approved" status in database
✅ Registered appointments show "Pending" status in database
✅ Frontend shows different confirmation messages
✅ Walk-in status badge is green
✅ Registered status badge is amber
✅ Staff notifications differentiate between types

