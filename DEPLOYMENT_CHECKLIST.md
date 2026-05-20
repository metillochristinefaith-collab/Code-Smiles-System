# Deployment Checklist - Dynamic Slot Management

## Pre-Deployment

- [ ] **Backup Database**
  ```bash
  pg_dump code_smiles_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
  Location: Save backup file to safe location

- [ ] **Review Changes**
  - [ ] Read `CHANGES_SUMMARY.md`
  - [ ] Review `slot-manager.js`
  - [ ] Review changes to `scheduling-api.js`
  - [ ] Review changes to `init-db.js`

- [ ] **Verify Environment**
  - [ ] PostgreSQL is running
  - [ ] Database connection works
  - [ ] Node.js version is compatible (v14+)
  - [ ] npm dependencies are installed

---

## Deployment Steps

### Step 1: Copy New Files

- [ ] Copy `slot-manager.js` to `dental-backend/`
- [ ] Copy `migrate-time-slots.js` to `dental-backend/`
- [ ] Copy `check-slots.js` to `dental-backend/`

**Verify:**
```bash
ls -la dental-backend/slot-manager.js
ls -la dental-backend/migrate-time-slots.js
ls -la dental-backend/check-slots.js
```

### Step 2: Update Existing Files

- [ ] Update `scheduling-api.js`
  - [ ] Add `const SlotManager = require('./slot-manager');` at line 8
  - [ ] Update `/available-times` endpoint
  - [ ] Update `/book` endpoint
  - [ ] Update `/booking/:id` DELETE endpoint

- [ ] Update `init-db.js`
  - [ ] Add `time_slots` table schema

**Verify:**
```bash
grep -n "SlotManager" dental-backend/scheduling-api.js
grep -n "time_slots" dental-backend/init-db.js
```

### Step 3: Run Migration

```bash
cd dental-backend
node migrate-time-slots.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════
  MIGRATION COMPLETE ✓
═══════════════════════════════════════════════════════════

Slot Statistics:
  Total time slots:    XX
  Total capacity:      XXX appointments
  Currently booked:    XX appointments
  Currently available: XXX slots

Slots will now:
  ✓ PERSIST (never deleted)
  ✓ DECREASE when appointments are booked
  ✓ INCREASE when appointments are cancelled
  ✓ TRACK max 4 slots per time slot
```

- [ ] Migration completed successfully
- [ ] No errors in output
- [ ] Slot statistics look reasonable

### Step 4: Verify Setup

```bash
node check-slots.js
```

**Expected Output:**
```
📊 All Time Slots:

  Date       | Slots | Capacity | Booked | Available
  -----------|-------|----------|--------|----------
  2026-05-25 |  24   |    96    |   XX   |    XX
```

- [ ] Slots are displayed
- [ ] Capacity matches (slots × 4)
- [ ] Booked + Available = Capacity

### Step 5: Restart Backend Server

```bash
# Stop current server (Ctrl+C or kill process)
# Then restart
npm start
# or
node index.js
```

- [ ] Server starts without errors
- [ ] No connection errors
- [ ] API endpoints are accessible

---

## Testing

### Test 1: Check Available Times

```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-05-25"
```

**Verify:**
- [ ] Response includes `slotsLeft`, `slotsBooked`, `slotsTotal`
- [ ] All values are numbers (0-4)
- [ ] Response is valid JSON

### Test 2: Book an Appointment

```bash
curl -X POST http://localhost:3000/api/scheduling/book \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": "D1",
    "date": "2026-05-25",
    "start_time": "09:00",
    "service": "Dental Cleaning",
    "patient_name": "Test Patient",
    "phone": "555-1234",
    "email": "test@example.com"
  }'
```

**Verify:**
- [ ] Appointment is created
- [ ] Response includes booking ID
- [ ] No errors

### Test 3: Check Slots After Booking

```bash
node check-slots.js 2026-05-25
```

**Verify:**
- [ ] Slot for 09:00 shows decreased availability
- [ ] `slotsBooked` increased by 1
- [ ] `slotsAvailable` decreased by 1

### Test 4: Cancel Appointment

```bash
curl -X DELETE http://localhost:3000/api/scheduling/booking/BOOK_<id>
```

**Verify:**
- [ ] Appointment is cancelled
- [ ] Response indicates success
- [ ] No errors

### Test 5: Check Slots After Cancellation

```bash
node check-slots.js 2026-05-25
```

**Verify:**
- [ ] Slot for 09:00 shows increased availability
- [ ] `slotsBooked` decreased by 1
- [ ] `slotsAvailable` increased by 1

### Test 6: Multiple Bookings

- [ ] Book 4 appointments for same time
- [ ] Verify slots decrease to 0
- [ ] Try to book 5th appointment (should fail or show 0 slots)
- [ ] Cancel one appointment
- [ ] Verify slots increase to 1

### Test 7: API Response Format

```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-05-25" | jq
```

**Verify:**
- [ ] Response includes all required fields
- [ ] `time` field is in 12-hour format
- [ ] `time24` field is in 24-hour format
- [ ] `slotsLeft`, `slotsBooked`, `slotsTotal` are present

---

## Post-Deployment

### Monitoring

- [ ] Check server logs for errors
- [ ] Monitor database performance
- [ ] Watch for slot update messages in logs
  - Example: `[SlotManager] ✓ Slot decreased: 2026-05-25 09:00 | Available: 3/4`

### Verification Commands

```bash
# View all slots
node check-slots.js

