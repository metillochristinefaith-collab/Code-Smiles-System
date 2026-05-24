# 🦷 Code Smiles - Complete Code Structure

## 📁 Project Layout

```
Code Smiles/
├── dental-frontend/          # Angular 21 Frontend
│   ├── src/
│   │   ├── app/             # Main application components
│   │   ├── environments/    # Environment configs
│   │   ├── index.html       # Entry point
│   │   ├── main.ts          # Bootstrap
│   │   ├── styles.css       # Global styles
│   │   └── material-theme.scss
│   ├── angular.json         # Angular config
│   ├── package.json         # Dependencies
│   └── tsconfig.json        # TypeScript config
│
├── dental-backend/          # Node.js/Express Backend
│   ├── index.js             # Main server file
│   ├── db.js                # PostgreSQL connection
│   ├── package.json         # Dependencies
│   ├── .env                 # Environment variables
│   ├── slot-manager.js      # Slot availability logic
│   ├── scheduler.js         # Background jobs
│   ├── scheduling-engine.js # Booking logic
│   └── [test & utility files]
│
└── [Documentation & Config Files]
```

---

## 🎯 Frontend Structure (Angular 21)

### Main Entry Point
```
dental-frontend/src/
├── main.ts              # Bootstrap Angular app
├── index.html           # HTML template
├── app.routes.ts        # Route definitions
├── app.component.ts     # Root component
└── app.config.ts        # App configuration
```

### Feature Modules (by Role)

#### 👥 **Public Pages**
```
public-home/            # Landing page
public-about/           # About page
public-contact/         # Contact form
public-services/        # Services listing
public-header/          # Navigation header
public-footer/          # Footer
```

#### 🏥 **Patient Portal**
```
patient-dashboard/              # Patient home
patient-booking/                # Book appointments
patient-appointments/           # View appointments
patient-medical-vault/          # Medical records
patient-profile/                # View profile
patient-profile-edit/           # Edit profile
patient-notifications/          # Notifications
patient-prescriptions/          # View prescriptions
patient-treatment-plan/         # Treatment plans
patient-treatment-progress/     # Progress tracking
patient-help-center/            # Help & FAQ
patient-change-password/        # Password change
```

#### 👨‍⚕️ **Dentist Portal**
```
dentist-dashboard/              # Dentist home
dentist-calendar/               # Calendar view
dentist-calendar-redesign/      # Updated calendar
dentist-appointments/           # Manage appointments
dentist-patients/               # Patient list
dentist-medical-vault/          # Patient records
dentist-treatment-plans/        # Treatment planning
dentist-prescriptions/          # Issue prescriptions
dentist-profile/                # View profile
dentist-profile-edit/           # Edit profile
dentist-notifications/          # Notifications
dentist-help-center/            # Help & FAQ
```

#### 👔 **Staff Portal**
```
staff-dashboard/                # Staff home
staff-booking/                  # Create bookings
staff-appointments/             # Manage appointments
staff-calendar/                 # Calendar view
staff-patients/                 # Patient management
staff-profile/                  # View profile
staff-notifications/            # Notifications
staff-requests/                 # Support requests
staff-help-center/              # Help & FAQ
```

#### 🔐 **Authentication**
```
login/                  # Login page
register/               # Registration
forgot-password/        # Password reset
reset-password/         # Reset form
verify-email/           # Email verification
check-email/            # Check email status
verify-email-result/    # Verification result
```

#### 🛡️ **Guards & Interceptors**
```
guards/
├── role.guard.ts        # Role-based access control
└── guest.guard.ts       # Guest access control

interceptors/
├── auth.interceptor.ts  # JWT token injection
└── error.interceptor.ts # Error handling
```

#### 🔧 **Services**
```
services/
├── auth.service.ts              # Authentication
├── booking.service.ts           # Booking operations
├── appointment.service.ts       # Appointment management
├── user.service.ts              # User data
├── dentist.service.ts           # Dentist data
├── patient.service.ts           # Patient data
├── medical-vault.service.ts     # File management
├── notification.service.ts      # Notifications
├── prescription.service.ts      # Prescriptions
├── treatment-plan.service.ts    # Treatment plans
└── [other services]
```

