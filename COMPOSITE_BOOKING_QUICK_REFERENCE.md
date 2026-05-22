# Composite Booking System - Quick Reference

## File Structure

```
dental-backend/
├── composite-booking-service.js      # Business logic & managers
├── composite-booking-api.js          # REST API endpoints
├── scheduling-engine.js              # (existing) Conflict detection
└── index.js                          # (update) Add API routes

dental-frontend/src/app/
├── composite-patient-booking/
│   ├── composite-patient-booking.ts
│   ├── composite-patient-booking.html
│   └── composite-patient-booking.css
├── composite-staff-booking/
│   ├── composite-staff-booking.ts
│   ├── composite-staff-booking.html
│   └── composite-staff-booking.css
└── (routing)                         # (update) Add routes

Database/
└── COMPOSITE_BOOKING_SCHEMA.sql      # Database tables & indexes
```

## Key Concepts

### Booking ID Format
- **Composite Booking:** `CB-2026-05-22-0001`
- **Appointment ID:** `CBA-2026-05-22-0001-01` (sequence 01, 02, 03)

### Status Values
- **Booking Status:** Pending, Approved, Partially Approved, Completed, Cancelled
- **Appointment Status:** Pending, Approved, Completed, Cancelled, No-show
- **Confirmation Status:** Not Confirmed, Confirmed, Reschedule Requested

### Service Limits
- **Max Services:** 3 per booking
- **Max Duration:** 120 minutes total
- **Service Duration:** 15-120 minutes (varies by service)

## API Quick Reference

### Create Booking
```bash
POST /api/composite-booking/create
{
  "services": [
    { "name": "Dental Cleaning", "category": "General Dentistry", "duration": 45 }
  ],
  "appointments": [
    { "date": "2026-05-25", "time": "09:00" }
  ],
  "patientDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "age": 35,
    "notes": ""
  },
  "bookingType": "Patient",
  "intakePriority": "Standard",
  "intakeSource": "Online"
}
```

### Get Booking
```bash
GET /api/composite-booking/CB-2026-05-22-0001
```

### Get Patient Bookings
```bash
GET /api/composite-booking/patient/123
```

### Update Appointment Status
```bash
PATCH /api/composite-booking/appointment/CBA-2026-05-22-0001-01/status
{
  "status": "Approved",
  "notes": "Approved by Dr. Smith"
}
```

### Cancel Booking
```bash
DELETE /api/composite-booking/CB-2026-05-22-0001
{
  "reason": "Patient requested cancellation",
  "cancelledBy": 5
}
```

### Get Available Dentists
```bash
GET /api/composite-booking/dentists/Dental%20Cleaning
```

### Get Available Slots
```bash
GET /api/composite-booking/available-slots?date=2026-05-25&serviceName=Dental%20Cleaning&dentistId=3
```

## Database Tables

### composite_bookings
- `id` - Primary key
- `booking_id` - Unique booking identifier
- `patient_id` - Reference to users table
- `service_count` - Number of services (1-3)
- `overall_status` - Booking status
- `created_at`, `updated_at` - Timestamps

### composite_booking_appointments
- `id` - Primary key
- `appointment_id` - Unique appointment identifier
- `composite_booking_id` - Reference to composite_bookings
- `dentist_id` - Assigned dentist
- `appointment_date`, `appointment_time` - Schedule
- `appointment_status` - Individual appointment status
- `appointment_sequence` - Order (1, 2, or 3)

### service_dentist_mapping
- `service_name` - Service name
- `dentist_id` - Assigned dentist
- `is_primary` - Primary dentist for service
- `is_active` - Active mapping

## Frontend Components

### Patient Booking (4 Steps)
1. **Service Selection** - Choose up to 3 services
2. **Individual Scheduling** - Schedule each service separately
3. **Patient Details** - Confirm patient information
4. **Review & Confirm** - Review and submit booking

### Staff Booking (4 Steps)
1. **Patient & Type** - Enter patient info and booking type
2. **Service Selection** - Choose up to 3 services
3. **Individual Scheduling** - Schedule each service separately
4. **Review & Confirm** - Review and submit booking

## Key Methods

### CompositeBookingManager

```typescript
// Create booking
await CompositeBookingManager.createCompositeBooking(request, userId)

// Get booking
await CompositeBookingManager.getCompositeBooking(bookingId)

// Get patient bookings
await CompositeBookingManager.getPatientCompositeBookings(patientId)

// Update appointment status
await CompositeBookingManager.updateAppointmentStatus(appointmentId, status, notes)

// Cancel booking
await CompositeBookingManager.cancelCompositeBooking(bookingId, reason, cancelledBy)

// Get available dentists
await CompositeBookingManager.getAvailableDentistsForService(serviceName)
```

### CompositeBookingValidator

