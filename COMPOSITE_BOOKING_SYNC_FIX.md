# Composite Booking Frontend Sync Fix

## Problem
When a patient created a composite booking (multiple services in one booking), the appointment was saved to the database but:
1. The frontend wasn't showing it in "My Appointments"
2. Notifications weren't being created for staff
3. Dashboard stats weren't including composite bookings

## Root Cause
The frontend endpoints were only querying the regular `appointments` table, not the `composite_booking_appointments` table where composite bookings are stored.

## Solution Applied

### 1. Updated `/my-appointments/:patientId` Endpoint
**File**: `dental-backend/index.js`

Changed from querying only `appointments` table to querying BOTH:
- Regular `appointments` table
- `composite_booking_appointments` table (joined with `composite_bookings`)

The endpoint now:
- Fetches regular appointments
- Fetches composite booking appointments
- Combines both results
- Sorts by date descending
- Returns unified list to frontend

```javascript
// Get regular appointments
const regularAppointments = await db.query(
  `SELECT ... FROM appointments WHERE patient_id = $1`
);

// Get composite booking appointments
const compositeAppointments = await db.query(
  `SELECT ... FROM composite_booking_appointments cba
   JOIN composite_bookings cb ON cba.composite_booking_id = cb.id
   WHERE cb.patient_id = $1`
);

// Combine and sort
const allAppointments = [...regularAppointments.rows, ...compositeAppointments.rows];
allAppointments.sort((a, b) => dateB - dateA);
```

### 2. Updated `/patient/dashboard-stats/:patientId` Endpoint
**File**: `dental-backend/index.js`

Enhanced to include composite booking statistics:
- Counts pending composite appointments
- Counts upcoming composite appointments
- Counts completed composite appointments
- Finds next appointment from either regular or composite bookings

Now returns accurate totals combining both appointment types.

### 3. Added Staff Notifications for Composite Bookings
**File**: `dental-backend/composite-booking-service.js`

Added notification creation in `createCompositeBooking()`:
```javascript
// Create notifications for staff
const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
for (const staff of staffUsers.rows) {
  await client.query(
    `INSERT INTO notifications (user_id, title, detail, level)
     VALUES ($1, $2, $3, $4)`,
    [staff.id, 'New Composite Booking Request', detail, 'New']
  );
}
```

## Files Modified
1. `dental-backend/index.js`
   - Updated `/my-appointments/:patientId` endpoint
   - Updated `/patient/dashboard-stats/:patientId` endpoint

2. `dental-backend/composite-booking-service.js`
   - Added staff notifications in `createCompositeBooking()`

## Result
✓ Composite bookings now appear in "My Appointments"
✓ Dashboard stats include composite appointments
✓ Staff receive notifications for composite bookings
✓ Frontend shows unified list of all appointments (regular + composite)
✓ Notifications are synced properly

## Data Structure
Composite bookings create separate appointment records for each service:
- Each service gets its own appointment with its own dentist
- Each appointment has its own date/time
- All appointments are linked via `composite_booking_id`
- Frontend treats them as individual appointments (which they are)

## Testing
1. Create a composite booking with 2-3 services
2. Verify it appears in "My Appointments"
3. Verify dashboard shows updated appointment count
4. Verify staff receives notification
5. Verify each service shows as separate appointment
