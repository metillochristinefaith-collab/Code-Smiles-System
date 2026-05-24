# 🔒 PHASE 2: FILE SHARING SECURITY - IMPLEMENTATION PLAN

**Date:** May 24, 2026  
**Status:** READY TO IMPLEMENT  
**Priority:** CRITICAL  
**Severity:** Security Vulnerability

---

## 🎯 PHASE 2 OBJECTIVE

**Fix:** Dentists can access files they shouldn't have permission to view. No authentication or authorization on file sharing endpoints.

**Security Risk:** HIPAA violation - unauthorized access to patient medical records

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: Dentist Vault Endpoint Missing Authentication
**File:** `dental-backend/index.js` (Line 920)

**Problem:**
```javascript
app.get('/dentist/vault-records', async (req, res) => {
  // ← NO authMiddleware!
  // ← Dentist name from query param, not verified!
  const dentist_name = req.query.dentist;
  // Any user can call this and get ANY dentist's files
});
```

**Risk:** Any user can access any dentist's shared files by guessing dentist names

---

### Issue 2: File Sharing Endpoint Doesn't Validate Dentist
**File:** `dental-backend/index.js` (Line 862)

**Problem:**
```javascript
app.post('/patient-vault-records/:recordId/share', authMiddleware, async (req, res) => {
  const { dentist_name } = req.body;
  
  // ← NO CHECK: Does this dentist exist?
  // ← NO CHECK: Is patient related to this dentist?
  // ← NO CHECK: Does dentist have permission?
  
  // Just inserts without validation
  await db.query(`INSERT INTO vault_file_sharing ...`);
});
```

**Risk:** Patient can share files with non-existent dentists or unrelated dentists

---

### Issue 3: No Audit Trail
**Problem:** No logging of who accessed what files and when

**Risk:** Can't detect unauthorized access or investigate security incidents

---

## ✅ FIXES TO IMPLEMENT

### FIX #1: Add Authentication to Dentist Vault Endpoint

**File:** `dental-backend/index.js` (Line 920)

**Changes:**
1. Add `authMiddleware` to endpoint
2. Verify user is a dentist
3. Get dentist name from JWT token (not query param)
4. Add permission checks
5. Log all access

**Code:**
```javascript
app.get('/dentist/vault-records', authMiddleware, async (req, res) => {
  // Verify user is a dentist
  if (req.user.role !== 'Dentist') {
    return res.status(403).json({ message: 'Only dentists can access vault records.' });
  }

  // Get dentist name from JWT token
  const dentistName = req.user.dentist_name || `${req.user.first_name} ${req.user.last_name}`;

  try {
    const result = await db.query(`
      SELECT 
        pvr.id, pvr.title, pvr.description, pvr.record_type, pvr.category,
        pvr.file_name, pvr.file_size, pvr.preview_kind,
        pvr.created_at, pvr.patient_id,
        u.first_name, u.last_name, u.email,
        vfs.shared_at, vfs.permission_level, vfs.access_revoked_at
      FROM patient_vault_records pvr
      JOIN vault_file_sharing vfs ON vfs.vault_record_id = pvr.id
      JOIN users u ON u.id = pvr.patient_id
      WHERE vfs.shared_with_dentist_name = $1
        AND vfs.access_revoked_at IS NULL
        AND vfs.permission_level = 'view'
      ORDER BY pvr.created_at DESC
    `, [dentistName]);

    // Log access for audit trail
    for (const file of result.rows) {
      await db.query(
        `INSERT INTO file_access_log (patient_id, dentist_id, file_id, accessed_at, action)
         VALUES ($1, $2, $3, NOW(), 'VIEW')`,
        [file.patient_id, req.user.id, file.id]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Vault access error:', err.message);
    res.status(500).json({ message: 'Failed to load vault records.' });
  }
});
```

---

### FIX #2: Validate Dentist Before Sharing

**File:** `dental-backend/index.js` (Line 862)

**Changes:**
1. Verify dentist exists in system
2. Verify patient owns the file
3. Verify patient has relationship with dentist (optional)
4. Log sharing action

