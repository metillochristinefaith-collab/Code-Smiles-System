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
  duration: number;
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
    ],
    'Pediatric Care': [
      { name: 'Pediatric Check-up', duration: 20 },
      { name: 'Pediatric Cleaning', duration: 30 },
      { name: 'Fluoride for Kids', duration: 15 },
      { name: 'Baby Tooth Extraction', duration: 30 },
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
    if (!email) return true; // email is optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  get isAgeValid(): boolean {
    const age = String(this.patientAge).trim();
    if (!age) return true; // age is optional
    const ageNum = parseInt(age, 10);
    return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
  }

  get canSubmit(): boolean {
    const hasValidName = this.isNameValid;
    const hasValidPhone = this.isPhoneValid;
    const hasValidEmail = this.isEmailValid;
    const hasValidAge = this.isAgeValid;
    const hasCategory = !!this.selectedCategory;
    const hasServices = this.selectedServices.length > 0;
    const hasDate = !!this.selectedDate;
    const hasTime = !!this.selectedTime;

    return hasValidName && hasValidPhone && hasValidEmail && hasValidAge && hasCategory && hasServices && hasDate && hasTime;
  }

  get confirmedServiceNames(): string {
    return this.confirmedBooking.services.map((service) => service.name).join(', ');
  }

  selectCategory(category: string): void {
    if (this.selectedCategory !== category) {
      this.resetSelection();
    }
    this.selectedCategory = category;
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

      const isPast = dateObj < today;
      const isFullyBooked = day % 4 === 0;

      this.calendarDays.push({
        number: day,
        date: this.formatDateLocal(dateObj),
        isToday: dateObj.getTime() === today.getTime(),
        isPast,
        isFullyBooked,
        isAvailable: !isPast && !isFullyBooked,
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
        // Filter slots that can fit the selected services duration
        this.availableSlots = (response.availableTimes || [])
          .filter((slot: any) => {
            // Parse the time to minutes
            const [hours, minutes] = slot.time24.split(':').map(Number);
            const startMin = hours * 60 + minutes;
            const endMin = startMin + this.totalSelectedDuration;
            
            // Check if appointment fits within operating hours
            // Operating hours: 09:00 - 21:00 (with lunch 12:00-13:00)
            const isWithinHours = startMin >= 9 * 60 && endMin <= 21 * 60;
            const isNotLunch = !(startMin >= 12 * 60 && startMin < 13 * 60);
            
            return isWithinHours && isNotLunch && slot.slotsLeft > 0;
          })
          .map((slot: any) => ({
            time: slot.time,
            slotsLeft: Math.min(slot.slotsLeft, 4), // Max 4 slots
          }));
      },
      error: (err) => {
        console.error('Error fetching available slots:', err);
        this.availableSlots = [];
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
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    let hour = parseInt(hours, 10);

    if (modifier === 'AM' && hour === 12) hour = 0;
    if (modifier === 'PM' && hour !== 12) hour += 12;

    hours = String(hour).padStart(2, '0');
    minutes = String(minutes).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  submit(): void {
    if (this.isSubmitting || !this.canSubmit) {
      this.submitError = 'Please complete the required booking details before submitting.';
      return;
    }

    const staffNotes = [
      `Staff booking type: ${this.bookingType}`,
      `Intake priority: ${this.intakePriority}`,
      `Intake source: ${this.intakeSource}`,
      String(this.patientAge).trim() ? `Patient age: ${String(this.patientAge).trim()}` : '',
      this.notes.trim() ? `Notes: ${this.notes.trim()}` : '',
    ].filter(Boolean).join('\n');

    this.isSubmitting = true;
    this.submitError = '';

    this.api.bookAppointment({
      patient_id: null,
      full_name: this.patientName.trim(),
      phone: this.patientPhone.trim(),
      email: this.patientEmail.trim() || `staff-booking-${Date.now()}@codesmiles.local`,
      treatment: this.selectedCategory,
      services: this.selectedServices,
      appointment_date: this.selectedDate,
      appointment_time: this.convertTo24Hour(this.selectedTime),
      duration_minutes: this.totalSelectedDuration,
      notes: staffNotes,
      booking_type: this.bookingType, // Send booking type to backend
    }).subscribe({
      next: (response) => {
        this.confirmedBooking = {
          fullName: this.patientName.trim(),
          date: this.selectedDate,
          time: this.selectedTime,
          services: [...this.selectedSubServices],
        };
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message || 'Booking failed. Please try again.';
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
}
