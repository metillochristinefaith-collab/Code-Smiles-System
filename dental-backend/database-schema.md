# Code Smiles Database Schema

## APPOINTMENTS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| patient_id | integer | Yes | FK → users.id |
| patient_name | character varying | Yes | - |
| email | character varying | Yes | - |
| phone | character varying | Yes | - |
| treatment | character varying | Yes | - |
| services | ARRAY | Yes | - |
| dentist_name | character varying | Yes | - |
| appointment_date | date | No | - |
| appointment_time | time without time zone | No | - |
| duration_minutes | integer | Yes | - |
| status | character varying | Yes | - |
| notes | text | Yes | - |
| urgency | character varying | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| updated_at | timestamp without time zone | Yes | - |
| reminder_24h_sent | boolean | No | - |
| reminder_3h_sent | boolean | No | - |
| confirmation_status | character varying | Yes | - |
| rescheduled_by | character varying | Yes | - |
| dentist_id | integer | Yes | FK → dentist.dentist_id |
| booking_type | character varying | Yes | - |
| intake_priority | character varying | Yes | - |
| intake_source | character varying | Yes | - |
| appointment_id | character varying | Yes | - |
| composite_booking_id | integer | Yes | FK → composite_bookings.id |
| booking_id | character varying | Yes | UNIQUE |

## BILLING

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| appointment_id | integer | Yes | - |
| patient_id | integer | Yes | - |
| patient_name | character varying | Yes | - |
| service | character varying | Yes | - |
| dentist_name | character varying | Yes | - |
| amount | numeric | Yes | - |
| amount_paid | numeric | Yes | - |
| discount | numeric | Yes | - |
| status | character varying | Yes | - |
| payment_method | character varying | Yes | - |
| due_date | date | Yes | - |
| notes | text | Yes | - |
| invoice_no | character varying | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| updated_at | timestamp without time zone | Yes | - |

## CLINICAL_NOTES

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| patient_id | integer | Yes | - |
| type | character varying | Yes | - |
| note | text | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| dentist_id | integer | Yes | FK → dentist.dentist_id |

## COMPOSITE_BOOKING_APPOINTMENTS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| composite_booking_id | integer | No | FK → composite_bookings.id |
| booking_id | character varying | No | - |
| appointment_id | character varying | No | UNIQUE |
| appointment_sequence | integer | No | - |
| service_name | character varying | No | - |
| service_category | character varying | No | - |
| service_duration_minutes | integer | No | - |
| appointment_date | date | No | - |
| appointment_time | character varying | No | - |
| dentist_id | integer | Yes | FK → dentist.dentist_id |
| dentist_name | character varying | Yes | - |
| patient_age | character varying | Yes | - |
| appointment_status | character varying | No | - |
| cancellation_reason | text | Yes | - |
| created_at | timestamp without time zone | No | - |
| updated_at | timestamp without time zone | No | - |
| appointment_end_time | character varying | Yes | - |
| dentist_specialty | character varying | Yes | - |
| confirmation_status | character varying | Yes | - |
| reminder_24h_sent | boolean | Yes | - |
| reminder_3h_sent | boolean | Yes | - |

## COMPOSITE_BOOKING_AUDIT_LOG

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| composite_booking_id | integer | No | FK → composite_bookings.id |
| action | character varying | No | - |
| action_by | integer | Yes | FK → users.id |
| action_details | text | Yes | - |
| created_at | timestamp without time zone | No | - |

## COMPOSITE_BOOKINGS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| booking_id | character varying | No | UNIQUE |
| patient_id | integer | No | FK → users.id |
| patient_name | character varying | No | - |
| patient_email | character varying | No | - |
| patient_phone | character varying | No | - |
| booking_type | character varying | No | - |
| intake_priority | character varying | No | - |
| intake_source | character varying | No | - |
| service_count | integer | No | - |
| total_duration_minutes | integer | No | - |
| patient_notes | text | Yes | - |
| overall_status | character varying | No | - |
| created_by | integer | Yes | FK → users.id |
| created_at | timestamp without time zone | No | - |
| updated_at | timestamp without time zone | No | - |
| staff_notes | text | Yes | - |

## DENTIST

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| dentist_id | integer | No | PRIMARY KEY |
| user_id | integer | No | FK → users.id, UNIQUE |
| created_at | timestamp without time zone | Yes | - |
| first_name | character varying | Yes | - |
| last_name | character varying | Yes | - |
| email | character varying | Yes | - |
| phone | character varying | Yes | - |
| specialization | character varying | Yes | - |
| license_number | character varying | Yes | - |
| years_experience | integer | Yes | - |
| bio | text | Yes | - |
| working_days | jsonb | Yes | - |
| start_time | time without time zone | Yes | - |
| end_time | time without time zone | Yes | - |
| status | character varying | Yes | - |
| updated_at | timestamp without time zone | Yes | - |
| avatar_url | text | Yes | - |

## FAQS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| question | text | No | - |
| answer | text | No | - |
| category | character varying | No | - |
| role | character varying | No | - |
| sort_order | integer | No | - |
| created_at | timestamp without time zone | No | - |

## NOTIFICATIONS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| user_id | integer | Yes | - |
| title | character varying | Yes | - |
| detail | text | Yes | - |
| level | character varying | Yes | - |
| is_read | boolean | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| appointment_id | integer | Yes | - |

