# Time Slots First Click Fix - Both Patient & Staff Booking

## Issue
When clicking a date for the first time, no time slots appeared. On the second click, slots would show. This was a race condition / change detection issue.

## Root Cause
1. When a date was clicked, the API call was initiated (async)
2. Angular would render the view before the API response arrived
3. `availableSlots` was empty during initial render
4. When API response arrived, change detection wasn't always triggered
5. Second click would work because slots were already populated from first click

## Solution

### Patient Booking (`patient-booking.ts`)

**Change 1: Clear slots immediately on date selection**
```typescript
selectDate(date: string) {
  // ... validation ...
  this.selectedDate = date;
  this.selectedTime = '';
  this.submitError = '';
  this.availableSlots = []; // ← NEW: Clear immediately while loading
  this.refreshAvailableSlots(date);
}
```

**Change 2: Ensure change detection in error case**
```typescript
private refreshAvailableSlots(date: string) {
  this.api.getAvailableTimes(date, service).subscribe({
    next: (response: any) => {
      this.availableSlots = response.availableTimes || [];
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.availableSlots = [];
      this.cdr.detectChanges(); // ← NEW: Added change detection
    }
  });
}
```

### Staff Booking (`staff-booking.ts`)

**Change 1: Clear slots immediately on date selection**
```typescript
selectDate(date: string): void {
  // ... validation ...
  this.selectedDate = date;
  this.selectedTime = '';
  this.submitError = '';
  this.availableSlots = []; // ← NEW: Clear immediately while loading
  
  if (this.selectedCategory) {
    this.fetchAvailableSlotsFromAPI(date);
  }
}
```

**Change 2: Ensure change detection in both cases**
```typescript
fetchAvailableSlotsFromAPI(date: string): void {
  this.api.getAvailableTimes(date, this.selectedCategory).subscribe({
    next: (response) => {
      this.availableSlots = (response.availableTimes || []).map(...);
      this.cdr.detectChanges(); // ← Ensure change detection
    },
    error: (err) => {
      this.availableSlots = [];
      this.cdr.detectChanges(); // ← NEW: Added change detection
    },
  });
}
```

## How It Works Now

1. User clicks a date
2. `availableSlots` is immediately cleared to `[]`
3. Angular renders with empty slots (shows placeholder)
4. API call is made in background
5. API response arrives
6. `availableSlots` is populated with slots
7. `cdr.detectChanges()` ensures Angular re-renders
8. User sees slots appear

## Files Modified
1. `/dental-frontend/src/app/patient-booking/patient-booking.ts` (2 changes)
2. `/dental-frontend/src/app/staff-booking/staff-booking.ts` (2 changes)

## Testing
1. Click a date - slots should appear immediately (or show loading state)
2. Click another date - slots should update
3. Try double booking - fully booked slots should show as disabled
4. No need to click twice anymore

## Risk Assessment
**Risk Level**: VERY LOW ✓
- Only added explicit state clearing and change detection
- No logic changes
- No API changes
- Improves UX consistency
- Fully backward compatible
