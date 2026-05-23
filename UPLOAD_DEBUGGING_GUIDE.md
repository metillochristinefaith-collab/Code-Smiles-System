# Medical Vault Upload - Debugging Guide

## What We Added
Comprehensive logging to both frontend and backend to help identify where uploads are failing.

---

## How to Debug

### Step 1: Open Browser Developer Tools
1. Press `F12` or right-click → "Inspect"
2. Go to the **Console** tab
3. Keep it open while testing

### Step 2: Try to Upload a File
1. Navigate to Patient Medical Vault
2. Click "Upload Document"
3. Select a file (any PDF, JPG, PNG, etc.)
4. Enter a title (e.g., "Test Upload")
5. Click "Upload Document"

### Step 3: Check Browser Console
Look for logs starting with `=== submitUpload called ===`

**Expected console output:**
```
=== submitUpload called ===
File input element: <input type="file">
File: File {name: "test.pdf", size: 12345, type: "application/pdf"}
File details: {name: "test.pdf", size: 12345, type: "application/pdf"}
FileReader onload triggered
Base64 length: 16460
Upload payload: {
  title: "Test Upload",
  record_type: "Medical Form",
  category: "medical-form",
  file_name: "test.pdf",
  file_size: "12.05 KB",
  file_mime: "application/pdf",
  file_base64_length: 16460
}
Upload successful: {id: 123, patient_id: 456, ...}
```

---

## Common Issues & Solutions

### Issue 1: "File input element: null"
**Problem:** The file input is not being found
**Solution:** 
- Make sure you clicked "Upload Document" button
- Check that the modal opened
- Try refreshing the page

### Issue 2: "File: undefined"
**Problem:** No file was selected
**Solution:**
- Click "Choose File" in the modal
- Select a file from your computer
- Make sure the file name appears in the modal

### Issue 3: "FileReader onload triggered" doesn't appear
**Problem:** File is not being read
**Solution:**
- Check file size (should be under 20 MB)
- Try a different file
- Check browser console for FileReader errors

### Issue 4: "Upload payload" shows but no "Upload successful"
**Problem:** Request is being sent but backend is rejecting it
**Solution:**
- Check backend logs (see Step 4 below)
- Look for error message in browser console
- Check the error response in Network tab

### Issue 5: Network Error / 500 Error
**Problem:** Backend is crashing or not responding
**Solution:**
- Check backend is running on port 3000
- Check backend logs (see Step 4 below)
- Restart backend server

---

## Step 4: Check Backend Logs

### If Backend is Running in Terminal
Look for logs starting with `=== POST /patient-vault-records ===`

**Expected backend output:**
```
=== POST /patient-vault-records ===
User: {id: 123, email: "patient@example.com", role: "Patient"}
User role: Patient
Request body keys: ["title", "description", "record_type", "category", "file_name", "file_size", "preview_kind", "file_mime", "file_base64"]
Title: Test Upload
Record type: Medical Form
Category: medical-form
File name: test.pdf
File base64 length: 16460
File mime: application/pdf
Converting base64 to buffer...
Buffer created, size: 12345 bytes
Inserting into database...
Record created successfully: 123
```

### Common Backend Errors

**Error: "User role is Patient not Patient"**
- This shouldn't happen - check authentication

**Error: "Missing required fields"**
- One of: title, record_type, category, file_name is missing
- Check frontend is sending all fields

**Error: "Invalid file data format"**
- Base64 conversion failed
- Try a different file

**Error: "Failed to save vault record"**
- Database error
- Check database connection
- Check patient_vault_records table exists

---

## Step 5: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Try to upload again
3. Look for request to `http://localhost:3000/patient-vault-records`
4. Click on it to see details

**Check:**
- **Status:** Should be 201 (Created) on success
- **Request Headers:** Should have `Authorization: Bearer <token>`
- **Request Body:** Should contain all fields including file_base64
- **Response:** Should contain the created record

---

## Detailed Logging Locations

### Frontend Logs
**File:** `patient-medical-vault.ts`
**Method:** `submitUpload()`
**Lines:** 385-450

Logs appear in browser console when:
1. Upload button clicked
2. File selected
3. FileReader starts
4. FileReader completes
5. API request sent
6. Response received

### Backend Logs
**File:** `index.js`
**Endpoint:** `POST /patient-vault-records`
**Lines:** 859-920

Logs appear in terminal when:
1. Request received
2. User role checked
3. Request body parsed
4. Base64 converted
5. Database insert attempted
6. Record created or error occurred

---

## What to Report

If upload still doesn't work, please provide:

1. **Browser Console Output**
   - Copy all logs starting with `=== submitUpload called ===`
   - Include any error messages

2. **Backend Terminal Output**
   - Copy all logs starting with `=== POST /patient-vault-records ===`
   - Include any error messages

3. **Network Tab Details**
   - Status code of the request
   - Response body (if error)

4. **File Details**
   - File name
   - File size
   - File type (PDF, JPG, etc.)

5. **Steps to Reproduce**
   - Exact steps you took
   - What you expected to happen
   - What actually happened

---

## Quick Checklist

- [ ] Backend running on port 3000?
- [ ] Frontend running on port 4200?
- [ ] Logged in as a Patient?
- [ ] File selected before clicking Upload?
- [ ] File under 20 MB?
- [ ] File is valid format (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX)?
- [ ] Browser console open?
- [ ] Backend terminal visible?
- [ ] No network errors?
- [ ] Database connection working?

---

## Testing with Different Files

Try uploading different file types to narrow down the issue:

1. **Small PDF** (< 1 MB)
   - Tests basic upload flow
   - Tests PDF handling

2. **Small Image** (JPG or PNG, < 1 MB)
   - Tests image handling
   - Tests MIME type detection

3. **Small Document** (DOC or DOCX, < 1 MB)
   - Tests document handling
   - Tests file type validation

4. **Larger File** (5-10 MB)
   - Tests file size handling
   - Tests buffer creation

---

## Next Steps

Once you provide the logs, I can:
1. Identify exactly where the upload is failing
2. Fix the specific issue
3. Test the fix
4. Verify it works

Please try uploading again and share:
- Browser console logs
- Backend terminal logs
- Any error messages you see

---

**Last Updated:** May 23, 2026
**Debug Logging Added:** ✅
**Ready for Testing:** ✅