---

## 🔧 Backend Structure (Node.js/Express)

### Main Server File
**`index.js`** - Core API server with:
- Express app setup
- CORS configuration
- Rate limiting
- Email transporter
- Authentication middleware
- All API endpoints

### Key Modules

#### 📧 **Email System**
```javascript
// Functions in index.js
getTransporter()                          // Email setup
sendVerificationEmail()                   // Email verification
sendAppointmentConfirmationEmail()        // Booking confirmation
sendAppointmentCancellationEmail()        // Cancellation notice
sendAppointmentRescheduleEmail()          // Reschedule notice
```

#### 🔐 **Authentication**
```javascript
authMiddleware()                          // JWT verification
// Endpoints:
POST /api/auth/register                   // User registration
POST /api/auth/login                      // User login
POST /api/auth/verify-email               // Email verification
POST /api/auth/forgot-password            // Password reset request
POST /api/auth/reset-password             // Reset password
```

#### 👤 **User Management**
```javascript
// Endpoints:
GET  /api/users/:id                       // Get user
PUT  /api/users/:id                       // Update user
GET  /api/users/:id/profile               // Get profile
PUT  /api/users/:id/profile               // Update profile
POST /api/users/:id/change-password       // Change password
```

#### 📅 **Booking System**
```javascript
// Endpoints:
POST   /api/bookings                      // Create booking
GET    /api/bookings                      // List bookings
GET    /api/bookings/:id                  // Get booking
PUT    /api/bookings/:id                  // Update booking
DELETE /api/bookings/:id                  // Cancel booking
GET    /api/bookings/:id/appointments     // Get appointments
```

#### 🏥 **Appointments**
```javascript
// Endpoints:
GET    /api/appointments                  // List appointments
GET    /api/appointments/:id              // Get appointment
POST   /api/appointments                  // Create appointment
PUT    /api/appointments/:id              // Update appointment
DELETE /api/appointments/:id              // Cancel appointment
POST   /api/appointments/:id/reschedule   // Reschedule
```

#### ⏰ **Time Slots**
```javascript
// Endpoints:
GET /api/slots                            // Get available slots
GET /api/slots/dentist/:dentistId         // Dentist slots
GET /api/slots/date/:date                 // Slots by date
POST /api/slots/check-availability        // Check availability
```

#### 👨‍⚕️ **Dentist Management**
```javascript
// Endpoints:
GET    /api/dentists                      // List dentists
GET    /api/dentists/:id                  // Get dentist
PUT    /api/dentists/:id                  // Update dentist
GET    /api/dentists/:id/schedule         // Get schedule
PUT    /api/dentists/:id/schedule         // Update schedule
GET    /api/dentists/:id/services         // Get services
```

#### 🏥 **Patient Management**
```javascript
// Endpoints:
GET    /api/patients                      // List patients
GET    /api/patients/:id                  // Get patient
PUT    /api/patients/:id                  // Update patient
GET    /api/patients/:id/appointments     // Patient appointments
GET    /api/patients/:id/medical-history  // Medical history
```

#### 📋 **Medical Records**
```javascript
// Endpoints:
GET    /api/medical-vault                 // List records
POST   /api/medical-vault                 // Upload record
GET    /api/medical-vault/:id             // Get record
DELETE /api/medical-vault/:id             // Delete record
POST   /api/medical-vault/:id/share       // Share record
```

#### 💊 **Prescriptions**
```javascript
// Endpoints:
GET    /api/prescriptions                 // List prescriptions
POST   /api/prescriptions                 // Create prescription
GET    /api/prescriptions/:id             // Get prescription
PUT    /api/prescriptions/:id             // Update prescription
DELETE /api/prescriptions/:id             // Delete prescription
```

#### 📝 **Treatment Plans**
```javascript
// Endpoints:
GET    /api/treatment-plans               // List plans
POST   /api/treatment-plans               // Create plan
GET    /api/treatment-plans/:id           // Get plan
PUT    /api/treatment-plans/:id           // Update plan
DELETE /api/treatment-plans/:id           // Delete plan
```

