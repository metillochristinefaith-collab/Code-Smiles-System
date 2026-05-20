# System Redesign Plan: Continuous Timeline Scheduling

## Current State (WRONG)
- ❌ Fixed 30-minute slots (9:00, 9:30, 10:00, etc.)
- ❌ Date + Time only (no duration tracking)
- ❌ No dentist differentiation (all dentists share same slots)
- ❌ Service-based blocking (same service + same date + same time = blocked)
- ❌ Maximum 4 slots per time (hardcoded)

## Required State (CORRECT)
- ✅ Continuous timeline (appointments can start at ANY time)
- ✅ Duration-based scheduling (each appointment has start_time + end_time)
- ✅ Dentist-based independent scheduling (each dentist has own timeline)
- ✅ Overlap detection (check if appointment duration conflicts)
- ✅ Specialty validation (verify dentist has required specialty)
- ✅ Buffer time enforcement (10 minutes after each appointment)
- ✅ Operating hours strict validation (09:00 AM - 07:00 PM)
- ✅ Available time gaps calculation (find free windows in dentist schedule)

## Dentist Structure
- **D1**: Dr. Smith - Oral Surgery + General Dentistry
- **D2**: Dr. Johnson - Orthodontics + Dental Implants
- **D3**: Dr. Williams - Pediatric Care
- **D4**: Dr. Brown - Cosmetic Dentistry

## Service Duration Model
Each service has:
- **Estimated duration** (minutes)
- **Buffer time** (10 minutes fixed)
- **Total booking block** = duration + 10 minutes

### Service Durations
- Dental Cleaning: 45 mins → 55 mins total
- Minor Oral Surgery: 60 mins → 70 mins total
- Dental Implant: 90-120 mins → 100-130 mins total
- Orthodontic Consultation: 30 mins → 40 mins total
- Pediatric Checkup: 30 mins → 40 mins total
- Cosmetic Consultation: 45 mins → 55 mins total
- Root Canal: 90 mins → 100 mins total
- Teeth Whitening: 60 mins → 70 mins total

## Core Booking Logic

### Overlap Rule (CRITICAL)
```
Reject booking if:
  requested_start < existing_end AND requested_end > existing_start
```

### Valid Booking Conditions
1. ✅ Dentist has NO overlapping schedule within requested time block
2. ✅ Requested time block fits into free gap in dentist schedule
3. ✅ Within clinic operating hours (09:00 AM - 07:00 PM)
4. ✅ Dentist has required specialty for service
5. ✅ No lunch break overlap (12:00 PM - 01:00 PM)

## Database Schema Changes

### Current appointments table
```sql
appointment_date DATE
appointment_time TIME
duration_minutes INTEGER
```

### New appointments table (SAME - already supports this!)
```sql
appointment_date DATE
appointment_time TIME (start_time)
duration_minutes INTEGER
-- Can calculate end_time = appointment_time + duration_minutes
```

**Good news**: The database schema ALREADY supports continuous timeline!
- `appointment_time` = start time
- `duration_minutes` = appointment duration
- We can calculate `end_time` = `appointment_time` + `duration_minutes`

## API Endpoints to Redesign

### 1. GET /api/scheduling/available-times
**Current**: Returns fixed 30-minute slots with count
**New**: Returns available time gaps for a specific dentist

**Query params**:
- `dentist_id`: D1, D2, D3, D4 (REQUIRED - NEW)
- `date`: YYYY-MM-DD
- `service`: Service name

**Response**: Array of available time windows
```json
{
  "dentist_id": "D1",
  "date": "2026-05-26",
  "service": "Dental Cleaning",
  "availableSlots": [
    {
      "start_time": "09:00",
      "end_time": "10:45",
      "duration_minutes": 105,
      "can_fit_service": true
    },
    {
      "start_time": "11:00",
      "end_time": "12:00",
      "duration_minutes": 60,
      "can_fit_service": true
    }
  ]
}
```

### 2. GET /api/scheduling/next-available
**Current**: Returns next available time for dentist
**New**: Same but with proper overlap detection

### 3. GET /api/scheduling/dentist-schedule
**Current**: Returns dentist bookings for a date
**New**: Same but with proper start_time + end_time calculation

### 4. POST /api/scheduling/book
**Current**: Checks same service + same date + same time
**New**: Checks duration-based overlap using overlap rule

**Validation**:
```
For each existing booking on same date for same dentist:
  IF requested_start < existing_end AND requested_end > existing_start:
    REJECT (overlap detected)
```

## Implementation Steps

### Phase 1: Update scheduling-engine.js
- ✅ Already has continuous timeline logic
- ✅ Already has overlap detection
- ✅ Already has specialty validation
- ✅ Already has buffer time enforcement
- ✅ Already has operating hours validation
- ✅ Already has available gaps calculation
- **Action**: Verify it's being used correctly in API

### Phase 2: Update scheduling-api.js
- ❌ Remove fixed slot generation
- ❌ Remove service-based blocking logic
- ✅ Add dentist_id as REQUIRED parameter
- ✅ Use AvailabilityCalculator for gap detection
- ✅ Use BookingValidator for overlap detection
- ✅ Calculate end_time from start_time + duration

### Phase 3: Update database queries
- ✅ Already fetching appointments with duration_minutes
- ✅ Already converting to start_min + end_min format
- **Action**: Ensure all queries use proper overlap detection

### Phase 4: Remove slot management
- ❌ Remove SlotManager usage
- ❌ Remove time_slots table operations
- ❌ Remove slot increase/decrease logic

## Testing Strategy

### Test Case 1: Overlap Detection
```
D1 has appointment: 09:00-09:55 (Dental Cleaning)
Try to book: 09:30-10:25 (Dental Cleaning)
Expected: REJECT (overlaps)
```

### Test Case 2: Adjacent Appointments (No Overlap)
```
D1 has appointment: 09:00-09:55 (Dental Cleaning)
Try to book: 09:55-10:50 (Dental Cleaning)
Expected: ACCEPT (no overlap, buffer already included)
```

### Test Case 3: Different Dentist
```
D1 has appointment: 09:00-09:55 (Dental Cleaning)
Try to book D2: 09:00-09:55 (Dental Cleaning)
Expected: ACCEPT (different dentist, independent schedule)
```

### Test Case 4: Specialty Validation
```
D3 (Pediatric Care only) tries to book: Dental Implants
Expected: REJECT (D3 doesn't have Dental Implants specialty)
```

### Test Case 5: Operating Hours
```
Try to book: 07:30 PM - 08:25 PM (outside 09:00 AM - 07:00 PM)
Expected: REJECT (outside operating hours)
```

## Files to Modify

1. **scheduling-api.js** - MAJOR REWRITE
   - Remove fixed slot generation
   - Add dentist_id as required parameter
   - Use continuous timeline logic
   - Use overlap detection

2. **scheduling-engine.js** - VERIFY (should be mostly correct)
   - Ensure overlap detection is correct
   - Ensure buffer time is applied
   - Ensure specialty validation works

3. **init-db.js** - NO CHANGES NEEDED
   - Schema already supports continuous timeline
   - time_slots table can be deprecated (but keep for now)

4. **slot-manager.js** - REMOVE USAGE
   - No longer needed
   - Can be deleted or deprecated

## Success Criteria

✅ Dentist-based independent scheduling works
✅ Continuous timeline (not fixed slots)
✅ Duration-based overlap detection
✅ Specialty validation enforced
✅ Buffer time applied to all appointments
✅ Operating hours strictly enforced
✅ Available gaps calculated correctly
✅ No more fixed 30-minute slots
✅ No more service-based blocking
✅ No more shared capacity between dentists

