# Code Smiles Database Schema Report

**Generated:** May 22, 2026  
**Total Tables:** 15  
**Status:** ✅ Well Organized

---

## 📊 Current Schema Organization

### 1. **User Management** (4 tables)
- `users` - Core user accounts (10 rows)
- `staff` - Staff members (1 row)
- `dentist` - Dentists (5 rows)
- `patient_profiles` - Patient profiles (6 rows)

**Status:** ✅ Well organized with role-specific tables

---

### 2. **Appointment Management** (1 table)
- `appointments` - Appointment bookings (0 rows)

**Status:** ✅ Centralized

---

### 3. **Clinical Management** (4 tables)
- `treatment_plans` - Treatment plans (0 rows)
- `treatment_sessions` - Treatment sessions (0 rows)
- `clinical_notes` - Clinical notes (0 rows)
- `prescriptions` - Prescriptions (2 rows)

**Status:** ✅ Well grouped by clinical domain

---

### 4. **Support & Communication** (3 tables)
- `notifications` - User notifications (113 rows)
- `support_requests` - Support tickets (0 rows)
- `faqs` - FAQ entries (19 rows)

**Status:** ✅ Well grouped by support domain

---

### 5. **Billing** (1 table)
- `billing` - Billing records (0 rows)

**Status:** ✅ Separate and focused

---

### 6. **Vault & File Sharing** (2 tables)
- `vault_file_sharing` - File sharing records (5 rows)
- `patient_vault_records` - Patient vault records (12 rows)

**Status:** ✅ Well grouped by vault domain

---

## 🔍 Detailed Table Analysis

### User Management Tables

#### `users` (10 rows)
**Purpose:** Core user authentication and profile  
**Key Columns:**
- `id` (PK) - User ID
- `first_name`, `last_name` - Name
- `email` (UNIQUE) - Email address
- `password` - Hashed password
- `role` - User role (Patient, Staff, Dentist)
- `status` - Account status (Active, Inactive)
- `is_verified` - Email verification status
- `avatar_url` - Profile picture
- `specialty` - Professional specialty (for dentists)

**Relationships:**
- ← `staff.user_id`
- ← `dentist.user_id`
- ← `patient_profiles.user_id`

---

#### `staff` (1 row)
**Purpose:** Staff member identification  
**Key Columns:**
- `staff_id` (PK) - Staff primary key
- `user_id` (FK) - Reference to users table
- `created_at` - Creation timestamp

**Current Staff:**
- Staff ID: 1 | Ashianna Creion Calayca

---

#### `dentist` (5 rows)
**Purpose:** Dentist identification  
**Key Columns:**
- `dentist_id` (PK) - Dentist primary key
- `user_id` (FK) - Reference to users table
- `created_at` - Creation timestamp

**Current Dentists:**
- Dentist ID: 1 | Derence Acojedo
- Dentist ID: 2 | Raphoncel Eduria
- Dentist ID: 3 | Nico Bongolto
- Dentist ID: 4 | Christine Faith Metillo
- **Dentist ID: 5 | Christine Metillo** ← Dr. Metillo (metillo@codesmiles.com)

---

#### `patient_profiles` (6 rows)
**Purpose:** Extended patient information  
**Key Columns:**
- `id` (PK) - Profile ID
- `user_id` (FK) - Reference to users table
- `date_of_birth` - DOB
- `gender` - Gender
- `blood_type` - Blood type
- `home_address` - Address
- `emergency_contact_*` - Emergency contact info
- `reliability_score` - No-show score
- `notif_*` - Notification preferences

---

### Appointment Management

#### `appointments` (0 rows)
**Purpose:** Appointment bookings and scheduling  
**Key Columns:**
- `id` (PK) - Appointment ID
- `patient_id` (FK) - Patient reference
- `dentist_id` (FK) - Dentist reference
- `appointment_date` - Date
- `appointment_time` - Time
- `duration_minutes` - Duration (default: 60)
- `treatment` - Service type
- `status` - Status (Pending, Approved, Completed, No-show)
- `urgency` - Urgency level (Standard, High)
- `reminder_24h_sent` - 24h reminder flag
- `reminder_3h_sent` - 3h reminder flag
- `confirmation_status` - Confirmation status

---

