# Slide 9 — User Interface Preview

## 🎨 UI/UX Overview

Code Smiles features a modern, responsive interface built with Angular Material. The design is clean, professional, and user-friendly across all devices.

---

## 🔐 **1. Login Page**

### Desktop View
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    CODE SMILES                             │
│                  Dental Booking System                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Select User Type:                                  │   │
│  │  ○ Patient    ○ Staff    ○ Dentist                 │   │
│  │                                                     │   │
│  │  Email Address:                                     │   │
│  │  [_________________________________]                │   │
│  │                                                     │   │
│  │  Password:                                          │   │
│  │  [_________________________________]                │   │
│  │                                                     │   │
│  │  ☐ Remember me                                      │   │
│  │                                                     │   │
│  │  [        LOGIN        ]  [  FORGOT PASSWORD  ]    │   │
│  │                                                     │   │
│  │  Don't have an account? [REGISTER HERE]            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Features
- **User Type Selection**: Radio buttons for Patient/Staff/Dentist
- **Email Input**: Validated email field
- **Password Input**: Secure password field
- **Remember Me**: Optional session persistence
- **Login Button**: Primary action button
- **Forgot Password**: Link to password reset
- **Register Link**: Link to registration page
- **Error Messages**: Clear validation feedback
- **Loading State**: Spinner during authentication

### Mobile View
```
┌──────────────────────┐
│  CODE SMILES         │
│  Dental Booking      │
│                      │
│  User Type:          │
│  ○ Patient           │
│  ○ Staff             │
│  ○ Dentist           │
│                      │
│  Email:              │
│  [________________]  │
│                      │
│  Password:           │
│  [________________]  │
│                      │
│  ☐ Remember me       │
│                      │
│  [    LOGIN    ]     │
│                      │
│  [FORGOT PASSWORD]   │
│                      │
│  [REGISTER HERE]     │
│                      │
└──────────────────────┘
```

---

## 👤 **2. Patient Dashboard**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 John Doe | Logout │
├──────────────┬──────────────────────────────────────────────────────┤
│ PATIENT MENU │                                                      │
│              │  PATIENT DASHBOARD                                   │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Book       │  │ Welcome, John!                                 │ │
│   Appointment│  │                                                │ │
│ • My         │  │ Quick Stats:                                   │ │
│   Appointments│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐        │ │
│ • Medical    │  │ Upcoming  │ │ Completed│ │ Cancelled│        │ │
│   Vault      │  │    3      │ │    12    │ │    1     │        │ │
│ • Profile    │  │ Appts     │ │ Appts    │ │ Appts    │        │ │
│ • Help       │  └──────────┘ └──────────┘ └──────────┘        │ │
│ • Logout     │  │                                                │ │
│              │  │ Upcoming Appointments:                         │ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ Date: May 28, 2026 | Time: 10:00 AM       ││ │
│              │  │ │ Service: Cleaning | Dentist: Dr. Smith    ││ │
│              │  │ │ Status: Confirmed | [RESCHEDULE] [CANCEL] ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ Date: Jun 5, 2026 | Time: 2:30 PM         ││ │
│              │  │ │ Service: Root Canal | Dentist: Dr. Jones  ││ │
│              │  │ │ Status: Confirmed | [RESCHEDULE] [CANCEL] ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │                                                │ │
│              │  │ [BOOK NEW APPOINTMENT]                         │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Key Sections
1. **Header**: Logo, user profile, logout
2. **Sidebar**: Navigation menu
3. **Quick Stats**: Appointment summary cards
4. **Upcoming Appointments**: List with actions
5. **Action Buttons**: Book new, reschedule, cancel

