# Code Smiles - Booking Flow Visual Guide
## Complete Flow Diagrams for Defense

---

## 🎯 SINGLE SERVICE BOOKING FLOW

### Patient Single Service Booking
```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT BOOKING                          │
│                   (Single Service)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │ Select Category │
                  │ (e.g., General  │
                  │  Dentistry)     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Service  │
                  │ (e.g., Dental   │
                  │  Cleaning)      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Date     │
                  │ (Calendar)      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Load Time Slots │
                  │ (API Call)      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Time     │
                  │ (e.g., 09:00)   │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Enter Patient   │
                  │ Details         │
                  │ (Name, Email,   │
                  │  Phone)         │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Submit Booking  │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Validate:       │
                  │ - Patient info  │
                  │ - Date/Time     │
                  │ - Conflicts     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Create Record   │
                  │ in appointments │
                  │ table           │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Send Email      │
                  │ Confirmation    │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Show Success    │
                  │ Message         │
                  └─────────────────┘
```

---

## 🎯 MULTI-SERVICE BOOKING FLOW

### Patient Multi-Service Booking (2-3 Services)
```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT BOOKING                          │
│                  (Multi-Service: 2-3)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │ Select Category │
                  │ (e.g., General  │
                  │  Dentistry)     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Service  │
                  │ (e.g., Dental   │
                  │  Cleaning)      │
                  │ Duration: 45min │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Add Another     │
                  │ Service?        │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Category │
                  │ (e.g., Cosmetic │
                  │  Arts)          │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Select Service  │
                  │ (e.g., Teeth    │
                  │  Whitening)     │
                  │ Duration: 60min │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Check Duration  │
                  │ Total: 105 min  │
                  │ Max: 120 min    │
                  │ ✅ OK           │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Add Another     │
                  │ Service?        │
                  │ (Optional)      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ FOR EACH        │
                  │ SERVICE:        │
                  │ - Select Date   │
                  │ - Load Slots    │
                  │ - Select Time   │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Enter Patient   │
                  │ Details         │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Submit Booking  │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Validate:       │
                  │ - Patient info  │
                  │ - Duration      │
                  │ - Conflicts     │
                  │ - Dentists      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Create Header   │
                  │ in composite_   │
                  │ bookings table  │
                  │ booking_id:     │
                  │ CB-2026-05-24-01│
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ FOR EACH        │
                  │ SERVICE:        │
                  │ Create Record   │
                  │ in composite_   │
                  │ booking_        │
                  │ appointments    │
                  │ appointment_id: │
                  │ CBA-...-01/02   │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Send Email      │
                  │ Confirmation    │
                  │ (All Services)  │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Show Success    │
                  │ Message         │
                  └─────────────────┘
```

---

## 🛡️ DOUBLE-BOOKING PREVENTION FLOW

### Conflict Detection Process
```
┌─────────────────────────────────────────────────────────────┐
│              DOUBLE-BOOKING PREVENTION                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  ┌─────────────────┐
                  │ User Submits    │
                  │ Booking         │
                  │ Dentist: Dr. A  │
                  │ Date: 2026-05-25│
                  │ Time: 09:00     │
                  │ Duration: 45min │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Calculate Time  │
                  │ Window:         │
                  │ Start: 09:00    │
                  │ End: 09:45      │
                  │ Buffer: +10min  │
                  │ Final: 09:55    │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Query           │
                  │ appointments    │
                  │ table for       │
                  │ conflicts       │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Query           │
                  │ composite_      │
                  │ booking_        │
                  │ appointments    │
                  │ table for       │
                  │ conflicts       │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Check for       │
                  │ Overlaps:       │
                  │ Existing: 09:30 │
                  │ New: 09:00-09:55│
                  │ OVERLAP! ❌     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Return Error:   │
                  │ "Scheduling     │
                  │  conflict       │
                  │  detected"      │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Show Error to   │
                  │ User            │
                  │ Suggest Alt.    │
                  │ Times           │
                  └─────────────────┘
```

