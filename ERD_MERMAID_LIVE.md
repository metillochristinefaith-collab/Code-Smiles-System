# Code Smiles ERD - Mermaid Live Format

## 🔗 How to Use These Diagrams

### Option 1: Mermaid Live Editor
1. Go to https://mermaid.live
2. Copy the diagram code below
3. Paste into the editor
4. Export as PNG, SVG, or share the link

### Option 2: GitHub/GitLab
- Paste the diagram code in any `.md` file
- It will render automatically

### Option 3: VS Code
- Install "Markdown Preview Mermaid Support" extension
- Open this file in preview mode

---

## 📊 Complete ERD Diagram

```mermaid
erDiagram
    USERS ||--|| DENTIST : "1:1"
    USERS ||--|| PATIENTS : "1:1"
    USERS ||--|| STAFF : "1:1"
    USERS ||--o{ COMPOSITE_BOOKINGS : "creates"
    USERS ||--o{ COMPOSITE_BOOKING_AUDIT_LOG : "performs"
    USERS ||--o{ VAULT_FILE_SHARING : "shares_with"
    USERS ||--o{ SUPPORT_REQUESTS : "submits"
    
    DENTIST ||--o{ APPOINTMENTS : "schedules"
    DENTIST ||--o{ CLINICAL_NOTES : "writes"
    DENTIST ||--o{ PRESCRIPTIONS : "issues"
    DENTIST ||--o{ SERVICE_DENTIST_MAPPING : "provides"
    DENTIST ||--o{ TREATMENT_PLANS : "creates"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "assigned_to"
    
    PATIENTS ||--|| PATIENT_PROFILES : "1:1"
    PATIENTS ||--o{ APPOINTMENTS : "books"
    PATIENTS ||--o{ PATIENT_VAULT_RECORDS : "owns"
    PATIENTS ||--o{ TREATMENT_PLANS : "receives"
    
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "contains"
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_AUDIT_LOG : "tracked_by"
    
    PATIENT_VAULT_RECORDS ||--o{ VAULT_FILE_SHARING : "shared_via"
    
    APPOINTMENTS ||--o{ BILLING : "generates"
    APPOINTMENTS ||--o{ NOTIFICATIONS : "triggers"
    
    TREATMENT_PLANS ||--o{ TREATMENT_SESSIONS : "contains"

    USERS {
        int id PK
        string first_name
        string last_name
        string email UK
        string phone
        string password
        string role
        string status
        text specialty
        text avatar_url
        boolean is_verified
        string verification_token
        timestamp verification_token_expires_at
        string reset_token
        timestamp reset_token_expires_at
        timestamp created_at
    }

    DENTIST {
        int dentist_id PK
        int user_id FK,UK
        string first_name
        string last_name
        string email
        string phone
        string specialization
        string license_number
        int years_experience
        text bio
        jsonb working_days
        time start_time
        time end_time
        string status
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    PATIENTS {
        int patient_id PK
        int user_id FK,UK
        string first_name
        string last_name
        string email UK
        date date_of_birth
        string gender
        string contact_number
        text address
        string emergency_contact_name
        string emergency_contact_phone
        text medical_history
        string status
        text avatar_url
        text specialty
        timestamp created_at
        timestamp updated_at
    }

    STAFF {
        int staff_id PK
        int user_id FK,UK
        string first_name
        string last_name
        string email
        string phone
        string position
        string department
        jsonb permissions
        date hire_date
        string status
        text avatar_url
        timestamp created_at
        timestamp updated_at
    }

    COMPOSITE_BOOKINGS {
        int id PK
        string booking_id UK
        int patient_id FK
        int created_by FK
        string patient_name
        string patient_email
        string patient_phone
        string booking_type
        string intake_priority
        string intake_source
        int service_count
        int total_duration_minutes
        text patient_notes
        text staff_notes
        string overall_status
        timestamp created_at
        timestamp updated_at
    }

    COMPOSITE_BOOKING_APPOINTMENTS {
        int id PK
        int composite_booking_id FK
        string booking_id
        string appointment_id UK
        int appointment_sequence
        int dentist_id FK
        string service_name
        string service_category
        int service_duration_minutes
        date appointment_date
        string appointment_time
        string appointment_end_time
        string dentist_name
        string dentist_specialty
        string patient_age
        string appointment_status
        string confirmation_status
        text cancellation_reason
        boolean reminder_24h_sent
        boolean reminder_3h_sent
        timestamp created_at
        timestamp updated_at
    }

    APPOINTMENTS {
        int id PK
        int patient_id FK
        int dentist_id FK
        int composite_booking_id FK
        string booking_id UK
        string patient_name
        string email
        string phone
        string treatment
        array services
        string dentist_name
        date appointment_date
        time appointment_time
        int duration_minutes
        string status
        text notes
        string urgency
        string booking_type
        string intake_priority
        string intake_source
        string appointment_id
        string confirmation_status
        string rescheduled_by
        boolean reminder_24h_sent
        boolean reminder_3h_sent
        timestamp created_at
        timestamp updated_at
    }

    COMPOSITE_BOOKING_AUDIT_LOG {
        int id PK
        int composite_booking_id FK
        int action_by FK
        string action
        text action_details
        timestamp created_at
    }

    CLINICAL_NOTES {
        int id PK
        int patient_id
        int dentist_id FK
        string type
        text note
        timestamp created_at
    }

    PRESCRIPTIONS {
        int id PK
        int patient_id
        int dentist_id FK
        string medication
        string dosage
        string frequency
        string duration
        text instructions
        string status
        text diagnosis
        text condition_note
        string patient_name
        string dentist_name
        timestamp issued_at
        timestamp updated_at
    }

    TREATMENT_PLANS {
        int id PK
        int patient_id
        int dentist_id FK
        string title
        text description
        string status
        timestamp created_at
    }

    TREATMENT_SESSIONS {
        int id PK
        int plan_id
        int session_no
        string title
        date session_date
        string status
        text note
    }

    SERVICE_DENTIST_MAPPING {
        int id PK
        string service_name UK
        string service_category
        int dentist_id FK,UK
        boolean is_primary
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PATIENT_PROFILES {
        int id PK
        int user_id
        int patient_id FK
        date date_of_birth
        string gender
        string blood_type
        string preferred_language
        text home_address
        string preferred_contact
        string primary_dentist
        string emergency_contact_name
        string emergency_contact_rel
        string emergency_contact_phone
        boolean notif_email
        boolean notif_sms
        boolean notif_announcements
        timestamp member_since
        int reliability_score
    }

    PATIENT_VAULT_RECORDS {
        int id PK
        int patient_id
        string title
        text description
        string record_type
        string category
        string file_name
        string file_size
        string preview_kind
        string source
        timestamp created_at
    }

    VAULT_FILE_SHARING {
        int id PK
        int vault_record_id FK,UK
        int patient_id FK
        int shared_with_user_id FK
        string shared_with_dentist_name UK
        string permission_level
        timestamp shared_at
        timestamp access_revoked_at
    }

    BILLING {
        int id PK
        int appointment_id
        int patient_id
        string patient_name
        string service
        string dentist_name
        numeric amount
        numeric amount_paid
        numeric discount
        string status
        string payment_method
        date due_date
        string invoice_no
        text notes
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id
        int appointment_id
        string title
        text detail
        string level
        boolean is_read
        timestamp created_at
    }

    SUPPORT_REQUESTS {
        int id PK
        int user_id
        string user_name
        string user_email
        string user_role
        string subject
        text message
        string status
        timestamp created_at
        timestamp updated_at
    }

    FAQS {
        int id PK
        text question
        text answer
        string category
        string role
        int sort_order
        timestamp created_at
    }
```

