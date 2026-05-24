# Code Smiles - Database Migration Guide
## From Current Schema to Normalized Schema

---

## 📋 OVERVIEW

This guide provides step-by-step instructions to migrate from the current denormalized schema to the new normalized schema without data loss.

**Timeline**: 6 weeks
**Complexity**: Medium
**Risk Level**: Low (with proper backups)

---

## ⚠️ PRE-MIGRATION CHECKLIST

- [ ] Backup current database
- [ ] Review new schema design
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users of downtime
- [ ] Test migration on staging environment
- [ ] Prepare application code updates
- [ ] Have DBA review migration plan

---

## 🔄 MIGRATION PHASES

### PHASE 1: Preparation (Week 1)

#### Step 1.1: Backup Current Database
```bash
# Create full backup
pg_dump -U postgres -d dental_clinic > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
psql -U postgres -d dental_clinic < backup_20260524_120000.sql
```

#### Step 1.2: Create New Tables
```sql
-- Run the DATABASE_NORMALIZED_SCHEMA.sql file
psql -U postgres -d dental_clinic -f DATABASE_NORMALIZED_SCHEMA.sql
```

#### Step 1.3: Verify New Tables
```sql
-- Check all new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('services', 'dentists', 'patients', 'dentist_services', 
                   'bookings', 'booking_services', 'booking_audit_log', 'time_slots');

-- Should return 8 rows
```

---

### PHASE 2: Data Migration (Week 2-3)

#### Step 2.1: Migrate Services
```sql
-- Extract unique services from service_dentist_mapping
INSERT INTO services (service_name, category, duration_minutes, price, description)
SELECT DISTINCT 
  INITCAP(sdm.service_name) as service_name,
  sdm.service_category as category,
  45 as duration_minutes,  -- Default duration
  0 as price,  -- Will be updated manually
  NULL as description
FROM service_dentist_mapping sdm
WHERE NOT EXISTS (
  SELECT 1 FROM services s 
  WHERE LOWER(s.service_name) = LOWER(sdm.service_name)
)
ON CONFLICT (service_name) DO NOTHING;

-- Verify migration
SELECT COUNT(*) FROM services;  -- Should match unique services
```

#### Step 2.2: Migrate Dentists
```sql
-- Create dentist profiles from users with role='Admin'
INSERT INTO dentists (user_id, specialization, is_active)
SELECT 
  u.id,
  'General Dentistry' as specialization,  -- Default, update manually
  TRUE as is_active
FROM users u
WHERE u.role = 'Admin'
  AND NOT EXISTS (
    SELECT 1 FROM dentists d WHERE d.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Verify migration
SELECT COUNT(*) FROM dentists;  -- Should match number of dentists
```

#### Step 2.3: Migrate Patients
```sql
-- Create patient profiles from users with role='Patient'
INSERT INTO patients (user_id, is_active)
SELECT 
  u.id,
  TRUE as is_active
FROM users u
WHERE u.role = 'Patient'
  AND NOT EXISTS (
    SELECT 1 FROM patients p WHERE p.user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Verify migration
SELECT COUNT(*) FROM patients;  -- Should match number of patients
```

#### Step 2.4: Migrate Dentist-Service Mappings
```sql
-- Create dentist-service relationships
INSERT INTO dentist_services (dentist_id, service_id, is_primary, is_available)
SELECT 
  d.dentist_id,
  s.service_id,
  sdm.is_primary,
  sdm.is_active as is_available
FROM service_dentist_mapping sdm
JOIN dentists d ON sdm.dentist_id = d.dentist_id
JOIN services s ON LOWER(s.service_name) = LOWER(sdm.service_name)
WHERE NOT EXISTS (
  SELECT 1 FROM dentist_services ds 
  WHERE ds.dentist_id = d.dentist_id 
  AND ds.service_id = s.service_id
)
ON CONFLICT (dentist_id, service_id) DO NOTHING;

-- Verify migration
SELECT COUNT(*) FROM dentist_services;
```

