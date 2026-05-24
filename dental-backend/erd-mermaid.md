# Code Smiles ERD (Mermaid)

```mermaid
erDiagram
    APPOINTMENTS {
        integer id PK
        integer patient_id? FK
        character varying patient_name?
        character varying email?
        character varying phone?
        character varying treatment?
        ARRAY services?
        character varying dentist_name?
        date appointment_date
        time without time zone appointment_time
        integer duration_minutes?
        character varying status?
        text notes?
        character varying urgency?
        timestamp without time zone created_at?
        timestamp without time zone updated_at?
        boolean reminder_24h_sent
        boolean reminder_3h_sent
        character varying confirmation_status?
        character varying rescheduled_by?
        integer dentist_id? FK
        character varying booking_type?
        character varying intake_priority?
        character varying intake_source?
        character varying appointment_id?
        integer composite_booking_id? FK
        character varying booking_id? UK
    }
    BILLING {
        integer id PK
        integer appointment_id?
        integer patient_id?
        character varying patient_name?
        character varying service?
        character varying dentist_name?
        numeric amount?
        numeric amount_paid?
        numeric discount?
        character varying status?
        character varying payment_method?
        date due_date?
        text notes?
        character varying invoice_no?
        timestamp without time zone created_at?
        timestamp without time zone updated_at?
    }
    CLINICAL_NOTES {
        integer id PK
        integer patient_id?
        character varying type?
        text note?
        timestamp without time zone created_at?
        integer dentist_id? FK
    }
    COMPOSITE_BOOKING_APPOINTMENTS {
        integer id PK
        integer composite_booking_id FK
        character varying booking_id
        character varying appointment_id UK
        integer appointment_sequence
        character varying service_name
        character varying service_category
        integer service_duration_minutes
        date appointment_date
        character varying appointment_time
        integer dentist_id? FK
        character varying dentist_name?
        character varying patient_age?
        character varying appointment_status
        text cancellation_reason?
        timestamp without time zone created_at
        timestamp without time zone updated_at
        character varying appointment_end_time?
        character varying dentist_specialty?
        character varying confirmation_status?
        boolean reminder_24h_sent?
        boolean reminder_3h_sent?
    }
    COMPOSITE_BOOKING_AUDIT_LOG {
        integer id PK
        integer composite_booking_id FK
        character varying action
        integer action_by? FK
        text action_details?
        timestamp without time zone created_at
    }
    COMPOSITE_BOOKINGS {
        integer id PK
        character varying booking_id UK
        integer patient_id FK
        character varying patient_name
        character varying patient_email
        character varying patient_phone
        character varying booking_type
        character varying intake_priority
        character varying intake_source
        integer service_count
        integer total_duration_minutes
        text patient_notes?
        character varying overall_status
        integer created_by? FK
        timestamp without time zone created_at
        timestamp without time zone updated_at
        text staff_notes?
    }
    DENTIST {
        integer dentist_id PK
        integer user_id FK
        timestamp without time zone created_at?
        character varying first_name?
        character varying last_name?
        character varying email?
        character varying phone?
        character varying specialization?
        character varying license_number?
        integer years_experience?
        text bio?
        jsonb working_days?
        time without time zone start_time?
        time without time zone end_time?
        character varying status?
        timestamp without time zone updated_at?
        text avatar_url?
    }
    FAQS {
        integer id PK
        text question
        text answer
        character varying category
        character varying role
        integer sort_order
        timestamp without time zone created_at
    }
    NOTIFICATIONS {
        integer id PK
        integer user_id?
        character varying title?
        text detail?
        character varying level?
        boolean is_read?
        timestamp without time zone created_at?
        integer appointment_id?
    }
    PATIENT_PROFILES {
        integer id PK
        integer user_id?
        date date_of_birth?
        character varying gender?
        character varying blood_type?
        character varying preferred_language?
        text home_address?
        character varying preferred_contact?
        character varying primary_dentist?
        character varying emergency_contact_name?
        character varying emergency_contact_rel?
        character varying emergency_contact_phone?
        boolean notif_email?
        boolean notif_sms?
        boolean notif_announcements?
        timestamp without time zone member_since?
        integer reliability_score
        integer patient_id? FK
    }
    PATIENT_VAULT_RECORDS {
        integer id PK
        integer patient_id
        character varying title
        text description?
        character varying record_type
        character varying category
        character varying file_name
        character varying file_size
        character varying preview_kind
        character varying source
        timestamp without time zone created_at
    }
    PATIENTS {
        integer patient_id PK
        integer user_id FK
        character varying first_name
        character varying last_name
        date date_of_birth?
        character varying gender?
        character varying contact_number?
        text address?
        character varying emergency_contact_name?
        character varying emergency_contact_phone?
        text medical_history?
        character varying status?
        timestamp without time zone created_at?
        timestamp without time zone updated_at?
        character varying email? UK
        text avatar_url?
        text specialty?
    }
    PRESCRIPTIONS {
        integer id PK
        integer patient_id?
        character varying medication?
        character varying dosage?
        character varying frequency?
        character varying duration?
        text instructions?
        character varying status?
        timestamp without time zone issued_at?
        character varying patient_name?
        character varying dentist_name?
        text condition_note?
        timestamp without time zone updated_at?
        text diagnosis?
        integer dentist_id? FK
    }
    SERVICE_DENTIST_MAPPING {
        integer id PK
        character varying service_name UK
        character varying service_category
        integer dentist_id FK
        boolean is_primary
        boolean is_active
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    STAFF {
        integer staff_id PK
        integer user_id FK
        timestamp without time zone created_at?
        character varying first_name?
        character varying last_name?
        character varying email?
        character varying phone?
        character varying position?
        character varying department?
        jsonb permissions?
        date hire_date?
        character varying status?
        timestamp without time zone updated_at?
        text avatar_url?
    }
    SUPPORT_REQUESTS {
        integer id PK
        integer user_id?
        character varying user_name?
        character varying user_email?
        character varying user_role?
        character varying subject
        text message
        character varying status
        timestamp without time zone created_at
        timestamp without time zone updated_at
    }
    TREATMENT_PLANS {
        integer id PK
        integer patient_id?
        character varying title?
        text description?
        character varying status?
        timestamp without time zone created_at?
        integer dentist_id? FK
    }
    TREATMENT_SESSIONS {
        integer id PK
        integer plan_id?
        integer session_no?
        character varying title?
        date session_date?
        character varying status?
        text note?
    }
    USERS {
        integer id PK
        character varying first_name
        character varying last_name
        character varying email
        character varying phone?
        character varying password
        character varying role
        character varying status?
        timestamp without time zone created_at?
        text specialty?
        text avatar_url?
        boolean is_verified
        timestamp without time zone verification_token_expires_at?
        character varying verification_token?
        character varying reset_token?
        timestamp without time zone reset_token_expires_at?
    }
    VAULT_FILE_SHARING {
        integer id PK
        integer vault_record_id FK
        integer patient_id FK
        character varying shared_with_dentist_name UK
        integer shared_with_user_id? FK
        character varying permission_level
        timestamp without time zone shared_at
        timestamp without time zone access_revoked_at?
    }
    DENTIST ||--o{ APPOINTMENTS : "dentist_id"
    DENTIST ||--o{ APPOINTMENTS : "patient_id"
    DENTIST ||--o{ APPOINTMENTS : "composite_booking_id"
    DENTIST ||--o{ CLINICAL_NOTES : "dentist_id"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "dentist_id"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "composite_booking_id"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "dentist_id"
    DENTIST ||--o{ COMPOSITE_BOOKING_APPOINTMENTS : "dentist_id"
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_AUDIT_LOG : "composite_booking_id"
    COMPOSITE_BOOKINGS ||--o{ COMPOSITE_BOOKING_AUDIT_LOG : "action_by"
    USERS ||--o{ COMPOSITE_BOOKINGS : "created_by"
    USERS ||--o{ COMPOSITE_BOOKINGS : "patient_id"
    USERS ||--o{ DENTIST : "user_id"
    PATIENTS ||--o{ PATIENT_PROFILES : "patient_id"
    USERS ||--o{ PATIENTS : "user_id"
    DENTIST ||--o{ PRESCRIPTIONS : "dentist_id"
    DENTIST ||--o{ SERVICE_DENTIST_MAPPING : "dentist_id"
    USERS ||--o{ STAFF : "user_id"
    DENTIST ||--o{ TREATMENT_PLANS : "dentist_id"
    PATIENT_VAULT_RECORDS ||--o{ VAULT_FILE_SHARING : "vault_record_id"
    PATIENT_VAULT_RECORDS ||--o{ VAULT_FILE_SHARING : "patient_id"
    PATIENT_VAULT_RECORDS ||--o{ VAULT_FILE_SHARING : "shared_with_user_id"
```
