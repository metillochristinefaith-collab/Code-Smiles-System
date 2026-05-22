# Composite Booking System - Implementation Guide

## Overview

The Composite Booking System allows patients and staff to book up to 3 services in a single booking session. Each service gets its own independent appointment with a separate dentist, date, and time slot. This provides a seamless booking experience while maintaining proper scheduling and conflict management.

---

## Architecture

### Key Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPOSITE BOOKING SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (Angular Components)                           │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • composite-patient-booking.ts/html/css                 │   │
│  │  • composite-staff-booking.ts/html/css                   │   │
│  │  • 4-step wizard for patients                            │   │
│  │  • 4-step form for staff                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  BACKEND API (Express.js)                                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • composite-booking-api.js (REST endpoints)             │   │
│  │  • composite-booking-service.js (business logic)         │   │
│  │  • scheduling-engine.js (conflict detection)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DATABASE (PostgreSQL)                                   │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • composite_bookings (main booking record)              │   │
│  │  • composite_booking_appointments (individual appts)     │   │
│  │  • service_dentist_mapping (service → dentist)           │   │
│  │  • composite_booking_audit_log (audit trail)             │   │
│  │  • composite_booking_conflicts (conflict tracking)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. composite_bookings
Main booking record that groups multiple service appointments together.

```sql
CREATE TABLE composite_bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(50) UNIQUE,        -- CB-2026-05-22-0001
  patient_id INT REFERENCES users(id),
  patient_name VARCHAR(255),
  patient_email VARCHAR(255),
  patient_phone VARCHAR(20),
  
  booking_type VARCHAR(50),             -- 'Patient' or 'Walk-in'
  intake_priority VARCHAR(50),          -- 'Standard' or 'Urgent'
  intake_source VARCHAR(100),           -- 'Front desk', 'Phone call', etc.
  
  service_count INT,                    -- 1-3 services
  total_duration_minutes INT,
  
  overall_status VARCHAR(50),           -- 'Pending', 'Approved', 'Completed'
  approval_status JSONB,                -- Per-appointment approval tracking
  
  patient_notes TEXT,
  staff_notes TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by INT REFERENCES users(id)
);
```

### 2. composite_booking_appointments
Individual appointments within a composite booking.

```sql
CREATE TABLE composite_booking_appointments (
  id SERIAL PRIMARY KEY,
  appointment_id VARCHAR(50) UNIQUE,    -- CBA-2026-05-22-0001-01
  composite_booking_id INT REFERENCES composite_bookings(id),
  
  service_name VARCHAR(255),
  service_category VARCHAR(100),
  service_duration_minutes INT,
  
  dentist_id INT REFERENCES dentist(id),
  dentist_name VARCHAR(255),
  dentist_specialty VARCHAR(100),
  
  appointment_date DATE,
  appointment_time TIME,
  appointment_end_time TIME,
  
  appointment_status VARCHAR(50),       -- 'Pending', 'Approved', 'Completed'
  confirmation_status VARCHAR(50),
  
  appointment_sequence INT,             -- 1, 2, or 3
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 3. service_dentist_mapping
Maps services to dentists for automatic assignment.

```sql
CREATE TABLE service_dentist_mapping (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(255),
  service_category VARCHAR(100),
  dentist_id INT REFERENCES dentist(id),
  is_primary BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(service_name, dentist_id)
);
```

---

## Backend Implementation

### 1. Composite Booking Service

**File:** `dental-backend/composite-booking-service.js`

#### Key Classes

**CompositeBookingIdGenerator**
- Generates unique booking IDs: `CB-YYYY-MM-DD-XXXX`
- Generates appointment IDs: `CBA-YYYY-MM-DD-XXXX-YY`

**CompositeBookingValidator**
- Validates booking requests
- Checks for scheduling conflicts
- Validates patient details

**CompositeBookingManager**
- Creates composite bookings with transactions
- Retrieves booking details
- Updates appointment statuses
- Cancels bookings
- Manages audit logs

#### Example: Create Composite Booking

```javascript
const request = {
  services: [
    { name: 'Dental Cleaning', category: 'General Dentistry', duration: 45 },
    { name: 'Teeth Whitening', category: 'Cosmetic Arts', duration: 60 }
  ],
  appointments: [
    { date: '2026-05-25', time: '09:00' },
    { date: '2026-05-25', time: '10:30' }
  ],
  patientDetails: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '1234567890',
    age: 35,
    notes: 'First time patient'
  },
  bookingType: 'Patient',
  intakePriority: 'Standard',
  intakeSource: 'Online'
};