### Mobile View
```
┌──────────────────────┐
│ ☰ CODE SMILES   👤   │
├──────────────────────┤
│ PATIENT DASHBOARD    │
│                      │
│ Welcome, John!       │
│                      │
│ Upcoming: 3          │
│ Completed: 12        │
│ Cancelled: 1         │
│                      │
│ Upcoming Appts:      │
│ ┌──────────────────┐ │
│ │ May 28, 10:00 AM │ │
│ │ Cleaning         │ │
│ │ Dr. Smith        │ │
│ │ [RESCHEDULE]     │ │
│ │ [CANCEL]         │ │
│ └──────────────────┘ │
│ ┌──────────────────┐ │
│ │ Jun 5, 2:30 PM   │ │
│ │ Root Canal       │ │
│ │ Dr. Jones        │ │
│ │ [RESCHEDULE]     │ │
│ │ [CANCEL]         │ │
│ └──────────────────┘ │
│                      │
│ [BOOK NEW APPT]      │
│                      │
└──────────────────────┘
```

---

## 📅 **3. Booking Page**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 John Doe | Logout │
├──────────────┬──────────────────────────────────────────────────────┤
│ PATIENT MENU │                                                      │
│              │  BOOK AN APPOINTMENT                                 │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Book       │  │ Step 1: Select Service                         │ │
│   Appointment│  │                                                │ │
│ • My         │  │ ☐ Cleaning (30 min) - $50                     │ │
│   Appointments│ │ ☐ Filling (45 min) - $75                      │ │
│ • Medical    │  │ ☑ Root Canal (60 min) - $200                  │ │
│   Vault      │  │ ☐ Extraction (30 min) - $100                  │ │
│ • Profile    │  │ ☐ Whitening (30 min) - $150                  │ │
│ • Help       │  │                                                │ │
│ • Logout     │  │ Step 2: Select Date & Time                    │ │
│              │  │                                                │ │
│              │  │ Date: [May 28, 2026 ▼]                        │ │
│              │  │                                                │ │
│              │  │ Available Times:                               │ │
│              │  │ ○ 9:00 AM    ○ 10:00 AM   ○ 11:00 AM         │ │
│              │  │ ○ 1:00 PM    ○ 2:00 PM    ○ 3:00 PM          │ │
│              │  │ ○ 4:00 PM    ○ 5:00 PM                        │ │
│              │  │                                                │ │
│              │  │ [ADD MORE SERVICES]  [SUBMIT]  [CANCEL]       │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Features
- **Service Selection**: Checkboxes with pricing
- **Date Picker**: Calendar widget
- **Time Slots**: Available time options
- **Add More Services**: Multi-service booking
- **Submit Button**: Confirm booking
- **Validation**: Real-time error checking

### Mobile View
```
┌──────────────────────┐
│ ☰ CODE SMILES   👤   │
├──────────────────────┤
│ BOOK APPOINTMENT     │
│                      │
│ Step 1: Service      │
│ ☐ Cleaning - $50     │
│ ☐ Filling - $75      │
│ ☑ Root Canal - $200  │
│ ☐ Extraction - $100  │
│ ☐ Whitening - $150   │
│                      │
│ Step 2: Date & Time  │
│ Date: [May 28 ▼]     │
│                      │
│ Times:               │
│ ○ 9:00 AM            │
│ ○ 10:00 AM           │
│ ○ 11:00 AM           │
│ ○ 1:00 PM            │
│ ○ 2:00 PM            │
│ ○ 3:00 PM            │
│ ○ 4:00 PM            │
│ ○ 5:00 PM            │
│                      │
│ [ADD MORE]           │
│ [SUBMIT]  [CANCEL]   │
│                      │
└──────────────────────┘
```

---

