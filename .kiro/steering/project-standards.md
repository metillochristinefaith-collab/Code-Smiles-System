# Code Smiles Project Standards

## Project Overview
Code Smiles is a dental booking and management system built with Angular, TypeScript, and PostgreSQL.

## Technology Stack

| Technology | Purpose |
|---|---|
| **Angular 21** | Frontend Framework |
| **TypeScript 5.9** | Application Language |
| **PostgreSQL** | Relational Database |
| **Node.js/Express** | Backend API Server |
| **JWT** | Authentication & Authorization |
| **Angular Material** | Responsive UI Components |
| **RxJS 7.8** | Reactive Programming |

## Project Structure

### Frontend (`dental-frontend/`)
- Angular 21 application with TypeScript
- Handles patient and staff booking interfaces
- Calendar components for appointment management
- Authentication flows for both patients and dentists
- Medical vault for document/file management
- Angular Material for responsive UI

### Backend (`dental-backend/`)
- Node.js/Express server for API endpoints
- PostgreSQL database integration via `pg` driver
- JWT-based authentication
- Business logic for booking validation
- Email notifications (confirmation emails via Nodemailer)
- CORS enabled for frontend communication
- Rate limiting for API security

## Key Features
- **Patient Booking**: Patients can book appointments with automatic slot availability
- **Staff Booking**: Internal staff scheduling system
- **Calendar Views**: Google Calendar-style monthly calendar display
- **Medical Vault**: File upload and sharing system for patients/dentists
- **Double Booking Prevention**: Validation to prevent conflicting appointments
- **Multi-Service Support**: Support for different service types with flexible time slots
- **Responsive Design**: Mobile-friendly interface using Angular Material

## Development Guidelines

### Code Style
- Use TypeScript with strict type checking
- Follow Angular style guide and best practices
- Use reactive programming patterns (RxJS)
- Component-based architecture

### Database Schema
- PostgreSQL database with relational schema
- Tables: `users`, `bookings`, `appointments`, `services`, `timeslots`
- Proper indexing on frequently queried columns
- Foreign key relationships for data integrity

### Authentication & Security
- JWT-based token authentication
- bcryptjs for password hashing
- Rate limiting on API endpoints
- CORS configuration for frontend requests

### Common Issues & Solutions
- **Slot Availability**: Validate against existing bookings and service duration
- **Double Booking**: Check both patient calendar and service availability
- **Responsive Layout**: Test on mobile, tablet, and desktop views
- **Email Notifications**: Use backend endpoints for sending confirmations
- **File Uploads**: Handle medical vault uploads with proper validation

## Build & Deploy

### Local Development
```bash
# Frontend
cd dental-frontend
npm install
npm start  # ng serve on port 4200

# Backend
cd dental-backend
npm install
npm start  # runs on configured port (usually 5000)
```

### Environment Setup
- Backend uses `.env` file for:
  - PostgreSQL connection string
  - JWT secret key
  - Email service credentials
  - Google Auth library configuration
  - Port configuration

## Testing Checklist
- [ ] Booking flows work for both patients and staff
- [ ] Calendar displays correctly on all screen sizes
- [ ] No double-booking allowed
- [ ] Email confirmations send successfully
- [ ] File uploads work in medical vault
- [ ] Authentication works for different user roles
