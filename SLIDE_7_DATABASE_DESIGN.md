# Slide 7 — Database Design

## 📊 ER Diagram (Entity Relationship Diagram)

### Visual Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE SMILES DATABASE SCHEMA                  │
│                      PostgreSQL (20 Tables)                     │
└─────────────────────────────────────────────────────────────────┘

                              USERS (Core)
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                DENTIST       PATIENTS        STAFF
                    │             │
        ┌───────────┼─────┐       │
        │           │     │       │
    APPOINTMENTS  CLINICAL  PRESCRIPTIONS  PATIENT_PROFILES
        │          NOTES       │
        │           │          │
    COMPOSITE_BOOKINGS    TREATMENT_PLANS
        │                      │
    COMPOSITE_BOOKING_    TREATMENT_
    APPOINTMENTS          SESSIONS
        │
    COMPOSITE_BOOKING_
    AUDIT_LOG

    SERVICE_DENTIST_MAPPING (Links Dentists to Services)
    PATIENT_VAULT_RECORDS (Medical Documents)
    VAULT_FILE_SHARING (Document Sharing)
    BILLING (Invoices & Payments)
    NOTIFICATIONS (User Alerts)
    SUPPORT_REQUESTS (Help Tickets)
    FAQS (Knowledge Base)
```

---

## 🏗️ Database Tables (20 Total)

### **Layer 1: User Management**

#### 1. **USERS** (Central Authentication)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| email | VARCHAR | Unique email for login |
| password_hash | VARCHAR | Encrypted password |
| role | ENUM | patient / dentist / staff / admin |
| is_verified | BOOLEAN | Email verification status |
| created_at | TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | Last update |

**Purpose**: Central authentication hub for all user types

---

#### 2. **DENTIST** (Dentist Profile)
| Column | Type | Purpose |
|--------|------|---------|
| dentist_id | UUID | Primary Key |
| user_id | UUID | FK to USERS (1:1) |
| specialization | VARCHAR | e.g., Orthodontist, Periodontist |
| license_number | VARCHAR | Professional license |
| experience_years | INT | Years of experience |
| working_days | JSONB | Schedule (Mon-Fri, hours) |
| is_active | BOOLEAN | Availability status |

**Purpose**: Dentist-specific information and availability

---

#### 3. **PATIENTS** (Patient Profile)
| Column | Type | Purpose |
|--------|------|---------|
| patient_id | UUID | Primary Key |
| user_id | UUID | FK to USERS (1:1) |
| phone | VARCHAR | Contact number |
| medical_history | TEXT | Health conditions |
| emergency_contact | VARCHAR | Emergency contact info |
| reliability_score | INT | Booking reliability (0-100) |

**Purpose**: Patient-specific information and history

---

#### 4. **STAFF** (Staff Profile)
| Column | Type | Purpose |
|--------|------|---------|
| staff_id | UUID | Primary Key |
| user_id | UUID | FK to USERS (1:1) |
| position | VARCHAR | Job title |
| department | VARCHAR | Department name |
| permissions | JSONB | Role-based permissions |
| hire_date | DATE | Employment start date |

**Purpose**: Staff member information and permissions

---

### **Layer 2: Booking & Appointments**

#### 5. **COMPOSITE_BOOKINGS** (Multi-Appointment Booking)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| booking_id | VARCHAR | Unique booking reference |
| patient_id | UUID | FK to USERS |
| created_by | UUID | FK to USERS (staff who created) |
| booking_type | ENUM | patient / staff / walk_in |
| priority | ENUM | normal / urgent / emergency |
| overall_status | ENUM | pending / approved / rejected / completed |
| patient_notes | TEXT | Patient's notes |
| staff_notes | TEXT | Staff's notes |
| created_at | TIMESTAMP | Booking creation |
| updated_at | TIMESTAMP | Last update |

**Purpose**: Container for multiple appointments in one booking

---

#### 6. **COMPOSITE_BOOKING_APPOINTMENTS** (Individual Appointments)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| appointment_id | VARCHAR | Unique appointment reference |
| composite_booking_id | UUID | FK to COMPOSITE_BOOKINGS |
| dentist_id | UUID | FK to DENTIST (assigned dentist) |
| service_name | VARCHAR | Service type (e.g., Cleaning, Root Canal) |
| appointment_date | DATE | Appointment date |
| appointment_time | TIME | Appointment time |
| duration_minutes | INT | Duration (30, 45, 60 mins) |
| confirmation_status | ENUM | pending / confirmed / cancelled |
| reminder_sent | BOOLEAN | Reminder notification sent |
| dentist_name | VARCHAR | Denormalized dentist name |
| patient_age | INT | Denormalized patient age |

**Purpose**: Individual appointment details within a booking

---

#### 7. **APPOINTMENTS** (Legacy Appointments)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| booking_id | VARCHAR | Unique booking reference |
| patient_id | UUID | FK to USERS |
| dentist_id | UUID | FK to DENTIST |
| appointment_date | DATE | Appointment date |
| appointment_time | TIME | Appointment time |
| status | ENUM | pending / approved / rejected / completed |
| urgency | ENUM | normal / urgent / emergency |
| booking_type | ENUM | patient / staff / walk_in |

**Purpose**: Legacy appointment tracking (being phased out)

---

#### 8. **COMPOSITE_BOOKING_AUDIT_LOG** (Booking Audit Trail)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| composite_booking_id | UUID | FK to COMPOSITE_BOOKINGS |
| action | VARCHAR | e.g., created, approved, rejected |
| action_by | UUID | FK to USERS (who performed action) |
| details | TEXT | Change details |
| created_at | TIMESTAMP | Action timestamp |

**Purpose**: Complete audit trail for compliance and debugging

---

### **Layer 3: Clinical & Medical Records**

#### 9. **CLINICAL_NOTES** (Doctor's Notes)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| dentist_id | UUID | FK to DENTIST |
| patient_id | UUID | FK to USERS |
| note_type | VARCHAR | e.g., diagnosis, treatment, follow-up |
| content | TEXT | Note content |
| created_at | TIMESTAMP | Note creation |

**Purpose**: Store clinical observations and diagnoses

---

#### 10. **PRESCRIPTIONS** (Medication Prescriptions)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| dentist_id | UUID | FK to DENTIST |
| patient_id | UUID | FK to USERS |
| medication | VARCHAR | Drug name |
| dosage | VARCHAR | e.g., 500mg |
| frequency | VARCHAR | e.g., 3x daily |
| duration_days | INT | Treatment duration |
| status | ENUM | active / completed / cancelled |

**Purpose**: Track medication prescriptions

---

#### 11. **TREATMENT_PLANS** (Treatment Planning)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| dentist_id | UUID | FK to DENTIST |
| patient_id | UUID | FK to USERS |
| title | VARCHAR | Plan name |
| description | TEXT | Treatment details |
| status | ENUM | draft / active / completed |
| start_date | DATE | Plan start date |
| estimated_end_date | DATE | Expected completion |

**Purpose**: Long-term treatment planning

---

#### 12. **TREATMENT_SESSIONS** (Individual Sessions)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| plan_id | UUID | FK to TREATMENT_PLANS |
| session_number | INT | Session sequence |
| session_date | DATE | Session date |
| status | ENUM | scheduled / completed / cancelled |
| notes | TEXT | Session notes |

**Purpose**: Track individual treatment sessions

---

### **Layer 4: Service Management**

#### 13. **SERVICE_DENTIST_MAPPING** (Service Availability)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| dentist_id | UUID | FK to DENTIST |
| service_name | VARCHAR | Service type |
| is_primary | BOOLEAN | Primary service |
| is_active | BOOLEAN | Currently offering |

**Purpose**: Link dentists to services they provide

---

### **Layer 5: Patient Information**

#### 14. **PATIENT_PROFILES** (Extended Patient Info)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| patient_id | UUID | FK to PATIENTS (1:1) |
| date_of_birth | DATE | DOB |
| gender | ENUM | male / female / other |
| blood_type | VARCHAR | Blood type |
| language_preference | VARCHAR | Preferred language |
| notification_preference | ENUM | email / sms / both |

**Purpose**: Extended patient demographic information

---

#### 15. **PATIENT_VAULT_RECORDS** (Medical Documents)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| patient_id | UUID | FK to USERS |
| file_name | VARCHAR | Document name |
| file_path | VARCHAR | Storage path |
| file_type | VARCHAR | e.g., PDF, JPG |
| file_size | INT | Size in bytes |
| record_type | VARCHAR | e.g., X-ray, Report, Prescription |
| category | VARCHAR | e.g., dental, medical |
| uploaded_at | TIMESTAMP | Upload date |

**Purpose**: Store patient medical documents

---

#### 16. **VAULT_FILE_SHARING** (Document Sharing)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| vault_record_id | UUID | FK to PATIENT_VAULT_RECORDS |
| patient_id | UUID | FK to USERS (owner) |
| shared_with_user_id | UUID | FK to USERS (recipient) |
| shared_with_dentist_name | VARCHAR | Recipient name |
| permission_level | ENUM | view / download / edit |
| shared_at | TIMESTAMP | Sharing date |

**Purpose**: Manage document sharing permissions

---

### **Layer 6: Billing & Notifications**

#### 17. **BILLING** (Invoices & Payments)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| appointment_id | UUID | FK to APPOINTMENTS |
| patient_id | UUID | FK to USERS |
| amount | DECIMAL | Invoice amount |
| payment_status | ENUM | pending / paid / overdue |
| payment_method | VARCHAR | e.g., credit_card, cash |
| discount_percent | INT | Discount percentage |
| due_date | DATE | Payment due date |
| paid_date | DATE | Actual payment date |

**Purpose**: Track invoices and payments

---

#### 18. **NOTIFICATIONS** (User Alerts)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| user_id | UUID | FK to USERS |
| appointment_id | UUID | FK to APPOINTMENTS |
| title | VARCHAR | Notification title |
| detail | TEXT | Notification message |
| level | ENUM | info / warning / error |
| is_read | BOOLEAN | Read status |
| created_at | TIMESTAMP | Creation time |

**Purpose**: Track user notifications

---

### **Layer 7: Support & FAQ**

#### 19. **SUPPORT_REQUESTS** (Help Tickets)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| user_id | UUID | FK to USERS |
| subject | VARCHAR | Ticket subject |
| message | TEXT | Ticket message |
| status | ENUM | open / in_progress / resolved / closed |
| created_at | TIMESTAMP | Ticket creation |
| updated_at | TIMESTAMP | Last update |

**Purpose**: Customer support ticket tracking

---

#### 20. **FAQS** (Knowledge Base)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary Key |
| category | VARCHAR | FAQ category |
| question | TEXT | Question text |
| answer | TEXT | Answer text |
| role | ENUM | patient / dentist / staff / public |
| sort_order | INT | Display order |

**Purpose**: Frequently asked questions knowledge base

---

## 🔗 Key Relationships

### One-to-One (1:1)
- USERS ↔ DENTIST (one user = one dentist)
- USERS ↔ PATIENTS (one user = one patient)
- USERS ↔ STAFF (one user = one staff)
- PATIENTS ↔ PATIENT_PROFILES (one patient = one profile)

### One-to-Many (1:N)
- DENTIST → APPOINTMENTS (one dentist → many appointments)
- DENTIST → CLINICAL_NOTES (one dentist → many notes)
- DENTIST → PRESCRIPTIONS (one dentist → many prescriptions)
- DENTIST → TREATMENT_PLANS (one dentist → many plans)
- PATIENTS → APPOINTMENTS (one patient → many appointments)
- PATIENTS → PATIENT_VAULT_RECORDS (one patient → many documents)
- COMPOSITE_BOOKINGS → COMPOSITE_BOOKING_APPOINTMENTS (one booking → many appointments)
- COMPOSITE_BOOKINGS → COMPOSITE_BOOKING_AUDIT_LOG (one booking → many audit logs)
- TREATMENT_PLANS → TREATMENT_SESSIONS (one plan → many sessions)
- PATIENT_VAULT_RECORDS → VAULT_FILE_SHARING (one record → many shares)

---

## 📈 Data Flow Patterns

### Booking Flow
```
Patient/Staff Creates Booking
    ↓