## 📅 **4. Calendar View**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 John Doe | Logout │
├──────────────┬──────────────────────────────────────────────────────┤
│ PATIENT MENU │                                                      │
│              │  MY APPOINTMENTS - CALENDAR VIEW                     │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Book       │  │ < May 2026 >                                   │ │
│   Appointment│  │                                                │ │
│ • My         │  │ Sun  Mon  Tue  Wed  Thu  Fri  Sat             │ │
│   Appointments│ │                                                │ │
│ • Medical    │  │      26   27   28   29   30   1    2          │ │
│   Vault      │  │                  ●                             │ │
│ • Profile    │  │      3    4    5    6    7    8    9          │ │
│ • Help       │  │                  ●                             │ │
│ • Logout     │  │     10   11   12   13   14   15   16          │ │
│              │  │                                                │ │
│              │  │     17   18   19   20   21   22   23          │ │
│              │  │                                                │ │
│              │  │     24   25   26   27   28   29   30          │ │
│              │  │                                                │ │
│              │  │     31                                         │ │
│              │  │                                                │ │
│              │  │ ● = Appointment scheduled                      │ │
│              │  │                                                │ │
│              │  │ Selected: May 28, 2026                         │ │
│              │  │ Cleaning - 10:00 AM - Dr. Smith               │ │
│              │  │ Status: Confirmed                              │ │
│              │  │                                                │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Features
- **Month View**: Calendar grid
- **Appointment Indicators**: Dots on dates with appointments
- **Navigation**: Previous/Next month buttons
- **Appointment Details**: Show details when date selected
- **Color Coding**: Different colors for status

---

## 🏥 **5. Medical Vault**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 John Doe | Logout │
├──────────────┬──────────────────────────────────────────────────────┤
│ PATIENT MENU │                                                      │
│              │  MEDICAL VAULT                                       │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Book       │  │ [UPLOAD NEW FILE]  [FILTER ▼]  [SEARCH ___]   │ │
│   Appointment│  │                                                │ │
│ • My         │  │ My Documents:                                  │ │
│   Appointments│ │ ┌────────────────────────────────────────────┐│ │
│ • Medical    │  │ │ 📄 X-Ray_2026_05_20.pdf                   ││ │
│   Vault      │  │ │ Uploaded: May 20, 2026 | Size: 2.5 MB     ││ │
│   ✓          │  │ │ Category: Dental | [SHARE] [DELETE]        ││ │
│ • Profile    │  │ └────────────────────────────────────────────┘│ │
│ • Help       │  │ ┌────────────────────────────────────────────┐│ │
│ • Logout     │  │ │ 📄 Prescription_2026_05_15.pdf             ││ │
│              │  │ │ Uploaded: May 15, 2026 | Size: 1.2 MB     ││ │
│              │  │ │ Category: Medical | [SHARE] [DELETE]        ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ 📄 Report_2026_05_10.pdf                   ││ │
│              │  │ │ Uploaded: May 10, 2026 | Size: 3.1 MB     ││ │
│              │  │ │ Category: Dental | [SHARE] [DELETE]        ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │                                                │ │
│              │  │ Shared With Me:                                │ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ 📄 Treatment_Plan.pdf                      ││ │
│              │  │ │ Shared by: Dr. Smith | Date: May 22, 2026 ││ │
│              │  │ │ Permission: View | [DOWNLOAD] [REVOKE]     ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │                                                │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Features
- **Upload Button**: Add new documents
- **File List**: Display uploaded files
- **File Details**: Name, date, size, category
- **Share Option**: Share with dentists
- **Delete Option**: Remove files
- **Shared Files**: View files shared with patient
- **Search & Filter**: Find documents quickly

---

## 👨‍⚕️ **6. Dentist Dashboard**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 Dr. Smith | Logout│
├──────────────┬──────────────────────────────────────────────────────┤
│ DENTIST MENU │                                                      │
│              │  DENTIST DASHBOARD                                   │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Today's    │  │ Today: May 24, 2026                            │ │
│   Schedule   │  │                                                │ │
│ • Patients   │  │ Appointments Today: 5                          │ │
│ • Calendar   │  │ ┌────────────────────────────────────────────┐│ │
│ • Medical    │  │ │ 9:00 AM - John Doe - Cleaning             ││ │
│   Vault      │  │ │ Status: Completed | [VIEW PATIENT]         ││ │
│ • Treatment  │  │ └────────────────────────────────────────────┘│ │
│   Plans      │  │ ┌────────────────────────────────────────────┐│ │
│ • Profile    │  │ │ 10:30 AM - Jane Smith - Root Canal         ││ │
│ • Help       │  │ │ Status: In Progress | [VIEW PATIENT]       ││ │
│ • Logout     │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ 1:00 PM - Bob Johnson - Filling            ││ │
│              │  │ │ Status: Pending | [VIEW PATIENT]           ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ 2:30 PM - Alice Brown - Extraction         ││ │
│              │  │ │ Status: Pending | [VIEW PATIENT]           ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ 4:00 PM - Carol White - Whitening          ││ │
│              │  │ │ Status: Pending | [VIEW PATIENT]           ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │                                                │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Features
- **Today's Schedule**: List of appointments
- **Patient Names**: Quick identification
- **Service Type**: Appointment type
- **Status Indicator**: Completed, in progress, pending
- **View Patient**: Link to patient details
- **Time Display**: Appointment times

