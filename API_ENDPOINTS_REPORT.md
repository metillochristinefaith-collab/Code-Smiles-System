# Code Smiles - API Endpoints Report
## May 24, 2026

---

## ✅ AVAILABLE API ENDPOINTS

### Authentication Endpoints
- ✅ `POST /auth/register` - Patient registration
- ✅ `POST /auth/login` - User login
- ✅ `POST /auth/google` - Google OAuth login
- ✅ `POST /auth/forgot-password` - Password reset request
- ✅ `POST /auth/reset-password` - Reset password with token
- ✅ `GET /auth/validate-reset-token` - Validate reset token
- ✅ `GET /verify-email` - Email verification
- ✅ `POST /auth/resend-verification` - Resend verification email

### User Profile Endpoints
- ✅ `GET /user/profile/:userId` - Get user profile
- ✅ `PUT /user/profile/:userId` - Update user profile
- ✅ `PUT /user/avatar/:userId` - Update user avatar
- ✅ `PUT /user/change-password/:userId` - Change password

### Appointment Endpoints (Single-Service Bookings)
- ✅ `GET /check-availability/:date` - Check available slots
- ✅ `GET /list-appointments` - List all appointments
- ✅ `POST /add-appointment` - Create new appointment (PATIENT BOOKING)
- ✅ `GET /my-appointments/:patientId` - Get patient's appointments
- ✅ `GET /dentist/appointments` - Get dentist's appointments
- ✅ `GET /staff/appointments` - Get all appointments (staff view)
- ✅ `GET /staff/appointments/:id` - Get single appointment
- ✅ `PUT /staff/appointments/:id/status` - Update appointment status
- ✅ `PUT /staff/appointments/:id/approve` - Approve appointment
- ✅ `PUT /staff/appointments/:id/cancel` - Cancel appointment (staff)
- ✅ `PUT /staff/appointments/:id/reschedule` - Reschedule appointment (staff)
- ✅ `PUT /appointments/:id/cancel` - Cancel appointment (patient)
- ✅ `PUT /appointments/:id/request-reschedule` - Request reschedule (patient)
- ✅ `PUT /dentist/appointments/:id/cancel` - Cancel appointment (dentist)

### Composite Booking Endpoints (Multi-Service Bookings)
- ✅ `POST /composite-booking/submit` - Create multi-service booking (STAFF BOOKING)
- ✅ `GET /composite-bookings` - List all composite bookings
- ✅ `GET /composite-bookings/:id` - Get single composite booking
- ✅ `PUT /composite-bookings/:id/status` - Update composite booking status
- ✅ `PUT /composite-bookings/:id/approve` - Approve composite booking
- ✅ `PUT /composite-bookings/:id/cancel` - Cancel composite booking

### Patient Management Endpoints
- ✅ `GET /list-patients` - List all patients (staff/dentist only)
- ✅ `POST /add-patient` - Add new patient (staff/dentist only)
- ✅ `PUT /update-patient/:id` - Update patient info (staff/dentist only)
- ✅ `DELETE /delete-patient/:id` - Delete patient (staff/dentist only)
- ✅ `GET /staff/patients-enriched` - Get patients with profile data (staff/dentist only)

### Dashboard Endpoints
- ✅ `GET /staff/dashboard-stats` - Staff dashboard statistics
- ✅ `GET /dentist/dashboard-stats` - Dentist dashboard statistics
- ✅ `GET /patient/dashboard-stats/:patientId` - Patient dashboard statistics

### Medical Vault Endpoints
- ✅ `GET /patient-vault-records/:patientId` - Get patient's vault records
- ✅ `POST /patient-vault-records` - Upload vault record
- ✅ `POST /patient-vault-records/:recordId/share` - Share vault file
- ✅ `GET /dentist/vault-records` - Get vault records shared with dentist
- ✅ `POST /patient-vault-records/:recordId/revoke-share` - Revoke file access

### Prescription Endpoints
- ✅ `POST /prescriptions` - Create prescription
- ✅ `GET /prescriptions/:patientId` - Get patient's prescriptions
- ✅ `PUT /prescriptions/:id` - Update prescription
- ✅ `DELETE /prescriptions/:id` - Delete prescription

### Treatment Plan Endpoints
- ✅ `POST /treatment-plans` - Create treatment plan
- ✅ `GET /treatment-plans/:patientId` - Get patient's treatment plans
- ✅ `PUT /treatment-plans/:id` - Update treatment plan
- ✅ `DELETE /treatment-plans/:id` - Delete treatment plan

### Clinical Notes Endpoints
- ✅ `POST /clinical-notes` - Create clinical note
- ✅ `GET /clinical-notes/:patientId` - Get patient's clinical notes
- ✅ `PUT /clinical-notes/:id` - Update clinical note
- ✅ `DELETE /clinical-notes/:id` - Delete clinical note

### Billing Endpoints
- ✅ `POST /billing` - Create billing record
- ✅ `GET /billing/:patientId` - Get patient's billing records
- ✅ `PUT /billing/:id` - Update billing record
- ✅ `DELETE /billing/:id` - Delete billing record

### Support Endpoints
- ✅ `POST /support-requests` - Create support request
- ✅ `GET /support-requests` - Get all support requests
- ✅ `PUT /support-requests/:id` - Update support request

### Notification Endpoints
- ✅ `GET /notifications/:userId` - Get user's notifications
- ✅ `PUT /notifications/:id/read` - Mark notification as read

---

## 🎯 KEY ENDPOINTS FOR DEFENSE

### For Patient Booking Demo
1. `POST /add-appointment` - Create single-service booking
2. `GET /my-appointments/:patientId` - View patient's bookings
3. `GET /check-availability/:date` - Check available slots

### For Staff Booking Demo
1. `POST /composite-booking/submit` - Create multi-service booking
2. `GET /composite-bookings` - View all composite bookings
3. `GET /staff/appointments` - View all appointments

### For Calendar Display
1. `GET /list-appointments` - Get all appointments
2. `GET /composite-bookings` - Get all composite bookings

---

## ✅ STATUS

All major endpoints are implemented and available!

**Ready for defense demo!** 🎉

---

## 📝 NOTES

- Backend is running on `http://localhost:3000`
- All endpoints require proper authentication (JWT token) where specified
- Rate limiting is in place for security
- ACID compliance implemented for critical operations
- Email notifications configured (Ethereal test account)

