# Staff Portal Sync - Detailed Changes

## Overview
This document lists every change made to fix staff portal database synchronization.

---

## 1. Database Schema Changes

### File: `dental-backend/init-db.js`

**Added**: New `staff_profiles` table (after `patient_profiles` table)

```sql
-- STAFF PROFILES TABLE
-- Extended staff information linked 1-to-1 with users (role='Staff')
-- Constraints: PRIMARY KEY, UNIQUE (user_id), FOREIGN KEY → users
CREATE TABLE IF NOT EXISTS staff_profiles (
  id                      SERIAL        PRIMARY KEY,
  user_id                 INTEGER       NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  position                VARCHAR(100)  NOT NULL DEFAULT 'Front Desk Staff',
  department              VARCHAR(100)  NOT NULL DEFAULT 'Administration',
  hire_date               DATE,
  work_schedule           VARCHAR(255)  NOT NULL DEFAULT 'Mon – Fri · 8:00 AM – 5:00 PM',
  address                 TEXT,
  date_of_birth           DATE,
  emergency_contact_name  VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  bio                     TEXT,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','On Leave')),
  created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

**Location**: Line ~150-170 in init-db.js

**Purpose**: Persistent storage for staff profile data

---

## 2. Backend API Endpoints

### File: `dental-backend/index.js`

**Added**: Three new staff profile endpoints after the `/staff/patient-reliability` endpoint

#### Endpoint 1: GET /staff/profile
```javascript
// GET /staff/profile — Get current staff member's profile (from database)
app.get('/staff/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
        sp.position, sp.department, sp.hire_date, sp.work_schedule,
        sp.address, sp.date_of_birth, sp.emergency_contact_name,
        sp.emergency_contact_phone, sp.bio, sp.status,
        sp.created_at, sp.updated_at
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'Staff'
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Staff profile fetch error:', err.message);
    res.status(500).json({ message: 'Failed to load staff profile.' });
  }
});
```

#### Endpoint 2: PUT /staff/profile
```javascript
// PUT /staff/profile — Update staff member's profile (sync to database)
app.put('/staff/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const {
    phone, position, department, hire_date, work_schedule,
    address, date_of_birth, emergency_contact_name,
    emergency_contact_phone, bio, status
  } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update users table (basic info)
    if (phone !== undefined) {
      await client.query(
        'UPDATE users SET phone = $1 WHERE id = $2',
        [phone?.trim() || null, req.user.id]
      );
    }

    // Ensure staff_profiles record exists
    const profileExists = await client.query(
      'SELECT id FROM staff_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileExists.rows.length === 0) {
      // Create new staff profile
      await client.query(
        `INSERT INTO staff_profiles (user_id, position, department, hire_date, work_schedule, address, date_of_birth, emergency_contact_name, emergency_contact_phone, bio, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.user.id,
          position || 'Front Desk Staff',
          department || 'Administration',
          hire_date || null,
          work_schedule || 'Mon – Fri · 8:00 AM – 5:00 PM',
          address || null,
          date_of_birth || null,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          bio || null,
          status || 'Active'
        ]
      );
    } else {
      // Update existing staff profile
      await client.query(
        `UPDATE staff_profiles SET
           position = COALESCE($1, position),
           department = COALESCE($2, department),
           hire_date = COALESCE($3, hire_date),
           work_schedule = COALESCE($4, work_schedule),
           address = COALESCE($5, address),
           date_of_birth = COALESCE($6, date_of_birth),
           emergency_contact_name = COALESCE($7, emergency_contact_name),
           emergency_contact_phone = COALESCE($8, emergency_contact_phone),
           bio = COALESCE($9, bio),
           status = COALESCE($10, status),
           updated_at = NOW()
         WHERE user_id = $11`,
        [
          position || null,
          department || null,
          hire_date || null,
          work_schedule || null,
          address || null,
          date_of_birth || null,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          bio || null,
          status || null,
          req.user.id
        ]
      );
    }

    await client.query('COMMIT');

    // Return updated profile
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
        sp.position, sp.department, sp.hire_date, sp.work_schedule,
        sp.address, sp.date_of_birth, sp.emergency_contact_name,
        sp.emergency_contact_phone, sp.bio, sp.status,
        sp.created_at, sp.updated_at
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Staff profile update error:', err.message);
    res.status(500).json({ message: 'Failed to update staff profile.' });
  } finally {
    client.release();
  }
});
```

#### Endpoint 3: GET /staff/all
```javascript
// GET /staff/all — Get all staff members (for admin/management view)
app.get('/staff/all', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
        sp.position, sp.department, sp.hire_date, sp.work_schedule, sp.status AS profile_status,
        COUNT(DISTINCT a.id) AS total_appointments_handled
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      LEFT JOIN appointments a ON a.dentist_id = u.id OR (a.patient_id IS NULL AND a.created_at IS NOT NULL)
      WHERE u.role = 'Staff'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
               sp.position, sp.department, sp.hire_date, sp.work_schedule, sp.status
      ORDER BY u.first_name, u.last_name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Staff list fetch error:', err.message);
    res.status(500).json({ message: 'Failed to load staff list.' });
  }
});
```

**Location**: Lines ~3910-4050 in index.js

**Purpose**: 
- GET: Retrieve staff profile from database
- PUT: Save staff profile to database (create if not exists)
- GET /all: List all staff members

---

## 3. Frontend API Service

### File: `dental-frontend/src/app/services/api.service.ts`

**Added**: Three new methods to ApiService class

```typescript
// ── STAFF PROFILE SYNC ──────────────────────────────────────────────────────
getStaffProfile(): Observable<any> {
  return this.http.get(`${this.base}/staff/profile`, { headers: this.authHeaders() });
}

updateStaffProfile(data: {
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  work_schedule?: string;
  address?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bio?: string;
  status?: string;
}): Observable<any> {
  return this.http.put(`${this.base}/staff/profile`, data, { headers: this.authHeaders() });
}

getAllStaff(): Observable<any[]> {
  return this.http.get<any[]>(`${this.base}/staff/all`, { headers: this.authHeaders() });
}
```

**Location**: Lines ~280-310 in api.service.ts

**Purpose**: Frontend methods to call the new backend endpoints

---

## 4. Staff Profile Component

### File: `dental-frontend/src/app/staff-profile/staff-profile.ts`

**Changes**:

#### 1. Added loading state
```typescript
isLoadingProfile = true;
```

#### 2. Replaced localStorage loading with database loading
**Before**:
```typescript
private loadProfileFromStorage(): void {
  try {
    const savedProfile = localStorage.getItem('staffProfileData');
    if (savedProfile) {
      const data = JSON.parse(savedProfile);
      // ... load from localStorage
    }
  } catch (e) {
    console.error('Error loading profile from storage:', e);
  }
}
```

**After**:
```typescript
private loadStaffProfile(): void {
  this.isLoadingProfile = true;
  this.api.getStaffProfile().subscribe({
    next: (data: any) => {
      // Map database fields to profile object
      if (data.position) this.profile.position = data.position;
      if (data.department) this.profile.department = data.department;
      if (data.hire_date) this.profile.hireDate = this.formatDateDisplay(data.hire_date);
      if (data.work_schedule) this.profile.workSchedule = data.work_schedule;
      if (data.address) this.profile.address = data.address;
      if (data.date_of_birth) this.profile.dateOfBirth = this.formatDateDisplay(data.date_of_birth);
      if (data.emergency_contact_name) this.profile.emergencyContact = data.emergency_contact_name;
      if (data.emergency_contact_phone) this.profile.emergencyPhone = data.emergency_contact_phone;
      if (data.bio) this.profile.bio = data.bio;
      if (data.status) this.profile.status = data.status;
      if (data.phone) this.profile.phone = data.phone;
      if (data.avatar_url) this.profile.avatarUrl = data.avatar_url;

      this.isLoadingProfile = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to load staff profile:', err);
      this.isLoadingProfile = false;
      this.cdr.detectChanges();
    }
  });
}
```

#### 3. Updated ngOnInit
**Before**:
```typescript
ngOnInit(): void {
  // ... load from auth
  this.loadAvatar();
  this.loadProfileFromStorage();  // ← localStorage
}
```

**After**:
```typescript
ngOnInit(): void {
  // ... load from auth
  this.loadAvatar();
  this.loadStaffProfile();  // ← database
}
```

#### 4. Updated saveEdit method
**Before**:
```typescript
saveEdit(): void {
  // ... only called updateUserProfile
  this.api.updateUserProfile(user.id, {...}).subscribe({
    next: () => {
      // ... update local profile
      this.saveProfileToStorage();  // ← save to localStorage
    }
  });
}
```

**After**:
```typescript
saveEdit(): void {
  // ... prepare data
  const updateData = {
    phone: this.editData.phone?.trim() || undefined,
    position: this.editData.position,
    department: this.editData.department,
    hire_date: this.editData.hireDate ? this.parseISOToDate(this.editData.hireDate) : undefined,
    work_schedule: this.editData.workSchedule,
    address: this.editData.address?.trim() || undefined,
    date_of_birth: this.editDob ? this.parseISOToDate(this.editDob) : undefined,
    emergency_contact_name: this.editData.emergencyContact?.trim() || undefined,
    emergency_contact_phone: this.editData.emergencyPhone?.trim() || undefined,
    bio: this.editData.bio?.trim() || undefined,
    status: this.editData.status,
  };

  // Update basic user info
  this.api.updateUserProfile(user.id, {...}).subscribe({
    next: () => {
      // Update staff profile in database
      this.api.updateStaffProfile(updateData).subscribe({
        next: () => {
          // ... update local profile
          this.isSavingEdit = false;
          this.showEditModal = false;
          this.showSuccessToast('Profile updated successfully!');
          this.cdr.detectChanges();
        }
      });
    }
  });
}
```

#### 5. Added helper method
```typescript
private parseISOToDate(iso: string): string {
  // Convert ISO date (YYYY-MM-DD) to database format
  return iso;
}
```

**Location**: Lines ~1-200 in staff-profile.ts

**Purpose**: Load and save staff profile from/to database instead of localStorage

---

## 5. New Migration Script

### File: `dental-backend/migrate-staff-profiles.js` (NEW)

```javascript
/**
 * migrate-staff-profiles.js
 * Populates the staff_profiles table from existing staff users
 * Run this ONCE after creating the staff_profiles table
 * Command: node migrate-staff-profiles.js
 */

require('dotenv').config();
const db = require('./db');

async function migrateStaffProfiles() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    console.log('Migrating staff profiles...\n');

    // Get all staff users
    const staffUsers = await client.query(
      `SELECT id, first_name, last_name FROM users WHERE role = 'Staff'`
    );

    console.log(`Found ${staffUsers.rows.length} staff members to migrate.\n`);

    let created = 0;
    let skipped = 0;

    for (const user of staffUsers.rows) {
      // Check if profile already exists
      const existing = await client.query(
        'SELECT id FROM staff_profiles WHERE user_id = $1',
        [user.id]
      );

      if (existing.rows.length > 0) {
        console.log(`⊘ Staff profile already exists for ${user.first_name} ${user.last_name} (ID: ${user.id})`);
        skipped++;
        continue;
      }

      // Create new staff profile with defaults
      await client.query(
        `INSERT INTO staff_profiles 
           (user_id, position, department, hire_date, work_schedule, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          'Front Desk Staff',
          'Administration',
          null,
          'Mon – Fri · 8:00 AM – 5:00 PM',
          'Active'
        ]
      );

      console.log(`✓ Created staff profile for ${user.first_name} ${user.last_name} (ID: ${user.id})`);
      created++;
    }

    await client.query('COMMIT');

    console.log(`\n✓ Migration complete!`);
    console.log(`  Created: ${created} new profiles`);
    console.log(`  Skipped: ${skipped} existing profiles`);
    console.log(`  Total:   ${created + skipped} staff members`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateStaffProfiles();
```

**Purpose**: Populate staff_profiles table for existing staff members

---

## Summary of Changes

| Component | Type | Change | Impact |
|-----------|------|--------|--------|
| Database | Schema | Added `staff_profiles` table | Persistent staff data storage |
| Backend | Endpoints | Added 3 new endpoints | Staff profile CRUD operations |
| Frontend | Service | Added 3 new methods | API calls for staff profile |
| Frontend | Component | Updated profile loading/saving | Database sync instead of localStorage |
| Backend | Script | Added migration script | Populate existing staff profiles |

---

## Verification

All changes have been:
- ✅ Syntax checked (JavaScript and TypeScript)
- ✅ Logically reviewed
- ✅ Documented with comments
- ✅ Tested for compilation errors

---

**End of Detailed Changes**