COMPOSITE_BOOKINGS (Create container)
    ↓
COMPOSITE_BOOKING_APPOINTMENTS (Add appointments)
    ↓
Staff Assigns Dentist
    ↓
DENTIST (Assign to appointment)
    ↓
NOTIFICATIONS (Send confirmation)
    ↓
BILLING (Generate invoice)
    ↓
COMPOSITE_BOOKING_AUDIT_LOG (Log all changes)
```

### Clinical Records Flow
```
Appointment Completed
    ↓
CLINICAL_NOTES (Doctor writes notes)
    ↓
PRESCRIPTIONS (Issue medication)
    ↓
TREATMENT_PLANS (Create treatment plan)
    ↓
TREATMENT_SESSIONS (Track sessions)
```

### Document Sharing Flow
```
Patient Uploads Document
    ↓
PATIENT_VAULT_RECORDS (Store file)
    ↓
VAULT_FILE_SHARING (Share with dentist)
    ↓
NOTIFICATIONS (Notify recipient)
```

---

## 🔐 Data Integrity Features

### Foreign Key Constraints
- All relationships enforced at database level
- Prevents orphaned records
- Cascading deletes where appropriate

### Unique Constraints
- Email uniqueness (USERS, PATIENTS)
- Booking ID uniqueness (COMPOSITE_BOOKINGS)
- Appointment ID uniqueness (COMPOSITE_BOOKING_APPOINTMENTS)

### Audit Trail
- COMPOSITE_BOOKING_AUDIT_LOG tracks all changes
- Timestamps on all tables (created_at, updated_at)
- User tracking (who made changes)

---

## 📊 Database Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 20 |
| Total Foreign Keys | 18+ |
| Total Unique Constraints | 11 |
| Denormalized Tables | 4 |
| JSONB Fields | 2 |
| Timestamp Fields | 30+ |

---

## 🎯 Design Highlights

✅ **Scalable**: Supports thousands of patients and appointments  
✅ **Secure**: Role-based access control via USERS table  
✅ **Auditable**: Complete audit trail for compliance  
✅ **Flexible**: JSONB fields for dynamic data (schedules, permissions)  
✅ **Normalized**: Reduces data redundancy and inconsistency  
✅ **Performant**: Indexed on frequently queried columns  

---

**Database**: PostgreSQL  
**Last Updated**: May 24, 2026