const result = await CompositeBookingManager.createCompositeBooking(request, userId);
// Returns: { success: true, compositeBooking: { id, bookingId, appointments } }
```

### 2. Composite Booking API

**File:** `dental-backend/composite-booking-api.js`

#### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/composite-booking/create` | Create new composite booking |
| GET | `/api/composite-booking/:bookingId` | Get booking details |
| GET | `/api/composite-booking/patient/:patientId` | Get patient's bookings |
| PATCH | `/api/composite-booking/appointment/:appointmentId/status` | Update appointment status |
| DELETE | `/api/composite-booking/:bookingId` | Cancel booking |
| GET | `/api/composite-booking/dentists/:serviceName` | Get available dentists |
| GET | `/api/composite-booking/available-slots` | Get available time slots |
| POST | `/api/composite-booking/validate` | Validate booking request |
| GET | `/api/composite-booking/:bookingId/audit-log` | Get audit trail |
| GET | `/api/composite-booking/stats/summary` | Get statistics |

#### Example: Create Booking API Call

```bash
POST /api/composite-booking/create
Content-Type: application/json

{
  "services": [
    { "name": "Dental Cleaning", "category": "General Dentistry", "duration": 45 },
    { "name": "Teeth Whitening", "category": "Cosmetic Arts", "duration": 60 }
  ],
  "appointments": [
    { "date": "2026-05-25", "time": "09:00" },
    { "date": "2026-05-25", "time": "10:30" }
  ],
  "patientDetails": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "age": 35,
    "notes": "First time patient"
  },
  "bookingType": "Patient",
  "intakePriority": "Standard",
  "intakeSource": "Online"
}

Response:
{
  "success": true,
  "compositeBooking": {
    "id": 1,
    "bookingId": "CB-2026-05-25-0001",
    "createdAt": "2026-05-22T10:30:00Z",
    "serviceCount": 2,
    "totalDuration": 115,
    "appointments": [
      {
        "id": 1,
        "appointmentId": "CBA-2026-05-25-0001-01",
        "appointmentDate": "2026-05-25",
        "appointmentTime": "09:00"
      },
      {
        "id": 2,
        "appointmentId": "CBA-2026-05-25-0001-02",
        "appointmentDate": "2026-05-25",
        "appointmentTime": "10:30"
      }
    ]
  }
}
```

---

## Frontend Implementation

### 1. Patient Composite Booking Component

**File:** `dental-frontend/src/app/composite-patient-booking/`

#### 4-Step Wizard

**Step 1: Service Selection**
- Browse service categories
- Select up to 3 services
- Validate total duration (max 120 minutes)
- Display selected services summary

**Step 2: Individual Service Scheduling**
- For each service:
  - Select date from calendar
  - Choose available dentist
  - Select time slot
  - View appointment summary
- Navigate between services

**Step 3: Patient Details**
- Confirm/update patient information
- First name, last name, email, phone
- Optional age and notes
- Validation before proceeding

**Step 4: Review & Confirm**
- Display all patient information
- Show all appointments with details
- Confirm booking submission
- Success modal with booking ID

#### Component Structure

