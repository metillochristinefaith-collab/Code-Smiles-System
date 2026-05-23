# Dentist Flowchart

```mermaid
flowchart TD
    Start([Start]) --> Login[Login]
    Login --> DentistDash[Dentist Dashboard<br/>Today's Schedule]
    
    DentistDash --> Action{Select Action}
    
    %% VIEW SCHEDULE
    Action -->|View Schedule| ViewSchedule[View Calendar Schedule]
    ViewSchedule --> SelectAppt[Select Appointment]
    SelectAppt --> UpdateStatus{Update Status?}
    UpdateStatus -->|Yes| ChooseStatus[Confirm/Cancel/Complete]
    UpdateStatus -->|No| ViewSchedule
    ChooseStatus --> SaveStatus[Save Status]
    SaveStatus --> NotifyPatient1[Notify Patient]
    NotifyPatient1 --> Action
    
    %% MANAGE BOOKINGS
    Action -->|Manage Bookings| ManageBookings[View All Bookings]
    ManageBookings --> SelectBooking[Select Booking]
    SelectBooking --> BookingAction{Action?}
    BookingAction -->|Edit| EditBooking[Edit Booking Details]
    BookingAction -->|Cancel| CancelBooking[Cancel Booking]
    BookingAction -->|Reschedule| RescheduleBooking[Change Date & Time]
    EditBooking --> SaveEdit[Save Changes]
    CancelBooking --> SaveCancel[Save Cancellation]
    RescheduleBooking --> SaveReschedule[Save New Time]
    SaveEdit --> NotifyPatient2[Notify Patient]
    SaveCancel --> NotifyPatient3[Notify Patient]
    SaveReschedule --> NotifyPatient4[Notify Patient]
    NotifyPatient2 --> Action
    NotifyPatient3 --> Action
    NotifyPatient4 --> Action
    
    %% ADD TIME SLOTS
    Action -->|Add Time Slots| AddSlots[Add Available Slots]
    AddSlots --> SelectDate[Select Date]
    SelectDate --> SelectTime[Select Time]
    SelectTime --> SelectService[Select Service Type]
    SelectService --> SetDuration[Set Duration]
    SetDuration --> SaveSlot[Save Slot]
    SaveSlot --> AddMore{Add More Slots?}
    AddMore -->|Yes| SelectDate
    AddMore -->|No| Action
    
    %% VIEW PATIENTS
    Action -->|View Patients| ViewPatients[View Patient Database]
    ViewPatients --> SearchPatient[Search Patient Profile]
    SearchPatient --> PatientProfile[View Patient Details]
    PatientProfile --> EditProfile{Edit Profile?}
    EditProfile -->|Yes| EditDetails[Edit Patient Details]
    EditProfile -->|No| Action
    EditDetails --> SaveProfile[Save & Update Records]
    SaveProfile --> Action
    
    %% LOGOUT
    Action -->|Logout| End([End])
    
    style Start fill:#e1f5ff
    style End fill:#c8e6c9
    style DentistDash fill:#f3e5f5
    style Action fill:#fff3e0
    style UpdateStatus fill:#fff3e0
    style BookingAction fill:#fff3e0
    style AddMore fill:#fff3e0
    style EditProfile fill:#fff3e0
    style SaveSlot fill:#c8e6c9
    style SaveEdit fill:#c8e6c9
    style SaveCancel fill:#c8e6c9
    style SaveReschedule fill:#c8e6c9
    style SaveProfile fill:#c8e6c9
```

## Dentist Features:

1. **View Schedule** - See today's appointments and update status
2. **Manage Bookings** - Edit, cancel, or reschedule appointments
3. **Add Time Slots** - Create available appointment slots
4. **View Patients** - Search and manage patient profiles
5. **Logout** - Exit the system

---

## To Download:

1. Go to: https://mermaid.live
2. Paste the code above
3. Click download (⬇️)

