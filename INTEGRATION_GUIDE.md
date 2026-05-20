# 🔗 Integration Guide - Smart Dental Scheduling System

## Quick Start Integration

### Step 1: Add Scheduling Router to Your Express App

In your main `index.js` or `app.js`:

```javascript
const express = require('express');
const schedulingRouter = require('./scheduling-api');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount scheduling routes
app.use('/api/scheduling', schedulingRouter);

// Other routes...
app.use('/api/auth', authRouter);
app.use('/api/patients', patientRouter);
// etc.

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Scheduling API available at /api/scheduling');
});
```

### Step 2: Test the Integration

```bash
# Test available times
curl "http://localhost:3000/api/scheduling/available-times?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning"

# Test creating a booking
curl -X POST http://localhost:3000/api/scheduling/book \
  -H "Content-Type: application/json" \
  -d '{
    "dentist_id": "D1",
    "date": "2026-05-20",
    "start_time": "09:00",
    "service": "Dental Cleaning",
    "patient_id": "PAT001"
  }'
```

---

## Frontend Integration Examples

### Angular Component Example

```typescript
// booking.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  dentists: any[] = [];
  services: any[] = [];
  availableTimes: any[] = [];
  
  selectedDentist = '';
  selectedService = '';
  selectedDate = '';
  selectedTime = '';
  patientId = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadDentists();
    this.loadServices();
  }

  loadDentists() {
    this.http.get('/api/scheduling/dentists').subscribe((data: any) => {
      this.dentists = data.dentists;
    });
  }

  loadServices() {
    this.http.get('/api/scheduling/services').subscribe((data: any) => {
      this.services = data.services;
    });
  }

  onDateChange() {
    if (this.selectedDentist && this.selectedDate && this.selectedService) {
      this.getAvailableTimes();
    }
  }

  getAvailableTimes() {
    const params = {
      dentist_id: this.selectedDentist,
      date: this.selectedDate,
      service: this.selectedService
    };

    this.http.get('/api/scheduling/available-times', { params })
      .subscribe((data: any) => {
        this.availableTimes = data.available_times;
      });
  }

  bookAppointment() {
    const booking = {
      dentist_id: this.selectedDentist,
      date: this.selectedDate,
      start_time: this.selectedTime,
      service: this.selectedService,
      patient_id: this.patientId
    };

    this.http.post('/api/scheduling/book', booking)
      .subscribe(
        (response: any) => {
          alert('Booking successful! ID: ' + response.booking.id);
          this.resetForm();
        },
        (error) => {
          alert('Booking failed: ' + error.error.error);
        }
      );
  }

  resetForm() {
    this.selectedDentist = '';
    this.selectedService = '';
    this.selectedDate = '';
    this.selectedTime = '';
    this.availableTimes = [];
  }
}
```

### HTML Template

```html
<!-- booking.component.html -->
<div class="booking-container">
  <h2>Book an Appointment</h2>

  <div class="form-group">
    <label>Select Dentist:</label>
    <select [(ngModel)]="selectedDentist" (change)="onDateChange()">
      <option value="">Choose a dentist...</option>
      <option *ngFor="let dentist of dentists" [value]="dentist.id">
        {{ dentist.name }} - {{ dentist.specialties.join(', ') }}
      </option>
    </select>
  </div>

  <div class="form-group">
    <label>Select Service:</label>
    <select [(ngModel)]="selectedService" (change)="onDateChange()">
      <option value="">Choose a service...</option>
      <option *ngFor="let service of services" [value]="service.name">
        {{ service.name }} ({{ service.total_duration }} min)
      </option>
    </select>
  </div>

  <div class="form-group">
    <label>Select Date:</label>
    <input type="date" [(ngModel)]="selectedDate" (change)="onDateChange()">
  </div>

  <div class="form-group" *ngIf="availableTimes.length > 0">
    <label>Select Time:</label>
    <select [(ngModel)]="selectedTime">
      <option value="">Choose a time...</option>
      <option *ngFor="let time of availableTimes" [value]="time.start_time">
        {{ time.start_time }} - {{ time.end_time }}
      </option>
    </select>
  </div>

  <div class="form-group">
    <label>Patient ID:</label>
    <input type="text" [(ngModel)]="patientId" placeholder="Enter patient ID">
  </div>

  <button (click)="bookAppointment()" [disabled]="!selectedDentist || !selectedService || !selectedDate || !selectedTime || !patientId">
    Book Appointment
  </button>
</div>
```

---

## Database Integration

### Option 1: MongoDB with Mongoose