---

## 🎯 Simplified Views by Domain

### User Management & Authentication

```mermaid
erDiagram
    USERS ||--|| DENTIST : "1:1"
    USERS ||--|| PATIENTS : "1:1"
    USERS ||--|| STAFF : "1:1"

    USERS {
        int id PK
        string email UK
        string password
        string role
        boolean is_verified
        string verification_token
        string reset_token
        timestamp created_at
    }

    DENTIST {
        int dentist_id PK
        int user_id FK,UK
        string specialization
        string license_number
        int years_experience
        jsonb working_days
        time start_time
        time end_time
    }

    PATIENTS {
        int patient_id PK
        int user_id FK,UK
        date date_of_birth
        string gender
        text medical_history
        string status
    }

    STAFF {
        int staff_id PK
        int user_id FK,UK
        string position
        string department
        jsonb permissions
        date hire_date
    }
```

### Booking & Appointment Management

```mermaid
erDiagram
    USERS ||--o{ COMPOSITE_BOOKINGS : "creates"
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "contains"
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_AUDIT_LOG : "tracked_by"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "assigned_to"
    PATIENTS ||--o{ COMPOSITE_BOOKINGS : "books"

    COMPOSITE_BOOKINGS {
        int id PK
        string booking_id UK
        int patient_id FK
        string booking_type
        string intake_priority
        string overall_status
        timestamp created_at
    }

    COMPOSITE_BOOKING_APPOINTMENTS {
        int id PK
        int composite_booking_id FK
        string appointment_id UK
        int dentist_id FK
        date appointment_date
        string appointment_time
        string appointment_status
        string confirmation_status
    }

    COMPOSITE_BOOKING_AUDIT_LOG {
        int id PK
        int composite_booking_id FK
        int action_by FK
        string action
        timestamp created_at
    }

    DENTIST {
        int dentist_id PK
        string specialization
        jsonb working_days
    }

    PATIENTS {
        int patient_id PK
        string first_name
        string last_name
    }

    USERS {
        int id PK
        string email
    }
```

### Clinical Records & Treatment