---

## 📊 DATABASE RECORD CREATION FLOW

### Single Service Booking
```
┌─────────────────────────────────────────────────────────────┐
│           SINGLE SERVICE BOOKING RECORDS                    │
└─────────────────────────────────────────────────────────────┘

User Submits Booking
        ↓
    ┌───────────────────────────────────┐
    │ appointments table                │
    ├───────────────────────────────────┤
    │ id: 1                             │
    │ appointment_id: APT-2026-05-24-01 │
    │ patient_id: 5                     │
    │ dentist_id: 2                     │
    │ treatment: Dental Cleaning        │
    │ appointment_date: 2026-05-25      │
    │ appointment_time: 09:00           │
    │ duration_minutes: 45              │
    │ status: Approved                  │
    │ created_at: 2026-05-24 10:30:00   │
    └───────────────────────────────────┘
```

### Multi-Service Booking
```
┌─────────────────────────────────────────────────────────────┐
│          MULTI-SERVICE BOOKING RECORDS                      │
└─────────────────────────────────────────────────────────────┘

User Submits Booking (2 Services)
        ↓
    ┌───────────────────────────────────┐
    │ composite_bookings table          │
    ├───────────────────────────────────┤
    │ id: 1                             │
    │ booking_id: CB-2026-05-24-0001    │
    │ patient_id: 5                     │
    │ patient_name: John Doe            │
    │ service_count: 2                  │
    │ total_duration_minutes: 105       │
    │ overall_status: Pending           │
    │ created_at: 2026-05-24 10:30:00   │
    └───────────────────────────────────┘
        ↓
        ├─ ┌───────────────────────────────────┐
        │  │ composite_booking_appointments    │
        │  ├───────────────────────────────────┤
        │  │ id: 1                             │
        │  │ composite_booking_id: 1           │
        │  │ booking_id: CB-2026-05-24-0001    │
        │  │ appointment_id: CBA-...-01        │
        │  │ appointment_sequence: 1           │
        │  │ service_name: Dental Cleaning     │
        │  │ appointment_date: 2026-05-25      │
        │  │ appointment_time: 09:00           │
        │  │ appointment_end_time: 09:45       │
        │  │ dentist_id: 2                     │
        │  │ dentist_name: Dr. Smith           │
        │  │ appointment_status: Pending       │
        │  └───────────────────────────────────┘
        │
        └─ ┌───────────────────────────────────┐
           │ composite_booking_appointments    │
           ├───────────────────────────────────┤
           │ id: 2                             │
           │ composite_booking_id: 1           │
           │ booking_id: CB-2026-05-24-0001    │
           │ appointment_id: CBA-...-02        │
           │ appointment_sequence: 2           │
           │ service_name: Teeth Whitening     │
           │ appointment_date: 2026-05-25      │
           │ appointment_time: 10:00           │
           │ appointment_end_time: 11:00       │
           │ dentist_id: 3                     │
           │ dentist_name: Dr. Johnson         │
           │ appointment_status: Pending       │
           └───────────────────────────────────┘
```

---

## 🔄 API CALL FLOW

### Frontend to Backend Communication
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                       │
│                                                              │
│  1. User fills booking form                                 │
│  2. Clicks "Submit Booking"                                 │
│  3. Frontend validates data                                 │
│  4. Prepares JSON payload                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    HTTP POST Request
                            ↓
        /api/composite-booking/create
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                        │
│                                                              │
│  1. Receives request                                        │
│  2. Validates request data                                  │
│  3. Checks for conflicts                                    │
│  4. Creates database records                                │
│  5. Sends confirmation email                                │
│  6. Returns success response                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    HTTP 201 Response
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                       │
│                                                              │
│  1. Receives response                                       │
│  2. Shows success message                                   │
│  3. Displays booking confirmation                           │
│  4. Redirects to appointments page                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📧 EMAIL NOTIFICATION FLOW

