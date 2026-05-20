import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientAppointmentStore } from '../patient-appointments/patient-appointment-store';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface TimeSlot {
  time: string;
  slotsLeft: number;
}

interface ServiceDetail {
  name: string;
  duration: number;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientSidebarComponent],
  templateUrl: './patient-booking.html',
  styleUrls: ['./patient-booking.css']
})
export class PatientBookingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appointmentStore = inject(PatientAppointmentStore);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  isSubmitting = false;
  submitError = '';

  currentStep: any = 1;
  selectedCategory: string = '';
  selectedServices: string[] = [];
  selectedSubServices: ServiceDetail[] = [];

  totalSelectedDuration: number = 0;
  readonly MAX_MINUTES = 120;

  selectedDate: string = '';
  selectedTime: string = '';
  availableSlots: TimeSlot[] = [];

  viewDate: Date = new Date();
  currentMonthName: string = '';
  currentYear: number = 0;
  calendarDays: any[] = [];

  bookingConfirmed: boolean = false;
  showSuccessModal: boolean = false;
  isRescheduleFlow: boolean = false;
  wasRescheduleFlow: boolean = false; // tracks if the completed booking was a reschedule
  rescheduleAppointmentId: string | null = null;

  showCancelConfirm: boolean = false;
  showLeaveConfirm: boolean = false;
  pendingNavigationUrl: string = '';

  confirmedBooking = {
    appointmentId: '',
    fullName: '',
    date: '',
    time: '',
    services: [] as ServiceDetail[]
  };

  patientDetails = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    notes: '',
    rescheduleReason: ''
  };

  serviceMap: { [key: string]: ServiceDetail[] } = {
    'General Dentistry': [
      { name: 'Oral Consultation', duration: 15 },
      { name: 'Dental Cleaning', duration: 45 },
      { name: 'Digital X-Rays', duration: 20 },
      { name: 'Tooth Fillings', duration: 60 },
      { name: 'Fluoride Treatment', duration: 15 },
      { name: 'Dental Sealants', duration: 30 },
      { name: 'Simple Tooth Extraction', duration: 45 },
      { name: 'Emergency Dental Care', duration: 60 }
    ],
    'Cosmetic Arts': [
      { name: 'Teeth Whitening', duration: 60 },
      { name: 'Dental Veneers', duration: 90 },
      { name: 'Dental Bonding', duration: 60 },
      { name: 'Smile Makeover', duration: 120 },
      { name: 'Tooth Contouring', duration: 45 },
      { name: 'Gum Contouring', duration: 60 }
    ],
    'Orthodontics': [
      { name: 'Traditional Braces', duration: 90 },
      { name: 'Ceramic Braces', duration: 90 },
      { name: 'Self-Ligating Braces', duration: 90 },
      { name: 'Clear Aligners', duration: 45 },
      { name: 'Retainers', duration: 30 },
      { name: 'Orthodontic Consultation', duration: 30 }
    ],
    'Oral Surgery': [
      { name: 'Surgical Tooth Extraction', duration: 60 },
      { name: 'Wisdom Tooth Removal', duration: 90 },
      { name: 'Cyst Removal', duration: 60 },
      { name: 'Minor Oral Surgery', duration: 45 },
      { name: 'Frenectomy', duration: 30 }
    ],
    'Dental Implants': [
      { name: 'Implant Consultation', duration: 30 },
      { name: 'Single Tooth Implant', duration: 90 },
      { name: 'Multiple Tooth Implant', duration: 120 },
      { name: 'Implant Crown Placement', duration: 60 },
      { name: 'Implant Maintenance', duration: 45 }
    ],
    'Pediatric Care': [
      { name: 'Pediatric Check-up', duration: 20 },
      { name: 'Pediatric Cleaning', duration: 30 },
      { name: 'Fluoride for Kids', duration: 15 },
      { name: 'Dental Sealants', duration: 30 },
      { name: 'Baby Tooth Extraction', duration: 30 },
      { name: 'Space Maintainers', duration: 45 }
    ]
  };

  get confirmedServiceNames(): string {
    return this.confirmedBooking.services.map(s => s.name).join(', ');
  }

  get hasBookingStarted(): boolean {
    return this.selectedServices.length > 0 || this.currentStep > 1;
  }

  ngOnInit() {
    this.generateCalendar();
    this.route.queryParamMap.subscribe((params) => {
      this.handleRescheduleState(params.get('reschedule'));
    });
    this.prefillPatientDetails();
  }

  private prefillPatientDetails() {
    const user = this.auth.getUser();
    if (user) {
      this.patientDetails.firstName = user.first_name || '';
      this.patientDetails.lastName = user.last_name || '';
      this.patientDetails.email = user.email || '';
    }
  }

  get currentSubServices() {
    return this.serviceMap[this.selectedCategory] || [];
  }

  get selectedServiceSummary(): string {
    const names = this.selectedSubServices.map(service => service.name).join(', ');
    return `${names} • ${this.totalSelectedDuration} mins`;
  }

  get isFirstNameValid(): boolean {
    return /^[A-Za-z\s'-]{2,}$/.test(this.patientDetails.firstName.trim());
  }

  get isLastNameValid(): boolean {
    return /^[A-Za-z\s'-]{2,}$/.test(this.patientDetails.lastName.trim());
  }

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.patientDetails.email.trim());
  }

  get isPhoneValid(): boolean {
    return /^09\d{9}$/.test(this.patientDetails.phone.trim());
  }

  get isAgeValid(): boolean {
    const age = Number(this.patientDetails.age);
    return Number.isInteger(age) && age >= 1 && age <= 120;
  }

  get canProceedToReview(): boolean {
    const baseValid = (
      this.isFirstNameValid &&
      this.isLastNameValid &&
      this.isEmailValid &&
      this.isPhoneValid &&
      this.isAgeValid
    );
    // Reschedule flow requires a reason
    if (this.isRescheduleFlow) {
      return baseValid && this.patientDetails.rescheduleReason.trim().length >= 5;
    }
    return baseValid;
  }

  get stepNumber(): number {
    if (this.currentStep === 1 || this.currentStep === 1.5) return 1;
    return this.currentStep;
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    // Don't auto-advance — user clicks Continue button
  }

  toggleService(serviceName: string) {
    const serviceObj = this.currentSubServices.find(s => s.name === serviceName);
    if (!serviceObj) return;

    const index = this.selectedServices.indexOf(serviceName);

    if (index > -1) {
      this.selectedServices.splice(index, 1);
      this.selectedSubServices = this.selectedSubServices.filter(s => s.name !== serviceName);
      this.totalSelectedDuration -= serviceObj.duration;
    } else {
      if (
        this.selectedServices.length < 3 &&
        this.totalSelectedDuration + serviceObj.duration <= this.MAX_MINUTES
      ) {
        this.selectedServices.push(serviceName);
        this.selectedSubServices.push(serviceObj);
        this.totalSelectedDuration += serviceObj.duration;
      }
    }

    if (this.selectedDate) {
      // Re-generate slots when service selection changes
      this.selectDate(this.selectedDate);
    }
  }

  resetSelection() {
    this.selectedServices = [];
    this.selectedSubServices = [];
    this.totalSelectedDuration = 0;
    this.selectedDate = '';
    this.selectedTime = '';
    this.availableSlots = [];
  }

  resetPatientDetails() {
    this.patientDetails = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      age: '',
      notes: '',
      rescheduleReason: ''
    };
  }

  resetConfirmedBooking() {
    this.confirmedBooking = {
      appointmentId: '',
      fullName: '',
      date: '',
      time: '',
      services: []
    };
  }

  generateCalendar() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    this.currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.viewDate);
    this.currentYear = year;
    this.calendarDays = [];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({
        number: '',
        date: '',
        isPast: true,
        isWeekend: false,
        isFullyBooked: false,
        isAvailable: false,
        isToday: false
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      dateObj.setHours(0, 0, 0, 0);

      const dayOfWeek = dateObj.getDay();
      const isPast = dateObj < today;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Check if date is within operating hours (not past and not weekend)
      const isOperatingDay = !isPast && !isWeekend;

      this.calendarDays.push({
        number: i,
        date: this.formatDateLocal(dateObj),
        isToday: dateObj.getTime() === today.getTime(),
        isPast,
        isWeekend,
        isFullyBooked: false, // Will be determined by API call
        isAvailable: isOperatingDay
      });
    }
  }

  prevMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  selectDate(date: string) {
    const dayObj = this.calendarDays.find(d => d.date === date);
    if (dayObj && dayObj.isAvailable && !dayObj.isPast && !dayObj.isWeekend) {
      this.selectedDate = date;
      this.selectedTime = '';
      this.refreshAvailableSlots(date);
    } else {
      this.selectedDate = '';
      this.selectedTime = '';
      this.availableSlots = [];
    }
  }

  private refreshAvailableSlots(date: string) {
    // Get the first selected service (or use a default)
    const service = this.selectedSubServices.length > 0 
      ? this.selectedSubServices[0].name 
      : 'Dental Cleaning'; // fallback service
    
    // Fetch real slot counts from API
    this.api.getAvailableTimes(date, service).subscribe({
      next: (response: any) => {
        if (response && response.availableTimes && Array.isArray(response.availableTimes)) {
          this.availableSlots = response.availableTimes;
          console.log('Slots from API:', this.availableSlots);
        } else {
          this.availableSlots = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching available times:', err);
        this.availableSlots = [];
      }
    });
  }

  private timeStringToMinutes(timeStr: string): number {
    // Handle both "HH:MM" and "HH:MM AM/PM" formats
    const parts = timeStr.trim().split(/\s+/);
    const timePart = parts[0];
    const modifier = parts[1] || '';
    
    const [hours, minutes] = timePart.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    // Convert 12-hour to 24-hour if needed
    if (modifier === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (modifier === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60;
    }

    return totalMinutes;
  }

  to12Hour(totalMinutes: number): string {
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  completeBooking() {
    if (this.isSubmitting) return;
    if (!this.canProceedToReview) return;
    if (!this.selectedDate || !this.selectedTime || this.selectedSubServices.length === 0) {
      this.submitError = 'Please complete the service, date, and time before submitting.';
      return;
    }

    const user = this.auth.getUser();
    const fullName = `${this.patientDetails.firstName.trim()} ${this.patientDetails.lastName.trim()}`;
    const selectedServiceNames = this.selectedSubServices.map((s) => s.name);
    const time24Hour = this.convertTo24Hour(this.selectedTime);

    const bookingData = {
      patient_id:       user?.id ?? null,
      full_name:        fullName,
      phone:            this.patientDetails.phone.trim(),
      email:            this.patientDetails.email.trim(),
      treatment:        this.selectedCategory,
      services:         selectedServiceNames,
      appointment_date: this.selectedDate,
      appointment_time: time24Hour,
      duration_minutes: this.totalSelectedDuration,
      notes:            this.patientDetails.notes.trim(),
      booking_type:     'Registered patient', // Patient bookings need approval
    };

    this.isSubmitting = true;
    this.submitError = '';

    this.api.bookAppointment(bookingData).subscribe({
      next: (res) => {
        // Store in local appointment store for reschedule flow
        this.appointmentStore.createAppointment({
          service:         this.selectedCategory,
          category:        this.selectedCategory,
          time:            this.selectedTime,
          date:            this.selectedDate,
          durationMinutes: this.totalSelectedDuration,
          patientName:     fullName,
          patientEmail:    this.patientDetails.email.trim(),
          patientPhone:    this.patientDetails.phone.trim(),
          patientAge:      this.patientDetails.age.toString(),
          notes:           this.patientDetails.notes.trim(),
          servicesSummary: selectedServiceNames,
        });

        this.confirmedBooking = {
          appointmentId: res.id?.toString() ?? '',
          fullName,
          date:     this.selectedDate,
          time:     this.selectedTime,
          services: [...this.selectedSubServices],
        };

        this.wasRescheduleFlow = this.isRescheduleFlow;
        this.isSubmitting = false;
        this.isRescheduleFlow = false;
        this.rescheduleAppointmentId = null;
        this.resetSelection();
        this.resetPatientDetails();

        // Refresh available slots to show updated counts
        this.refreshAvailableSlots(this.selectedDate);

        // Show the success modal — cdr.detectChanges() ensures it renders immediately
        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message
          || 'Booking failed. Please make sure the server is running and try again.';
        this.cdr.detectChanges();
      }
    });
  }

  convertTo24Hour(time12h: string): string {
    if (!time12h) {
      return '';
    }

    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    let hour = parseInt(hours, 10);
    
    // Convert 12-hour to 24-hour format
    if (modifier === 'AM') {
      if (hour === 12) {
        hour = 0; // 12 AM is 00:XX
      }
    } else if (modifier === 'PM') {
      if (hour !== 12) {
        hour += 12; // 1 PM is 13, 2 PM is 14, etc.
      }
      // 12 PM stays as 12
    }
    
    // Pad hours and minutes with leading zeros
    const paddedHours = String(hour).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    
    return `${paddedHours}:${paddedMinutes}`;
  }

  startNewBooking() {
    this.showSuccessModal = false;
    this.bookingConfirmed = false;
    this.currentStep = 1;
    this.selectedCategory = '';
    this.isRescheduleFlow = false;
    this.rescheduleAppointmentId = null;
    this.resetSelection();
    this.resetPatientDetails();
    this.resetConfirmedBooking();
  }

  goToDashboardFromModal() {
    this.showSuccessModal = false;
    this.bookingConfirmed = true; // Set to show success state before leaving
    this.router.navigate(['/patient-dashboard']);
  }

  goToAppointmentsFromModal() {
    this.showSuccessModal = false;
    this.bookingConfirmed = true; // Set to show success state before leaving
    this.router.navigate(['/patient-appointments']);
  }

  goToDashboard() {
    this.router.navigate(['/patient-dashboard']);
  }

  goToAppointments() {
    this.router.navigate(['/patient-appointments']);
  }

  /** Called by "← Back to Dashboard" button */
  requestBackToDashboard() {
    if (this.hasBookingStarted && !this.bookingConfirmed) {
      this.pendingNavigationUrl = '/patient-dashboard';
      this.showLeaveConfirm = true;
    } else {
      this.router.navigate(['/patient-dashboard']);
    }
  }

  /** Called by "Cancel Booking" buttons */
  requestCancel() {
    if (this.hasBookingStarted && !this.bookingConfirmed) {
      this.showCancelConfirm = true;
    } else {
      this.doCancel();
    }
  }

  confirmLeave() {
    this.showLeaveConfirm = false;
    this.doFullReset();
    this.router.navigate([this.pendingNavigationUrl || '/patient-dashboard']);
  }

  dismissLeave() {
    this.showLeaveConfirm = false;
    this.pendingNavigationUrl = '';
  }

  confirmCancel() {
    this.showCancelConfirm = false;
    this.doCancel();
  }

  dismissCancel() {
    this.showCancelConfirm = false;
  }

  private doCancel() {
    this.doFullReset();
  }

  private doFullReset() {
    this.bookingConfirmed = false;
    this.currentStep = 1;
    this.selectedCategory = '';
    this.isRescheduleFlow = false;
    this.rescheduleAppointmentId = null;
    this.resetSelection();
    this.resetPatientDetails();
    this.resetConfirmedBooking();
  }

  private handleRescheduleState(appointmentId: string | null): void {
    this.isRescheduleFlow = false;
    this.rescheduleAppointmentId = null;

    if (!appointmentId) return;

    const appointment = this.appointmentStore.getAppointmentById(appointmentId);
    if (!appointment) return;

    this.isRescheduleFlow = true;
    this.rescheduleAppointmentId = appointment.id;
    this.selectedCategory = appointment.category;
    this.currentStep = 1.5;
    this.selectedServices = [...appointment.servicesSummary];
    this.selectedSubServices = this.currentSubServices.filter((service) =>
      appointment.servicesSummary.includes(service.name),
    );
    this.totalSelectedDuration = this.selectedSubServices.reduce((total, service) => total + service.duration, 0);
    this.patientDetails = {
      firstName: appointment.patientName.split(' ')[0] ?? '',
      lastName: appointment.patientName.split(' ').slice(1).join(' '),
      email: appointment.patientEmail,
      phone: appointment.patientPhone,
      age: appointment.patientAge,
      notes: appointment.notes,
      rescheduleReason: '',
    };
  }
}