#### 🔔 **Notifications**
```javascript
// Endpoints:
GET    /api/notifications                 // List notifications
POST   /api/notifications                 // Create notification
PUT    /api/notifications/:id             // Mark as read
DELETE /api/notifications/:id             // Delete notification
```

### Database Connection
**`db.js`** - PostgreSQL connection pool
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

### Slot Management
**`slot-manager.js`** - Availability logic
- Check slot availability
- Prevent double bookings
- Handle service durations
- Manage dentist schedules

### Scheduling Engine
**`scheduling-engine.js`** - Booking logic
- Create composite bookings
- Assign dentists
- Validate time slots
- Handle conflicts

### Background Jobs
**`scheduler.js`** - Automated tasks
- Send appointment reminders
- Clean up expired tokens
- Generate reports
- Maintenance tasks

---

## 🗄️ Database Schema (PostgreSQL)

### Core Tables

#### **USERS** (Authentication)
```sql
id (PK)
first_name
last_name
email (UK)
phone
password (hashed)
role (patient|dentist|staff|admin)
status
is_verified
verification_token
reset_token
created_at
```

#### **DENTIST** (Dentist Profile)
```sql
dentist_id (PK)
user_id (FK → USERS)
specialization
license_number
years_experience
working_days (JSONB)
start_time
end_time
status
```

#### **PATIENTS** (Patient Profile)
```sql
patient_id (PK)
user_id (FK → USERS)
first_name
last_name
date_of_birth
gender
medical_history
status
```

#### **COMPOSITE_BOOKINGS** (Multi-Appointment Booking)
```sql
id (PK)
booking_id (UK)
patient_id (FK → USERS)
booking_type
intake_priority
service_count
total_duration_minutes
overall_status
created_at
```

#### **COMPOSITE_BOOKING_APPOINTMENTS** (Individual Appointments)
```sql
id (PK)
composite_booking_id (FK)
appointment_id (UK)
dentist_id (FK → DENTIST)
appointment_date
appointment_time
appointment_status
confirmation_status
```

#### **CLINICAL_NOTES** (Doctor Notes)
```sql
id (PK)
patient_id
dentist_id (FK → DENTIST)
type
note
created_at
```

#### **PRESCRIPTIONS** (Medications)
```sql
id (PK)
patient_id
dentist_id (FK → DENTIST)
medication
dosage
frequency
status
```

#### **TREATMENT_PLANS** (Treatment Planning)
```sql
id (PK)
patient_id
dentist_id (FK → DENTIST)
title
description
status
```

#### **PATIENT_VAULT_RECORDS** (Medical Documents)
```sql
id (PK)
patient_id
title
record_type
file_name
file_size
created_at
```

#### **VAULT_FILE_SHARING** (Document Sharing)
```sql
id (PK)
vault_record_id (FK)
patient_id (FK)
shared_with_user_id (FK)
permission_level
shared_at
```

#### **BILLING** (Invoices)
```sql
id (PK)
appointment_id
patient_id
amount
amount_paid
discount
status
payment_method
```

#### **NOTIFICATIONS** (User Alerts)
```sql
id (PK)
user_id
appointment_id
title
detail
is_read
created_at
```

---

## 🔄 Data Flow Examples

### Booking Flow
```
1. Patient clicks "Book Appointment"
   ↓
2. Frontend calls POST /api/bookings
   ↓
3. Backend creates COMPOSITE_BOOKINGS record
   ↓
4. Backend creates COMPOSITE_BOOKING_APPOINTMENTS records
   ↓
5. Backend checks slot availability (slot-manager.js)
   ↓
6. Backend assigns dentist (scheduling-engine.js)
   ↓
7. Backend sends confirmation email
   ↓
8. Frontend receives booking_id
   ↓
9. Patient sees confirmation
```

### Appointment Reminder Flow
```
1. Scheduler runs every hour (scheduler.js)
   ↓
2. Query appointments 24 hours away
   ↓
3. Send 24-hour reminder email
   ↓
4. Update reminder_24h_sent flag
   ↓
5. Query appointments 3 hours away
   ↓
6. Send 3-hour reminder SMS/email
   ↓
7. Update reminder_3h_sent flag
```

