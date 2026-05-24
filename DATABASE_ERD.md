# Code Smiles Database ERD (Entity Relationship Diagram)

## Database Overview
PostgreSQL database with 20 tables supporting a dental booking and management system.

---

## Core Entity Tables

### 1. **users** (Core Authentication)
Primary key: `id`
- Stores all system users (patients, dentists, staff)
- Fields: first_name, last_name, email, phone, password, role, status, specialty, avatar_url
- Authentication: JWT tokens, password reset, email verification

**Relationships:**
- ← patients (1:1 via user_id)
- ← staff (1:1 via user_id)
- ← dentist (1:1 via user_id)
- ← vault_file_sharing (1:N via patient_id, shared_with_user_id)
- ← support_requests (1:N via user_id)

---

### 2. **patients** (Patient Profiles)
Primary key: `patient_id`
Foreign key: `user_id` → users.id (UNIQUE)
- Extends user data with patient-specific info
- Fields: date_of_birth, gender, address, phone_number, medical_history, allergies, insurance_provider, insurance_id, emergency_contact, specialty
- Unique constraint on email and user_id

**Relationships:**
- → users (N:1)
- ← appointments (1:N)
- ← composite_bookings (1:N)
- ← patient_vault_records (1:N)
- ← vault_file_sharing (1:N)
- ← prescriptions (1:N)
- ← treatment_plans (1:N)
- ← clinical_notes (1:N)
- ← patient_profiles (1:N)

---

### 3. **dentist** (Dentist Profiles)
Primary key: `dentist_id`
Foreign key: `user_id` → users.id (UNIQUE)
- Dentist-specific information
- Fields: license_number, specialization, experience_years, clinic_location, availability_status, bio, rating, total_patients, consultation_fee

**Relationships:**
- → users (N:1)
- ← appointments (1:N)
- ← composite_bookings (1:N)
- ← service_dentist_mapping (1:N)
- ← prescriptions (1:N)
- ← treatment_plans (1:N)
- ← clinical_notes (1:N)

---

### 4. **staff** (Staff Members)
Primary key: `staff_id`
Foreign key: `user_id` → users.id (UNIQUE)
- Internal staff information
- Fields: first_name, last_name, email, phone, position, department, permissions (JSONB), hire_date, status, avatar_url

**Relationships:**
- → users (N:1)

---

## Booking & Appointment Tables

### 5. **appointments** (Individual Appointments - Single-Service Bookings)
Primary key: `id` (INTEGER)
Foreign keys: `patient_id` → users.id, `dentist_id` → dentist.dentist_id
- Single appointment records (standalone bookings)
- Fields: booking_id (UNIQUE VARCHAR), patient_id, patient_name, email, phone, treatment, services (ARRAY), dentist_id, dentist_name, appointment_date, appointment_time, duration_minutes, status, confirmation_status, notes, urgency, booking_type, intake_source, reminder_24h_sent, reminder_3h_sent, rescheduled_by, created_at, updated_at

**Relationships:**
- → users (N:1) [patient_id]
- → dentist (N:1) [dentist_id]

---

### 6. **composite_bookings** (Multi-Appointment Bookings)
Primary key: `id` (INTEGER)
Unique constraint: `booking_id` (VARCHAR 50)
Foreign keys: `patient_id` → users.id, `created_by` → users.id
- Groups multiple appointments together (multi-service bookings)
- Fields: id, booking_id (UNIQUE), patient_id, patient_name, patient_email, patient_phone, booking_type, intake_priority, intake_source, service_count (1-3), total_duration_minutes, overall_status, patient_notes, staff_notes, created_by, created_at, updated_at

**Relationships:**
- → users (N:1) [patient_id]
- → users (N:1) [created_by]
- ← composite_booking_appointments (1:N)

---

### 7. **composite_booking_appointments** (Booking-Appointment Junction)
Primary key: `id` (INTEGER)
Foreign keys: `composite_booking_id` → composite_bookings.id, `dentist_id` → dentist.dentist_id
- Links individual services to composite bookings (multi-service booking details)
- Fields: id, composite_booking_id, booking_id (VARCHAR), appointment_id (VARCHAR), appointment_sequence (1-3), service_name, service_category, service_duration_minutes, appointment_date, appointment_time, appointment_end_time, dentist_id, dentist_name, dentist_specialty, patient_age, appointment_status, confirmation_status, cancellation_reason, reminder_24h_sent, reminder_3h_sent, created_at, updated_at

**Relationships:**
- → composite_bookings (N:1)
- → dentist (N:1)

---

### 8. **composite_booking_audit_log** (Booking Audit Trail)
Primary key: `id`
Foreign key: `composite_booking_id` → composite_bookings.id
- Tracks changes to composite bookings
- Fields: id, composite_booking_id, action, changed_by, change_details, timestamp

**Relationships:**
- → composite_bookings (N:1)

---

## Service & Mapping Tables

### 9. **service_dentist_mapping** (Service-Dentist Association)
Primary key: `id` (SERIAL)
Foreign key: `dentist_id` → dentist.dentist_id
- Maps services to dentists (which dentist can perform which service)
- Fields: id, dentist_id, service_name, service_category, is_primary, is_active, created_at
- Unique constraint on (dentist_id, service_name)

**Relationships:**
- → dentist (N:1)

---

## Medical & Treatment Tables

### 10. **treatment_plans** (Treatment Plans)
Primary key: `id`
Foreign keys: `patient_id` → patients.patient_id, `dentist_id` → dentist.dentist_id
- Long-term treatment plans for patients
- Fields: title, description, status, created_at