```mermaid
erDiagram
    DENTIST ||--o{ CLINICAL_NOTES : "writes"
    DENTIST ||--o{ PRESCRIPTIONS : "issues"
    DENTIST ||--o{ TREATMENT_PLANS : "creates"
    TREATMENT_PLANS ||--o{ TREATMENT_SESSIONS : "contains"
    PATIENTS ||--o{ TREATMENT_PLANS : "receives"

    CLINICAL_NOTES {
        int id PK
        int patient_id
        int dentist_id FK
        string type
        text note
        timestamp created_at
    }

    PRESCRIPTIONS {
        int id PK
        int patient_id
        int dentist_id FK
        string medication
        string dosage
        string frequency
        string status
    }

    TREATMENT_PLANS {
        int id PK
        int patient_id
        int dentist_id FK
        string title
        string status
    }

    TREATMENT_SESSIONS {
        int id PK
        int plan_id
        int session_no
        date session_date
        string status
    }

    DENTIST {
        int dentist_id PK
        string specialization
    }

    PATIENTS {
        int patient_id PK
        string first_name
    }
```

### Patient Information & Medical Vault

```mermaid
erDiagram
    PATIENTS ||--|| PATIENT_PROFILES : "1:1"
    PATIENTS ||--o{ PATIENT_VAULT_RECORDS : "owns"
    PATIENT_VAULT_RECORDS ||--o{ VAULT_FILE_SHARING : "shared_via"
    VAULT_FILE_SHARING ||--o{ USERS : "shared_with"

    PATIENTS {
        int patient_id PK
        int user_id FK,UK
        string first_name
        string last_name
        text medical_history
    }

    PATIENT_PROFILES {
        int id PK
        int patient_id FK
        date date_of_birth
        string gender
        string blood_type
        text home_address
        string emergency_contact_name
    }

    PATIENT_VAULT_RECORDS {
        int id PK
        int patient_id
        string title
        string record_type
        string file_name
        timestamp created_at
    }

    VAULT_FILE_SHARING {
        int id PK
        int vault_record_id FK,UK
        int patient_id FK
        int shared_with_user_id FK
        string permission_level
        timestamp shared_at
    }

    USERS {
        int id PK
        string email
    }
```

### Billing & Notifications

```mermaid
erDiagram
    APPOINTMENTS ||--o{ BILLING : "generates"
    APPOINTMENTS ||--o{ NOTIFICATIONS : "triggers"
    USERS ||--o{ NOTIFICATIONS : "receives"

    APPOINTMENTS {
        int id PK
        int patient_id FK
        int dentist_id FK
        date appointment_date
        string status
    }

    BILLING {
        int id PK
        int appointment_id
        int patient_id
        numeric amount
        numeric amount_paid
        string status
        string payment_method
    }

    NOTIFICATIONS {
        int id PK
        int user_id
        int appointment_id
        string title
        string level
        boolean is_read
    }

    USERS {
        int id PK
        string email
    }
```

### Services & Dentist Mapping

```mermaid
erDiagram
    DENTIST ||--o{ SERVICE_DENTIST_MAPPING : "provides"

    DENTIST {
        int dentist_id PK
        string specialization
        string license_number
    }

    SERVICE_DENTIST_MAPPING {
        int id PK
        string service_name UK
        string service_category
        int dentist_id FK,UK
        boolean is_primary
        boolean is_active
    }
```

---

## 📋 Legend

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UK` | Unique Key |
| `\|\|--\|\|` | One-to-One relationship |
| `\|\|--o{` | One-to-Many relationship |
| `}o--o{` | Many-to-Many relationship |

---

## 🔗 Direct Links to Mermaid Live

### Full ERD
https://mermaid.live/edit#pako:YOUR_ENCODED_DIAGRAM_HERE

### To create your own link:
1. Go to https://mermaid.live
2. Paste the diagram code
3. Click "Share" to get a shareable link
4. The URL will be auto-generated

---

## 💡 Tips for Using These Diagrams

### In GitHub
```markdown
# My ERD
[Paste the mermaid code block above]
```

### In Notion
1. Create a code block
2. Select "Mermaid" as language
3. Paste the diagram code

### In Confluence
1. Use the Mermaid macro
2. Paste the diagram code

### In VS Code
1. Install "Markdown Preview Mermaid Support"
2. Open this file in preview
3. Diagrams render automatically

### Export as Image
1. Go to https://mermaid.live
2. Paste code
3. Click "Download" → PNG/SVG

---

## 📝 Notes

- **PK** = Primary Key (unique identifier)
- **FK** = Foreign Key (references another table)
- **UK** = Unique Key (must be unique but not primary)
- **1:1** = One-to-One (each record in table A relates to exactly one record in table B)
- **1:N** = One-to-Many (one record in table A can relate to many records in table B)

---

**Last Updated:** May 24, 2026  
**Database:** PostgreSQL (code_smiles_db)  
**Total Tables:** 20