## PATIENT_PROFILES

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| user_id | integer | Yes | - |
| date_of_birth | date | Yes | - |
| gender | character varying | Yes | - |
| blood_type | character varying | Yes | - |
| preferred_language | character varying | Yes | - |
| home_address | text | Yes | - |
| preferred_contact | character varying | Yes | - |
| primary_dentist | character varying | Yes | - |
| emergency_contact_name | character varying | Yes | - |
| emergency_contact_rel | character varying | Yes | - |
| emergency_contact_phone | character varying | Yes | - |
| notif_email | boolean | Yes | - |
| notif_sms | boolean | Yes | - |
| notif_announcements | boolean | Yes | - |
| member_since | timestamp without time zone | Yes | - |
| reliability_score | integer | No | - |
| patient_id | integer | Yes | FK → patients.patient_id |

## PATIENT_VAULT_RECORDS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| patient_id | integer | No | - |
| title | character varying | No | - |
| description | text | Yes | - |
| record_type | character varying | No | - |
| category | character varying | No | - |
| file_name | character varying | No | - |
| file_size | character varying | No | - |
| preview_kind | character varying | No | - |
| source | character varying | No | - |
| created_at | timestamp without time zone | No | - |

## PATIENTS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| patient_id | integer | No | PRIMARY KEY |
| user_id | integer | No | FK → users.id, UNIQUE |
| first_name | character varying | No | - |
| last_name | character varying | No | - |
| date_of_birth | date | Yes | - |
| gender | character varying | Yes | - |
| contact_number | character varying | Yes | - |
| address | text | Yes | - |
| emergency_contact_name | character varying | Yes | - |
| emergency_contact_phone | character varying | Yes | - |
| medical_history | text | Yes | - |
| status | character varying | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| updated_at | timestamp without time zone | Yes | - |
| email | character varying | Yes | UNIQUE |
| avatar_url | text | Yes | - |
| specialty | text | Yes | - |

## PRESCRIPTIONS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| patient_id | integer | Yes | - |
| medication | character varying | Yes | - |
| dosage | character varying | Yes | - |
| frequency | character varying | Yes | - |
| duration | character varying | Yes | - |
| instructions | text | Yes | - |
| status | character varying | Yes | - |
| issued_at | timestamp without time zone | Yes | - |
| patient_name | character varying | Yes | - |
| dentist_name | character varying | Yes | - |
| condition_note | text | Yes | - |
| updated_at | timestamp without time zone | Yes | - |
| diagnosis | text | Yes | - |
| dentist_id | integer | Yes | FK → dentist.dentist_id |

## SERVICE_DENTIST_MAPPING

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| service_name | character varying | No | UNIQUE |
| service_category | character varying | No | - |
| dentist_id | integer | No | FK → dentist.dentist_id, UNIQUE |
| is_primary | boolean | No | - |
| is_active | boolean | No | - |
| created_at | timestamp without time zone | No | - |
| updated_at | timestamp without time zone | No | - |

## STAFF

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| staff_id | integer | No | PRIMARY KEY |
| user_id | integer | No | FK → users.id, UNIQUE |
| created_at | timestamp without time zone | Yes | - |
| first_name | character varying | Yes | - |
| last_name | character varying | Yes | - |
| email | character varying | Yes | - |
| phone | character varying | Yes | - |
| position | character varying | Yes | - |
| department | character varying | Yes | - |
| permissions | jsonb | Yes | - |
| hire_date | date | Yes | - |
| status | character varying | Yes | - |
| updated_at | timestamp without time zone | Yes | - |
| avatar_url | text | Yes | - |

## SUPPORT_REQUESTS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| user_id | integer | Yes | - |
| user_name | character varying | Yes | - |
| user_email | character varying | Yes | - |
| user_role | character varying | Yes | - |
| subject | character varying | No | - |
| message | text | No | - |
| status | character varying | No | - |
| created_at | timestamp without time zone | No | - |
| updated_at | timestamp without time zone | No | - |

## TREATMENT_PLANS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| patient_id | integer | Yes | - |
| title | character varying | Yes | - |
| description | text | Yes | - |
| status | character varying | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| dentist_id | integer | Yes | FK → dentist.dentist_id |

## TREATMENT_SESSIONS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| plan_id | integer | Yes | - |
| session_no | integer | Yes | - |
| title | character varying | Yes | - |
| session_date | date | Yes | - |
| status | character varying | Yes | - |
| note | text | Yes | - |

## USERS

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| first_name | character varying | No | - |
| last_name | character varying | No | - |
| email | character varying | No | - |
| phone | character varying | Yes | - |
| password | character varying | No | - |
| role | character varying | No | - |
| status | character varying | Yes | - |
| created_at | timestamp without time zone | Yes | - |
| specialty | text | Yes | - |
| avatar_url | text | Yes | - |
| is_verified | boolean | No | - |
| verification_token_expires_at | timestamp without time zone | Yes | - |
| verification_token | character varying | Yes | - |
| reset_token | character varying | Yes | - |
| reset_token_expires_at | timestamp without time zone | Yes | - |

## VAULT_FILE_SHARING

| Column | Type | Nullable | Constraints |
|--------|------|----------|-------------|
| id | integer | No | PRIMARY KEY |
| vault_record_id | integer | No | FK → patient_vault_records.id, UNIQUE |
| patient_id | integer | No | FK → users.id |
| shared_with_dentist_name | character varying | No | UNIQUE |
| shared_with_user_id | integer | Yes | FK → users.id |
| permission_level | character varying | No | - |
| shared_at | timestamp without time zone | No | - |
| access_revoked_at | timestamp without time zone | Yes | - |