**Code:**
```javascript
app.post('/patient-vault-records/:recordId/share', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Patient') {
    return res.status(403).json({ message: 'Only patients can share vault records.' });
  }

  const { dentist_name } = req.body;
  const recordId = req.params.recordId;

  try {
    // VERIFY: Dentist exists in system
    const dentistCheck = await db.query(
      `SELECT id, first_name, last_name FROM users 
       WHERE role = 'Dentist' AND (
         CONCAT(first_name, ' ', last_name) = $1 
         OR first_name = $1
       )`,
      [dentist_name.trim()]
    );

    if (dentistCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Dentist not found in system.' });
    }

    const dentistUserId = dentistCheck.rows[0].id;
    const fullDentistName = `${dentistCheck.rows[0].first_name} ${dentistCheck.rows[0].last_name}`;

    // VERIFY: Record belongs to this patient
    const recordCheck = await db.query(
      'SELECT id FROM patient_vault_records WHERE id = $1 AND patient_id = $2',
      [recordId, req.user.id]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ message: 'File not found or access denied.' });
    }

    // VERIFY: Patient has relationship with this dentist
    const relationshipCheck = await db.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE patient_id = $1 AND dentist_name = $2 AND status IN ('Approved', 'Completed')`,
      [req.user.id, fullDentistName]
    );

    if (relationshipCheck.rows[0].count === 0) {
      console.warn(`Patient ${req.user.id} sharing with unrelated dentist ${fullDentistName}`);
      // Allow but log warning
    }

    // Share the file
    const result = await db.query(
      `INSERT INTO vault_file_sharing 
         (vault_record_id, patient_id, shared_with_dentist_name, shared_with_user_id, permission_level, shared_at)
       VALUES ($1, $2, $3, $4, 'view', NOW())
       ON CONFLICT (vault_record_id, shared_with_dentist_name) 
       DO UPDATE SET access_revoked_at = NULL, shared_at = NOW()
       RETURNING id, vault_record_id, shared_with_dentist_name, shared_at`,
      [recordId, req.user.id, fullDentistName, dentistUserId]
    );

    // Log sharing action
    await db.query(
      `INSERT INTO file_access_log (patient_id, dentist_id, file_id, accessed_at, action)
       VALUES ($1, $2, $3, NOW(), 'SHARE')`,
      [req.user.id, dentistUserId, recordId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Share vault record error:', err.message);
    res.status(500).json({ message: 'Failed to share file.' });
  }
});
```

---

### FIX #3: Create Audit Log Table

**File:** PostgreSQL Database

**SQL:**
```sql
CREATE TABLE IF NOT EXISTS file_access_log (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dentist_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  file_id INTEGER NOT NULL REFERENCES patient_vault_records(id) ON DELETE CASCADE,
  accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  action VARCHAR(50) NOT NULL, -- 'VIEW', 'DOWNLOAD', 'SHARE', 'REVOKE'
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_access_log_patient ON file_access_log(patient_id);
CREATE INDEX idx_file_access_log_dentist ON file_access_log(dentist_id);
CREATE INDEX idx_file_access_log_file ON file_access_log(file_id);
CREATE INDEX idx_file_access_log_accessed ON file_access_log(accessed_at);
```

---

### FIX #4: Add File Download Permission Check

**File:** `dental-backend/index.js` (Find file download endpoint)

**Changes:**
1. Verify user has permission to download file
2. Log download action
3. Check if access has been revoked

---

## 🧪 TESTING CHECKLIST

### Test 1: Dentist Cannot Access Vault Without Auth
```
1. Call GET /dentist/vault-records without auth token
2. VERIFY: 401 Unauthorized ✅
```

### Test 2: Dentist Can Only See Own Shared Files
```
1. Login as Dentist A
2. Call GET /dentist/vault-records
3. VERIFY: Only files shared with Dentist A ✅
4. VERIFY: Cannot see files shared with Dentist B ✅
```

### Test 3: Patient Cannot Share with Non-Existent Dentist
```
1. Login as Patient
2. Try to share file with "Dr. Fake Name"
3. VERIFY: 404 Dentist not found ✅
```

### Test 4: Patient Cannot Share File They Don't Own
```
1. Login as Patient A
2. Try to share Patient B's file
3. VERIFY: 404 File not found or access denied ✅
```

### Test 5: Audit Trail Logs All Access
```
1. Patient shares file with Dentist
2. Dentist views file
3. Check file_access_log table
4. VERIFY: Both SHARE and VIEW actions logged ✅
```

---

## 📊 IMPLEMENTATION STEPS

1. **Create audit log table** (SQL)
2. **Fix dentist vault endpoint** (Add auth + validation)
3. **Fix file sharing endpoint** (Add dentist validation)
4. **Fix file download endpoint** (Add permission check)
5. **Restart backend**
6. **Run all 5 tests**
7. **Verify no console errors**

---

## 🎯 SUCCESS CRITERIA

✅ Dentist vault endpoint requires authentication  
✅ Dentist can only see files shared with them  
✅ Patient cannot share with non-existent dentist  
✅ Patient cannot share files they don't own  
✅ All file access is logged in audit trail  
✅ No unauthorized access possible  
✅ No console errors  

---

**Ready to implement Phase 2?** 🚀

