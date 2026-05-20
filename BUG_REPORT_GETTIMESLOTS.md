# Bug Report: getTimeSlots Missing Service Parameter

## Summary
The patient booking system has a critical bug where the `getAvailableTimes()` API call is missing the required `service` parameter, causing the backend to return an error or incorrect time slots.

## Root Cause

### Frontend Issue (patient-booking.ts)
**Location:** `dental-frontend/src/app/patient-booking/patient-booking.ts` line 346

```typescript
private refreshAvailableSlots(date: string) {
  // Fetch real slot counts from API
  this.api.getAvailableTimes(date).subscribe({
    // ...
  });
}
```

The `refreshAvailableSlots()` method calls `getAvailableTimes(date)` with **only the date parameter**.

### API Service Issue (api.service.ts)
**Location:** `dental-frontend/src/app/services/api.service.ts` line 202-204

```typescript
getAvailableTimes(date: string): Observable<any> {
  return this.http.get(`${this.base}/api/scheduling/available-times?date=${encodeURIComponent(date)}`);
}
```

The method only passes the `date` query parameter.

### Backend Requirement (scheduling-api.js)
**Location:** `dental-backend/scheduling-api.js` line 52-100

```javascript
router.get('/available-times', async (req, res) => {
  try {
    const { date, service } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Missing date parameter' });
    }

    if (!service) {
      return res.status(400).json({ error: 'Missing service parameter' });  // ← BUG TRIGGERED HERE
    }
```

The backend **requires both `date` AND `service`** parameters. Without the service parameter, the API returns a 400 error.

## Impact

1. **Patient cannot see available time slots** - The API call fails with "Missing service parameter" error
2. **Booking flow breaks** - Users cannot proceed past the date selection step
3. **Error handling** - The frontend catches the error and displays an empty slots list, confusing users

## The Fix

### Option 1: Pass the selected service to the API (Recommended)

**File:** `dental-frontend/src/app/patient-booking/patient-booking.ts`

Change line 346 from:
```typescript
private refreshAvailableSlots(date: string) {
  this.api.getAvailableTimes(date).subscribe({
```

To:
```typescript
private refreshAvailableSlots(date: string) {
  // Get the first selected service (or use a default)
  const service = this.selectedSubServices.length > 0 
    ? this.selectedSubServices[0].name 
    : 'Dental Cleaning'; // fallback service
  
  this.api.getAvailableTimes(date, service).subscribe({
```

**File:** `dental-frontend/src/app/services/api.service.ts`

Change line 202-204 from:
```typescript
getAvailableTimes(date: string): Observable<any> {
  return this.http.get(`${this.base}/api/scheduling/available-times?date=${encodeURIComponent(date)}`);
}
```

To:
```typescript
getAvailableTimes(date: string, service: string): Observable<any> {
  return this.http.get(`${this.base}/api/scheduling/available-times?date=${encodeURIComponent(date)}&service=${encodeURIComponent(service)}`);
}
```

### Option 2: Make service optional in the backend

Modify the backend to not require the service parameter and return all available slots regardless of service. However, this defeats the purpose of the service-specific slot blocking logic.

## Why This Bug Exists

The backend was designed to block time slots when the **same service** is already booked at that date/time (see scheduling-api.js line 73-80):

```javascript
// RULE: If an appointment exists with SAME SERVICE + SAME DATE + SAME TIME, 
// that slot is BLOCKED (0 slots available)
```

But the frontend never passes the service information, so the backend cannot apply this rule and rejects the request entirely.

## Testing the Fix

1. Select a service category and specific services
2. Select a date
3. Verify that available time slots appear (should show times with slot counts)
4. Verify that if a service is already booked at a time, that slot shows 0 available

## Related Code

- **Backend slot logic:** `scheduling-api.js` lines 52-100
- **Frontend booking flow:** `patient-booking.ts` lines 345-356
- **API service:** `api.service.ts` lines 202-209