### Clinical Management

#### `treatment_plans` (0 rows)
**Purpose:** Treatment plans for patients  
**Key Columns:**
- `id` (PK) - Plan ID
- `patient_id` (FK) - Patient reference
- `dentist_id` (FK) - Dentist reference
- `title` - Plan title
- `description` - Plan description
- `status` - Status (Active, Completed, Cancelled)
- `created_at` - Creation timestamp

---

#### `treatment_sessions` (0 rows)
**Purpose:** Individual treatment sessions  
**Key Columns:**
- `id` (PK) - Session ID
- `plan_id` (FK) - Treatment plan reference
- `session_no` - Session number
- `title` - Session title
- `session_date` - Date
- `status` - Status (pending, completed, cancelled)
- `note` - Session notes

---

#### `clinical_notes` (0 rows)
**Purpose:** Clinical notes from dentists  
**Key Columns:**
- `id` (PK) - Note ID
- `patient_id` (FK) - Patient reference
- `dentist_id` (FK) - Dentist reference
- `type` - Note type (Consultation, Procedure, Post-treatment, Observation)
- `note` - Note content
- `created_at` - Creation timestamp

---

#### `prescriptions` (2 rows)
**Purpose:** Medication prescriptions  
**Key Columns:**
- `id` (PK) - Prescription ID
- `patient_id` (FK) - Patient reference
- `dentist_id` (FK) - Dentist reference
- `medication` - Medication name
- `dosage` - Dosage
- `frequency` - Frequency
- `duration` - Duration
- `instructions` - Instructions
- `status` - Status (Active, Completed, Cancelled)
- `diagnosis` - Diagnosis
- `condition_note` - Condition notes
- `issued_at` - Issue timestamp

---

### Support & Communication

#### `notifications` (113 rows)
**Purpose:** User notifications  
**Key Columns:**
- `id` (PK) - Notification ID
- `user_id` (FK) - User reference
- `title` - Notification title
- `detail` - Notification detail
- `level` - Level (New, Info, Warning, Error)
- `is_read` - Read status
- `appointment_id` (FK) - Related appointment
- `created_at` - Creation timestamp

---

#### `support_requests` (0 rows)
**Purpose:** Support tickets  
**Key Columns:**
- `id` (PK) - Request ID
- `user_id` (FK) - User reference
- `user_name` - User name
- `user_email` - User email
- `user_role` - User role
- `subject` - Subject
- `message` - Message
- `status` - Status (Pending, In Progress, Resolved, Closed)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

---

#### `faqs` (19 rows)
**Purpose:** Frequently asked questions  
**Key Columns:**
- `id` (PK) - FAQ ID
- `question` - Question text
- `answer` - Answer text
- `category` - Category (General, Appointments, Billing, etc.)
- `role` - Target role (Patient, Staff, Dentist)
- `sort_order` - Display order
- `created_at` - Creation timestamp

---

### Billing

#### `billing` (0 rows)
**Purpose:** Billing and payment records  
**Key Columns:**
- `id` (PK) - Billing ID
- `appointment_id` (FK) - Appointment reference
- `patient_id` (FK) - Patient reference
- `service` - Service name
- `dentist_name` - Dentist name
- `amount` - Total amount
- `amount_paid` - Amount paid
- `discount` - Discount amount
- `status` - Status (Unpaid, Partial, Paid)
- `payment_method` - Payment method
- `due_date` - Due date
- `invoice_no` - Invoice number
- `created_at` - Creation timestamp

---

### Vault & File Sharing

#### `patient_vault_records` (12 rows)
**Purpose:** Patient medical records in vault  
**Key Columns:**
- `id` (PK) - Record ID
- `patient_id` (FK) - Patient reference
- `title` - Record title
- `description` - Description
- `record_type` - Type (Medical, Dental, Lab, etc.)
- `category` - Category
- `file_name` - File name
- `file_size` - File size
- `preview_kind` - Preview type (document, image, etc.)
- `source` - Source (Patient, Clinic, etc.)
- `created_at` - Creation timestamp

---