```typescript
export class CompositePatientBookingComponent implements OnInit {
  // Step 1: Service Selection
  currentStep: number = 1;
  selectedCategory: string = '';
  selectedServices: string[] = [];
  selectedSubServices: SelectedService[] = [];
  totalSelectedDuration: number = 0;

  // Step 2: Scheduling
  currentServiceIndex: number = 0;
  serviceSchedules: Array<{
    service: SelectedService;
    selectedDate: string;
    selectedTime: string;
    availableSlots: TimeSlot[];
    availableDentists: any[];
    selectedDentist?: any;
  }> = [];

  // Step 3: Patient Details
  patientDetails = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    notes: ''
  };

  // Step 4: Review
  confirmedBooking = {
    bookingId: '',
    fullName: '',
    services: [],
    appointments: []
  };
}
```

### 2. Staff Composite Booking Component

**File:** `dental-frontend/src/app/composite-staff-booking/`

#### 4-Step Form

**Step 1: Patient & Booking Type**
- Booking type: Walk-in or Registered patient
- Patient name (required)
- Patient age (required)
- Phone number (optional)
- Email (required for registered patients)
- Intake priority: Standard or Urgent
- Intake source: Front desk, Phone call, Staff referral
- Notes

**Step 2: Service Selection**
- Same as patient booking
- Browse categories and select services

**Step 3: Individual Service Scheduling**
- Same as patient booking
- Schedule each service independently

**Step 4: Review & Confirm**
- Display all information
- Confirm and submit

---

## Scheduling Logic

### Conflict Detection

The system checks for conflicts at multiple levels:

1. **Dentist Timeline Conflict**
   - For each dentist on a specific date
   - Check if proposed appointment overlaps with existing appointments
   - Include 10-minute buffer after each appointment

2. **Duration Validation**
   - Ensure appointment fits within operating hours
   - Respect lunch break (12:00 PM - 1:00 PM)
   - Validate end time doesn't exceed closing time

3. **Service-Dentist Mapping**
   - Automatically assign correct dentist for each service
   - Use primary dentist if available
   - Fall back to secondary dentist if needed

### Available Slots Calculation

```javascript
// For each 30-minute interval during operating hours:
for (let timeMin = hours.start; timeMin < hours.end; timeMin += 30) {
  // Skip lunch break
  if (timeMin >= lunch.start && timeMin < lunch.end) continue;
  
  // Calculate proposed window
  const slotEnd = timeMin + serviceDuration + 10; // 10-min buffer
  
  // Check if fits within operating hours
  if (slotEnd > hours.end) continue;
  
  // Check for conflicts with existing appointments
  let hasConflict = false;
  for (const booked of existingAppointments) {
    if (!(slotEnd <= booked.start || timeMin >= booked.end)) {
      hasConflict = true;
      break;
    }
  }
  
  if (!hasConflict) {
    availableSlots.push(timeMin);
  }
}
```

---

## Data Flow

### Creating a Composite Booking

```
1. Patient/Staff submits booking request
   ↓
2. Frontend validates request
   ↓
3. API receives POST /api/composite-booking/create
   ↓
4. Backend validates request
   ↓
5. For each service:
   a. Find assigned dentist
   b. Check for scheduling conflicts
   c. Calculate end time
   d. Generate appointment ID
   ↓
6. Create composite booking record (transaction)
   ↓
7. Create individual appointment records
   ↓
8. Log audit trail
   ↓
9. Return booking ID and appointment details
   ↓
10. Frontend displays success modal
    ↓
11. Send confirmation email to patient
```

### Retrieving Booking Details

```
GET /api/composite-booking/CB-2026-05-25-0001
   ↓
Query composite_bookings table
   ↓
Join with composite_booking_appointments
   ↓
Aggregate appointments into JSON array
   ↓
Return complete booking with all appointments
```

---

## Integration Steps

### 1. Database Setup

```bash
# Run migration script
psql -U postgres -d code_smiles -f COMPOSITE_BOOKING_SCHEMA.sql
```

### 2. Backend Integration

```bash
# Add to dental-backend/index.js
const compositeBookingApi = require('./composite-booking-api');
app.use('/api/composite-booking', compositeBookingApi);
```

### 3. Frontend Integration

