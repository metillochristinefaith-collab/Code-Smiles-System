# Dentist Medical Vault Upload - Debug Steps

## What We Added
Enhanced logging to both frontend and backend for dentist uploads.

---

## Quick Debug Steps

### Step 1: Open Browser DevTools
1. Press `F12`
2. Go to **Console** tab
3. Keep it open

### Step 2: Try to Upload
1. Log in as Dentist
2. Go to Medical Vault
3. Select patient **Raphoncel Eduria**
4. Click "Upload a File"
5. Select a file
6. Wait for upload to complete

### Step 3: Check Browser Console
Look for logs starting with `=== handleFileUpload called ===`

**Expected output:**
```
=== handleFileUpload called ===
File: test.pdf Size: 12345 Type: application/pdf
PatientId: 123
Base64 length: 16460
Found patient: Raphoncel Eduria
Upload payload: {
  title: "test",
  record_type: "Medical Form",
  category: "medical-form",
  file_name: "test.pdf",
  file_size: "12.05 KB",
  file_mime: "application/pdf",
  file_base64_length: 16460
}
Sending upload request to: /dentist-vault-records/123
Upload successful: {id: 456, patient_id: 123, ...}
```

### Step 4: Check Backend Terminal
Look for logs starting with `=== POST /dentist-vault-records/:patientId ===`

**Expected output:**
```
=== POST /dentist-vault-records/:patientId ===
User: {id: 789, email: "dentist@example.com", role: "Dentist"}
User role: Dentist
Request body keys: ["title", "description", "record_type", "category", "file_name", "file_size", "preview_kind", "file_mime", "file_base64"]
PatientId: 123 Type: string
Title: test
Record type: Medical Form
Category: medical-form
File name: test.pdf
File base64 length: 16460
File mime: application/pdf
Converting base64 to buffer...
Buffer created, size: 12345 bytes
Checking if patient exists with id: 123
Patient check result: 1 rows
Inserting vault record into database...
Vault record created successfully: 456
Dentist name: Dr. John Smith
Creating file sharing record...
File shared with patient successfully
```

---

## Common Issues for Dentist Upload

### Issue 1: "ERROR: Selected patient not found with id: X"
**Problem:** Patient ID is wrong or patient doesn't exist
**Solution:**
- Make sure you selected a patient from the list
- Check the patient ID in the logs
- Verify patient exists in database

### Issue 2: "Patient check result: 0 rows"
**Problem:** Patient exists but is not marked as 'Patient' role
**Solution:**
- Check database: `SELECT id, role FROM users WHERE id = X`
- Patient should have role = 'Patient'
- Contact admin if role is wrong

### Issue 3: "ERROR: Unsupported MIME type"
**Problem:** File type not allowed
**Solution:**
- Only upload: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
- Check file extension
- Try a different file

### Issue 4: "ERROR: File too large"
**Problem:** File exceeds 20 MB
**Solution:**
- Check file size
- Compress file if needed
- Try a smaller file

### Issue 5: "ERROR: Invalid base64 data"
**Problem:** File couldn't be converted to base64
**Solution:**
- Try a different file
- Check file is not corrupted
- Try a smaller file

### Issue 6: "Failed to save vault record"
**Problem:** Database error
**Solution:**
- Check backend logs for full error message
- Check database connection
- Check patient_vault_records table exists

---

## What to Report

Please provide:

1. **Browser Console Output**
   - Copy all logs starting with `=== handleFileUpload called ===`
   - Include any error messages

2. **Backend Terminal Output**
   - Copy all logs starting with `=== POST /dentist-vault-records/:patientId ===`
   - Include any error messages

3. **File Details**
   - File name
   - File size
   - File type (PDF, JPG, etc.)

4. **Patient Details**
   - Patient name: Raphoncel Eduria
   - Patient ID (from logs)

5. **Error Message**
   - Exact error message you see
   - Where you see it (alert, console, etc.)

---

## Testing Checklist

- [ ] Backend running on port 3000?
- [ ] Frontend running on port 4200?
- [ ] Logged in as Dentist?
- [ ] Patient selected from list?
- [ ] File selected before clicking Upload?
- [ ] File under 20 MB?
- [ ] File is valid format (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX)?
- [ ] Browser console open?
- [ ] Backend terminal visible?
- [ ] No network errors?

---

## Next Steps

1. Try uploading again with the new logging
2. Copy the browser console logs
3. Copy the backend terminal logs
4. Share both with me
5. I'll identify the exact issue and fix it

---

**Status:** Debug logging added ✅
**Ready for testing:** Yes ✅
