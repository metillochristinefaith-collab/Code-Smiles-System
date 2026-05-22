# Patient Table - What Should Be Inside

## 🔍 **Current Situation:**

### What You Have Now:
```
✓ users table (authentication + some profile data)
✓ patient_profiles table (extended patient info)
❌ NO separate patients table
```

### What You SHOULD Have (Per Your Refactoring Proposal):
```
✓ users table (authentication ONLY)
✓ patients table (patient-specific data) ← MISSING
✓ patient_profiles table (extended profile info)
```

---

## 📋 **PATIENTS Table (Should Be Created)**

### Purpose:
Store core patient information linked to users table

### What SHOULD Be In It:
```sql
patient_id (PK)           - Primary key (SERIAL)
user_id (FK)              - Reference to users(id)
first_name                - Patient's first name
last_name                 - Patient's last name
date_of_birth             - Date of birth
gender                    - Male, Female, Other
contact_number            - Phone number
address                   - Home address
emergency_contact_name    - Emergency contact name
emergency_contact_phone   - Emergency contact phone
medical_history           - Medical conditions, allergies, etc.
status                    - Active, Inactive, Archived
created_at                - Record creation timestamp
updated_at                - Last update timestamp
```

### Example Data:
```
patient_id | user_id | first_name | last_name | date_of_birth | gender | contact_number | address              | emergency_contact_name | emergency_contact_phone | medical_history
-----------|---------|------------|-----------|---------------|--------|----------------|----------------------|------------------------|-------------------------|------------------
1          | 19      | Keivo      | Eduria    | 1990-05-15    | Male   | 09123456789    | 123 Main St, City    | Maria Eduria           | 09987654321             | Allergic to Penicillin
2          | 21      | Charmaine  | Eduria    | 1992-08-22    | Female | 09234567890    | 456 Oak Ave, City    | John Eduria            | 09876543210             | Diabetic
3          | 25      | Richard    | Eduria    | 1988-03-10    | Male   | 09345678901    | 789 Pine Rd, City    | Sarah Eduria           | 09765432109             | None
```

---

## 📋 **PATIENT_PROFILES Table (Already Exists)**

### Current Structure:
```sql
id (PK)                      - Profile ID
user_id (FK)                 - Reference to users
date_of_birth                - DOB
gender                       - Gender
blood_type                   - Blood type
preferred_language           - Language preference
home_address                 - Address
preferred_contact            - Preferred contact method
primary_dentist              - Primary dentist name
emergency_contact_name       - Emergency contact
emergency_contact_rel        - Relationship
emergency_contact_phone      - Phone
notif_email                  - Email notification preference
notif_sms                    - SMS notification preference
notif_announcements          - Announcement preference
member_since                 - Membership date
reliability_score            - No-show score
```

### Current Rows: 6

---

## 🔗 **How They Should Connect:**

### Current (Not Ideal):
```
users table
└── patient_profiles table (extended info)
```

### Proposed (Better):
```
users table (auth only)
└── patients table (core patient info)
    └── patient_profiles table (extended profile info)
```

---

## ⚠️ **The Problem:**

Right now, patient data is **split between**:
1. `users` table (first_name, last_name, email, phone, etc.)
2. `patient_profiles` table (DOB, gender, blood_type, emergency contact, etc.)

**This is messy because:**
- ❌ Patient name is in `users` table
- ❌ Patient DOB is in `patient_profiles` table
- ❌ Patient phone is in `users` table
- ❌ Patient address is in `patient_profiles` table
- ❌ Hard to query all patient info in one place

---

## ✅ **The Solution:**

Create a `patients` table that:
- ✅ Stores all patient-specific data in ONE place
- ✅ Links to `users` for authentication
- ✅ Keeps `patient_profiles` for extended info (preferences, scores, etc.)

---

## 📊 **Proposed Structure:**

```
users table (AUTHENTICATION ONLY)
├── id
├── email
├── password
├── role (patient, dentist, staff)
├── account_status
└── created_at

patients table (PATIENT CORE DATA)
├── patient_id (PK)
├── user_id (FK → users.id)
├── first_name
├── last_name
├── date_of_birth
├── gender
├── contact_number
├── address
├── emergency_contact_name
├── emergency_contact_phone
├── medical_history
├── status
├── created_at
└── updated_at

patient_profiles table (EXTENDED PROFILE INFO)
├── id (PK)
├── patient_id (FK → patients.patient_id) ← CHANGE THIS
├── blood_type
├── preferred_language
├── preferred_contact
├── primary_dentist
├── notif_email
├── notif_sms
├── notif_announcements
├── member_since
├── reliability_score
└── ...other preferences...
```

---

## 🎯 **For Your Monday Presentation:**

You can say:
> "We have patient data stored in the users and patient_profiles tables. We're planning to create a dedicated patients table to better organize patient-specific information and improve data normalization in the next phase."

This shows:
- ✅ You understand the current structure
- ✅ You have a plan to improve it
- ✅ You're thinking about data organization

---

## 📅 **After Monday - What to Do:**

### Step 1: Create patients table
```sql
CREATE TABLE patients (
  patient_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  contact_number VARCHAR(20),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  medical_history TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Step 2: Migrate data from users to patients
```sql
INSERT INTO patients (user_id, first_name, last_name, contact_number, status, created_at)
SELECT id, first_name, last_name, phone, status, created_at
FROM users
WHERE role = 'patient';
```

### Step 3: Update patient_profiles to reference patients
```sql
ALTER TABLE patient_profiles 
ADD COLUMN patient_id INTEGER REFERENCES patients(patient_id);

UPDATE patient_profiles pp
SET patient_id = p.patient_id
FROM patients p
WHERE pp.user_id = p.user_id;
```

### Step 4: Update all queries to use patients table

---

## 💡 **Summary:**

| Table | Purpose | Status |
|-------|---------|--------|
| `users` | Authentication | ✅ Exists |
| `patients` | Patient core data | ❌ **MISSING** |
| `patient_profiles` | Extended profile info | ✅ Exists |

**For Monday:** You're fine as-is. The system works.

**After Monday:** Create the `patients` table to properly separate concerns.

---

**Key Takeaway:** Your current system works, but it's not as clean as it could be. After Monday, we can refactor to have a proper `patients` table! ✅
