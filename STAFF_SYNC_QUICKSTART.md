# Staff Portal Sync - Quick Start Guide

## TL;DR

Staff profile data is now synced with the database instead of being stored only in localStorage.

---

## 3-Step Deployment

### Step 1: Update Database
```bash
cd dental-backend
node migrate-staff-profiles.js
```

### Step 2: Restart Backend
```bash
npm start
```

### Step 3: Restart Frontend
```bash
cd dental-frontend
npm start
```

---

## Test It

1. Log in as staff member
2. Go to **Staff Profile**
3. Edit any field (e.g., position, department)
4. Click **Save**
5. Refresh page (F5)
6. ✅ Changes should still be there

---

## What Changed

| Before | After |
|--------|-------|
| Profile data in localStorage | Profile data in database |
| Data lost on cache clear | Data persists permanently |
| Single device only | Synced across all devices |
| No admin view | Can view all staff profiles |

---

## Files Modified

- `dental-backend/init-db.js` - Added staff_profiles table
- `dental-backend/index.js` - Added 3 new endpoints
- `dental-backend/migrate-staff-profiles.js` - NEW migration script
- `dental-frontend/src/app/services/api.service.ts` - Added 3 new methods
- `dental-frontend/src/app/staff-profile/staff-profile.ts` - Updated to use database

---

## Booking Logic

✅ **No changes** - Staff and patient booking flows work exactly the same

---

## Troubleshooting

**Profile not loading?**
```bash
# Check backend is running
npm start  # in dental-backend/

# Check database
psql -U postgres -d code_smiles_db
SELECT COUNT(*) FROM staff_profiles;
```

**Changes not saving?**
- Clear browser cache (Ctrl+Shift+Delete)
- Refresh page (Ctrl+F5)
- Check browser console (F12)

**Migration failed?**
```bash
# Check database connection in .env
# Verify staff_profiles table exists
psql -U postgres -d code_smiles_db
\dt staff_profiles
```

---

## Documentation

For detailed information, see:
- `STAFF_SYNC_FIX_COMPLETE.md` - Full documentation
- `STAFF_SYNC_CHANGES_DETAILED.md` - All code changes
- `STAFF_SYNC_IMPLEMENTATION_SUMMARY.md` - Implementation overview

---

**Done! Staff portal is now synced with the database. ✅**