```typescript
// Add to app routing
import { CompositePatientBookingComponent } from './composite-patient-booking/composite-patient-booking';
import { CompositeStaffBookingComponent } from './composite-staff-booking/composite-staff-booking';

const routes: Routes = [
  { path: 'composite-patient-booking', component: CompositePatientBookingComponent },
  { path: 'composite-staff-booking', component: CompositeStaffBookingComponent },
  // ... other routes
];
```

### 4. Navigation Updates

Add links to composite booking in:
- Patient dashboard
- Staff dashboard
- Navigation menus

---

## Key Features

### ✅ Multi-Service Booking
- Select up to 3 services in one session
- Automatic duration calculation
- Validation against maximum duration

### ✅ Independent Scheduling
- Each service gets separate appointment
- Different dentist per service
- Different date/time per service
- Automatic dentist assignment based on service

### ✅ Conflict Management
- Real-time conflict detection
- Dentist timeline checking
- Operating hours validation
- Lunch break handling

### ✅ Unified Booking ID
- One main booking ID for entire transaction
- Individual appointment IDs for each service
- Easy tracking and management

### ✅ Audit Trail
- Log all booking changes
- Track approvals and cancellations
- Maintain complete history

### ✅ Flexible Booking Types
- Patient bookings (require approval)
- Staff walk-in bookings (immediate)
- Registered patient bookings

### ✅ Status Tracking
- Per-appointment status
- Overall booking status
- Partial approval support

---

## Error Handling

### Validation Errors

```javascript
// Service validation
- At least one service required
- Maximum 3 services allowed
- Total duration cannot exceed 120 minutes

// Patient details validation
- First and last name required
- Valid email format required
- Valid phone number required
- Age must be positive integer

// Appointment validation
- Date must be in future
- Time must be within operating hours
- Time must not overlap lunch break
- Time must not conflict with existing appointments
```

### Conflict Resolution

```javascript
// If conflict detected:
1. Return error with conflict details
2. Suggest alternative time slots
3. Allow user to select different date/time
4. Retry booking with new schedule
```

---

## Testing

### Unit Tests

```typescript
// Test service selection
- Select single service
- Select multiple services
- Exceed maximum services
- Exceed maximum duration

// Test scheduling
- Select valid date and time
- Detect conflicts
- Validate operating hours
- Handle lunch break

// Test patient details
- Validate email format
- Validate phone format
- Validate age range
```

### Integration Tests

```typescript
// Test complete booking flow
- Create composite booking
- Retrieve booking details
- Update appointment status
- Cancel booking
- Get patient bookings
```

---

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Composite indexes for date/dentist queries
- Efficient JSON aggregation

### API Optimization
- Cache available slots for 5 minutes
- Batch conflict checks
- Lazy load appointment details

### Frontend Optimization
- Lazy load calendar
- Debounce slot loading
- Cache dentist list

---

## Future Enhancements

1. **Bulk Booking**
   - Book multiple patients at once
   - Batch appointment creation

2. **Recurring Bookings**
   - Schedule recurring appointments
   - Automatic rescheduling

3. **Smart Scheduling**
   - AI-based optimal time suggestion
   - Dentist workload balancing

4. **Payment Integration**
   - Upfront payment for composite bookings
   - Partial payment options

5. **Notifications**
   - SMS reminders for each appointment
   - Email confirmations
   - Calendar invitations

6. **Analytics**
   - Booking trends
   - Dentist utilization
   - Service popularity

---

## Support & Troubleshooting

### Common Issues

**Issue:** "No available slots for this date"
- **Solution:** Try different date or service combination

**Issue:** "Dentist not found for service"
- **Solution:** Check service_dentist_mapping table

**Issue:** "Scheduling conflict detected"
- **Solution:** Select different time slot

**Issue:** "Booking creation failed"
- **Solution:** Check patient details validation

---

## Conclusion

The Composite Booking System provides a seamless, efficient way for patients and staff to book multiple dental services in a single session while maintaining proper scheduling and conflict management. The system is designed to be scalable, maintainable, and user-friendly.

For questions or issues, please refer to the troubleshooting section or contact the development team.