#### Step 2.5: Migrate Single-Service Bookings
```sql
-- Migrate appointments to bookings + booking_services
BEGIN;

-- Create bookings from appointments
INSERT INTO bookings (
  booking_number, patient_id, booking_type, intake_priority, intake_source,
  service_count, total_duration_minutes, booking_status, patient_notes,
  created_by, created_at, updated_at
)
SELECT 
  'BK-' || TO_CHAR(a.created_at::DATE, 'YYYY-MM-DD') || '-' || 
  LPAD(ROW_NUMBER() OVER (PARTITION BY a.created_at::DATE ORDER BY a.id)::TEXT, 4, '0'),
  p.patient_id,
  'Patient' as booking_type,
  CASE a.urgency 
    WHEN 'Emergency' THEN 'Emergency'
    WHEN 'Urgent' THEN 'Urgent'
    ELSE 'Standard'
  END as intake_priority,
  'Online' as intake_source,
  1 as service_count,
  a.duration_minutes as total_duration_minutes,
  CASE a.status
    WHEN 'Pending' THEN 'Pending'
    WHEN 'Approved' THEN 'Approved'
    WHEN 'Completed' THEN 'Completed'
    WHEN 'Cancelled by Patient' THEN 'Cancelled'
    WHEN 'Cancelled by Staff' THEN 'Cancelled'
    WHEN 'Cancelled by Dentist' THEN 'Cancelled'
    ELSE 'Pending'
  END as booking_status,
  a.notes as patient_notes,
  NULL as created_by,
  a.created_at,
  a.updated_at
FROM appointments a
JOIN patients p ON a.patient_id = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.created_at = a.created_at 
  AND b.patient_id = p.patient_id
)
ON CONFLICT (booking_number) DO NOTHING;

-- Create booking_services from appointments
INSERT INTO booking_services (
  booking_id, service_id, dentist_id, service_sequence,
  appointment_date, appointment_start_time, appointment_end_time,
  service_status, confirmation_status, reminder_24h_sent, reminder_3h_sent,
  created_at, updated_at
)
SELECT 
  b.booking_id,
  s.service_id,
  d.dentist_id,
  1 as service_sequence,
  a.appointment_date,
  a.appointment_time,
  (a.appointment_time::TIME + (a.duration_minutes || ' minutes')::INTERVAL)::TIME,
  CASE a.status
    WHEN 'Pending' THEN 'Pending'
    WHEN 'Approved' THEN 'Approved'
    WHEN 'Completed' THEN 'Completed'
    WHEN 'No-show' THEN 'No-show'
    ELSE 'Pending'
  END as service_status,
  CASE a.confirmation_status
    WHEN 'Confirmed' THEN 'Confirmed'
    WHEN 'Reschedule Requested' THEN 'Reschedule Requested'
    ELSE 'Not Confirmed'
  END as confirmation_status,
  a.reminder_24h_sent,
  a.reminder_3h_sent,
  a.created_at,
  a.updated_at
FROM appointments a
JOIN patients p ON a.patient_id = p.user_id
JOIN bookings b ON b.patient_id = p.patient_id 
  AND b.created_at = a.created_at
JOIN services s ON LOWER(s.service_name) = LOWER(a.treatment)
JOIN dentists d ON a.dentist_id = d.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM booking_services bs 
  WHERE bs.booking_id = b.booking_id
)
ON CONFLICT (booking_id, service_sequence) DO NOTHING;

COMMIT;

-- Verify migration
SELECT COUNT(*) FROM bookings WHERE service_count = 1;
SELECT COUNT(*) FROM booking_services WHERE service_sequence = 1;
```