```javascript
// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  id: String,
  dentist_id: String,
  date: String,
  start_min: Number,
  end_min: Number,
  service: String,
  patient_id: String,
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
```

```javascript
// scheduling-api.js (updated)
const Booking = require('./models/Booking');

// Replace in-memory bookings with database queries
router.get('/available-times', async (req, res) => {
  try {
    const { dentist_id, date, service } = req.query;
    
    // Fetch from database
    const bookings = await Booking.find({
      dentist_id,
      date
    });

    // Update calculator with database bookings
    calculator.bookings = bookings;

    // Rest of the logic...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/book', async (req, res) => {
  try {
    const { dentist_id, date, start_time, service, patient_id } = req.body;
    
    // Fetch existing bookings
    const existingBookings = await Booking.find({
      dentist_id,
      date
    });

    // Update validator
    validator.bookings = existingBookings;

    // Validate and create booking
    const result = validator.addBooking(dentist_id, new Date(date), timeToMinutes(start_time), service, patient_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Save to database
    const booking = new Booking(result.booking);
    await booking.save();

    res.status(201).json({ success: true, booking: result.booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Option 2: PostgreSQL with Sequelize

```javascript
// models/Booking.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  dentist_id: DataTypes.STRING,
  date: DataTypes.DATEONLY,
  start_min: DataTypes.INTEGER,
  end_min: DataTypes.INTEGER,
  service: DataTypes.STRING,
  patient_id: DataTypes.STRING,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Booking;
```

---

## Authentication Integration

### Add Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
```

### Apply to Scheduling Routes

```javascript
// scheduling-api.js
const authenticateToken = require('../middleware/auth');

// Protect booking creation
router.post('/book', authenticateToken, (req, res) => {
  // Only authenticated users can book
  // ...
});

// Allow public access to view available times
router.get('/available-times', (req, res) => {
  // Public endpoint
  // ...
});
```

---

## Error Handling

### Global Error Handler

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
}

module.exports = errorHandler;
```

### Use in App

```javascript
app.use(errorHandler);
```

---

## Logging

### Add Request Logging

```javascript
// middleware/logger.js
const morgan = require('morgan');

module.exports = morgan(':method :url :status :res[content-length] - :response-time ms');
```

### Use in App

```javascript
const logger = require('./middleware/logger');
app.use(logger);
```

---

## Environment Variables

### .env File

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=27017
DB_NAME=code_smiles
DB_USER=admin
DB_PASSWORD=password

# JWT
ACCESS_TOKEN_SECRET=your_secret_key_here
REFRESH_TOKEN_SECRET=your_refresh_secret_here

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
```

### Load Environment Variables

```javascript
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST;
// etc.
```

---

## Testing with Postman

### Collection Setup

1. Create new Postman collection: "Code Smiles Scheduling"

2. Add requests:

```
GET /api/scheduling/dentists
GET /api/scheduling/services
GET /api/scheduling/available-times?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning
GET /api/scheduling/next-available?dentist_id=D1&date=2026-05-20&service=Dental%20Cleaning
GET /api/scheduling/dentist-schedule?dentist_id=D1&date=2026-05-20
POST /api/scheduling/book
GET /api/scheduling/booking/:id
DELETE /api/scheduling/booking/:id
```

3. Set environment variables:
```
{{base_url}} = http://localhost:3000
{{dentist_id}} = D1
{{date}} = 2026-05-20
{{service}} = Dental Cleaning
```

---

## Performance Optimization

### Add Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

router.get('/available-times', (req, res) => {
  const cacheKey = `available_${req.query.dentist_id}_${req.query.date}_${req.query.service}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Calculate availability
  const result = calculator.getAvailableTimesForService(...);
  
  // Cache result
  cache.set(cacheKey, result);
  
  res.json(result);
});
```

### Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/scheduling', limiter);
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Authentication implemented
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Tests passing
- [ ] Documentation updated
- [ ] API documentation (Swagger/OpenAPI)

---

## Next Steps

1. **Integrate with your database** (MongoDB or PostgreSQL)
2. **Add authentication** to protect endpoints
3. **Build frontend** using the API
4. **Add email notifications** for bookings
5. **Implement admin dashboard** for schedule management
6. **Add analytics** for booking trends
7. **Deploy to production** (Heroku, AWS, etc.)

---

## Support

For questions or issues with integration, refer to:
- `SCHEDULING_SYSTEM_DOCS.md` - Full system documentation
- `scheduling-engine.js` - Core engine code
- `scheduling-api.js` - API implementation
- `test-scheduling-engine.js` - Test examples

---

**Ready to integrate!** 🚀
