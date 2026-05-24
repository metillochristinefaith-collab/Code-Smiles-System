# Code Smiles - Quick Start Guide for Defense
## May 25, 2026

---

## 🚀 START THE SYSTEM (5 minutes)

### Step 1: Start PostgreSQL Database
```bash
# Windows - PostgreSQL should auto-start
# Or manually start from Services
# Verify: Open PgAdmin4 → should connect without errors
```

### Step 2: Start Backend Server
```bash
cd "c:\Users\Admin\OneDrive\Desktop\Code Smiles\dental-backend"
node index.js
```

**Expected Output:**
```
✓ injected env from .env
✓ Connected to PostgreSQL!
✓ Database migrations complete
Server running at http://localhost:3000
✓ All jobs running
```

### Step 3: Start Frontend Development Server
```bash
cd "c:\Users\Admin\OneDrive\Desktop\Code Smiles\dental-frontend"
ng serve
```

**Expected Output:**
```
✓ Application bundle generation complete
✓ Watch mode enabled
➜ Local: http://localhost:4200/
```

### Step 4: Open in Browser
```
http://localhost:4200/
```

---

## 🧪 QUICK TEST SCENARIOS (10 minutes)

### Test 1: Single Service Booking (Patient)
1. Click "Patient Booking"
2. Select "General Dentistry" → "Dental Cleaning"
3. Click a date on calendar
4. Select a time slot
5. Enter name, email, phone
6. Click "Submit Booking"
7. ✅ Should see success message

### Test 2: Multi-Service Booking (Patient)
1. Click "Patient Booking"
2. Select "General Dentistry" → "Dental Cleaning" (45 min)
3. Click "Add Another Service"
4. Select "Cosmetic Arts" → "Teeth Whitening" (60 min)
5. Total shows 105 minutes ✅
6. Select dates/times for each
7. Enter patient details
8. Click "Submit Booking"
9. ✅ Should see success message

### Test 3: Staff Booking (Walk-in)
1. Click "Staff Booking"
2. Select "Walk-in" booking type
3. Enter patient name, phone, email
4. Select "General Dentistry" → "Dental Cleaning"
5. Select date and time
6. Click "Submit Booking"
7. ✅ Should see success message

### Test 4: Double-Booking Prevention
1. Create first booking: "Dental Cleaning" on 2026-05-25 at 09:00
2. Try to create second booking: "Teeth Whitening" on 2026-05-25 at 09:30
3. ✅ Should see error: "Scheduling conflict detected"

---

## 📊 VERIFY DATABASE (5 minutes)

### Open PgAdmin4
1. Open browser → `http://localhost:5432` (or your PgAdmin URL)
2. Login with your credentials
3. Navigate to: Servers → PostgreSQL → Databases → `dental_clinic`

### Check Tables
```sql
-- Single service bookings
SELECT COUNT(*) FROM appointments;

-- Multi-service bookings
SELECT COUNT(*) FROM composite_bookings;

-- Individual services in multi-service bookings
SELECT COUNT(*) FROM composite_booking_appointments;

-- Service to dentist mappings
SELECT COUNT(*) FROM service_dentist_mapping;
```

### View Recent Bookings
```sql
-- Last 5 composite bookings
SELECT booking_id, patient_name, service_count, overall_status, created_at
FROM composite_bookings
ORDER BY created_at DESC
LIMIT 5;

-- Appointments for a booking
SELECT appointment_id, service_name, appointment_date, appointment_time, dentist_name
FROM composite_booking_appointments
WHERE booking_id = 'CB-2026-05-24-0001'
ORDER BY appointment_sequence;
```

---

## 🔍 TROUBLESHOOTING (Quick Fixes)

### Backend Won't Start
```
Error: Cannot find module 'pg'
Fix: cd dental-backend && npm install
```

### Frontend Won't Build
```
Error: ng: command not found
Fix: npm install -g @angular/cli
```

### Time Slots Not Loading
```
Check: Browser console (F12) for errors
Fix: Verify backend is running on port 3000
```

### Booking Fails
```
Check: Backend logs for error message
Fix: Verify patient details are complete
Fix: Verify date is not in past or Sunday
```

