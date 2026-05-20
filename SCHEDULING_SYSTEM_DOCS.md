# 🦷 Code Smiles Smart Dental Booking System - Documentation

## Overview

The Smart Dental Booking System is a **continuous timeline-based scheduling engine** that manages appointments for 4 dentists with different specialties. Unlike traditional fixed-slot systems, this system calculates available time gaps dynamically based on existing bookings.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Clinic Configuration](#clinic-configuration)
3. [Dentist Specialties](#dentist-specialties)
4. [Service Duration Model](#service-duration-model)
5. [Booking Validation Logic](#booking-validation-logic)
6. [Availability Calculation](#availability-calculation)
7. [API Endpoints](#api-endpoints)
8. [Usage Examples](#usage-examples)
9. [Database Schema](#database-schema)

---

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│         Smart Dental Scheduling Engine                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐       │
│  │ BookingValidator │      │AvailabilityCalc  │       │
│  │                  │      │                  │       │
│  │ • Validates      │      │ • Calculates     │       │
│  │   bookings       │      │   free gaps      │       │
│  │ • Checks overlap │      │ • Finds next     │       │
│  │ • Verifies hours │      │   available time │       │
│  │ • Validates      │      │ • Generates      │       │
│  │   specialty      │      │   time slots     │       │
│  └──────────────────┘      └──────────────────┘       │
│           ▲                         ▲                  │
│           │                         │                  │
│           └─────────────┬───────────┘                  │
│                         │                              │
│                    Bookings Array                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Request
    ↓
API Endpoint (scheduling-api.js)
    ↓
BookingValidator / AvailabilityCalculator
    ↓
Validation Rules Applied
    ↓
Response (Success or Error)
```

---

## Clinic Configuration

### Operating Hours

| Day | Hours | Lunch Break | Effective Hours |
|-----|-------|-------------|-----------------|
| Monday-Friday | 08:00-20:30 | 12:00-13:00 | 11.5 hours |
| Saturday | 08:00-21:00 | 12:00-13:00 | 12 hours |
| Sunday | 08:00-21:30 | 12:00-13:00 | 12.5 hours |

### Lunch Break Rules

- **Time**: 12:00 PM - 01:00 PM (1 hour daily)
- **Restriction**: No bookings can overlap with lunch break
- **Validation**: Appointments must end by 12:00 PM OR start at/after 01:00 PM

### Example

```
11:30 AM appointment with 45-min service + 10-min buffer = 55 mins
End time: 12:25 PM → ❌ INVALID (overlaps lunch)

11:00 AM appointment with 45-min service + 10-min buffer = 55 mins
End time: 11:55 AM → ✅ VALID (ends before lunch)
```

---

## Dentist Specialties

### Dentist Configuration

```javascript
D1: Dr. Smith
   Specialties: Oral Surgery, General Dentistry

D2: Dr. Johnson
   Specialties: Orthodontics, Dental Implants

D3: Dr. Williams
   Specialties: Pediatric Care

D4: Dr. Brown
   Specialties: Cosmetic Dentistry
```

### Key Rules

- Each dentist has **independent scheduling** (no shared queue)
- Each dentist has **fixed specialties** (cannot perform other services)
- Services are matched to dentist specialties before booking

---

## Service Duration Model

### Service Definitions

| Service | Duration | Buffer | Total | Specialties |
|---------|----------|--------|-------|-------------|
| Dental Cleaning | 45 min | 10 min | 55 min | General Dentistry |
| Minor Oral Surgery | 60 min | 10 min | 70 min | Oral Surgery |
| Dental Implant | 120 min | 10 min | 130 min | Dental Implants |
| Orthodontic Consultation | 30 min | 10 min | 40 min | Orthodontics |
| Pediatric Checkup | 30 min | 10 min | 40 min | Pediatric Care |
| Cosmetic Consultation | 45 min | 10 min | 55 min | Cosmetic Dentistry |
| Root Canal | 90 min | 10 min | 100 min | General Dentistry |
| Teeth Whitening | 60 min | 10 min | 70 min | Cosmetic Dentistry |

### Buffer Time

- **Fixed**: 10 minutes after every appointment
- **Purpose**: Cleaning, patient transition, dentist break
- **Included in total block**: Service duration + 10 min buffer

### Example Calculation

```
Service: Dental Cleaning
Duration: 45 minutes
Buffer: 10 minutes
Total Block: 55 minutes

Booking: 09:00 AM
End Time: 09:55 AM (45 min service + 10 min buffer)
```

---

## Booking Validation Logic

### Validation Rules

A booking is **VALID** only if ALL conditions are met:

1. ✅ **Within Operating Hours**
   - Start time ≥ clinic opening time
   - End time ≤ clinic closing time
   - Does NOT overlap lunch break

2. ✅ **No Overlapping Bookings**
   - For the same dentist on the same date
   - Overlap rule: `start1 < end2 AND end1 > start2`

3. ✅ **Dentist Has Required Specialty**
   - Service specialty matches dentist specialties
   - Example: Cannot book "Dental Implant" with D3 (Pediatric only)

4. ✅ **Valid Date**
   - Date must be in valid format (YYYY-MM-DD)
   - Date must be a valid calendar date

### Rejection Reasons

| Reason | Example |
|--------|---------|
| Outside operating hours | Booking at 07:00 AM (before 08:00 AM) |
| Overlaps lunch break | Booking 11:50 AM (ends at 12:45 PM) |
| Overlaps existing booking | Booking 10:30 AM when 10:00-10:55 is taken |
| Specialty mismatch | Booking "Dental Implant" with D3 |
| Invalid date format | "2026-5-20" instead of "2026-05-20" |

### Overlap Detection Algorithm

```javascript
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// Examples:
hasOverlap(600, 700, 650, 750)  // true - overlaps
hasOverlap(600, 700, 700, 800)  // false - adjacent (no overlap)
hasOverlap(600, 700, 500, 600)  // false - adjacent (no overlap)
```

---

## Availability Calculation

### Algorithm Overview

The system calculates available time gaps by:

1. **Fetching all bookings** for the dentist on the date
2. **Sorting by start time** (earliest first)
3. **Identifying gaps** between bookings
4. **Splitting by lunch break** (morning and afternoon slots)
5. **Filtering by minimum duration** (service + buffer)

### Example Calculation

```
D1 Schedule on Wednesday:
- 09:00-09:55: Dental Cleaning (PAT001)
- 11:00-11:55: Dental Cleaning (PAT002)
- 12:00-13:00: Lunch Break
- 13:00-20:30: Clinic hours end

Available Gaps:
1. 08:00-09:00 (60 min)
2. 09:55-11:00 (65 min)
3. 13:00-20:30 (450 min)

For 55-min Dental Cleaning:
- Slot 1: 08:00-08:55 ✅
- Slot 2: 09:55-10:50 ✅
- Slot 3: 13:00-13:55 ✅ (and many more in afternoon)
```

### Time Slot Generation

The system generates 15-minute intervals within available gaps:

```
Available Gap: 13:00-20:30 (450 minutes)
Service Duration: 55 minutes

Generated Slots:
13:00-13:55
13:15-14:10
13:30-14:25
13:45-14:40
14:00-14:55
... (continues every 15 minutes)
```

---

## API Endpoints

### 1. Get Available Times

```http
GET /api/scheduling/available-times?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning
```

**Query Parameters:**
- `dentist_id` (required): D1, D2, D3, or D4
- `date` (required): YYYY-MM-DD format
- `service` (required): Service name

**Response:**
```json
{
  "dentist_id": "D1",
  "date": "2026-05-20",
  "service": "Dental Cleaning",
  "service_duration": 45,
  "total_duration": 55,
  "available_times": [
    {
      "start_min": 480,
      "start_time": "08:00",
      "end_min": 535,
      "end_time": "08:55"
    },
    {
      "start_min": 595,
      "start_time": "09:55",
      "end_min": 650,
      "end_time": "10:50"
    }
  ],
  "count": 29
}
```

---

### 2. Get Next Available Time

```http
GET /api/scheduling/next-available?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning
```

**Response:**
```json
{
  "dentist_id": "D1",
  "date": "2026-05-20",
  "service": "Dental Cleaning",
  "next_available": {
    "start_min": 480,
    "start_time": "08:00",
    "end_min": 535,
    "end_time": "08:55"
  }
}
```

---

### 3. Get Dentist Schedule

```http
GET /api/scheduling/dentist-schedule?dentist_id=D1&date=2026-05-20
```

**Response:**
```json
{
  "dentist_id": "D1",
  "dentist_name": "Dr. Smith",
  "date": "2026-05-20",
  "bookings": [
    {
      "id": "BOOK_1779249057201",
      "service": "Dental Cleaning",
      "start_time": "09:00",
      "end_time": "09:55",
      "patient_id": "PAT001",
      "duration": 55
    }
  ],
  "total_bookings": 1
}
```

---

### 4. Create Booking

```http
POST /api/scheduling/book
Content-Type: application/json

{
  "dentist_id": "D1",
  "date": "2026-05-20",
  "start_time": "09:00",
  "service": "Dental Cleaning",
  "patient_id": "PAT001"
}
```

**Response (Success):**
```json
{
  "success": true,
  "booking": {
    "id": "BOOK_1779249057201",
    "dentist_id": "D1",
    "dentist_name": "Dr. Smith",
    "date": "2026-05-20",
    "start_time": "09:00",
    "end_time": "09:55",
    "service": "Dental Cleaning",
    "patient_id": "PAT001",
    "duration": 55
  }
}
```

**Response (Error):**
```json
{
  "error": "Overlaps with existing booking from 10:00 to 10:55"
}
```

---

### 5. Get All Dentists

```http
GET /api/scheduling/dentists
```

**Response:**
```json
{
  "dentists": [
    {
      "id": "D1",
      "name": "Dr. Smith",
      "specialties": ["Oral Surgery", "General Dentistry"]
    },
    {
      "id": "D2",
      "name": "Dr. Johnson",
      "specialties": ["Orthodontics", "Dental Implants"]
    }
  ],
  "count": 4
}
```

---

### 6. Get All Services

```http
GET /api/scheduling/services
```

**Response:**
```json
{
  "services": [
    {
      "name": "Dental Cleaning",
      "duration": 45,
      "total_duration": 55,
      "specialties": ["General Dentistry"]
    },
    {
      "name": "Dental Implant",
      "duration": 120,
      "total_duration": 130,
      "specialties": ["Dental Implants"]
    }
  ],
  "count": 8
}
```

---

### 7. Get Booking by ID

```http
GET /api/scheduling/booking/BOOK_1779249057201
```

**Response:**
```json
{
  "id": "BOOK_1779249057201",
  "dentist_id": "D1",
  "dentist_name": "Dr. Smith",
  "date": "2026-05-20",
  "start_time": "09:00",
  "end_time": "09:55",
  "service": "Dental Cleaning",
  "patient_id": "PAT001",
  "duration": 55,
  "created_at": "2026-05-20T03:50:57.201Z"
}
```

---

### 8. Cancel Booking

```http
DELETE /api/scheduling/booking/BOOK_1779249057201
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled",
  "cancelled_booking": {
    "id": "BOOK_1779249057201",
    "dentist_id": "D1",
    "date": "2026-05-20",
    "start_time": "09:00",
    "service": "Dental Cleaning"
  }
}
```

---

## Usage Examples

### Example 1: Book a Dental Cleaning

```bash
# Step 1: Get available times
curl "http://localhost:3000/api/scheduling/available-times?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning"

# Step 2: Create booking at 09:00
curl -X POST http://localhost:3000/api/scheduling/book \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": "D1",
    "date": "2026-05-20",
    "start_time": "09:00",
    "service": "Dental Cleaning",
    "patient_id": "PAT001"
  }'
```

### Example 2: Find Next Available Implant Appointment

```bash
curl "http://localhost:3000/api/scheduling/next-available?dentist_id=D2&date=2026-05-20&service=Dental%20Implant"
```

### Example 3: View Dentist's Full Schedule

```bash
curl "http://localhost:3000/api/scheduling/dentist-schedule?dentist_id=D1&date=2026-05-20"
```

---

## Database Schema

### Bookings Table

```sql
CREATE TABLE bookings (
  id VARCHAR(50) PRIMARY KEY,
  dentist_id VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  start_min INT NOT NULL,
  end_min INT NOT NULL,
  service VARCHAR(100) NOT NULL,
  patient_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (dentist_id) REFERENCES dentists(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  INDEX idx_dentist_date (dentist_id, date),
  INDEX idx_patient (patient_id)
);
```

### Dentists Table

```sql
CREATE TABLE dentists (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialties JSON NOT NULL
);
```

### Services Table

```sql
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  duration INT NOT NULL,
  specialties JSON NOT NULL
);
```

---

## Integration with Express Backend

### Setup

```javascript
// In your main index.js
const express = require('express');
const schedulingRouter = require('./scheduling-api');

const app = express();
app.use(express.json());

// Mount scheduling routes
app.use('/api/scheduling', schedulingRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Dentist not found` | Invalid dentist_id | Use D1, D2, D3, or D4 |
| `Service not found` | Invalid service name | Check available services |
| `Outside operating hours` | Time outside clinic hours | Book within 08:00-20:30 |
| `Overlaps lunch break` | Booking during 12:00-13:00 | Avoid lunch hours |
| `Overlaps with existing booking` | Time slot taken | Choose different time |
| `Dentist does not have required specialty` | Service not offered by dentist | Choose different dentist |
| `Invalid date format` | Wrong date format | Use YYYY-MM-DD |
| `Invalid time format` | Wrong time format | Use HH:MM (24-hour) |

---

## Performance Considerations

### Time Complexity

- **Booking Validation**: O(n) where n = bookings for dentist on date
- **Availability Calculation**: O(n log n) due to sorting
- **Overlap Detection**: O(1) per booking

### Optimization Tips

1. **Index bookings by dentist_id and date** for faster queries
2. **Cache available times** for popular dates
3. **Use pagination** for large booking lists
4. **Implement rate limiting** on booking endpoint

---

## Future Enhancements

- [ ] Multi-day availability search
- [ ] Recurring appointments
- [ ] Dentist unavailability (vacation, sick leave)
- [ ] Patient preferences (preferred dentist, time)
- [ ] Appointment reminders
- [ ] Cancellation policies
- [ ] Waitlist management
- [ ] Analytics and reporting

---

## Support

For issues or questions, contact the development team.

**Last Updated**: May 20, 2026
