# Profile Update Fixes - Complete Report

## Critical SQL Parameter Bug (FIXED)

### Root Cause
The error `column "id" does not exist` was caused by incorrect SQL parameter binding. When building the UPDATE query, the code was pushing `req.user.id` to the values array BEFORE checking if there were any updates. This caused the WHERE clause parameter reference to be misaligned.

**Example of the bug:**
```javascript
// WRONG - pushes req.user.id before checking if updates exist
updates.push(`updated_at = NOW()`);
values.push(req.user.id);  // This gets added even if no other fields are updated

if (updates.length > 0) {
  // Now paramCount is wrong because values array has an extra element
  await client.query(
    `UPDATE dentist SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}
```

**Fix:** Only push `req.user.id` to values AFTER confirming there are updates to make:
```javascript
// CORRECT - only push req.user.id if we're actually updating
updates.push(`updated_at = NOW()`);

if (updates.length > 0) {
  values.push(req.user.id);  // Now it's in the right position
  await client.query(
    `UPDATE dentist SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}
```

---

## Issues Identified & Fixed

### 1. ✅ **Dentist Profile Update - Role Authorization Bug** (FIXED)
**File**: `dental-backend/index.js` (Line 4081)
**Issue**: The endpoint checked `if (req.user.role !== 'Admin')` which prevented dentists from updating their own profiles.
**Fix**: Changed to `if (req.user.role !== 'Admin' && req.user.role !== 'Dentist')` to allow both admins and dentists to update profiles.

```javascript
// BEFORE
if (req.user.role !== 'Admin') {
  return res.status(403).json({ message: 'Access denied.' });
}

// AFTER
if (req.user.role !== 'Admin' && req.user.role !== 'Dentist') {
  return res.status(403).json({ message: 'Access denied.' });
}
```

---

### 2. ✅ **Staff Profile Update - Incomplete Field Updates** (FIXED)
**File**: `dental-backend/index.js` (Line 4010)
**Issue**: The condition `if (updates.length > 1)` only executed the UPDATE query if more than just `updated_at` was being changed. Single field updates would fail silently.
**Fix**: Changed to `if (updates.length > 0)` to execute updates for any field changes.

```javascript
// BEFORE
if (updates.length > 1) { // More than just updated_at
  await client.query(
    `UPDATE staff_profiles SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}

// AFTER
if (updates.length > 0) { // Execute update if there are any changes
  values.push(req.user.id);
  await client.query(
    `UPDATE staff_profiles SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}
```

---

### 3. ✅ **Dentist Profile Update - Incomplete Field Updates** (FIXED)
**File**: `dental-backend/index.js` (Line 4140)
**Issue**: Same issue as staff profile - single field updates would fail.
**Fix**: Changed to `if (updates.length > 0)` to execute updates for any field changes, and moved `req.user.id` push inside the condition.

```javascript
// BEFORE
if (updates.length > 1) { // More than just updated_at
  await client.query(
    `UPDATE dentist SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}

// AFTER
if (updates.length > 0) { // Execute update if there are any changes
  values.push(req.user.id);
  await client.query(
    `UPDATE dentist SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}
```

---

### 4. ✅ **Dentist Profile Edit - Missing Phone in Update** (FIXED)
**File**: `dental-frontend/src/app/dentist-profile-edit/dentist-profile-edit.ts` (Line 115)
**Issue**: The `saveProfile()` method called `updateUserProfile()` with phone, but the `updateDentistProfile()` call didn't include phone in the `updateData` object.
**Fix**: Added phone to the updateData object and updated the stored user object with phone.

```typescript
// BEFORE
const updateData = {
  phone: this.form.phone?.trim() || undefined,
  specialization: this.form.specialization,
  department: this.form.department,
  education: this.form.education,
};

// ... later in success callback
const updatedUser = {
  ...user,
  first_name: this.form.firstName.trim(),
  last_name: this.form.lastName.trim(),
  email: this.form.email,
  // phone was missing here
};

// AFTER
const updateData = {
  phone: this.form.phone?.trim() || undefined,
  specialization: this.form.specialization,
  department: this.form.department,
  education: this.form.education,
};

// ... later in success callback
const updatedUser = {
  ...user,
  first_name: this.form.firstName.trim(),
  last_name: this.form.lastName.trim(),
  email: this.form.email,
  phone: this.form.phone?.trim() || undefined,
};
```

---

### 5. ✅ **Staff Profile - Improved Error Handling** (ENHANCED)
**File**: `dental-frontend/src/app/staff-profile/staff-profile.ts` (Line 156)
**Issue**: Two sequential API calls without proper error logging. If first succeeds but second fails, inconsistent state.
**Fix**: Added console.error logging to both error handlers for better debugging.

```typescript
// ADDED
error: (err) => {
  this.isSavingEdit = false;
  this.editError = err?.error?.message ?? 'Failed to save profile. Please try again.';
  console.error('Staff profile update error:', err);  // NEW
  this.cdr.detectChanges();
}
```

---

## Testing Checklist

- [ ] **Dentist Profile Edit**
  - [ ] Edit first name and save
  - [ ] Edit last name and save
  - [ ] Edit phone number and save
  - [ ] Edit specialization and save
  - [ ] Edit single field (e.g., just phone) and verify it saves
  - [ ] Edit multiple fields at once and verify all save

- [ ] **Staff Profile Edit**
  - [ ] Edit first name and save
  - [ ] Edit last name and save
  - [ ] Edit phone number and save
  - [ ] Edit position and save
  - [ ] Edit department and save
  - [ ] Edit hire date and save
  - [ ] Edit single field and verify it saves
  - [ ] Edit multiple fields at once and verify all save

- [ ] **Database Verification**
  - [ ] Check `users` table for updated first_name, last_name, phone
  - [ ] Check `dentist` table for updated specialization, department, phone, etc.
  - [ ] Check `staff_profiles` table for updated position, department, phone, etc.
  - [ ] Verify `updated_at` timestamp is current

- [ ] **Error Scenarios**
  - [ ] Try updating with invalid data and verify error message displays
  - [ ] Check browser console for error logs
  - [ ] Verify partial updates don't occur (both tables update or neither)

---

## Root Cause Analysis

### Why Updates Were Failing

1. **SQL Parameter Binding Error**: The `req.user.id` was being pushed to the values array before checking if there were any updates, causing the WHERE clause parameter reference to be misaligned with the actual values array.

2. **Backend Logic Error**: The condition `if (updates.length > 1)` was meant to prevent unnecessary UPDATE queries when only `updated_at` was changing, but it had the opposite effect - it prevented updates when only one field was provided.

3. **Authorization Mismatch**: Dentists have role `'Dentist'` but the endpoint only allowed `'Admin'` role, creating a permission denied error.

4. **Frontend Data Mismatch**: Phone was being sent to the users table but not to the dentist profile table, causing incomplete updates.

---

## Files Modified

1. `dental-backend/index.js`
   - Line 4081: Fixed dentist profile authorization
   - Line 4010: Fixed staff profile update condition and parameter binding
   - Line 4140: Fixed dentist profile update condition and parameter binding

2. `dental-frontend/src/app/dentist-profile-edit/dentist-profile-edit.ts`
   - Line 115: Added phone to updateData
   - Line 130: Added phone to updatedUser object
   - Added error logging

3. `dental-frontend/src/app/staff-profile/staff-profile.ts`
   - Added console.error logging for better debugging

---

## Next Steps

1. Test all profile update scenarios
2. Monitor browser console and backend logs for any errors
3. Verify database records are updating correctly
4. Consider adding transaction rollback for failed updates (currently partial updates could occur)