**Relationships:**
- → patients (N:1)
- → dentist (N:1)
- ← treatment_sessions (1:N)

---

### 11. **treatment_sessions** (Individual Treatment Sessions)
Primary key: `id`
Foreign key: `plan_id` → treatment_plans.id
- Individual sessions within a treatment plan
- Fields: session_no, title, session_date, status, note

**Relationships:**
- → treatment_plans (N:1)

---

### 12. **prescriptions** (Medication Prescriptions)
Primary key: `id`
Foreign key: `dentist_id` → dentist.dentist_id
- Medication prescriptions for patients
- Fields: patient_id, medication, dosage, frequency, duration, instructions, status, issued_at, patient_name, dentist_name, condition_note, diagnosis, updated_at

**Relationships:**
- → dentist (N:1)

---

### 13. **clinical_notes** (Clinical Documentation)
Primary key: `id`
Foreign keys: `patient_id` → patients.patient_id, `dentist_id` → dentist.dentist_id
- Clinical notes and observations
- Fields: note_content, created_at, updated_at

**Relationships:**
- → patients (N:1)
- → dentist (N:1)

---

## Patient Records & Vault Tables

### 14. **patient_profiles** (Extended Patient Info)
Primary key: `id`
Foreign key: `patient_id` → patients.patient_id
- Additional patient profile information
- Fields: bio, preferences, emergency_contact_info, created_at, updated_at

**Relationships:**
- → patients (N:1)

---

### 15. **patient_vault_records** (Medical File Storage)
Primary key: `id`
Foreign key: `patient_id` → patients.patient_id
- Stores medical documents and files
- Fields: file_name, file_path, file_type, file_size, upload_date, description, is_shared

**Relationships:**
- → patients (N:1)
- ← vault_file_sharing (1:N)

---

### 16. **vault_file_sharing** (File Access Control)
Primary key: `id`
Foreign keys: `vault_record_id` → patient_vault_records.id, `patient_id` → users.id, `shared_with_user_id` → users.id
- Manages file sharing permissions
- Fields: shared_with_dentist_name, permission_level, shared_at, access_revoked_at
- Unique constraint on (vault_record_id, shared_with_dentist_name)

**Relationships:**
- → patient_vault_records (N:1)
- → users (N:1) [patient_id]
- → users (N:1) [shared_with_user_id]

---

## Support & Notification Tables

### 17. **support_requests** (Customer Support)
Primary key: `id`
Foreign key: `user_id` → users.id (optional)
- Support tickets from users
- Fields: user_name, user_email, user_role, subject, message, status, created_at, updated_at

**Relationships:**
- → users (N:1)

---

### 18. **notifications** (System Notifications)
Primary key: `id`
- System-wide notifications
- Fields: recipient_id, message, type, is_read, created_at

---

### 19. **faqs** (Frequently Asked Questions)
Primary key: `id`
- FAQ entries
- Fields: question, answer, category, created_at, updated_at

---

### 20. **billing** (Financial Records)
Primary key: `id`
- Billing and payment records
- Fields: patient_id, amount, service_type, payment_status, invoice_date, due_date, paid_date

---

## Relationship Summary

### One-to-Many (1:N) Relationships:
- users → dentist, appointments (patient_id), composite_bookings (patient_id), composite_bookings (created_by), vault_file_sharing, support_requests
- dentist → appointments, composite_booking_appointments, service_dentist_mapping, prescriptions, treatment_plans, clinical_notes
- composite_bookings → composite_booking_appointments, composite_booking_audit_log
- treatment_plans → treatment_sessions
- patient_vault_records → vault_file_sharing

### One-to-One (1:1) Relationships:
- users ↔ dentist (via user_id)
- users ↔ staff (via user_id)
- users ↔ patients (via user_id)

### Many-to-Many (N:N) Relationships:
- dentist ↔ services (via service_dentist_mapping junction table)
- users ↔ patient_vault_records (via vault_file_sharing)

---

## Key Constraints & Indexes

### Primary Keys:
All tables have primary key constraints for data integrity.

### Foreign Keys:
- Enforced referential integrity across all relationships
- Cascade delete/update policies in place

### Unique Constraints:
- users.email (implicit)
- patients.user_id, patients.email
- staff.user_id
- dentist.user_id
- service_dentist_mapping (service_name, dentist_id)
- vault_file_sharing (vault_record_id, shared_with_dentist_name)

### Check Constraints:
- Various NOT NULL constraints on required fields

---

## Data Flow Patterns

### Booking Flow:
1. Patient creates appointment → appointments table
2. Dentist confirms → status updated
3. Multiple appointments grouped → composite_bookings
4. Audit trail maintained → composite_booking_audit_log

### Medical Records Flow:
1. Dentist creates treatment plan → treatment_plans
2. Sessions scheduled → treatment_sessions
3. Clinical notes recorded → clinical_notes
4. Prescriptions issued → prescriptions

### File Sharing Flow:
1. Patient uploads file → patient_vault_records
2. Shares with dentist → vault_file_sharing
3. Permission level set (view/edit)
4. Access can be revoked → access_revoked_at

---

## Notes
- All timestamps use `timestamp without time zone` (UTC recommended)
- JSONB used for flexible data (staff permissions)
- Status fields use VARCHAR for flexibility
- Audit logging implemented for composite bookings
- File sharing has granular permission control