```typescript
// Validate booking request
CompositeBookingValidator.validateBookingRequest(request)

// Check for conflicts
await CompositeBookingValidator.validateAppointmentConflict(
  dentistId, 
  appointmentDate, 
  appointmentTime, 
  durationMinutes
)
```

## Dentist-Service Mapping

| Service | Dentist | Specialty |
|---------|---------|-----------|
| Dental Cleaning | Dr. Raphoncel Eduria (D3) | General Dentistry |
| Teeth Whitening | Dr. Derence Acojedo (D2) | Cosmetic Arts |
| Traditional Braces | Dr. Christine Faith Metillo (D6) | Orthodontics |
| Wisdom Tooth Removal | Dr. Raphoncel Eduria (D3) | Oral Surgery |
| Single Tooth Implant | Dr. Christine Faith Metillo (D6) | Dental Implants |
| Pediatric Check-up | Dr. Nico Bongolto (D5) | Pediatric Care |

## Operating Hours

| Day | Hours |
|-----|-------|
| Monday-Friday | 8:00 AM - 8:30 PM |
| Saturday | 8:00 AM - 9:00 PM |
| Sunday | 8:00 AM - 9:30 PM |
| Lunch Break | 12:00 PM - 1:00 PM (daily) |

## Validation Rules

### Service Selection
- ✅ At least 1 service required
- ✅ Maximum 3 services allowed
- ✅ Total duration ≤ 120 minutes

### Patient Details
- ✅ First name required
- ✅ Last name required
- ✅ Valid email format required
- ✅ Valid phone format required (10+ digits)
- ✅ Age must be positive integer

### Appointment Scheduling
- ✅ Date must be in future
- ✅ Time must be within operating hours
- ✅ Time must not overlap lunch break
- ✅ No conflicts with existing appointments
- ✅ Appointment must fit within operating hours

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Validation failed | Check request format |
| 400 | No dentist found | Service not mapped to dentist |
| 400 | Scheduling conflict | Select different time |
| 404 | Booking not found | Check booking ID |
| 500 | Database error | Check database connection |

## Testing Checklist

- [ ] Create booking with 1 service
- [ ] Create booking with 2 services
- [ ] Create booking with 3 services
- [ ] Exceed maximum services (should fail)
- [ ] Exceed maximum duration (should fail)
- [ ] Schedule conflicting appointments (should fail)
- [ ] Update appointment status
- [ ] Cancel booking
- [ ] Retrieve booking details
- [ ] Get patient bookings
- [ ] Get available dentists
- [ ] Get available slots

## Common Workflows

### Patient Books Multiple Services
1. Navigate to composite-patient-booking
2. Select services (Step 1)
3. Schedule each service (Step 2)
4. Confirm patient details (Step 3)
5. Review and submit (Step 4)
6. Receive booking ID

### Staff Creates Walk-in Booking
1. Navigate to composite-staff-booking
2. Enter patient info and booking type (Step 1)
3. Select services (Step 2)
4. Schedule each service (Step 3)
5. Review and submit (Step 4)
6. Booking created immediately

### Staff Approves Booking
1. View pending bookings
2. Click on booking
3. Review appointments
4. Approve each appointment
5. Send confirmation email

## Performance Tips

- Cache available slots for 5 minutes
- Use database indexes on date/dentist queries
- Lazy load calendar months
- Debounce slot loading API calls
- Batch conflict checks

## Debugging

### Check Booking Status
```sql
SELECT * FROM composite_bookings WHERE booking_id = 'CB-2026-05-22-0001';
```

### Check Appointments
```sql
SELECT * FROM composite_booking_appointments 
WHERE composite_booking_id = 1 
ORDER BY appointment_sequence;
```

### Check Conflicts
```sql
SELECT * FROM composite_booking_conflicts 
WHERE resolution_status = 'Unresolved';
```

### Check Audit Log
```sql
SELECT * FROM composite_booking_audit_log 
WHERE composite_booking_id = 1 
ORDER BY created_at DESC;
```

## Integration Checklist

- [ ] Run database migration script
- [ ] Add composite-booking-api.js to backend
- [ ] Add composite-booking-service.js to backend
- [ ] Update index.js to include API routes
- [ ] Add patient booking component to frontend
- [ ] Add staff booking component to frontend
- [ ] Update routing configuration
- [ ] Add navigation links
- [ ] Test complete booking flow
- [ ] Deploy to production

## Support Resources

- **Implementation Guide:** COMPOSITE_BOOKING_IMPLEMENTATION_GUIDE.md
- **Database Schema:** COMPOSITE_BOOKING_SCHEMA.sql
- **API Documentation:** composite-booking-api.js (JSDoc comments)
- **Service Documentation:** composite-booking-service.js (JSDoc comments)

---

**Last Updated:** May 22, 2026
**Version:** 1.0.0
