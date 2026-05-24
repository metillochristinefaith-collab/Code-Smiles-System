# Code Smiles Project Standards

## Tech Stack
- **Frontend**: Angular 21 + TypeScript + Angular Material
- **Backend**: Node.js/Express + PostgreSQL
- **Auth**: JWT + bcryptjs
- **Reactive**: RxJS 7.8

## Project Structure
- `dental-frontend/` - Angular app (port 4200)
- `dental-backend/` - Express API (port 5000)

## Key Features
- Patient & staff booking with calendar
- Double booking prevention
- Medical vault (file uploads)
- Email notifications
- Multi-service support

## Code Standards
- TypeScript with strict checking
- Component-based architecture
- RxJS reactive patterns
- Proper error handling

## Common Gotchas
- Validate slot availability against existing bookings
- Prevent double-booking with proper checks
- Test responsive design on mobile/tablet/desktop
- Handle file uploads securely in medical vault