---

## 👔 **7. Staff Dashboard**

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────┐
│ CODE SMILES                                    👤 Staff | Logout    │
├──────────────┬──────────────────────────────────────────────────────┤
│ STAFF MENU   │                                                      │
│              │  STAFF DASHBOARD                                     │
│ • Dashboard  │  ┌────────────────────────────────────────────────┐ │
│ • Requests   │  │ Pending Booking Requests: 8                    │ │
│ • Bookings   │  │                                                │ │
│ • Patients   │  │ ┌────────────────────────────────────────────┐│ │
│ • Calendar   │  │ │ Request #1001                              ││ │
│ • Reports    │  │ │ Patient: John Doe | Service: Cleaning      ││ │
│ • Profile    │  │ │ Preferred Date: May 28, 2026               ││ │
│ • Help       │  │ │ [APPROVE] [REJECT]                         ││ │
│ • Logout     │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ Request #1002                              ││ │
│              │  │ │ Patient: Jane Smith | Service: Root Canal  ││ │
│              │  │ │ Preferred Date: May 29, 2026               ││ │
│              │  │ │ [APPROVE] [REJECT]                         ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │ ┌────────────────────────────────────────────┐│ │
│              │  │ │ Request #1003                              ││ │
│              │  │ │ Patient: Bob Johnson | Service: Filling    ││ │
│              │  │ │ Preferred Date: May 30, 2026               ││ │
│              │  │ │ [APPROVE] [REJECT]                         ││ │
│              │  │ └────────────────────────────────────────────┘│ │
│              │  │                                                │ │
│              │  │ [VIEW ALL REQUESTS]                            │ │
│              │  │                                                │ │
│              │  └────────────────────────────────────────────────┘ │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### Features
- **Pending Requests**: Count of pending bookings
- **Request Details**: Patient, service, date
- **Approve/Reject**: Action buttons
- **View All**: Link to full request list
- **Quick Actions**: Fast approval workflow

---

## 📱 **8. Mobile Responsive Views**

### Patient Mobile Dashboard
```
┌──────────────────────┐
│ ☰ CODE SMILES   👤   │
├──────────────────────┤
│ PATIENT DASHBOARD    │
│                      │
│ Welcome, John!       │
│                      │
│ Quick Stats:         │
│ ┌──────────────────┐ │
│ │ Upcoming: 3      │ │
│ │ Completed: 12    │ │
│ │ Cancelled: 1     │ │
│ └──────────────────┘ │
│                      │
│ Upcoming Appts:      │
│ ┌──────────────────┐ │
│ │ May 28, 10:00 AM │ │
│ │ Cleaning         │ │
│ │ Dr. Smith        │ │
│ │ [RESCHEDULE]     │ │
│ │ [CANCEL]         │ │
│ └──────────────────┘ │
│                      │
│ [BOOK NEW APPT]      │
│ [VIEW CALENDAR]      │
│ [MEDICAL VAULT]      │
│ [PROFILE]            │
│                      │
└──────────────────────┘
```

