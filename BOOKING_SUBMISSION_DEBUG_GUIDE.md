# Booking Submission Debug Guide

**Date**: May 22, 2026  
**Issue**: "Booking failed. Please try again." error when submitting bookings

---

## Problem Analysis

The booking submission is failing with a generic error message. This could be caused by:

1. **Backend API Error** - The `/add-appointment` endpoint is returning an error
2. **Validation Error** - Required fields are missing or invalid
3. **Network Error** - Connection issue with the backend
4. **Data Format Error** - Payload format doesn't match API expectations

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Try to submit a booking
4. Look for console logs starting with `[STAFF-BOOKING]` or `[BOOKING]`

**Expected Output:**
```
[STAFF-BOOKING] Submitting payload: {
  patient_id: null,
  full_name: "John Doe",
  phone: "09123456789",
  email: "john@example.com",
  treatment: "General Dentistry",
  services: ["Dental Cleaning"],
  appointment_date: "2026-05-27",
  appointment_time: "14:00",
  duration_minutes: 45,
  notes: "Staff booking type: Walk-in...",
  booking_type: "Walk-in"
}

[STAFF-BOOKING] Submission error: {
  error: {
    message: "...",
    error: "..."
  }
}
```

### Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Try to submit a booking
4. Look for a request to `/add-appointment`
5. Click on it and check:
   - **Status Code**: Should be 200 or 201 (not 400, 500, etc.)
   - **Request Payload**: Verify all fields are present
   - **Response**: Check what error the backend returned

---

## Common Issues & Solutions

### Issue 1: Missing Required Fields

**Error Message**: `"Booking failed. Please try again."`

**Cause**: One or more required fields are empty or invalid

**Solution**:
- Verify all form fields are filled:
  - ✅ Full Name (at least 2 characters)
  - ✅ Phone (11 digits, format: 09XXXXXXXXX)
  - ✅ Email (valid email format)
  - ✅ Age (1-120)
  - ✅ Service selected
  - ✅ Date selected
  - ✅ Time selected

**Check in Console**:
```javascript
// In browser console, type:
console.log({
  name: document.querySelector('[name="patientName"]')?.value,
  phone: document.querySelector('[name="patientPhone"]')?.value,
  email: document.querySelector('[name="patientEmail"]')?.value,
  age: document.querySelector('[name="patientAge"]')?.value
});
```

---

### Issue 2: Invalid Phone Format

**Error**: Phone validation fails

**Expected Format**: `09XXXXXXXXX` (11 digits starting with 09)

**Examples**:
- ✅ `09123456789` - Valid
- ❌ `9123456789` - Missing leading 0
- ❌ `+639123456789` - Has country code
- ❌ `09-123-456-789` - Has dashes

---

### Issue 3: Invalid Email Format

**Error**: Email validation fails

**Expected Format**: `user@domain.com`

**Examples**:
- ✅ `john@example.com` - Valid
- ✅ `john.doe@example.co.uk` - Valid
- ❌ `john@example` - Missing domain extension
- ❌ `john example@example.com` - Has space

---

### Issue 4: Backend API Error

**Error**: Network request fails with 500 or 400 status

**Possible Causes**:
1. Backend service is down
2. Database connection issue
3. Invalid data format in payload
4. Missing required fields on backend

**Solution**:
1. Check if backend is running: `http://localhost:3000/health` (or your backend URL)
2. Check backend logs for error details
3. Verify all fields match backend expectations

---

### Issue 5: Time Format Error

**Error**: Appointment time not accepted

**Cause**: Time format mismatch

**Expected Format**: 24-hour format (HH:MM)

**Examples**:
- ✅ `14:00` - 2:00 PM
- ✅ `09:30` - 9:30 AM
- ❌ `2:00 PM` - 12-hour format (should be converted to 14:00)

**Check in Console**:
```javascript
// Verify time conversion
const time12h = "02:00 PM";
const [time, modifier] = time12h.split(' ');
let [hours, minutes] = time.split(':');
let hour = parseInt(hours, 10);
if (modifier === 'PM' && hour !== 12) hour += 12;
console.log(`${String(hour).padStart(2, '0')}:${minutes}`); // Should output: 14:00
```

---

## Payload Validation Checklist

Before submitting, verify the payload contains:

```javascript
{
  patient_id: null,                    // ✅ Can be null for new patients
  full_name: "John Doe",               // ✅ At least 2 characters
  phone: "09123456789",                // ✅ 11 digits, starts with 09
  email: "john@example.com",           // ✅ Valid email format
  treatment: "General Dentistry",      // ✅ Valid category
  services: ["Dental Cleaning"],       // ✅ Array of service names
  appointment_date: "2026-05-27",      // ✅ Format: YYYY-MM-DD
  appointment_time: "14:00",           // ✅ Format: HH:MM (24-hour)
  duration_minutes: 45,                // ✅ Number > 0
  notes: "...",                        // ✅ Can be empty string
  booking_type: "Walk-in"              // ✅ "Walk-in" or "Registered patient"
}
```

---

## Testing Checklist

- [ ] All form fields are filled with valid data
- [ ] Phone number is in correct format (09XXXXXXXXX)
- [ ] Email is in correct format (user@domain.com)
- [ ] Age is between 1-120
- [ ] Service is selected
- [ ] Date is selected (not in the past)
- [ ] Time is selected
- [ ] Browser console shows no errors
- [ ] Network request shows 200/201 status
- [ ] Backend is running and accessible

---

## How to Enable Detailed Logging

The code now includes console logging. To see detailed logs:

1. Open Browser Developer Tools (F12)
2. Go to **Console** tab
3. Filter by `[BOOKING]` or `[STAFF-BOOKING]` to see relevant logs
4. Try to submit a booking
5. Check the logs for:
   - Payload being sent
   - API response
   - Error details

**Example Log Output**:
```
[STAFF-BOOKING] Submitting payload: {...}
[STAFF-BOOKING] Submission error: {error: {message: "..."}}
```

---

## Backend Integration

The frontend sends requests to: `POST /add-appointment`

**Expected Request Format**:
```json
{
  "patient_id": null,
  "full_name": "John Doe",
  "phone": "09123456789",
  "email": "john@example.com",
  "treatment": "General Dentistry",
  "services": ["Dental Cleaning"],
  "appointment_date": "2026-05-27",
  "appointment_time": "14:00",
  "duration_minutes": 45,
  "notes": "...",
  "booking_type": "Walk-in"
}
```

**Expected Response (Success)**:
```json
{
  "id": 123,
  "appointment_id": "APT-2026-05-27-001",
  "status": "pending",
  "message": "Appointment booked successfully"
}
```

**Expected Response (Error)**:
```json
{
  "error": "Invalid phone format",
  "message": "Phone must be in format 09XXXXXXXXX"
}
```

---

## Next Steps

1. **Check Console Logs**: Open browser console and look for `[BOOKING]` or `[STAFF-BOOKING]` logs
2. **Verify Payload**: Ensure all fields are present and valid
3. **Check Backend**: Verify backend is running and responding
4. **Review Error Message**: The error message in the console will indicate the specific issue
5. **Contact Support**: If issue persists, provide:
   - Console logs
   - Network request/response
   - Backend error logs
   - Steps to reproduce

---

## Files Modified for Debugging

- `patient-booking.ts` - Added console logging for payload and errors
- `staff-booking.ts` - Added console logging for payload and errors

**Build Status**: ✅ Successful (17.480 seconds)

---

**Last Updated**: May 22, 2026