#### Step 2.6: Migrate Multi-Service Bookings
```sql
-- Migrate composite_bookings to bookings + booking_services
BEGIN;

-- Create bookings from composite_bookings
INSERT INTO bookings (
  booking_number, patient_id, booking_type, intake_priority, intake_source,
  service_count, total_duration_minutes, booking_status, patient_notes,
  staff_notes, created_by, created_at, updated_at
)
SELECT 
  'BK-' || SUBSTRING(cb.booking_id, 4),  -- Convert CB-... to BK-...
  p.patient_id,
  CASE cb.booking_type
    WHEN 'Walk-in' THEN 'Walk-in'
    WHEN 'Registered' THEN 'Registered'
    ELSE 'Patient'
  END as booking_type,
  cb.intake_priority,
  cb.intake_source,
  cb.service_count,
  cb.total_duration_minutes,
  CASE cb.overall_status
    WHEN 'Pending' THEN 'Pending'
    WHEN 'Approved' THEN 'Approved'
    WHEN 'Partially Approved' THEN 'Partially Approved'
    WHEN 'Completed' THEN 'Completed'
    WHEN 'Cancelled' THEN 'Cancelled'
    ELSE 'Pending'
  END as booking_status,
  cb.patient_notes,
  cb.staff_notes,
  cb.created_by,
  cb.created_at,
  cb.updated_at
FROM composite_bookings cb
JOIN patients p ON cb.patient_id = p.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.booking_number = 'BK-' || SUBSTRING(cb.booking_id, 4)
)
ON CONFLICT (booking_number) DO NOTHING;

-- Create booking_services from composite_booking_appointments
INSERT INTO booking_services (
  booking_id, service_id, dentist_id, service_sequence,
  appointment_date, appointment_start_time, appointment_end_time,
  service_status, confirmation_status, reminder_24h_sent, reminder_3h_sent,
  service_notes, created_at, updated_at
)
SELECT 
  b.booking_id,
  s.service_id,
  d.dentist_id,
  cba.appointment_sequence,
  cba.appointment_date,
  cba.appointment_time::TIME,
  cba.appointment_end_time::TIME,
  CASE cba.appointment_status
    WHEN 'Pending' THEN 'Pending'
    WHEN 'Approved' THEN 'Approved'
    WHEN 'Completed' THEN 'Completed'
    WHEN 'Cancelled' THEN 'Cancelled'
    ELSE 'Pending'
  END as service_status,
  CASE cba.confirmation_status
    WHEN 'Confirmed' THEN 'Confirmed'
    WHEN 'Reschedule Requested' THEN 'Reschedule Requested'
    ELSE 'Not Confirmed'
  END as confirmation_status,
  FALSE as reminder_24h_sent,
  FALSE as reminder_3h_sent,
  cba.cancellation_reason,
  cba.created_at,
  cba.updated_at
FROM composite_booking_appointments cba
JOIN composite_bookings cb ON cba.composite_booking_id = cb.id
JOIN bookings b ON b.booking_number = 'BK-' || SUBSTRING(cb.booking_id, 4)
JOIN services s ON LOWER(s.service_name) = LOWER(cba.service_name)
JOIN dentists d ON cba.dentist_id = d.dentist_id
WHERE NOT EXISTS (
  SELECT 1 FROM booking_services bs 
  WHERE bs.booking_id = b.booking_id 
  AND bs.service_sequence = cba.appointment_sequence
)
ON CONFLICT (booking_id, service_sequence) DO NOTHING;

COMMIT;

-- Verify migration
SELECT COUNT(*) FROM bookings WHERE service_count > 1;
SELECT COUNT(*) FROM booking_services WHERE service_sequence > 1;
```

#### Step 2.7: Migrate Audit Logs
```sql
-- Migrate composite_booking_audit_log to booking_audit_log
INSERT INTO booking_audit_log (booking_id, action, action_by, action_details, created_at)
SELECT 
  b.booking_id,
  cbal.action,
  cbal.action_by,
  cbal.action_details::JSONB,
  cbal.created_at
FROM composite_booking_audit_log cbal
JOIN composite_bookings cb ON cbal.composite_booking_id = cb.id
JOIN bookings b ON b.booking_number = 'BK-' || SUBSTRING(cb.booking_id, 4)
WHERE NOT EXISTS (
  SELECT 1 FROM booking_audit_log bal 
  WHERE bal.booking_id = b.booking_id 
  AND bal.created_at = cbal.created_at
)
ON CONFLICT DO NOTHING;

-- Verify migration
SELECT COUNT(*) FROM booking_audit_log;
```

---

### PHASE 3: Verification (Week 3)

#### Step 3.1: Data Integrity Checks
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM bookings WHERE patient_id NOT IN (SELECT patient_id FROM patients);
SELECT COUNT(*) FROM booking_services WHERE service_id NOT IN (SELECT service_id FROM services);
SELECT COUNT(*) FROM booking_services WHERE dentist_id NOT IN (SELECT dentist_id FROM dentists);

