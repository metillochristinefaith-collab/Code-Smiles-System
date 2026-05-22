import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';

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
  selector: 'app-staff-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-booking.html',
  styleUrls: ['./staff-booking.css'],
})
export class StaffBookingComponent implements OnInit {
  readonly MAX_MINUTES = 120;

  currentStep: number | 1.5 = 1;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;

  bookingType: 'Walk-in' | 'Registered patient' = 'Walk-in';
  intakePriority: 'Standard' | 'Urgent' = 'Standard';
  intakeSource: 'Front desk' | 'Phone call' | 'Staff referral' = 'Front desk';

  patientName = '';
  patientPhone = '';
  patientEmail = '';
  patientAge = '';
  notes = '';

  selectedCategory = '';
  selectedServices: string[] = [];
  selectedSubServices: ServiceDetail[] = [];
  totalSelectedDuration = 0;

  selectedDate = '';
  selectedTime = '';
  availableSlots: TimeSlot[] = [];

  // Multi-service booking
  currentServiceIndex: number = 0;
  serviceSchedules: ServiceSchedule[] = [];

  viewDate = new Date();
  currentMonthName = '';
  currentYear = 0;
  calendarDays: any[] = [];

  confirmedBooking = {
    fullName: '',
    date: '',
    time: '',
    services: [] as ServiceDetail[],
  };

  readonly serviceMap: Record<string, ServiceDetail[]> = {
    'General Dentistry': [
      { name: 'Oral Consultation', duration: 15 },
      { name: 'Dental Cleaning', duration: 45 },
      { name: 'Digital X-Rays', duration: 20 },
      { name: 'Tooth Fillings', duration: 60 },
      { name: 'Fluoride Treatment', duration: 15 },
      { name: 'Dental Sealants', duration: 30 },
      { name: 'Simple Tooth Extraction', duration: 45 },
      { name: 'Emergency Dental Care', duration: 60 },
    ],
    'Cosmetic Arts': [
      { name: 'Teeth Whitening', duration: 60 },
      { name: 'Dental Veneers', duration: 90 },
      { name: 'Dental Bonding', duration: 60 },
      { name: 'Smile Makeover', duration: 120 },
      { name: 'Tooth Contouring', duration: 45 },
      { name: 'Gum Contouring', duration: 60 },
    ],
    Orthodontics: [
      { name: 'Traditional Braces', duration: 90 },
      { name: 'Ceramic Braces', duration: 90 },
      { name: 'Self-Ligating Braces', duration: 90 },
      { name: 'Clear Aligners', duration: 45 },
      { name: 'Retainers', duration: 30 },
      { name: 'Orthodontic Consultation', duration: 30 },
    ],
    'Oral Surgery': [
      { name: 'Surgical Tooth Extraction', duration: 60 },
      { name: 'Wisdom Tooth Removal', duration: 90 },
      { name: 'Minor Oral Surgery', duration: 45 },
      { name: 'Frenectomy', duration: 30 },
    ],
    'Dental Implants': [
      { name: 'Implant Consultation', duration: 30 },
      { name: 'Single Tooth Implant', duration: 90 },
      { name: 'Multiple Tooth Implant', duration: 120 },
      { name: 'Implant Crown Placement', duration: 60 },
      { name: 'Implant Maintenance', duration: 45 },
    ],
    'Pediatric Care': [
      { name: 'Pediatric Check-up', duration: 20 },
      { name: 'Pediatric Cleaning', duration: 30 },
      { name: 'Fluoride for Kids', duration: 15 },
      { name: 'Dental Sealants', duration: 30 },
      { name: 'Baby Tooth Extraction', duration: 30 },
      { name: 'Space Maintainers', duration: 45 },
    ],
  };

