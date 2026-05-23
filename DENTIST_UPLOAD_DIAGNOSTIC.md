# Dentist Upload - Diagnostic Guide

Based on your analysis, here are the 3 most likely issues and how to diagnose them:

---

## Issue #1: Missing PatientId in Frontend Request

### What to Check:
1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Click the green [+ Upload File to Patient] button**
4. **Look for logs starting with `=== openUploadModal called ===`**

### Expected Output:
```
=== openUploadModal called ===
uploadPatientId: 20
selectedRecord: {db_id: 20, patient: "Raphoncel Eduria", ...}
selectedRecord?.db_id: 20
Final patientId: 20
Creating file input...
Triggering file picker...
```

### If You See:
```
Final patientId: undefined
ERROR: No patientId available
```

**Problem:** The patient ID is not being captured from the selected record.

**Solution:** Make sure you:
1. Selected a patient from the list (click on the patient card)
2. The patient card shows as "active" (highlighted)
3. Then click the "Upload a File" button

---

## Issue #2: Missing "Dentist" Permission in JWT Token

### What to Check:
1. **Open Browser DevTools** (F12)
2. **Go to Console tab**
3. **Try to upload a file**
4. **Look for logs starting with `=== POST /dentist-vault-records/:patientId ===`** in the backend terminal

### Expected Backend Output:
```
=== POST /dentist-vault-records/:patientId ===
Timestamp: 2026-05-23T09:44:49.411Z
User: {
  "id": 789,
  "email": "dentist@example.com",
  "role": "Dentist"
}
User role: Dentist
User ID: 789
✓ User role check passed
```

### If You See:
```
User role: Patient
ERROR: User role is Patient not Dentist/Admin
Allowed roles: Admin, Dentist
```

**Problem:** You're logged in as a Patient, not a Dentist.

**Solution:** 
1. Log out
2. Log in with a Dentist account
3. Try uploading again

### If You See:
```
User role: Staff
ERROR: User role is Staff not Dentist/Admin
```

**Problem:** Your account is marked as Staff, not Dentist.

**Solution:** Contact admin to change your role to Dentist

---

## Issue #3: Mismatched API Route (Endpoint Error)

### What to Check:
1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Click the green [+ Upload File to Patient] button**
4. **Select a file and upload**
5. **Look for a request to `/dentist-vault-records/20` (or similar)**

### Expected Response:
```
Status: 201 Created
Response: {
  "message": "File shared with patient successfully",
  "record": {
    "id": 123,
    "patient_id": 20,
    "title": "filename",
    ...
  }
}
```

### If You See:
```
Status: 404 Not Found
Response: Cannot POST /dentist-vault-records/20
```

**Problem:** The backend endpoint doesn't exist or is not registered.

**Solution:** Check that the backend has the route defined at line 1056 in `index.js`

### If You See:
```
Status: 400 Bad Request
Response: {"message": "Title, type, category, and file name are required."}
```

**Problem:** Required fields are missing from the request.

**Solution:** Check the browser console to see what fields are being sent

### If You See:
```
Status: 500 Internal Server Error
Response: {"message": "Failed to save vault record: ..."}
```

**Problem:** Backend error while saving to database.

**Solution:** Check the backend terminal for the full error message

---

## Complete Diagnostic Checklist

### Frontend Checks:
- [ ] Browser console shows `Final patientId: [number]` (not undefined)
- [ ] Patient is selected (card is highlighted)
- [ ] File is selected before clicking upload
- [ ] File is under 20 MB
- [ ] File is valid format (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX)

### Backend Checks:
- [ ] Backend is running on port 3000
- [ ] Backend terminal shows `=== POST /dentist-vault-records/:patientId ===`
- [ ] Backend shows `User role: Dentist` (not Patient or Staff)
- [ ] Backend shows `✓ User role check passed`
- [ ] Backend shows `Extracted fields:` with all required fields

### Network Checks:
- [ ] Network tab shows request to `/dentist-vault-records/[patientId]`
- [ ] Request method is POST
- [ ] Request has Authorization header with Bearer token
- [ ] Response status is 201 (Created)

---

## Step-by-Step Debugging

### Step 1: Verify You're Logged In as Dentist
```
1. Open browser console (F12)
2. Type: localStorage.getItem('auth_token')
3. You should see a long token string
4. The token should decode to role: "Dentist"
```

### Step 2: Verify Patient is Selected
```
1. Look at the patient list on the left
2. Click on "Raphoncel Eduria" to select them
3. The card should highlight/become active
4. The right panel should show their details
```

### Step 3: Try Upload
```
1. Click "Upload a File" button
2. Select a small PDF or image file
3. Watch the browser console for logs
4. Watch the backend terminal for logs
```

### Step 4: Check Network Request
```
1. Open Network tab (F12)
2. Filter by "dentist-vault"
3. Look at the request details:
   - Headers: Should have Authorization
   - Payload: Should have title, file_name, file_base64, etc.
   - Response: Should be 201 with record data
```

---

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Final patientId: undefined` | Patient not selected | Click on a patient card first |
| `User role is Patient` | Logged in as wrong user | Log in as Dentist |
| `Cannot POST /dentist-vault-records/20` | Endpoint not found | Check backend route exists |
| `Title, type, category, and file name are required` | Missing fields | Check all fields are being sent |
| `Uploaded file exceeds the 20 MB limit` | File too large | Use a smaller file |
| `Unsupported file type` | Wrong file format | Use PDF, JPG, PNG, DOC, DOCX, XLS, or XLSX |
| `Patient not found` | Patient ID doesn't exist | Verify patient ID is correct |
| `Failed to save vault record` | Database error | Check backend terminal for details |

---

## What to Report

If the upload still fails after checking all of the above, please provide:

1. **Browser Console Output:**
   - Copy all logs starting with `=== openUploadModal called ===`
   - Include any error messages

2. **Backend Terminal Output:**
   - Copy all logs starting with `=== POST /dentist-vault-records/:patientId ===`
   - Include any error messages

3. **Network Tab Details:**
   - Status code of the request
   - Request headers (especially Authorization)
   - Response body

4. **Your Account Details:**
   - Are you logged in as Dentist or Patient?
   - What is your user ID?
   - What is your role?

5. **File Details:**
   - File name
   - File size
   - File type (PDF, JPG, etc.)

6. **Patient Details:**
   - Patient name: Raphoncel Eduria
   - Patient ID (from the card)

---

**Status:** Enhanced logging added ✅
**Ready for Diagnosis:** Yes ✅
**Build Status:** Success ✅
