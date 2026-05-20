# How Dentists View Shared Patient Files

## Step-by-Step Guide

### 1. Login as Dentist
- Go to the login page
- Select "Dentist" role
- Login with your credentials (e.g., Dr. Raphoncel)

### 2. Navigate to Medical Records
- Click **"Medical Records"** in the left sidebar
- You'll see a list of all your patients

### 3. Find the Patient
- Use the search box to find the patient by name or ID
- Or scroll through the patient list
- Click on the patient card to select them

### 4. View Shared Files
Once you select a patient, you'll see:
- **Overview tab** - Patient info (diagnosis, last visit, blood type, etc.)
- **Dental History tab** - Past appointments and procedures
- **Treatment Plan tab** - Upcoming treatment steps
- **Shared Files section** - Files the patient shared with you (appears below all tabs)

### 5. Shared Files Display
The "Shared Files" section shows:
- 📷 **File Icon** - Visual indicator of file type
- **File Name** - Name of the shared document
- **File Type** - X-ray, Prescription, Consent Form, etc.
- **Date Shared** - When the patient shared it
- **File Size** - Size of the file

## Example Workflow

**Patient (Raphoncel Eduria) uploads and shares:**
1. Patient logs in → Medical Vault
2. Uploads "Dental X-Ray 2024.pdf"
3. Clicks "Share with Clinic"
4. Selects "Dr. Raphoncel Eduria"
5. Confirms share

**Dentist (Dr. Raphoncel) views:**
1. Dentist logs in → Medical Records
2. Searches for "Raphoncel Eduria"
3. Clicks on the patient card
4. Scrolls down to "Shared Files" section
5. Sees "Dental X-Ray 2024.pdf" with metadata

## What You'll See

```
┌─────────────────────────────────────────────────────┐
│ Medical Records                                     │
├─────────────────────────────────────────────────────┤
│ [Search box] [Status filter]                        │
│                                                     │
│ Patient List:                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ RE  Raphoncel Eduria                    Active  │ │
│ │     MR-00020 · 0 yrs                            │ │
│ │     Oral Surgery                                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Raphoncel Eduria                            Active  │
│ MR-00020 · 0 yrs · N/A                              │
│                                                     │
│ [Overview] [Dental History] [Treatment Plan]       │
│                                                     │
│ Diagnosis: Oral Surgery                             │
│ Last Visit: N/A                                     │
│ Assigned Dentist: N/A                               │
│ Blood Type: N/A                                     │
│                                                     │
│ ─────────────────────────────────────────────────  │
│ Shared Files                                        │
│                                                     │
│ 📷 Dental X-Ray 2024.pdf                            │
│    X-ray · May 20, 2026 · 2.4 MB                   │
│                                                     │
│ 📋 Treatment Plan.pdf                               │
│    Consent Form · May 19, 2026 · 1.1 MB            │
│                                                     │
│ 🧪 Lab Results.pdf                                  │
│    Lab Result · May 18, 2026 · 856 KB              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Troubleshooting

**I don't see the "Shared Files" section:**
- The patient hasn't shared any files with you yet
- Ask the patient to upload and share a file
- Make sure they selected your name when sharing

**I see the section but no files:**
- The patient may have revoked access
- Ask them to share the file again

**I can't find the patient:**
- Make sure you're logged in as the correct dentist
- The patient must have an appointment with you to appear in your list
- Try searching by patient name or ID

## File Types

Files can be shared as:
- 📷 **X-ray** - Dental imaging
- 📸 **Photo** - Clinical photos
- 🧪 **Lab Result** - Lab test results
- 📋 **Consent Form** - Medical forms and consents
- 🖼️ **Scan** - Document scans
- 📎 **Other** - General documents

## Security

- Only you can see files shared with you
- Patients can revoke access anytime
- All sharing is tracked with timestamps
- Files are encrypted and secure