  readonly categoryCards = [
    {
      name: 'General Dentistry',
      icon: '🦷',
      description: 'Preventive care & cleanings',
      tone: 'general',
    },
    {
      name: 'Cosmetic Arts',
      icon: '✨',
      description: 'Veneers and whitening',
      tone: 'cosmetic',
    },
    {
      name: 'Orthodontics',
      icon: '💎',
      description: 'Braces and aligners',
      tone: 'ortho',
    },
    {
      name: 'Oral Surgery',
      icon: '🏥',
      description: 'Specialist surgical care',
      tone: 'surgery',
    },
    {
      name: 'Dental Implants',
      icon: '⚙️',
      description: 'Restorative solutions',
      tone: 'implants',
    },
    {
      name: 'Pediatric Care',
      icon: '🧸',
      description: 'Care for children',
      tone: 'pediatric',
    },
  ];

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
  }

  get stepNumber(): number {
    if (this.currentStep === 1 || this.currentStep === 1.5) return 1;
    return this.currentStep;
  }

  get currentSubServices(): ServiceDetail[] {
    return this.serviceMap[this.selectedCategory] ?? [];
  }

  get isNameValid(): boolean {
    return this.patientName.trim().length >= 2;
  }

  get isPhoneValid(): boolean {
    const phone = this.patientPhone.trim();
    return phone.length === 11 && /^09\d{9}$/.test(phone);
  }

  get isEmailValid(): boolean {
    const email = this.patientEmail.trim();
    if (!email) return false; // email is required in staff-booking
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get isAgeValid(): boolean {
    const age = String(this.patientAge).trim();
    if (!age) return false; // age is required in staff-booking
    const ageNum = parseInt(age, 10);
    return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
  }

  get canSubmit(): boolean {
    const hasValidName = this.isNameValid;
    const hasValidPhone = this.isPhoneValid;
    const hasValidEmail = this.isEmailValid;
    const hasValidAge = this.isAgeValid;
    const hasCategory = !!this.selectedCategory;
    // BUG FIX #9: Check selectedSubServices instead of selectedServices (which is just names)
    const hasServices = this.selectedSubServices.length > 0;
    const hasDate = !!this.selectedDate;
    const hasTime = !!this.selectedTime;

    return hasValidName && hasValidPhone && hasValidEmail && hasValidAge && hasCategory && hasServices && hasDate && hasTime;
  }

  get confirmedServiceNames(): string {
    return this.confirmedBooking.services.map((service) => service.name).join(', ');
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    // Don't reset selection - allow selecting services from multiple categories
  }

  toggleService(serviceName: string): void {
    const service = this.currentSubServices.find((item) => item.name === serviceName);
    if (!service) return;

    const index = this.selectedServices.indexOf(serviceName);

    if (index > -1) {
      this.selectedServices.splice(index, 1);
      this.selectedSubServices = this.selectedSubServices.filter((item) => item.name !== serviceName);
      this.totalSelectedDuration -= service.duration;
    } else if (
      this.selectedServices.length < 3 &&
      this.totalSelectedDuration + service.duration <= this.MAX_MINUTES
    ) {
      this.selectedServices.push(serviceName);
      this.selectedSubServices.push(service);
      this.totalSelectedDuration += service.duration;
    }

    // Refresh available slots if date is selected
    if (this.selectedDate) {
      this.fetchAvailableSlotsFromAPI(this.selectedDate);
      // Clear selected time if it no longer fits
      if (!this.availableSlots.some((slot) => slot.time === this.selectedTime && slot.slotsLeft > 0)) {
        this.selectedTime = '';
      }
    }
    
    // Clear any previous errors when services change
    this.submitError = '';
  }

  proceedToScheduling(): void {
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

  resetSelection(): void {
    this.selectedServices = [];
    this.selectedSubServices = [];
    this.totalSelectedDuration = 0;
    this.selectedDate = '';
    this.selectedTime = '';
    this.availableSlots = [];
  }

  generateCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    this.currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.viewDate);
    this.currentYear = year;
    this.calendarDays = [];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i += 1) {
      this.calendarDays.push({
        number: '',
        date: '',
        isPast: true,
        isFullyBooked: false,
        isAvailable: false,
        isToday: false,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day);
      dateObj.setHours(0, 0, 0, 0);

      const dayOfWeek = dateObj.getDay();
      const isPast = dateObj < today;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      this.calendarDays.push({
        number: day,
        date: this.formatDateLocal(dateObj),
        isToday: dateObj.getTime() === today.getTime(),
        isPast,
        isFullyBooked: false, // Will be determined by API call
        isAvailable: !isPast,
      });
    }
  }

  prevMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  selectDate(date: string): void {
    const day = this.calendarDays.find((item) => item.date === date);
    if (!day?.isAvailable || day.isPast || day.isFullyBooked) {
      this.selectedDate = '';
      this.selectedTime = '';
      this.availableSlots = [];
      return;
    }

    this.selectedDate = date;
    this.selectedTime = '';
    this.submitError = ''; // Clear any previous errors when selecting a new date
    this.availableSlots = []; // Clear slots immediately while loading
    
    // Fetch available slots from API
    if (this.selectedCategory) {
      this.fetchAvailableSlotsFromAPI(date);
    } else {
      this.availableSlots = [];
    }
  }

  fetchAvailableSlotsFromAPI(date: string): void {
    if (!this.selectedCategory) {
      this.availableSlots = [];
      return;
    }

    // Call the API to get available times
    this.api.getAvailableTimes(date, this.selectedCategory).subscribe({
      next: (response) => {
        // Map all slots, don't filter them out - just mark as full if slotsLeft === 0
        this.availableSlots = (response.availableTimes || [])
          .map((slot: any) => ({
            time: slot.time,
            slotsLeft: slot.slotsLeft, // Keep original count, don't cap at 4
          }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching available slots:', err);
        this.availableSlots = [];
        this.cdr.detectChanges();
      },
    });
  }

  generateAvailableSlots(date: string): TimeSlot[] {
    // For now, return empty array - will be populated by API call
    // This is a placeholder until we integrate with the real API
    return [];
  }

  getSlotsLeftForTime(start: number): number {
    // Deprecated - using API instead
    return 0;
  }

  to12Hour(totalMinutes: number): string {
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${suffix}`;
  }

  convertTo24Hour(time12h: string): string {
    // BUG FIX #6: Add comprehensive validation for time format
    if (!time12h) {
      console.error('[STAFF-BOOKING] Empty time string');
      return '';
    }

    // Validate format: "HH:MM AM/PM"
    const timeRegex = /^(\d{1,2}):(\d{2})\s+(AM|PM)$/i;
    const match = time12h.trim().match(timeRegex);
    
    if (!match) {
      console.error(`[STAFF-BOOKING] Invalid time format: ${time12h}`);
      return '';
    }

    let hour = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3].toUpperCase();

    // Validate hour range for 12-hour format
    if (hour < 1 || hour > 12) {
      console.error(`[STAFF-BOOKING] Invalid hour for 12-hour format: ${hour}`);
      return '';
    }

    // Validate minutes range
    const minutesNum = parseInt(minutes, 10);
    if (minutesNum < 0 || minutesNum > 59) {
      console.error(`[STAFF-BOOKING] Invalid minutes: ${minutesNum}`);
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
      console.error(`[STAFF-BOOKING] Index out of bounds: ${this.currentServiceIndex} for array length ${this.serviceSchedules.length}`);
      return null as any;
    }
    return this.serviceSchedules[this.currentServiceIndex];
  }

  selectDateForMultiService(date: string): void {
    const schedule = this.getCurrentServiceSchedule();
    const dayObj = this.calendarDays.find(d => d.date === date);
    
    if (dayObj && dayObj.isAvailable && !dayObj.isPast && !dayObj.isFullyBooked) {
      schedule.selectedDate = date;
      schedule.selectedTime = '';
      schedule.availableSlots = [];
      this.loadAvailableSlotsForMultiService();
    }
  }

  async loadAvailableSlotsForMultiService(): Promise<void> {
    const schedule = this.getCurrentServiceSchedule();

    if (!schedule.selectedDate) {
      alert('Please select a date');
      return;
    }

    schedule.isLoadingSlots = true;

    try {
      // Get available slots for this service on this date
      const slotsResponse = await this.api.getAvailableTimes(schedule.selectedDate, schedule.service.name).toPromise();

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

  selectTimeForMultiService(time: string): void {
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

  proceedToNextService(): void {
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
      console.error(`[STAFF-BOOKING] Invalid time format: ${timeStr}`);
      return 0;
    }

    // Validate ranges for 12-hour format
    if (modifier && (modifier === 'AM' || modifier === 'PM')) {
      if (hours < 1 || hours > 12) {
        console.error(`[STAFF-BOOKING] Invalid hour for 12-hour format: ${hours}`);
        return 0;
      }
    }

    if (minutes < 0 || minutes > 59) {
      console.error(`[STAFF-BOOKING] Invalid minutes: ${minutes}`);
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

  goBackToServiceSelection(): void {
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

  submit(): void {
    if (this.isSubmitting || !this.canSubmit) {
      this.submitError = 'Please complete the required booking details before submitting.';
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

    const staffNotes = [
      `Staff booking type: ${this.bookingType}`,
      `Intake priority: ${this.intakePriority}`,
      `Intake source: ${this.intakeSource}`,
      String(this.patientAge).trim() ? `Patient age: ${String(this.patientAge).trim()}` : '',
      this.notes.trim() ? `Notes: ${this.notes.trim()}` : '',
    ].filter(Boolean).join('\n');

    // Prepare appointments based on booking type
    let appointments: any[];

    if (this.selectedSubServices.length === 1) {
      // Single service
      appointments = [{
        date: this.selectedDate,
        time: this.convertTo24Hour(this.selectedTime)
      }];
    } else {
      // Multi-service
      appointments = this.serviceSchedules.map(schedule => ({
        date: schedule.selectedDate,
        time: this.convertTo24Hour(schedule.selectedTime)
      }));
    }

    const bookingData = {
      services: this.selectedSubServices.map(s => ({
        name: s.name,
        category: s.category,
        duration: s.duration
      })),
      appointments,
      patientDetails: {
        firstName: this.patientName.trim().split(' ')[0] || '',
        lastName: this.patientName.trim().split(' ').slice(1).join(' ') || '',
        email: this.patientEmail.trim() || `staff-booking-${Date.now()}@codesmiles.local`,
        phone: this.patientPhone.trim(),
        age: this.patientAge,
        notes: staffNotes
      },
      bookingType: this.bookingType,
      intakePriority: this.intakePriority,
      intakeSource: this.intakeSource
    };

    this.isSubmitting = true;
    this.submitError = '';

    const payload = {
      patient_id: null,
      full_name: this.patientName.trim(),
      phone: this.patientPhone.trim(),
      email: this.patientEmail.trim() || `staff-booking-${Date.now().toString(36)}@codesmiles.local`,
      treatment: this.selectedCategory,
      services: this.selectedSubServices.map(s => s.name),
      appointment_date: this.selectedDate,
      appointment_time: this.selectedSubServices.length === 1 ? this.convertTo24Hour(this.selectedTime) : this.convertTo24Hour(this.serviceSchedules[0].selectedTime),
      duration_minutes: this.totalSelectedDuration,
      notes: staffNotes,
      booking_type: this.bookingType
    };

    console.log('[STAFF-BOOKING] Submitting payload:', payload);

    this.api.bookAppointment(payload).subscribe({
      next: (response: any) => {
        this.confirmedBooking = {
          fullName: this.patientName.trim(),
          date: this.selectedDate,
          time: this.selectedSubServices.length === 1 ? this.selectedTime : this.serviceSchedules[0].selectedTime,
          services: [...this.selectedSubServices],
        };
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('[STAFF-BOOKING] Submission error:', err);
        this.submitError = err?.error?.message || err?.error?.error || 'Booking failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  bookAnother(): void {
    this.currentStep = 1;
    this.bookingType = 'Walk-in';
    this.intakePriority = 'Standard';
    this.intakeSource = 'Front desk';
    this.patientName = '';
    this.patientPhone = '';
    this.patientEmail = '';
    this.patientAge = '';
    this.notes = '';
    this.selectedCategory = '';
    // BUG FIX #4: Reset multi-service state for new booking
    this.currentServiceIndex = 0;
    this.serviceSchedules = [];
    this.resetSelection();
    this.submitSuccess = false;
    this.submitError = '';
  }

  goToAppointments(): void {
    this.router.navigate(['/staff-appointments']);
  }

  goBack(): void {
    this.router.navigate(['/staff-appointments']);
  }

  proceedToPatientDetails(): void {
    // BUG FIX #10: Validate date and time are selected before proceeding
    if (!this.selectedDate) {
      alert('Please select a date');
      return;
    }
    if (!this.selectedTime) {
      alert('Please select a time');
      return;
    }
    this.currentStep = 3;
    this.submitError = '';
    this.cdr.detectChanges();
  }
}