### Dentist Mobile Dashboard
```
┌──────────────────────┐
│ ☰ CODE SMILES   👤   │
├──────────────────────┤
│ TODAY'S SCHEDULE     │
│                      │
│ May 24, 2026         │
│ 5 Appointments       │
│                      │
│ ┌──────────────────┐ │
│ │ 9:00 AM          │ │
│ │ John Doe         │ │
│ │ Cleaning         │ │
│ │ ✓ Completed      │ │
│ │ [VIEW PATIENT]   │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 10:30 AM         │ │
│ │ Jane Smith       │ │
│ │ Root Canal       │ │
│ │ ⏱ In Progress    │ │
│ │ [VIEW PATIENT]   │ │
│ └──────────────────┘ │
│                      │
│ [VIEW ALL]           │
│ [CALENDAR]           │
│ [PATIENTS]           │
│                      │
└──────────────────────┘
```

---

## 🎨 **9. Design System**

### Color Palette
| Color | Usage | Hex |
|-------|-------|-----|
| Primary Blue | Buttons, links, headers | #1976D2 |
| Success Green | Confirmed, completed | #4CAF50 |
| Warning Orange | Pending, attention | #FF9800 |
| Error Red | Cancelled, errors | #F44336 |
| Neutral Gray | Text, borders | #757575 |
| Light Gray | Backgrounds | #F5F5F5 |

### Typography
- **Headers**: Roboto Bold, 24px
- **Subheaders**: Roboto Medium, 18px
- **Body Text**: Roboto Regular, 14px
- **Small Text**: Roboto Regular, 12px

### Components
- **Buttons**: Material Design buttons with ripple effect
- **Cards**: Elevated cards with shadows
- **Forms**: Material input fields with validation
- **Tables**: Sortable, paginated tables
- **Modals**: Centered dialogs with backdrop
- **Notifications**: Toast messages and alerts

---

## 📊 **10. Responsive Breakpoints**

| Device | Width | Layout |
|--------|-------|--------|
| Mobile | < 600px | Single column, stacked |
| Tablet | 600-960px | Two columns |
| Desktop | > 960px | Three+ columns, sidebar |

### Responsive Features
✅ Flexible grid layout  
✅ Touch-friendly buttons (48px minimum)  
✅ Readable font sizes on all devices  
✅ Optimized images for mobile  
✅ Hamburger menu on mobile  
✅ Collapsible sidebar on tablet  

---

## 🎯 **11. Key UI Features**

### Navigation
- **Sidebar Navigation**: Persistent on desktop, collapsible on mobile
- **Breadcrumb Navigation**: Shows current location
- **Top Navigation Bar**: Logo, user profile, logout
- **Mobile Menu**: Hamburger menu with slide-out drawer

### Forms
- **Input Validation**: Real-time error messages
- **Required Fields**: Marked with asterisk
- **Helper Text**: Guidance below fields
- **Error States**: Red borders and messages
- **Success States**: Green checkmarks

### Tables
- **Sortable Columns**: Click to sort
- **Pagination**: Navigate through pages
- **Row Actions**: Edit, delete, view buttons
- **Responsive**: Horizontal scroll on mobile

### Modals
- **Confirmation Dialogs**: Confirm destructive actions
- **Forms in Modals**: Create/edit records
- **Backdrop**: Click outside to close
- **Close Button**: X button in top right

---

## ✨ **12. User Experience Highlights**

✅ **Intuitive Navigation**: Clear menu structure  
✅ **Consistent Design**: Same patterns throughout  
✅ **Fast Loading**: Optimized performance  
✅ **Accessibility**: WCAG 2.1 compliant  
✅ **Error Handling**: Clear error messages  
✅ **Feedback**: Loading states and confirmations  
✅ **Mobile First**: Responsive on all devices  
✅ **Professional Look**: Modern, clean design  

---

## 📸 **13. Screenshot Locations**

To view actual screenshots:
1. **Patient Portal**: http://localhost:4200/patient/dashboard
2. **Staff Portal**: http://localhost:4200/staff/dashboard
3. **Dentist Portal**: http://localhost:4200/dentist/dashboard
4. **Login Page**: http://localhost:4200/login

---

**UI Framework**: Angular Material  
**Design System**: Material Design 3  
**Last Updated**: May 24, 2026
