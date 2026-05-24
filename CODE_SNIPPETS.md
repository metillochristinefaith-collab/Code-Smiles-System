# 🦷 Code Smiles - Code Snippets & Examples

## 📍 Quick Navigation

- [Frontend Components](#frontend-components)
- [Backend API Endpoints](#backend-api-endpoints)
- [Services](#services)
- [Database Queries](#database-queries)
- [Authentication](#authentication)
- [Booking Logic](#booking-logic)

---

## Frontend Components

### Patient Booking Component
**File:** `dental-frontend/src/app/patient-booking/patient-booking.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { BookingService } from '../services/booking.service';
import { DentistService } from '../services/dentist.service';

@Component({
  selector: 'app-patient-booking',
  templateUrl: './patient-booking.html',
  styleUrls: ['./patient-booking.css']
})
export class PatientBookingComponent implements OnInit {
  dentists: any[] = [];
  selectedDentist: any;
  selectedDate: Date;
  selectedTime: string;
  services: any[] = [];
  availableSlots: any[] = [];

  constructor(
    private bookingService: BookingService,
    private dentistService: DentistService
  ) {}

  ngOnInit() {
    this.loadDentists();
    this.loadServices();
  }

  loadDentists() {
    this.dentistService.getDentists().subscribe(
      (dentists) => {
        this.dentists = dentists;
      },
      (error) => console.error('Error loading dentists:', error)
    );
  }

  loadServices() {
    this.bookingService.getServices().subscribe(
      (services) => {
        this.services = services;
      },
      (error) => console.error('Error loading services:', error)
    );
  }

  onDentistSelected(dentist: any) {
    this.selectedDentist = dentist;
    this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    this.bookingService.getAvailableSlots(
      this.selectedDentist.id,
      this.selectedDate
    ).subscribe(
      (slots) => {
        this.availableSlots = slots;
      },
      (error) => console.error('Error loading slots:', error)
    );
  }

  submitBooking() {
    const bookingData = {
      dentist_id: this.selectedDentist.id,
      appointment_date: this.selectedDate,
      appointment_time: this.selectedTime,
      services: this.services.filter(s => s.selected),
      booking_type: 'patient'
    };

    this.bookingService.createBooking(bookingData).subscribe(
      (response) => {
        console.log('Booking created:', response);
        alert('Booking confirmed! Check your email for details.');
      },
      (error) => console.error('Error creating booking:', error)
    );
  }
}
```

### Dentist Calendar Component
**File:** `dental-frontend/src/app/dentist-calendar/dentist-calendar.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { AppointmentService } from '../services/appointment.service';

@Component({
  selector: 'app-dentist-calendar',
  templateUrl: './dentist-calendar.html',
  styleUrls: ['./dentist-calendar.css']
})
export class DentistCalendarComponent implements OnInit {
  currentMonth: Date = new Date();
  appointments: any[] = [];
  calendarDays: any[] = [];

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit() {
    this.generateCalendar();
    this.loadAppointments();
  }

  generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    this.calendarDays = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
      this.calendarDays.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      this.calendarDays.push(new Date(year, month, day));
    }
  }

  loadAppointments() {
    this.appointmentService.getAppointments().subscribe(
      (appointments) => {
        this.appointments = appointments;
      },
      (error) => console.error('Error loading appointments:', error)
    );
  }

  getAppointmentsForDate(date: Date): any[] {
    if (!date) return [];
    return this.appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate.toDateString() === date.toDateString();
    });
  }

  previousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1
    );
    this.generateCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1
    );
    this.generateCalendar();
  }
}
```

---

## Backend API Endpoints

### Authentication Endpoints
**File:** `dental-backend/index.js`

```javascript
// ── REGISTRATION ──────────────────────────────────────────────────────────
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Insert user
    const result = await db.query(
      `INSERT INTO users 
       (first_name, last_name, email, password, role, verification_token, 
        verification_token_expires_at, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       RETURNING id, email, role`,
      [first_name, last_name, email, hashedPassword, role, 
       verificationToken, tokenExpiry]
    );

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail(email, first_name, verificationToken);

    res.status(201).json({
      message: 'Registration successful. Check your email to verify.',
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// ── LOGIN ──────────────────────────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, password, role, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if verified
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Please verify your email first' });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});
```

### Booking Endpoints
**File:** `dental-backend/index.js`

```javascript
// ── CREATE BOOKING ────────────────────────────────────────────────────────
app.post('/api/bookings', bookingLimiter, authMiddleware, async (req, res) => {
  try {
    const { dentist_id, appointment_date, appointment_time, services, notes } = req.body;
    const patient_id = req.user.id;

    // Validate input
    if (!dentist_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check slot availability
    const slotManager = new SlotManager(db);
    const isAvailable = await slotManager.checkAvailability(
      dentist_id,
      appointment_date,
      appointment_time
    );

    if (!isAvailable) {
      return res.status(409).json({ message: 'Slot not available' });
    }

    // Create composite booking
    const bookingId = `BK-${Date.now()}`;
    const bookingResult = await db.query(
      `INSERT INTO composite_bookings 
       (booking_id, patient_id, booking_type, overall_status, created_at)
       VALUES ($1, $2, 'patient', 'confirmed', NOW())
       RETURNING id`,
      [bookingId, patient_id]
    );

    const compositeBookingId = bookingResult.rows[0].id;

    // Create appointment
    const appointmentId = `APT-${Date.now()}`;
    await db.query(
      `INSERT INTO composite_booking_appointments
       (composite_booking_id, appointment_id, dentist_id, appointment_date, 
        appointment_time, appointment_status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'confirmed', NOW())`,
      [compositeBookingId, appointmentId, dentist_id, appointment_date, appointment_time]
    );

    // Send confirmation email
    const userResult = await db.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [patient_id]
    );
    const user = userResult.rows[0];

    await sendAppointmentConfirmationEmail(user.email, user.first_name, {
      date: appointment_date,
      time: appointment_time,
      bookingId
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: { id: compositeBookingId, booking_id: bookingId }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Booking failed' });
  }
});

// ── GET AVAILABLE SLOTS ────────────────────────────────────────────────────
app.get('/api/slots', async (req, res) => {
  try {
    const { dentist_id, date } = req.query;

    if (!dentist_id || !date) {
      return res.status(400).json({ message: 'Missing dentist_id or date' });
    }

    const slotManager = new SlotManager(db);
    const slots = await slotManager.getAvailableSlots(dentist_id, date);

    res.json({ slots });
  } catch (error) {
    console.error('Slots error:', error);
    res.status(500).json({ message: 'Failed to fetch slots' });
  }
});
```

### Appointment Endpoints
**File:** `dental-backend/index.js`

```javascript
// ── GET APPOINTMENTS ──────────────────────────────────────────────────────
app.get('/api/appointments', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query;
    let params;

    if (role === 'patient') {
      query = `
        SELECT a.* FROM composite_booking_appointments a
        JOIN composite_bookings b ON a.composite_booking_id = b.id
        WHERE b.patient_id = $1
        ORDER BY a.appointment_date DESC
      `;
      params = [userId];
    } else if (role === 'dentist') {
      query = `
        SELECT a.* FROM composite_booking_appointments a
        WHERE a.dentist_id = $1
        ORDER BY a.appointment_date DESC
      `;
      params = [userId];
    }

    const result = await db.query(query, params);
    res.json({ appointments: result.rows });
  } catch (error) {
    console.error('Appointments error:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// ── CANCEL APPOINTMENT ────────────────────────────────────────────────────
app.delete('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const userId = req.user.id;

    // Update appointment status
    await db.query(
      `UPDATE composite_booking_appointments 
       SET appointment_status = 'cancelled' 
       WHERE id = $1`,
      [appointmentId]
    );

    // Send cancellation email
    const aptResult = await db.query(
      'SELECT * FROM composite_booking_appointments WHERE id = $1',
      [appointmentId]
    );
    const appointment = aptResult.rows[0];

    const userResult = await db.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    await sendAppointmentCancellationEmail(user.email, user.first_name, appointment);

    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ message: 'Failed to cancel appointment' });
  }
});
```

---

## Services

### Booking Service
**File:** `dental-frontend/src/app/services/booking.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  createBooking(bookingData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/bookings`, bookingData);
  }

  getBookings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/bookings`);
  }

  getBooking(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/bookings/${id}`);
  }

  updateBooking(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/bookings/${id}`, data);
  }

  cancelBooking(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bookings/${id}`);
  }

  getAvailableSlots(dentistId: number, date: Date): Observable<any> {
    return this.http.get(`${this.apiUrl}/slots`, {
      params: {
        dentist_id: dentistId.toString(),
        date: date.toISOString().split('T')[0]
      }
    });
  }

  getServices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/services`);
  }
}
```

### Authentication Service
**File:** `dental-frontend/src/app/services/auth.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentUser();
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  loadCurrentUser() {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
```

---

## Database Queries

### Check Slot Availability
**File:** `dental-backend/slot-manager.js`

```javascript
async checkAvailability(dentistId, date, time) {
  try {
    // Get dentist's working hours
    const dentistResult = await this.db.query(
      'SELECT start_time, end_time FROM dentist WHERE dentist_id = $1',
      [dentistId]
    );

    if (dentistResult.rows.length === 0) {
      throw new Error('Dentist not found');
    }

    const dentist = dentistResult.rows[0];

    // Check if time is within working hours
    if (time < dentist.start_time || time > dentist.end_time) {
      return false;
    }

    // Check for existing appointments
    const appointmentResult = await this.db.query(
      `SELECT COUNT(*) as count FROM composite_booking_appointments
       WHERE dentist_id = $1 
       AND appointment_date = $2 
       AND appointment_time = $3
       AND appointment_status != 'cancelled'`,
      [dentistId, date, time]
    );

    const count = parseInt(appointmentResult.rows[0].count);
    return count === 0; // Available if no conflicts
  } catch (error) {
    console.error('Availability check error:', error);
    return false;
  }
}
```

### Get Patient Appointments
**File:** `dental-backend/index.js`

```javascript
async getPatientAppointments(patientId) {
  const query = `
    SELECT 
      a.id,
      a.appointment_id,
      a.appointment_date,
      a.appointment_time,
      a.appointment_status,
      a.confirmation_status,
      d.first_name as dentist_first_name,
      d.last_name as dentist_last_name,
      d.specialization,
      b.patient_notes
    FROM composite_booking_appointments a
    JOIN composite_bookings b ON a.composite_booking_id = b.id
    JOIN dentist d ON a.dentist_id = d.dentist_id
    WHERE b.patient_id = $1
    ORDER BY a.appointment_date DESC
  `;

  const result = await db.query(query, [patientId]);
  return result.rows;
}
```

---

## Authentication

### JWT Middleware
**File:** `dental-backend/index.js`

```javascript
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

### Auth Interceptor
**File:** `dental-frontend/src/app/interceptors/auth.interceptor.ts`

```typescript
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }
}
```

---

## Booking Logic

### Create Composite Booking
**File:** `dental-backend/scheduling-engine.js`

```javascript
async createCompositeBooking(patientId, bookingData) {
  try {
    // Start transaction
    await this.db.query('BEGIN');

    // Create composite booking
    const bookingId = `BK-${Date.now()}`;
    const bookingResult = await this.db.query(
      `INSERT INTO composite_bookings 
       (booking_id, patient_id, booking_type, intake_priority, 
        service_count, total_duration_minutes, overall_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())
       RETURNING id`,
      [bookingId, patientId, bookingData.booking_type, 
       bookingData.intake_priority, bookingData.services.length,
       bookingData.total_duration]
    );

    const compositeBookingId = bookingResult.rows[0].id;

    // Create appointments for each service
    for (const service of bookingData.services) {
      const appointmentId = `APT-${Date.now()}-${Math.random()}`;
      
      await this.db.query(
        `INSERT INTO composite_booking_appointments
         (composite_booking_id, appointment_id, dentist_id, 
          appointment_date, appointment_time, service_name,
          appointment_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())`,
        [compositeBookingId, appointmentId, service.dentist_id,
         service.date, service.time, service.name]
      );
    }

    // Commit transaction
    await this.db.query('COMMIT');

    return { id: compositeBookingId, booking_id: bookingId };
  } catch (error) {
    await this.db.query('ROLLBACK');
    throw error;
  }
}
```

---

## 📁 File Locations

| Component | Location |
|-----------|----------|
| Patient Booking | `dental-frontend/src/app/patient-booking/` |
| Dentist Calendar | `dental-frontend/src/app/dentist-calendar/` |
| Staff Booking | `dental-frontend/src/app/staff-booking/` |
| Auth Service | `dental-frontend/src/app/services/auth.service.ts` |
| Booking Service | `dental-frontend/src/app/services/booking.service.ts` |
| Main API | `dental-backend/index.js` |
| Slot Manager | `dental-backend/slot-manager.js` |
| Scheduler | `dental-backend/scheduler.js` |
| Database | `dental-backend/db.js` |

---

**Generated:** May 24, 2026  
**Stack:** Angular 21 + Node.js/Express + PostgreSQL