-- All should return 0

-- Check for duplicate bookings
SELECT booking_number, COUNT(*) FROM bookings GROUP BY booking_number HAVING COUNT(*) > 1;

-- Should return 0 rows

-- Check for missing booking_services
SELECT b.booking_id, b.service_count, COUNT(bs.booking_service_id) as actual_count
FROM bookings b
LEFT JOIN booking_services bs ON b.booking_id = bs.booking_id
GROUP BY b.booking_id, b.service_count
HAVING b.service_count != COUNT(bs.booking_service_id);

-- Should return 0 rows
```

#### Step 3.2: Data Completeness Checks
```sql
-- Verify all bookings have services
SELECT COUNT(*) FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM booking_services bs WHERE bs.booking_id = b.booking_id
);

-- Should return 0

-- Verify all services have dentists
SELECT COUNT(*) FROM booking_services bs
WHERE bs.dentist_id IS NULL;

-- Should return 0

-- Verify all dentists are active
SELECT COUNT(*) FROM dentists WHERE is_active = FALSE;

-- Review and update as needed
```

#### Step 3.3: Performance Checks
```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM bookings WHERE patient_id = 1;

EXPLAIN ANALYZE
SELECT * FROM booking_services WHERE dentist_id = 1 AND appointment_date = '2026-05-25';

-- Should use indexes efficiently
```

---

### PHASE 4: Application Updates (Week 4-5)

#### Step 4.1: Update API Endpoints

**Before (Old Schema)**:
```javascript
// Get bookings for patient
const result = await db.query(
  `SELECT * FROM appointments WHERE patient_id = $1`,
  [patientId]
);
```

**After (New Schema)**:
```javascript
// Get bookings for patient
const result = await db.query(
  `SELECT 
    b.booking_id, b.booking_number, b.booking_status,
    s.service_name, s.category, s.duration_minutes,
    u.first_name, u.last_name,
    bs.appointment_date, bs.appointment_start_time
  FROM bookings b
  JOIN booking_services bs ON b.booking_id = bs.booking_id
  JOIN services s ON bs.service_id = s.service_id
  JOIN dentists d ON bs.dentist_id = d.dentist_id
  JOIN users u ON d.user_id = u.id
  WHERE b.patient_id = (SELECT patient_id FROM patients WHERE user_id = $1)
  ORDER BY b.created_at DESC`,
  [userId]
);
```

#### Step 4.2: Update Conflict Detection

**Before (Old Schema)**:
```javascript
// Check for conflicts
const conflicts = await db.query(
  `SELECT * FROM appointments 
   WHERE dentist_id = $1 AND appointment_date = $2 AND status IN ('Pending', 'Approved')`
);
```

**After (New Schema)**:
```javascript
// Check for conflicts using function
const conflicts = await db.query(
  `SELECT * FROM check_appointment_conflict($1, $2, $3, $4)`
  [dentistId, appointmentDate, startTime, endTime]
);
```

#### Step 4.3: Update Booking Creation

**Before (Old Schema)**:
```javascript
// Create composite booking
const result = await db.query(
  `INSERT INTO composite_bookings (booking_id, patient_id, patient_name, ...)
   VALUES ($1, $2, $3, ...)`
);
```

**After (New Schema)**:
```javascript
// Create booking
const bookingNumber = await db.query(
  `SELECT generate_booking_number() as booking_number`
);

const result = await db.query(
  `INSERT INTO bookings (booking_number, patient_id, booking_type, ...)
   VALUES ($1, $2, $3, ...)
   RETURNING booking_id`
);

// Create booking services
for (const service of services) {
  await db.query(
    `INSERT INTO booking_services (booking_id, service_id, dentist_id, ...)
     VALUES ($1, $2, $3, ...)`
  );
}
```

---

### PHASE 5: Testing & QA (Week 5)

#### Step 5.1: Unit Tests
```javascript
// Test booking creation
test('Create single-service booking', async () => {
  const booking = await createBooking({
    patientId: 1,
    services: [{ serviceId: 1, dentistId: 1, date: '2026-05-25', time: '09:00' }]
  });
  expect(booking.bookingNumber).toBeDefined();
  expect(booking.serviceCount).toBe(1);
});

