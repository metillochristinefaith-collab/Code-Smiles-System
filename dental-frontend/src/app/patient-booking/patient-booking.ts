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
  category?: string;
  duration: number;
  dentistId?: number;
  dentistName?: string;
  date?: string;
  time?: string;
  endTime?: string;
}

interface ServiceSchedule {
  service: ServiceDetail;
  selectedDate: string;
  selectedTime: string;
  availableSlots: TimeSlot[];
  isLoadingSlots: boolean;
  availableDentists: any[];
  selectedDentist?: any;
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
  readonly MAX_SERVICES = 3;

  // Single service booking
  selectedDate: string = '';
  selectedTime: string = '';
  availableSlots: TimeSlot[] = [];
  isLoadingSlots: boolean = false;

  // Multi-service booking
  currentServiceIndex: number = 0;
  serviceSchedules: ServiceSchedule[] = [];

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
      // Remove service
      this.selectedServices.splice(index, 1);
      this.selectedSubServices = this.selectedSubServices.filter(s => s.name !== serviceName);
      this.totalSelectedDuration -= serviceObj.duration;
    } else {
      // Add service
      if (this.selectedServices.length >= this.MAX_SERVICES) {
        alert(`Maximum ${this.MAX_SERVICES} services allowed`);
        return;
      }

      const newDuration = this.totalSelectedDuration + serviceObj.duration;
      if (newDuration > this.MAX_MINUTES) {
        alert(`Total duration cannot exceed ${this.MAX_MINUTES} minutes`);
        return;
      }

      this.selectedServices.push(serviceName);
      this.selectedSubServices.push({
        name: serviceObj.name,
        category: this.selectedCategory,
        duration: serviceObj.duration
      });
      this.totalSelectedDuration += serviceObj.duration;
    }

    if (this.selectedDate && this.selectedSubServices.length === 1) {
      // Re-generate slots when service selection changes (only for single service)
      this.selectDate(this.selectedDate);
    }
  }

  proceedToScheduling() {
    if (this.selectedSubServices.length === 0) {
      alert('Please select at least one service');
      return;
    }

    // DECISION POINT: Single vs Multi-service
    if (this.selectedSubServices.length === 1) {
      // Single service → Skip to date/time selection (original flow)
      this.currentStep = 2;
    } else {
      // Multi-service → Go to individual scheduling
      // BUG FIX #5: Use deep clone instead of shallow copy to prevent shared state
      this.serviceSchedules = this.selectedSubServices.map(service => ({
        service: JSON.parse(JSON.stringify(service)),
        selectedDate: '',
        selectedTime: '',
        availableSlots: [],
        isLoadingSlots: false,
        availableDentists: []
      }));
      this.currentStep = 2.5; // Multi-service scheduling step
      this.currentServiceIndex = 0;
    }

    this.cdr.detectChanges();
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
      
      // Check if date is within operating hours (not past)
      // Weekends are now allowed - clinic is open Saturday and Sunday
      const isOperatingDay = !isPast;

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
    console.log(`[BOOKING] selectDate called with date: ${date}`);
    const dayObj = this.calendarDays.find(d => d.date === date);
    console.log(`[BOOKING] Day object:`, dayObj);
    
    if (dayObj && dayObj.isAvailable && !dayObj.isPast && !dayObj.isFullyBooked) {
      console.log(`[BOOKING] Date is valid, setting selectedDate to ${date}`);
      this.selectedDate = date;
      this.selectedTime = '';
      this.submitError = ''; // Clear any previous errors
      this.availableSlots = []; // Clear slots immediately while loading
      this.refreshAvailableSlots(date);
    } else {
      console.warn(`[BOOKING] Date is invalid:`, {
        dayObjExists: !!dayObj,
        isAvailable: dayObj?.isAvailable,
        isPast: dayObj?.isPast,
        isFullyBooked: dayObj?.isFullyBooked
      });
      this.selectedDate = '';
      this.selectedTime = '';
      this.availableSlots = [];
    }
  }

  private refreshAvailableSlots(date: string) {
    // Get the first selected service
    if (this.selectedSubServices.length === 0) {
      console.warn(`[BOOKING] No services selected, cannot fetch available slots`);
      this.availableSlots = [];
      return;
    }

    const service = this.selectedSubServices[0].name;
    
    console.log(`[BOOKING] Fetching available times for date: ${date}, service: ${service}`);
    this.isLoadingSlots = true;
    this.availableSlots = []; // Clear slots while loading
    
    // Fetch real slot counts from API
    this.api.getAvailableTimes(date, service).subscribe({
      next: (response: any) => {
        console.log(`[BOOKING] API Response:`, response);
        if (response && response.availableTimes && Array.isArray(response.availableTimes)) {
          this.availableSlots = response.availableTimes;
          console.log(`[BOOKING] Loaded ${this.availableSlots.length} available slots`);
          if (this.availableSlots.length === 0) {
            console.warn(`[BOOKING] WARNING: No available slots returned for ${date} and ${service}`);
          }
        } else {
          console.warn(`[BOOKING] Invalid response structure:`, response);
          this.availableSlots = [];
        }
        this.isLoadingSlots = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(`[BOOKING] Error fetching available times:`, err);
        this.submitError = `Failed to load available times: ${err?.error?.error || err?.message || 'Unknown error'}`;
        this.availableSlots = [];
        this.isLoadingSlots = false;
        this.cdr.detectChanges();
      }
    });
  }

  private timeStringToMinutes(timeStr: string): number {
    // BUG FIX #2: Add validation for 12-hour format
    // Handle both "HH:MM" and "HH:MM AM/PM" formats
    const parts = timeStr.trim().split(/\s+/);
    const timePart = parts[0];
    const modifier = (parts[1] || '').toUpperCase(); // Normalize to uppercase
    
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    // Validate hours and minutes
    if (isNaN(hours) || isNaN(minutes)) {
      console.error(`[BOOKING] Invalid time format: ${timeStr}`);
      return 0;
    }

    // Validate ranges for 12-hour format
    if (modifier && (modifier === 'AM' || modifier === 'PM')) {
      if (hours < 1 || hours > 12) {
        console.error(`[BOOKING] Invalid hour for 12-hour format: ${hours}`);
        return 0;
      }
    }

    if (minutes < 0 || minutes > 59) {
      console.error(`[BOOKING] Invalid minutes: ${minutes}`);
      return 0;
    }

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

  // ═════════════════════════════════════════════════════════════════════════════
  // MULTI-SERVICE SCHEDULING METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  getCurrentServiceSchedule(): ServiceSchedule {
    // BUG FIX #3: Add bounds checking to prevent undefined access
    if (this.currentServiceIndex < 0 || this.currentServiceIndex >= this.serviceSchedules.length) {
      console.error(`[BOOKING] Index out of bounds: ${this.currentServiceIndex} for array length ${this.serviceSchedules.length}`);
      return null as any;
    }
    return this.serviceSchedules[this.currentServiceIndex];
  }

  selectDateForMultiService(date: string) {
    const schedule = this.getCurrentServiceSchedule();
    const dayObj = this.calendarDays.find(d => d.date === date);
    
    if (dayObj && dayObj.isAvailable && !dayObj.isPast && !dayObj.isFullyBooked) {
      schedule.selectedDate = date;
      schedule.selectedTime = '';
      schedule.availableSlots = [];
      this.loadAvailableSlotsForMultiService();
    }
  }

  async loadAvailableSlotsForMultiService() {
    const schedule = this.getCurrentServiceSchedule();

    if (!schedule.selectedDate) {
      alert('Please select a date');
      return;
    }

    schedule.isLoadingSlots = true;

    try {
      // Get available slots for this service on this date
      const slotsResponse = await this.api.getAvailableTimes(
        schedule.selectedDate,
        schedule.service.name
      ).toPromise();

      schedule.availableSlots = (slotsResponse?.availableTimes || []).map((slot: any) => ({
        time: slot.time,
        slotsLeft: slot.slotsLeft
      }));

      if (schedule.availableSlots.length === 0) {
        console.warn('No available slots for this date and service');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      alert('Error loading available time slots');
      schedule.availableSlots = [];
    } finally {
      schedule.isLoadingSlots = false;
      this.cdr.detectChanges();
    }
  }

  selectTimeForMultiService(time: string) {
    const schedule = this.getCurrentServiceSchedule();
    schedule.selectedTime = time;

    // Calculate end time
    const [hours, minutes] = time.split(':').map(Number);
    const endMin = hours * 60 + minutes + schedule.service.duration;
    const endHours = Math.floor(endMin / 60);
    const endMinutes = endMin % 60;
    schedule.service.endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    schedule.service.date = schedule.selectedDate;
    schedule.service.time = time;
  }

  proceedToNextService() {
    const schedule = this.getCurrentServiceSchedule();

    if (!schedule || !schedule.selectedDate || !schedule.selectedTime) {
      alert('Please select both date and time for this service');
      return;
    }

    // Validate no time conflicts with previously scheduled services
    const currentStartTime = this.timeStringToMinutes(schedule.selectedTime);
    const currentEndTime = currentStartTime + schedule.service.duration;

    for (let i = 0; i < this.currentServiceIndex; i++) {
      const prevSchedule = this.serviceSchedules[i];
      if (prevSchedule.selectedDate === schedule.selectedDate) {
        const prevStartTime = this.timeStringToMinutes(prevSchedule.selectedTime);
        const prevEndTime = prevStartTime + prevSchedule.service.duration;

        // Check for overlap
        if ((currentStartTime < prevEndTime && currentEndTime > prevStartTime)) {
          alert(`This time slot overlaps with "${prevSchedule.service.name}" scheduled at ${prevSchedule.selectedTime}. Please choose a different time.`);
          return;
        }
      }
    }

    if (this.currentServiceIndex < this.serviceSchedules.length - 1) {
      this.currentServiceIndex++;
      // BUG FIX #8: Don't reset calendar - keep user's current month context
      this.generateCalendar();
      this.cdr.detectChanges();
    } else {
      // BUG FIX #1: Validate ALL services are scheduled before proceeding to step 3
      const allScheduled = this.serviceSchedules.every(s => 
        s.selectedDate && 
        s.selectedTime && 
        /^\d{4}-\d{2}-\d{2}$/.test(s.selectedDate) && 
        /^\d{2}:\d{2}/.test(s.selectedTime)
      );
      
      if (!allScheduled) {
        alert('Please schedule all services before proceeding.');
        return;
      }

      // All services scheduled, proceed to patient details
      this.currentStep = 3;
      this.cdr.detectChanges();
    }
  }

  goBackToServiceSelection() {
    if (this.currentServiceIndex > 0) {
      this.currentServiceIndex--;
    } else {
      this.currentStep = 1;
      // BUG FIX #7: Clear all service selections when going back to step 1
      this.selectedCategory = '';
      this.selectedServices = [];
      this.selectedSubServices = [];
      this.totalSelectedDuration = 0;
    }
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // BOOKING SUBMISSION
  // ═════════════════════════════════════════════════════════════════════════════

  completeBooking() {
    console.log(`[BOOKING] completeBooking called`);
    
    if (this.isSubmitting) {
      console.warn(`[BOOKING] Already submitting, ignoring`);
      return;
    }
    if (!this.canProceedToReview) {
      console.warn(`[BOOKING] Cannot proceed to review - validation failed`);
      return;
    }

    // Validate based on booking type
    if (this.selectedSubServices.length === 1) {
      // Single service
      if (!this.selectedDate || !this.selectedTime) {
        this.submitError = 'Please complete the service, date, and time before submitting.';
        return;
      }
    } else {
      // Multi-service
      const allScheduled = this.serviceSchedules.every(s => s.selectedDate && s.selectedTime);
      if (!allScheduled) {
        this.submitError = 'Please schedule all services before submitting.';
        return;
      }
    }

    const user = this.auth.getUser();
    const fullName = `${this.patientDetails.firstName.trim()} ${this.patientDetails.lastName.trim()}`;
    const selectedServiceNames = this.selectedSubServices.map((s) => s.name);

    console.log(`[BOOKING] Submitting booking:`, {
      fullName,
      serviceCount: this.selectedSubServices.length,
      services: selectedServiceNames
    });

    // Prepare appointments based on booking type
    let appointments: any[];

    if (this.selectedSubServices.length === 1) {
      // Single service
      const time24Hour = this.convertTo24Hour(this.selectedTime);
      appointments = [{
        date: this.selectedDate,
        time: time24Hour
      }];
    } else {
      // Multi-service
      appointments = this.serviceSchedules.map(schedule => ({
        date: schedule.selectedDate,
        time: schedule.selectedTime
      }));
    }

    this.isSubmitting = true;
    this.submitError = '';

    const bookingData = {
      patient_id: null,
      full_name: `${this.patientDetails.firstName.trim()} ${this.patientDetails.lastName.trim()}`,
      phone: this.patientDetails.phone.trim(),
      email: this.patientDetails.email.trim(),
      treatment: this.selectedCategory,
      services: this.selectedSubServices.map(s => s.name),
      appointment_date: this.selectedDate,
      appointment_time: this.selectedSubServices.length === 1 ? this.convertTo24Hour(this.selectedTime) : this.convertTo24Hour(this.serviceSchedules[0].selectedTime),
      duration_minutes: this.totalSelectedDuration,
      notes: this.patientDetails.notes.trim(),
      booking_type: 'Patient'
    };

    console.log(`[BOOKING] Submitting booking:`, bookingData);

    this.api.bookAppointment(bookingData).subscribe({
      next: (res: any) => {
        console.log(`[BOOKING] Booking successful:`, res);
        this.submitError = '';

        this.confirmedBooking = {
          appointmentId: res.id || res.appointment_id || '',
          fullName: `${this.patientDetails.firstName.trim()} ${this.patientDetails.lastName.trim()}`,
          date: this.selectedDate,
          time: this.selectedSubServices.length === 1 ? this.selectedTime : this.serviceSchedules[0].selectedTime,
          services: [...this.selectedSubServices],
        };

        this.wasRescheduleFlow = this.isRescheduleFlow;
        this.isSubmitting = false;
        this.isRescheduleFlow = false;
        this.rescheduleAppointmentId = null;
        this.resetSelection();
        this.resetPatientDetails();

        this.showSuccessModal = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(`[BOOKING] Booking failed:`, err);
        this.isSubmitting = false;
        this.submitError = err?.error?.error || 'Booking failed. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  convertTo24Hour(time12h: string): string {
    // BUG FIX #6: Add comprehensive validation for time format
    if (!time12h) {
      console.error('[BOOKING] Empty time string');
      return '';
    }

    // Validate format: "HH:MM AM/PM"
    const timeRegex = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/i;
    const match = time12h.trim().match(timeRegex);
    
    if (!match) {
      console.error(`[BOOKING] Invalid time format: ${time12h}`);
      return '';
    }

    let hour = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3].toUpperCase();

    // Validate hour range for 12-hour format
    if (hour < 1 || hour > 12) {
      console.error(`[BOOKING] Invalid hour for 12-hour format: ${hour}`);
      return '';
    }

    // Validate minutes range
    const minutesNum = parseInt(minutes, 10);
    if (minutesNum < 0 || minutesNum > 59) {
      console.error(`[BOOKING] Invalid minutes: ${minutesNum}`);
      return '';
    }
    
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
    // BUG FIX #4: Reset multi-service state for new booking
    this.currentServiceIndex = 0;
    this.serviceSchedules = [];
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
