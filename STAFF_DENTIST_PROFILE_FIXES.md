# ✅ STAFF & DENTIST PROFILE UPDATE FIXES

**Date:** May 24, 2026  
**Status:** FIXED - Ready for Testing  
**Issue:** Staff and Dentist profiles couldn't be updated (error: "Failed to update staff profile")

---

## 🔍 ROOT CAUSE ANALYSIS

### Problem 1: Staff Profile Update Endpoint
**File:** `dental-backend/index.js` (line 3946)

**Issue:** The endpoint was using `COALESCE` operator which prevented updates when `undefined` values were sent from the frontend.

```javascript
// BEFORE (BROKEN):
UPDATE staff_profiles SET
  position = COALESCE($1, position),  // If $1 is null, doesn't update
  department = COALESCE($2, department),
  ...
```

**Why it failed:** When frontend sent `undefined` for a field, it became `null` in the database query, and `COALESCE(null, position)` returns the old value, so nothing changed.

---

### Problem 2: Dentist Profile Update Endpoint
**File:** `dental-backend/index.js`

**Issue:** No dentist profile update endpoint existed at all!

**Frontend was calling:** `PUT /dentist/profile` (via `api.updateDentistProfile()`)  
**Backend had:** Nothing - endpoint didn't exist

---

## ✅ FIXES APPLIED

### FIX #1: Staff Profile Update Endpoint

**File:** `dental-backend/index.js` (line 3946)

**Changed:** Replaced `COALESCE` logic with conditional updates

```javascript
// AFTER (FIXED):
const updates = [];
const values = [];
let paramCount = 1;

if (position !== undefined) {
  updates.push(`position = $${paramCount++}`);
  values.push(position || null);
}
if (department !== undefined) {
  updates.push(`department = $${paramCount++}`);
  values.push(department || null);
}
// ... more fields ...

if (updates.length > 1) {
  await client.query(
    `UPDATE staff_profiles SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
    values
  );
}
```

**Why it works:** Only includes fields in UPDATE statement if they're provided. Prevents overwriting with null values.

---

### FIX #2: Create Dentist Profile Update Endpoint

**File:** `dental-backend/index.js` (after line 4077)

**Added:** New `PUT /dentist/profile` endpoint with same logic as staff profile

```javascript
app.put('/dentist/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const {
    phone, specialization, department, license_number, education,
    address, date_of_birth, emergency_contact_name,
    emergency_contact_phone, bio, status
  } = req.body;

  // ... same conditional update logic as staff profile ...
  
  // Returns updated profile from database
  res.json(result.rows[0]);
});
```

---

### FIX #3: Add API Method for Dentist Profile

**File:** `dental-frontend/src/app/services/api.service.ts` (line 247)

**Added:** New `updateDentistProfile()` method

```typescript
updateDentistProfile(data: {
  phone?: string;
  specialization?: string;
  department?: string;
  license_number?: string;
  education?: string;
  address?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bio?: string;
  status?: string;
}): Observable<any> {
  return this.http.put(`${this.base}/dentist/profile`, data, { headers: this.authHeaders() });
}
```

---

### FIX #4: Update Dentist Profile Edit Component

**File:** `dental-frontend/src/app/dentist-profile-edit/dentist-profile-edit.ts` (line 103)

**Changed:** Updated `saveProfile()` method to call new API method

```typescript
protected saveProfile(): void {
  // ... validation ...

  // Prepare data for API call
  const updateData = {
    phone: this.form.phone?.trim() || undefined,
    specialization: this.form.specialization,
    department: this.form.department,
    education: this.form.education,
  };

  this.api.updateUserProfile(user.id, {...}).subscribe({
    next: () => {
      // Update dentist profile in database
      this.api.updateDentistProfile(updateData).subscribe({
        next: () => {
          // Success - show modal
          this.showSuccessModal = true;
        },
        error: (err) => {
          this.saveError = err?.error?.message || 'Failed to save profile.';
        }
      });
    }
  });
}
```

---

## 🧪 TESTING

### Test 1: Update Staff Profile
```
1. Login as STAFF
2. Go to Profile → Edit Profile
3. Change position to "Senior Receptionist"
4. Change address to "456 Oak Ave"
5. Click "Save Changes"
6. VERIFY: Success modal appears ✅
7. Press F5 to refresh
8. VERIFY: Changes persist ✅
```

### Test 2: Update Dentist Profile
```
1. Login as ADMIN (dentist account)
2. Go to Dentist Profile → Edit Profile
3. Change specialization to "Orthodontics"
4. Change department to "Specialty Services"
5. Click "Save Changes"
6. VERIFY: Success modal appears ✅
7. Press F5 to refresh
8. VERIFY: Changes persist ✅
```

---

## 📊 SUMMARY OF CHANGES

| Component | File | Change | Status |
|-----------|------|--------|--------|
| Backend Staff | `index.js` | Fixed COALESCE logic | ✅ Done |
| Backend Dentist | `index.js` | Added new endpoint | ✅ Done |
| Frontend API | `api.service.ts` | Added updateDentistProfile() | ✅ Done |
| Frontend Dentist | `dentist-profile-edit.ts` | Updated saveProfile() | ✅ Done |

---

## 🚀 NEXT STEPS

1. **Restart backend:** Kill Node process and run `npm start` in `dental-backend/`
2. **Restart frontend:** Run `npm start` in `dental-frontend/`
3. **Test staff profile update** (Test 1 above)
4. **Test dentist profile update** (Test 2 above)
5. **Report results** - which tests passed/failed

---

## ⚠️ IMPORTANT NOTES

- **Backend must be restarted** for new endpoint to be available
- **Frontend must be restarted** for new API method to be available
- **Clear browser cache** if you see old data (Ctrl+Shift+Delete)
- **Check browser console** for any errors (F12 → Console tab)

---

## 🎯 SUCCESS CRITERIA

✅ Staff profile updates persist after page refresh  
✅ Dentist profile updates persist after page refresh  
✅ Success modal shows after save  
✅ No console errors  
✅ Backend logs show successful updates  

---

**Ready to test? Restart both backend and frontend!** 🚀