// Test multi-service booking
test('Create multi-service booking', async () => {
  const booking = await createBooking({
    patientId: 1,
    services: [
      { serviceId: 1, dentistId: 1, date: '2026-05-25', time: '09:00' },
      { serviceId: 2, dentistId: 2, date: '2026-05-25', time: '10:00' }
    ]
  });
  expect(booking.serviceCount).toBe(2);
});

// Test conflict detection
test('Prevent overlapping appointments', async () => {
  await expect(createBooking({
    patientId: 1,
    services: [
      { serviceId: 1, dentistId: 1, date: '2026-05-25', time: '09:00' },
      { serviceId: 2, dentistId: 1, date: '2026-05-25', time: '09:30' }
    ]
  })).rejects.toThrow('Scheduling conflict');
});
```

#### Step 5.2: Integration Tests
```javascript
// Test complete booking workflow
test('Complete booking workflow', async () => {
  // Create booking
  const booking = await createBooking(...);
  
  // Verify in database
  const dbBooking = await getBooking(booking.bookingId);
  expect(dbBooking.bookingStatus).toBe('Pending');
  
  // Approve booking
  await approveBooking(booking.bookingId);
  
  // Verify status updated
  const updatedBooking = await getBooking(booking.bookingId);
  expect(updatedBooking.bookingStatus).toBe('Approved');
});
```

#### Step 5.3: Performance Tests
```javascript
// Test query performance
test('Query performance', async () => {
  const start = Date.now();
  
  // Get all bookings for patient
  const bookings = await getPatientBookings(1);
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(100); // Should complete in < 100ms
});
```

---

### PHASE 6: Deployment (Week 6)

#### Step 6.1: Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Rollback plan ready
- [ ] Backup created
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Monitoring configured

#### Step 6.2: Deployment Steps
```bash
# 1. Stop application
systemctl stop dental-clinic-api

# 2. Create final backup
pg_dump -U postgres -d dental_clinic > backup_final_$(date +%Y%m%d_%H%M%S).sql

# 3. Run migration
psql -U postgres -d dental_clinic -f migration_script.sql

# 4. Verify migration
psql -U postgres -d dental_clinic -f verification_script.sql

# 5. Deploy new application code
git pull origin main
npm install
npm run build

# 6. Start application
systemctl start dental-clinic-api

# 7. Monitor logs
tail -f /var/log/dental-clinic-api.log
```

#### Step 6.3: Post-Deployment Monitoring
```bash
# Monitor application logs
tail -f /var/log/dental-clinic-api.log

# Monitor database performance
psql -U postgres -d dental_clinic -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor error rates
curl http://localhost:3000/health
```

---

## 🔙 ROLLBACK PLAN

If issues occur during migration:

```bash
# 1. Stop application
systemctl stop dental-clinic-api

# 2. Restore from backup
psql -U postgres -d dental_clinic < backup_final_20260524_120000.sql

# 3. Revert application code
git checkout previous-version
npm install
npm run build

# 4. Start application
systemctl start dental-clinic-api

# 5. Notify team
# Send notification about rollback
```

---

## 📊 MIGRATION CHECKLIST

### Pre-Migration
- [ ] Database backed up
- [ ] New schema reviewed
- [ ] Rollback plan prepared
- [ ] Team notified
- [ ] Maintenance window scheduled

### During Migration
- [ ] New tables created
- [ ] Services migrated
- [ ] Dentists migrated
- [ ] Patients migrated
- [ ] Bookings migrated
- [ ] Data verified
- [ ] Indexes created
- [ ] Performance tested

### Post-Migration
- [ ] Application code updated
- [ ] Tests passing
- [ ] Performance acceptable
- [ ] Monitoring active
- [ ] Team trained
- [ ] Documentation updated
- [ ] Old tables archived

---

## 📞 SUPPORT

If you encounter issues during migration:

1. **Check logs**: Review application and database logs
2. **Verify data**: Run integrity checks
3. **Contact DBA**: Reach out to database administrator
4. **Rollback if needed**: Follow rollback plan

---

**Document Created**: May 24, 2026
**Status**: Ready for Implementation
**Estimated Duration**: 6 weeks
