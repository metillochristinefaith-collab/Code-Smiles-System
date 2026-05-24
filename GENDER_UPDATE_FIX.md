# Gender Field Update - Complete Fix

## Problem
Users couldn't update the gender field for dentist and staff profiles. The gender field wasn't being saved to the database.

## Root Causes
1. **Missing Database Columns**: The `staff` and `dentist` tables didn't have a `gender` column
2. **Backend Not Handling Gender**: The API endpoints weren't extracting or saving the gender field
3. **Frontend Not Sending Gender**: The frontend components weren't including gender in the update requests
4. **Table Name Mismatch**: Backend code referenced `staff_profiles` but the actual table was `staff`

## Solutions Implemented

### 1. ✅ Added Gender Columns to Database
**File**: `add-missing-profile-columns.js` (migration script)

Added gender column to both tables with proper validation:
```sql
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(20) 
  CHECK (gender IN ('Male','Female','Other','Prefer not to say'));

ALTER TABLE dentist ADD COLUMN IF NOT EXISTS gender VARCHAR(20) 
  CHECK (gender IN ('Male','Female','Other','Prefer not to say'));
```

Also added other missing columns:
- **Staff table**: address, date_of_birth, emergency_contact_name, emergency_contact_phone, bio, work_schedule
- **Dentist table**: department, education, address, date_of_birth, emergency_contact_name, emergency_contact_phone

### 2. ✅ Fixed Backend API Endpoints
**File**: `dental-backend/index.js`

#### Staff Profile Endpoint (`PUT /staff/profile`)
- Added `gender` to destructured request body
- Updated INSERT statement to include gender
- Updated UPDATE logic to handle gender field
- Fixed table reference from `staff_profiles` to `staff`
- Updated SELECT query to return gender field

#### Dentist Profile Endpoint (`PUT /dentist/profile`)
- Added `gender` to destructured request body
- Updated INSERT statement to include gender
- Updated UPDATE logic to handle gender field
- Updated SELECT query to return gender field

### 3. ✅ Updated Frontend Components
**Files**: 
- `dental-frontend/src/app/dentist-profile-edit/dentist-profile-edit.ts`
- `dental-frontend/src/app/staff-profile/staff-profile.ts`

Added gender to the update data objects:
```typescript
const updateData = {
  // ... other fields
  gender: this.form.gender !== '—' ? this.form.gender : undefined,  // dentist
  gender: this.editData.gender || undefined,  // staff
};
```

### 4. ✅ Updated API Service
**File**: `dental-frontend/src/app/services/api.service.ts`

Added `gender?: string;` to both:
- `updateStaffProfile()` method
- `updateDentistProfile()` method

## Testing Steps

1. **Dentist Profile**:
   - Go to `/dentist-profile/edit`
   - Change gender from "—" to "Female" (or any other option)
   - Click Save
   - Verify the gender is saved and persists on page reload

2. **Staff Profile**:
   - Go to `/staff-profile`
   - Click Edit
   - Change gender in the Personal tab
   - Click Save
   - Verify the gender is saved and persists on page reload

3. **Database Verification**:
   ```sql
   SELECT id, first_name, last_name, gender FROM staff WHERE user_id = 3;
   SELECT id, first_name, last_name, gender FROM dentist WHERE user_id = 3;
   ```

## Files Modified

### Backend
- `dental-backend/index.js` - Updated staff and dentist profile endpoints
- `dental-backend/add-missing-profile-columns.js` - Migration script (new)

### Frontend
- `dental-frontend/src/app/dentist-profile-edit/dentist-profile-edit.ts` - Added gender to update data
- `dental-frontend/src/app/staff-profile/staff-profile.ts` - Added gender to update data
- `dental-frontend/src/app/services/api.service.ts` - Added gender parameter to API methods

## Database Changes

### Staff Table
```sql
ALTER TABLE staff ADD COLUMN gender VARCHAR(20) 
  CHECK (gender IN ('Male','Female','Other','Prefer not to say'));
ALTER TABLE staff ADD COLUMN address TEXT;
ALTER TABLE staff ADD COLUMN date_of_birth DATE;
ALTER TABLE staff ADD COLUMN emergency_contact_name VARCHAR(100);
ALTER TABLE staff ADD COLUMN emergency_contact_phone VARCHAR(20);
ALTER TABLE staff ADD COLUMN bio TEXT;
ALTER TABLE staff ADD COLUMN work_schedule VARCHAR(255) DEFAULT 'Mon – Fri · 8:00 AM – 5:00 PM';
```

### Dentist Table
```sql
ALTER TABLE dentist ADD COLUMN gender VARCHAR(20) 
  CHECK (gender IN ('Male','Female','Other','Prefer not to say'));
ALTER TABLE dentist ADD COLUMN department VARCHAR(100);
ALTER TABLE dentist ADD COLUMN education TEXT;
ALTER TABLE dentist ADD COLUMN address TEXT;
ALTER TABLE dentist ADD COLUMN date_of_birth DATE;
ALTER TABLE dentist ADD COLUMN emergency_contact_name VARCHAR(100);
ALTER TABLE dentist ADD COLUMN emergency_contact_phone VARCHAR(20);
```

## Summary

The gender field is now fully functional for both dentist and staff profiles. Users can:
- ✅ Update their gender
- ✅ Save it to the database
- ✅ See it persist on page reload
- ✅ Update other profile fields simultaneously

All changes are backward compatible and don't affect existing data.
