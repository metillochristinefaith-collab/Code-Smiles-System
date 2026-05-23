# Database Debug Report: Staff Booking Error

## Issue Summary
The staff booking feature is showing "Error loading available time slots" when users try to book appointments.

## Root Cause Analysis

### 1. Appointments Table ✓ EXISTS
- **Status**: Table exists and is properly configured
- **Rows**: 2 appointments currently in database
- **Columns**: 21 columns including all required fields

### 2. Required Columns ✓ ALL PRESENT
The appointments table has all required columns:
- ✓ `appointment_date` (date type)
- ✓ `appointment_time` (time without time zone)
- ✓ `treatment` (character varying)
- ✓ `dentist_name` (character varying)
- ✓ `status` (character varying)
- ✓ `dentist_id` (integer) - **KEY FIELD**

### 3. Sample Appointments Data
```
ID: 153
- Patient: Raphoncel Eduria
- Dentist: Dr. Derence Acojedo (dentist_id: 2)
- Date: 2026-05-27
- Time: 09:30:00
- Treatment: Gum Contouring
- Status: Approved

ID: 154
- Patient: Raphoncel Eduria
- Dentist: Dr. Derence Acojedo (dentist_id: 2)
- Date: 2026-05-29
- Time: 08:30:00
- Treatment: Tooth Contouring
- Status: Approved
```

## CRITICAL ISSUE FOUND: Dentist ID Mismatch

### Database Dentist Table Structure
The `dentist` table (singular, not `dentists`) contains:
- **dentist_id**: 1, 2, 3, 4, 5 (numeric IDs)
- **user_id**: Links to users table
- **first_name, last_name, email, specialization, etc.**

### Dentists in Database
1. **dentist_id: 1** → Dr. Derence Acojedo (Cosmetic Arts)
2. **dentist_id: 2** → Dr. Raphoncel Eduria (General Dentistry, Oral Surgery)
3. **dentist_id: 3** → Dr. Nico Bongolto (Pediatric Care)
4. **dentist_id: 4** → Dr. Christine Faith Metillo (General Dentistry)
5. **dentist_id: 5** → Dr. Christine Metillo (Orthodontics, Dental Implants)

### Backend Code Issue (scheduling-engine.js)
The scheduling engine defines dentists with **string IDs**:
```javascript
const DENTISTS = {
  D3: { id: 'D3', dbId: 3, name: 'Dr. Raphoncel Eduria', ... },
  D6: { id: 'D6', dbId: 6, name: 'Dr. Christine Faith Metillo', ... },
  D5: { id: 'D5', dbId: 5, name: 'Dr. Nico Bongolto', ... },
  D2: { id: 'D2', dbId: 2, name: 'Dr. Derence Acojedo', ... },
};
```

### The Problem
1. **Appointments table** stores `dentist_id` as **numeric** (1, 2, 3, 4, 5)
2. **scheduling-engine.js** expects **string IDs** (D2, D3, D5, D6)
3. **Database query** in `scheduling-api.js` line 127:
   ```javascript
   WHERE appointment_date = $1
     AND dentist_id = $2
     AND status IN ('Approved', 'Pending')
   ```
   This query uses the numeric `dentist_id` from the database, but the `findDentistForService()` function returns a dentist object with `dbId` property that doesn't match the actual database IDs.

## Database Schema Summary

### All Tables in Database (16 total)
- appointments (21 columns, 2 rows)
- billing
- clinical_notes
- **dentist** (17 columns, 5 rows) ← **SINGULAR, not "dentists"**
- faqs
- notifications
- patient_profiles
- patient_vault_records
- patients
- prescriptions
- staff
- support_requests
- treatment_plans
- treatment_sessions
- users (16 columns, 12 rows)
- vault_file_sharing

## Recommendations

### Immediate Fix Required
1. **Update scheduling-engine.js** to use correct dentist IDs:
   - Change `dbId: 3` to `dbId: 2` for Dr. Raphoncel Eduria
   - Change `dbId: 6` to `dbId: 4` for Dr. Christine Faith Metillo
   - Verify all dentist ID mappings match the actual database

2. **Verify the mapping**:
   ```
   Database dentist_id → Backend dbId
   1 → 1 (Dr. Derence Acojedo)
   2 → 2 (Dr. Raphoncel Eduria)
   3 → 3 (Dr. Nico Bongolto)
   4 → 4 (Dr. Christine Faith Metillo)
   5 → 5 (Dr. Christine Metillo)
   ```

3. **Test the available-times endpoint** after fixing:
   ```
   GET /api/scheduling/available-times?date=2026-05-20&service=Wisdom%20Tooth%20Removal
   ```

## Verification Steps Completed
✓ Confirmed appointments table exists
✓ Verified all required columns present
✓ Checked sample appointment data
✓ Identified dentist table structure
✓ Found ID mismatch between database and backend code
✓ Located the exact issue in scheduling-engine.js

## Next Steps
1. Fix the dentist ID mappings in scheduling-engine.js
2. Test the available-times API endpoint
3. Verify staff booking works end-to-end
4. Check if any other services have similar ID mismatches