### Database Connection Error
```
Check: PostgreSQL is running
Fix: Verify connection string in .env
Fix: Verify database exists
```

---

## 📧 CHECK EMAIL NOTIFICATIONS

### Ethereal Test Account (Development)
1. After creating a booking, check console output
2. Look for: `View at: https://ethereal.email/messages`
3. Click link to see sent emails
4. Verify appointment details are correct

### Email Contents to Verify
- ✅ Patient name
- ✅ Service name
- ✅ Appointment date
- ✅ Appointment time
- ✅ Dentist name
- ✅ Status (Pending/Confirmed)

---

## 🎯 DEFENSE DEMO FLOW (15 minutes)

### Part 1: Show Single Service Booking (3 min)
1. Open Patient Booking
2. Select service
3. Select date/time
4. Submit
5. Show confirmation

### Part 2: Show Multi-Service Booking (5 min)
1. Open Patient Booking
2. Select 2-3 services
3. Show duration validation (max 120 min)
4. Select dates/times for each
5. Submit
6. Show confirmation with all services

### Part 3: Show Double-Booking Prevention (3 min)
1. Try to book overlapping times
2. Show error message
3. Explain conflict detection logic

### Part 4: Show Database (4 min)
1. Open PgAdmin4
2. Show composite_bookings table
3. Show composite_booking_appointments table
4. Show how appointments are linked via booking_id
5. Explain table relationships

---

## 📋 CHECKLIST BEFORE DEFENSE

- [ ] PostgreSQL is running
- [ ] Backend server started (port 3000)
- [ ] Frontend server started (port 4200)
- [ ] Browser can access http://localhost:4200
- [ ] Can create single service booking
- [ ] Can create multi-service booking
- [ ] Double-booking prevention works
- [ ] Email notifications are sent
- [ ] Database records are created correctly
- [ ] All 6 service categories available
- [ ] Time slots load correctly
- [ ] Calendar displays correctly
- [ ] Responsive design works on mobile

---

## 🎓 KEY POINTS TO EXPLAIN

### Architecture
- **Single Service**: Stored in `appointments` table
- **Multi-Service**: Stored in `composite_bookings` + `composite_booking_appointments` tables
- **Linking**: All appointments in multi-service booking linked via `booking_id`

### Validation
- **Duration**: Max 120 minutes total for multi-service
- **Services**: Max 3 services per booking
- **Conflicts**: Prevents overlapping appointments for same dentist
- **Buffer**: 10-minute buffer between appointments

### Database Design
- **Normalized**: Separate tables for different booking types
- **Relationships**: Proper foreign keys and constraints
- **Audit Trail**: All changes logged in audit table
- **Transactions**: SERIALIZABLE isolation to prevent race conditions

### Features
- **Automatic Dentist Assignment**: Based on service-dentist mapping
- **Email Notifications**: Confirmation emails for all bookings
- **Responsive Design**: Works on mobile, tablet, desktop
- **Rate Limiting**: Prevents API abuse
- **Security**: JWT authentication, password hashing

---

## 💡 TIPS FOR SMOOTH DEMO

1. **Pre-create some bookings** before defense so you have data to show
2. **Have PgAdmin4 open** in another tab for quick database verification
3. **Keep browser console open** (F12) to show API calls
4. **Test on mobile** to show responsive design
5. **Have talking points ready** for each feature
6. **Know the error messages** - they help explain validation
7. **Be ready to explain** why multi-service needs separate appointments

---

## 🆘 EMERGENCY CONTACTS

### If System Crashes
1. Stop backend (Ctrl+C)
2. Stop frontend (Ctrl+C)
3. Restart both servers
4. Refresh browser (Ctrl+F5)

### If Database Corrupts
1. Stop backend
2. Restore from backup (if available)
3. Or recreate tables by restarting backend

### If You Get Stuck
1. Check browser console (F12) for errors
2. Check backend logs for error messages
3. Verify all services are running
4. Try restarting everything

---

## ✨ YOU'VE GOT THIS!

The system is fully functional and ready for defense. All features have been tested and verified. Just follow the quick start guide and you'll be good to go.

**Good luck with your defense! 🎓**

---

**Last Updated**: May 24, 2026
**System Status**: ✅ Ready
**Defense Date**: May 25, 2026
