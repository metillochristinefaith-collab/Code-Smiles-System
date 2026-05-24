# 🔗 Mermaid Live - Direct Links & Quick Reference

## 📊 How to Use Mermaid Live

### Step 1: Open Mermaid Live
Go to: **https://mermaid.live**

### Step 2: Copy Diagram Code
Choose a diagram from the sections below and copy the code

### Step 3: Paste & View
Paste the code into the Mermaid Live editor and it will render instantly

### Step 4: Export or Share
- **Export:** Click "Download" to save as PNG/SVG
- **Share:** Click "Share" to get a shareable link
- **Edit:** Make changes directly in the editor

---

## 🎯 Quick Diagram Codes

### 1️⃣ FULL ERD (All 20 Tables)

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
```

---

### 2️⃣ USER MANAGEMENT

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
        string first_name
        string last_name
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

---

### 3️⃣ BOOKING SYSTEM

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
        int created_by FK
        string booking_type
        string intake_priority
        string overall_status
        int service_count
        int total_duration_minutes
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
        boolean reminder_24h_sent
        boolean reminder_3h_sent
    }

    COMPOSITE_BOOKING_AUDIT_LOG {
        int id PK
        int composite_booking_id FK
        int action_by FK
        string action
        text action_details
        timestamp created_at
    }

    DENTIST {
        int dentist_id PK
        string specialization
    }

    PATIENTS {
        int patient_id PK
        string first_name
    }

    USERS {
        int id PK
        string email
    }
```

---

### 4️⃣ CLINICAL RECORDS

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
        string duration
        text instructions
        string status
        text diagnosis
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

    DENTIST {
        int dentist_id PK
        string specialization
    }

    PATIENTS {
        int patient_id PK
        string first_name
    }
```

---

### 5️⃣ MEDICAL VAULT

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
        string emergency_contact_phone
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

    USERS {
        int id PK
        string email
    }
```

---

### 6️⃣ BILLING & NOTIFICATIONS

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
        string patient_name
        string service
        numeric amount
        numeric amount_paid
        numeric discount
        string status
        string payment_method
        date due_date
        string invoice_no
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

    USERS {
        int id PK
        string email
    }
```

---

### 7️⃣ SERVICES & DENTIST MAPPING

```mermaid
erDiagram
    DENTIST ||--o{ SERVICE_DENTIST_MAPPING : "provides"

    DENTIST {
        int dentist_id PK
        string specialization
        string license_number
        int years_experience
    }

    SERVICE_DENTIST_MAPPING {
        int id PK
        string service_name UK
        string service_category
        int dentist_id FK,UK
        boolean is_primary
        boolean is_active
        timestamp created_at
    }
```

---

## 📋 Legend & Symbols

| Symbol | Meaning | Example |
|--------|---------|---------|
| `PK` | Primary Key | `int id PK` |
| `FK` | Foreign Key | `int user_id FK` |
| `UK` | Unique Key | `string email UK` |
| `\|\|--\|\|` | One-to-One | `USERS \|\|--\|\| DENTIST` |
| `\|\|--o{` | One-to-Many | `DENTIST \|\|--o{ APPOINTMENTS` |
| `}o--o{` | Many-to-Many | `STUDENTS }o--o{ COURSES` |

---

## 🎨 Mermaid Live Features

### Themes
- **Default** - Light theme
- **Dark** - Dark theme
- **Forest** - Green theme
- **Neutral** - Grayscale

### Export Options
- **PNG** - Raster image (good for presentations)
- **SVG** - Vector image (scalable, good for web)
- **Markdown** - Copy as markdown code block

### Sharing
1. Click "Share" button
2. Get a unique URL
3. Share with team members
4. They can view and edit

---

## 💡 Pro Tips

### Tip 1: Customize Appearance
```mermaid
%%{init: {'theme':'dark'}}%%
erDiagram
    ...
```

### Tip 2: Add Comments
```mermaid
erDiagram
    %% This is a comment
    USERS ||--|| DENTIST : "1:1"
```

### Tip 3: Zoom & Pan
- **Zoom:** Scroll wheel or pinch
- **Pan:** Click and drag
- **Reset:** Double-click

### Tip 4: Copy Diagram Link
After editing, click "Share" to get a URL like:
```
https://mermaid.live/edit#pako:eNqLVkosKMnPS8wpTVWqBgAZeQUK
```

---

## 🔄 Workflow Examples

### For Documentation
1. Create diagram in Mermaid Live
2. Export as PNG
3. Add to README.md or documentation
4. Keep source code in version control

### For Presentations
1. Create diagram in Mermaid Live
2. Export as SVG
3. Insert into PowerPoint/Google Slides
4. Resize as needed

### For Team Collaboration
1. Create diagram in Mermaid Live
2. Click "Share"
3. Send URL to team
4. Team can view and suggest changes
5. Update and reshare

### For Version Control
1. Save `.md` files with diagram code
2. Commit to Git
3. GitHub/GitLab renders automatically
4. Easy to track changes

---

## 📱 Mobile Friendly

Mermaid Live works on:
- ✅ Desktop browsers
- ✅ Tablets
- ✅ Mobile phones
- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)

---

## 🚀 Advanced Features

### Custom Styling
```mermaid
%%{init: {'primaryColor':'#9f51b6', 'primaryTextColor':'#fff', 'primaryBorderColor':'#7c3aed', 'lineColor':'#5a189a', 'secondBkgColor':'#c77dff', 'tertiaryTextColor':'black'}}%%
erDiagram
    ...
```

### Responsive Design
Diagrams automatically adjust to screen size

### Accessibility
- Semantic HTML
- Keyboard navigation
- Screen reader support

---

## 📞 Support & Resources

- **Official Docs:** https://mermaid.js.org
- **GitHub:** https://github.com/mermaid-js/mermaid
- **Live Editor:** https://mermaid.live
- **Examples:** https://mermaid.js.org/ecosystem/integrations.html

---

## 📝 Quick Checklist

- [ ] Copy diagram code
- [ ] Go to https://mermaid.live
- [ ] Paste code in editor
- [ ] View rendered diagram
- [ ] Customize if needed
- [ ] Export or share
- [ ] Save source code

---

## 🎯 Common Use Cases

### 1. Database Design Review
- Share ERD with team
- Get feedback
- Update and reshare

### 2. Documentation
- Include in README
- Add to wiki
- Reference in PRs

### 3. Presentations
- Export as image
- Insert into slides
- Present to stakeholders

### 4. Learning
- Understand relationships
- Study schema
- Learn database design

### 5. Planning
- Design new features
- Plan migrations
- Document changes

---

**Last Updated:** May 24, 2026  
**Database:** PostgreSQL (code_smiles_db)  
**Total Tables:** 20  
**Mermaid Live:** https://mermaid.live