### Medical Record Sharing Flow
```
1. Patient uploads file to medical vault
   ↓
2. Frontend calls POST /api/medical-vault
   ↓
3. Backend stores file metadata in PATIENT_VAULT_RECORDS
   ↓
4. Patient clicks "Share with Dentist"
   ↓
5. Frontend calls POST /api/medical-vault/:id/share
   ↓
6. Backend creates VAULT_FILE_SHARING record
   ↓
7. Dentist sees shared file in their vault
```

---

## 🔐 Authentication Flow

### Registration
```
1. User fills registration form
   ↓
2. Frontend validates input
   ↓
3. Frontend calls POST /api/auth/register
   ↓
4. Backend hashes password (bcryptjs)
   ↓
5. Backend creates USERS record
   ↓
6. Backend sends verification email
   ↓
7. User clicks email link
   ↓
8. Frontend calls POST /api/auth/verify-email
   ↓
9. Backend marks user as verified
   ↓
10. User can now login
```

### Login
```
1. User enters email & password
   ↓
2. Frontend calls POST /api/auth/login
   ↓
3. Backend queries USERS table
   ↓
4. Backend compares password hash
   ↓
5. Backend generates JWT token
   ↓
6. Frontend stores token in localStorage
   ↓
7. Frontend redirects to dashboard
   ↓
8. All subsequent requests include JWT in header
```

### Protected Routes
```
1. Frontend makes API request
   ↓
2. Interceptor adds JWT to Authorization header
   ↓
3. Backend authMiddleware verifies JWT
   ↓
4. If valid: request proceeds
   ↓
5. If invalid: return 401 Unauthorized
   ↓
6. Frontend redirects to login
```

---

## 📦 Dependencies

### Frontend (Angular 21)
```json
{
  "@angular/core": "^21.0.0",
  "@angular/material": "^21.0.0",
  "@angular/forms": "^21.0.0",
  "@angular/router": "^21.0.0",
  "rxjs": "^7.8.0",
  "typescript": "^5.9.0"
}
```

### Backend (Node.js)
```json
{
  "express": "^4.18.0",
  "pg": "^8.11.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.1.0",
  "nodemailer": "^6.9.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.0.0",
  "dotenv": "^16.3.0"
}
```

---

## 🚀 Running the Application

### Frontend
```bash
cd dental-frontend
npm install
npm start          # ng serve on port 4200
```

### Backend
```bash
cd dental-backend
npm install
npm start          # runs on port 5000 (or configured port)
```

### Database
```bash
# PostgreSQL must be running
# Connection string in .env:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=***
DB_NAME=code_smiles_db
```

---

## 🧪 Testing

### Frontend Tests
```bash
npm test            # Run unit tests
npm run e2e         # Run e2e tests
```

### Backend Tests
```bash
npm test            # Run unit tests
npm run test:integration  # Integration tests
```

---

## 📝 Environment Variables

### Frontend (`.env`)
```
ANGULAR_APP_API_URL=http://localhost:5000/api
ANGULAR_APP_ENV=development
```

### Backend (`.env`)
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=Dububear101523
DB_NAME=code_smiles_db

JWT_SECRET=your-secret-key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

FRONTEND_URL=http://localhost:4200
PORT=5000
```

---

## 🔗 API Base URL

**Development:** `http://localhost:5000/api`  
**Production:** `https://your-domain.com/api`

---

## 📚 Key Files to Know

| File | Purpose |
|------|---------|
| `dental-frontend/src/app/app.routes.ts` | Route definitions |
| `dental-frontend/src/app/services/` | API services |
| `dental-backend/index.js` | Main API server |
| `dental-backend/db.js` | Database connection |
| `dental-backend/slot-manager.js` | Availability logic |
| `dental-backend/scheduler.js` | Background jobs |

---

**Generated:** May 24, 2026  
**Stack:** Angular 21 + Node.js/Express + PostgreSQL  
**Status:** ✅ Production Ready