### Booking Confirmation Email
```
┌─────────────────────────────────────────────────────────────┐
│              BOOKING CONFIRMATION EMAIL                     │
└─────────────────────────────────────────────────────────────┘

Booking Created
        ↓
Backend Prepares Email
        ↓
    ┌─────────────────────────────────┐
    │ Email Content:                  │
    ├─────────────────────────────────┤
    │ To: patient@example.com         │
    │ Subject: Appointment Confirmed  │
    │                                 │
    │ Hi John Doe,                    │
    │                                 │
    │ Your appointment has been       │
    │ confirmed!                      │
    │                                 │
    │ Service: Dental Cleaning        │
    │ Date: May 25, 2026              │
    │ Time: 09:00 - 09:45             │
    │ Dentist: Dr. Smith              │
    │ Status: Confirmed               │
    │                                 │
    │ Please arrive 10 minutes early. │
    │                                 │
    │ Code Smiles Dental Clinic       │
    └─────────────────────────────────┘
        ↓
Send via Nodemailer
        ↓
    ┌─────────────────────────────────┐
    │ Development: Ethereal           │
    │ (View at ethereal.email)        │
    │                                 │
    │ Production: Gmail/SMTP          │
    │ (Delivered to inbox)            │
    └─────────────────────────────────┘
        ↓
Patient Receives Email
```

---

## 🔐 VALIDATION FLOW

### Comprehensive Validation Process
```
┌─────────────────────────────────────────────────────────────┐
│                  BOOKING VALIDATION                         │
└─────────────────────────────────────────────────────────────┘

User Submits Booking
        ↓
    ┌─────────────────────────────────┐
    │ 1. Patient Details              │
    │    ✓ First name required        │
    │    ✓ Last name required         │
    │    ✓ Valid email format         │
    │    ✓ Valid phone number         │
    └────────┬────────────────────────┘
             ↓
    ┌─────────────────────────────────┐
    │ 2. Services                     │
    │    ✓ At least 1 service         │
    │    ✓ Maximum 3 services         │
    │    ✓ Each service has duration  │
    └────────┬────────────────────────┘
             ↓
    ┌─────────────────────────────────┐
    │ 3. Duration                     │
    │    ✓ Total ≤ 120 minutes        │
    │    ✓ Each service ≥ 15 minutes  │
    │    ✓ Include buffers            │
    └────────┬────────────────────────┘
             ↓
    ┌─────────────────────────────────┐
    │ 4. Date/Time                    │
    │    ✓ Valid format (YYYY-MM-DD)  │
    │    ✓ Not in past                │
    │    ✓ Not Sunday                 │
    │    ✓ Within business hours      │
    └────────┬────────────────────────┘
             ↓
    ┌─────────────────────────────────┐
    │ 5. Conflicts                    │
    │    ✓ Check appointments table   │
    │    ✓ Check composite_booking_   │
    │      appointments table         │
    │    ✓ Include 10-min buffer      │
    └────────┬────────────────────────┘
             ↓
    ┌─────────────────────────────────┐
    │ 6. Dentist Assignment           │
    │    ✓ Service has mapping        │
    │    ✓ Dentist exists             │
    │    ✓ Dentist is active          │
    └────────┬────────────────────────┘
             ↓
    All Validations Pass?
             ↓
    ┌─────────────────────────────────┐
    │ YES: Create Booking             │
    │ NO: Return Error Message        │
    └─────────────────────────────────┘
```

---

## 🎯 DENTIST ASSIGNMENT FLOW

