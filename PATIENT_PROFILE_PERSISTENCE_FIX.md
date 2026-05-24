# Patient Profile Persistence Fix

## Problem
Patient profile edits were not being saved to the database, so refreshing the page would lose all changes.

## Root Cause
The backend `PUT /patient-profile/:userId` endpoint was using a simple `UPDATE` query:

```sql
UPDATE patient_profiles SET ... WHERE user_id = $1
```

**The issue:** When a patient registers, no `patient_profiles` record is created. So when they try to save their profile for the first time, the UPDATE fails silently (0 rows affected) because there's no row to update.

## Solution
Changed the endpoint to use **UPSERT** (INSERT ... ON CONFLICT ... DO UPDATE):

```sql
INSERT INTO patient_profiles (...)
VALUES (...)
ON CONFLICT (user_id) DO UPDATE SET ...
```

This ensures:
- ✅ If the profile doesn't exist, it's **created**
- ✅ If the profile exists, it's **updated**
- ✅ Data persists to the database and survives page refreshes

## Files Modified
- `dental-backend/index.js` - Updated the `PUT /patient-profile/:userId` endpoint (line ~3100)

## How It Works

### Frontend Flow (unchanged)
1. User edits profile in `PatientProfileEditComponent`
2. Clicks "Save"
3. Component calls `PatientProfileStore.saveToServer(profile)`
4. Store sends HTTP PUT request to backend with profile data
5. Store updates local cache with new profile data

### Backend Flow (fixed)
1. Receives PUT request with profile data
2. **UPSERT** operation:
   - Tries to INSERT new patient_profiles record
   - If user_id already exists (CONFLICT), UPDATE instead
   - If user_id doesn't exist, INSERT creates it
3. Returns success response
4. Data is now persisted in database

### On Page Refresh
1. User navigates to profile page
2. Component calls `PatientProfileStore.loadFromServer()`
3. Backend GET endpoint retrieves the saved profile from database
4. Profile displays with all previously saved data

## Testing
To verify the fix works:

1. **First-time save:**
   - Register a new patient account
   - Go to Edit Profile
   - Fill in profile information (DOB, blood type, emergency contact, etc.)
   - Click Save
   - Should see success message

2. **Persistence test:**
   - Refresh the page (F5 or Ctrl+R)
   - Navigate back to profile
   - All saved data should still be there

3. **Update test:**
   - Edit an existing profile field
   - Save again
   - Refresh page
   - Updated data should persist

## Technical Details

### UPSERT Syntax
PostgreSQL's `ON CONFLICT` clause allows atomic insert-or-update operations:

```sql
INSERT INTO table (columns) 
VALUES (values)
ON CONFLICT (unique_column) DO UPDATE SET
  column1 = excluded.column1,
  column2 = excluded.column2
```

The `excluded` keyword refers to the values that would have been inserted.

### Why This Works
- **Atomic:** Single database operation, no race conditions
- **Idempotent:** Safe to retry without duplicates
- **Efficient:** No need for separate SELECT + INSERT/UPDATE logic
- **Reliable:** Guaranteed to persist data on first save

## Related Components
- `PatientProfileStore` - Handles caching and API calls
- `PatientProfileEditComponent` - UI for editing profile
- `ApiService.updatePatientProfile()` - HTTP PUT wrapper
- `patient_profiles` table - Database storage

## No Breaking Changes
This fix is backward compatible:
- Existing profiles continue to work
- API contract unchanged (same endpoint, same request/response format)
- Frontend code requires no changes