# View slots for specific date
node check-slots.js 2026-05-25

# Check database directly
psql code_smiles_db -c "SELECT * FROM time_slots LIMIT 10;"

# Check appointment count
psql code_smiles_db -c "SELECT COUNT(*) FROM appointments;"

# Check slot count
psql code_smiles_db -c "SELECT COUNT(*) FROM time_slots;"
```

- [ ] All commands execute successfully
- [ ] Data looks correct

### Documentation

- [ ] Copy documentation files to accessible location
- [ ] Share with team:
  - [ ] `README_SLOTS.md` - Overview
  - [ ] `SETUP_SLOTS.md` - Setup guide
  - [ ] `SLOTS_QUICK_REFERENCE.md` - Quick reference
  - [ ] `SLOT_MANAGEMENT.md` - Full documentation

---

## Rollback Plan

If issues occur, follow these steps:

### Step 1: Stop Server

```bash
# Stop the backend server
Ctrl+C
```

### Step 2: Restore Database (if needed)

```bash
psql code_smiles_db < backup_YYYYMMDD_HHMMSS.sql
```

### Step 3: Revert Code Changes

- [ ] Restore original `scheduling-api.js`
- [ ] Restore original `init-db.js`
- [ ] Remove `slot-manager.js`
- [ ] Remove `migrate-time-slots.js`
- [ ] Remove `check-slots.js`

### Step 4: Restart Server

```bash
npm start
```

### Step 5: Verify

```bash
curl "http://localhost:3000/api/scheduling/available-times?date=2026-05-25"
```

---

## Troubleshooting

### Issue: Migration Fails

**Solution:**
1. Check database connection
2. Verify PostgreSQL is running
3. Check `.env` file for correct credentials
4. Try again: `node migrate-time-slots.js`

### Issue: Slots Not Updating

**Solution:**
1. Verify `slot-manager.js` is imported in `scheduling-api.js`
2. Check server logs for errors
3. Restart server
4. Test again

### Issue: Slots Out of Sync

**Solution:**
```bash
node check-slots.js recalc-all
```

### Issue: Table Already Exists

**Solution:**
- This is normal if running migration twice
- Migration uses `CREATE TABLE IF NOT EXISTS`
- No data will be lost

### Issue: Permission Denied

**Solution:**
1. Check file permissions
2. Ensure user has read/write access
3. Try: `chmod +x *.js`

---

## Sign-Off

- [ ] All tests passed
- [ ] No errors in logs
- [ ] Slots are updating correctly
- [ ] API responses are correct
- [ ] Documentation is shared
- [ ] Team is notified

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________

---

## Post-Deployment Monitoring (First 24 Hours)

- [ ] Monitor server logs
- [ ] Check for slot update messages
- [ ] Verify bookings are working
- [ ] Verify cancellations are working
- [ ] Check database performance
- [ ] Monitor error rates

**Issues Found:** _______________

**Resolution:** _______________

---

## Success Criteria

✅ Migration completes without errors  
✅ Slots are created in database  
✅ Available times API returns slot data  
✅ Booking decreases slots  
✅ Cancellation increases slots  
✅ No errors in server logs  
✅ Database performance is acceptable  
✅ Team is trained on new system  

---

## Notes

- Slots are persistent (never deleted)
- Slots automatically update on booking/cancellation
- Max 4 slots per time slot
- Can recalculate slots if needed
- Backward compatible with existing code

---

## Contact

For issues or questions:
- Check `SLOT_MANAGEMENT.md` for technical details
- Check `SETUP_SLOTS.md` for setup help
- Check `SLOTS_QUICK_REFERENCE.md` for quick commands
- Review `SYSTEM_ARCHITECTURE.md` for architecture details