### Automatic Dentist Selection
```
┌─────────────────────────────────────────────────────────────┐
│              DENTIST ASSIGNMENT PROCESS                     │
└─────────────────────────────────────────────────────────────┘

User Selects Service
        ↓
    "Dental Cleaning"
        ↓
Query service_dentist_mapping
        ↓
    ┌─────────────────────────────────┐
    │ service_dentist_mapping         │
    ├─────────────────────────────────┤
    │ service_name: Dental Cleaning   │
    │ dentist_id: 2                   │
    │ is_primary: TRUE                │
    │ is_active: TRUE                 │
    └────────┬────────────────────────┘
             ↓
Query dentist table
             ↓
    ┌─────────────────────────────────┐
    │ dentist                         │
    ├─────────────────────────────────┤
    │ dentist_id: 2                   │
    │ user_id: 3                      │
    │ specialization: General         │
    │ is_active: TRUE                 │
    └────────┬────────────────────────┘
             ↓
Query users table
             ↓
    ┌─────────────────────────────────┐
    │ users                           │
    ├─────────────────────────────────┤
    │ id: 3                           │
    │ first_name: John                │
    │ last_name: Smith                │
    └────────┬────────────────────────┘
             ↓
Assign to Appointment
             ↓
    ┌─────────────────────────────────┐
    │ Appointment Record              │
    ├─────────────────────────────────┤
    │ dentist_id: 2                   │
    │ dentist_name: John Smith        │
    │ dentist_specialty: General      │
    └─────────────────────────────────┘
```

---

## 📱 RESPONSIVE DESIGN FLOW

### Device Adaptation
```
┌─────────────────────────────────────────────────────────────┐
│                  RESPONSIVE DESIGN                          │
└─────────────────────────────────────────────────────────────┘

Browser Window Size
        ↓
    ┌─────────────────────────────────┐
    │ Desktop (> 1024px)              │
    │ - Full calendar view            │
    │ - Side-by-side layout           │
    │ - All details visible           │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │ Tablet (768px - 1024px)         │
    │ - Adjusted calendar             │
    │ - Stacked layout                │
    │ - Optimized spacing             │
    └─────────────────────────────────┘
        ↓
    ┌─────────────────────────────────┐
    │ Mobile (< 768px)                │
    │ - Compact calendar              │
    │ - Full-width layout             │
    │ - Touch-friendly buttons        │
    │ - Scrollable content            │
    └─────────────────────────────────┘
```

---

## ✨ COMPLETE BOOKING LIFECYCLE

### From Start to Finish
```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETE BOOKING LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

1. USER INITIATES BOOKING
   ├─ Opens booking page
   ├─ Selects service category
   └─ Selects specific service(s)

2. DATE/TIME SELECTION
   ├─ Clicks date on calendar
   ├─ API loads available slots
   ├─ Selects time slot
   └─ (Repeat for multi-service)

3. PATIENT DETAILS
   ├─ Enters name
   ├─ Enters email
   ├─ Enters phone
   └─ Enters optional notes

4. SUBMISSION
   ├─ Frontend validates data
   ├─ Sends to backend API
   └─ Backend validates again

5. CONFLICT CHECK
   ├─ Queries appointments table
   ├─ Queries composite_booking_appointments table
   ├─ Checks for overlaps
   └─ Returns error if conflict found

6. DENTIST ASSIGNMENT
   ├─ Queries service_dentist_mapping
   ├─ Finds primary dentist
   └─ Assigns to appointment

7. DATABASE CREATION
   ├─ Single service: Creates 1 record in appointments
   └─ Multi-service: Creates 1 header + N service records

8. EMAIL NOTIFICATION
   ├─ Prepares confirmation email
   ├─ Sends via Nodemailer
   └─ Logs email details

9. USER FEEDBACK
   ├─ Shows success message
   ├─ Displays booking confirmation
   └─ Redirects to appointments page

10. BOOKING COMPLETE ✅
    ├─ Record in database
    ├─ Email sent to patient
    ├─ Dentist assigned
    └─ Ready for clinic staff to review
```

---

**Last Updated**: May 24, 2026
**System**: Code Smiles Dental Booking
**Defense Date**: May 25, 2026