#### `vault_file_sharing` (5 rows)
**Purpose:** File sharing permissions  
**Key Columns:**
- `id` (PK) - Sharing ID
- `vault_record_id` (FK) - Vault record reference
- `patient_id` (FK) - Patient reference
- `shared_with_dentist_name` - Dentist name
- `shared_with_user_id` (FK) - User reference
- `permission_level` - Permission (view, edit, download)
- `shared_at` - Share timestamp
- `access_revoked_at` - Revocation timestamp

---

## ✅ Strengths

1. **Clear Domain Separation** - Tables are grouped by business domain
2. **Proper Relationships** - Foreign keys establish clear relationships
3. **Role-Specific Tables** - Staff and Dentist tables provide clear role identification
4. **Audit Trail** - Most tables have `created_at` and `updated_at` timestamps
5. **Status Tracking** - Most entities have status fields for workflow management
6. **Notification System** - Dedicated notifications table for user communication
7. **Vault System** - Secure file sharing with permission levels

---

## 🔧 Recommendations for Improvement

### 1. **Add Audit Columns to More Tables**
**Current Issue:** Some tables lack `updated_at` timestamps
**Recommendation:** Add `updated_at` to:
- `appointments`
- `treatment_plans`
- `treatment_sessions`
- `clinical_notes`
- `prescriptions`
- `patient_vault_records`

**Benefit:** Better tracking of data changes

---

### 2. **Add Soft Delete Support**
**Current Issue:** No soft delete capability
**Recommendation:** Add `deleted_at` column to:
- `appointments`
- `treatment_plans`
- `prescriptions`
- `support_requests`

**Benefit:** Preserve data history and enable recovery

---

### 3. **Improve Billing Table**
**Current Issue:** Missing appointment reference in some cases
**Recommendation:**
- Add `created_by` (staff_id) to track who created the billing record
- Add `payment_date` to track when payment was made
- Add `payment_reference` for transaction tracking

---

### 4. **Add Audit Log Table**
**Current Issue:** No centralized audit trail
**Recommendation:** Create `audit_logs` table:
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50),
  table_name VARCHAR(100),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Benefit:** Complete audit trail for compliance

---

### 5. **Add Indexes for Performance**
**Current Issue:** No explicit indexes mentioned
**Recommendation:** Add indexes on:
- `appointments.appointment_date`
- `appointments.dentist_id`
- `appointments.patient_id`
- `notifications.user_id`
- `notifications.is_read`
- `patient_vault_records.patient_id`

---

### 6. **Standardize Naming Conventions**
**Current Issue:** Some inconsistencies in naming
**Examples:**
- `dentist_name` vs `shared_with_dentist_name` (use consistent naming)
- `status` values vary (use enums or check constraints)

---

### 7. **Add Constraints for Data Integrity**
**Current Issue:** Some fields could benefit from constraints
**Recommendation:**
- Add CHECK constraint for `appointments.duration_minutes > 0`
- Add CHECK constraint for `billing.amount >= 0`
- Add CHECK constraint for `patient_profiles.reliability_score` between 0-100

---

## 📈 Data Volume Summary

| Table | Rows | Status |
|-------|------|--------|
| users | 10 | Active |
| staff | 1 | Active |
| dentist | 5 | Active |
| patient_profiles | 6 | Active |
| appointments | 0 | Empty |
| treatment_plans | 0 | Empty |
| treatment_sessions | 0 | Empty |
| clinical_notes | 0 | Empty |
| prescriptions | 2 | Low |
| notifications | 113 | Active |
| support_requests | 0 | Empty |
| faqs | 19 | Active |
| billing | 0 | Empty |
| vault_file_sharing | 5 | Low |
| patient_vault_records | 12 | Low |

---

## 🎯 Conclusion

**Overall Assessment:** ✅ **WELL ORGANIZED**

The Code Smiles database schema is well-structured and logically organized by business domain. The recent migration to role-specific primary keys (staff_id, dentist_id) has improved clarity and data integrity.

**Priority Improvements:**
1. Add `updated_at` timestamps to all tables
2. Implement soft delete support
3. Create audit log table
4. Add performance indexes
5. Standardize naming conventions

**Next Steps:**
- Implement the recommended improvements
- Add database documentation
- Create backup and recovery procedures
- Monitor performance as data grows

---

**Report Generated:** May 22, 2026  
**Database:** code_smiles_db  
**Status:** ✅ Production Ready
