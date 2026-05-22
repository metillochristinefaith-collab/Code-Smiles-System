import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface TimeSlot {
  time: string;
  slotsLeft: number;
}

interface ServiceDetail {
  name: string;
  category: string;
  duration: number;
}

interface SelectedService {
  name: string;
  category: string;
  duration: number;
  dentistId?: number;
  dentistName?: string;
  date?: string;
  time?: string;
  endTime?: string;
}

interface CompositeBookingStep {
  step: number;
  title: string;
  description: string;
}

@Component({
  selector: 'app-composite-patient-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientSidebarComponent],
  templateUrl: './composite-patient-booking.html',
  styleUrls: ['./composite-patient-booking.css']
})
export class CompositePatientBookingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: SERVICE SELECTION
  // ─────────────────────────────────────────────────────────────────────────────
  currentStep: number = 1;
  selectedCategory: string = '';
  selectedServices: string[] = [];
  selectedSubServices: SelectedService[] = [];
  totalSelectedDuration: number = 0;
  readonly MAX_SERVICES = 3;
  readonly MAX_MINUTES = 120;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: DATE & TIME SELECTION (For 1 service) OR INDIVIDUAL SCHEDULING (2-3)
  // ─────────────────────────────────────────────────────────────────────────────
  
  // For single service booking
  selectedDate: string = '';
  selectedTime: string = '';
  availableSlots: TimeSlot[] = [];
  isLoadingSlots: boolean = false;

  // For multi-service booking
  currentServiceIndex: number = 0;
  serviceSchedules: Array<{
    service: SelectedService;
    selectedDate: string;
    selectedTime: string;
    availableSlots: TimeSlot[];
    isLoadingSlots: boolean;
    availableDentists: any[];
    selectedDentist?: any;
  }> = [];

  viewDate: Date = new Date();
  currentMonthName: string = '';
  currentYear: number = 0;
  calendarDays: any[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: PATIENT DETAILS
  // ─────────────────────────────────────────────────────────────────────────────
  patientDetails = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    notes: ''
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: REVIEW & CONFIRM
  // ─────────────────────────────────────────────────────────────────────────────
  confirmedBooking = {
    bookingId: '',
    fullName: '',
    services: [] as SelectedService[],
    appointments: [] as any[]
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UI STATE
  // ─────────────────────────────────────────────────────────────────────────────
  isSubmitting = false;
  submitError = '';
  bookingConfirmed = false;
  showSuccessModal = false;
  showCancelConfirm = false;
  showLeaveConfirm = false;
  pendingNavigationUrl = '';

  // Service map (same as original)
  serviceMap: { [key: string]: ServiceDetail[] } = {
    'General Dentistry': [
      { name: 'Oral Consultation', category: 'General Dentistry', duration: 15 },
      { name: 'Dental Cleaning', category: 'General Dentistry', duration: 45 },
      { name: 'Digital X-Rays', category: 'General Dentistry', duration: 20 },
      { name: 'Tooth Fillings', category: 'General Dentistry', duration: 60 },
      { name: 'Fluoride Treatment', category: 'General Dentistry', duration: 15 },
      { name: 'Dental Sealants', category: 'General Dentistry', duration: 30 },
      { name: 'Simple Tooth Extraction', category: 'General Dentistry', duration: 45 },
      { name: 'Emergency Dental Care', category: 'General Dentistry', duration: 60 }
    ],
    'Cosmetic Arts': [
      { name: 'Teeth Whitening', category: 'Cosmetic Arts', duration: 60 },
      { name: 'Dental Veneers', category: 'Cosmetic Arts', duration: 90 },
      { name: 'Dental Bonding', category: 'Cosmetic Arts', duration: 60 },
      { name: 'Smile Makeover', category: 'Cosmetic Arts', duration: 120 },
      { name: 'Tooth Contouring', category: 'Cosmetic Arts', duration: 45 },
      { name: 'Gum Contouring', category: 'Cosmetic Arts', duration: 60 }
    ],
    'Orthodontics': [
      { name: 'Traditional Braces', category: 'Orthodontics', duration: 90 },
      { name: 'Ceramic Braces', category: 'Orthodontics', duration: 90 },
      { name: 'Self-Ligating Braces', category: 'Orthodontics', duration: 90 },
      { name: 'Clear Aligners', category: 'Orthodontics', duration: 45 },
      { name: 'Retainers', category: 'Orthodontics', duration: 30 },
      { name: 'Orthodontic Consultation', category: 'Orthodontics', duration: 30 }
    ],
    'Oral Surgery': [
      { name: 'Surgical Tooth Extraction', category: 'Oral Surgery', duration: 60 },
      { name: 'Wisdom Tooth Removal', category: 'Oral Surgery', duration: 90 },
      { name: 'Cyst Removal', category: 'Oral Surgery', duration: 60 },
      { name: 'Minor Oral Surgery', category: 'Oral Surgery', duration: 45 },
      { name: 'Frenectomy', category: 'Oral Surgery', duration: 30 }
    ],
    'Dental Implants': [
      { name: 'Implant Consultation', category: 'Dental Implants', duration: 30 },
      { name: 'Single Tooth Implant', category: 'Dental Implants', duration: 90 },
      { name: 'Multiple Tooth Implant', category: 'Dental Implants', duration: 120 },
      { name: 'Implant Crown Placement', category: 'Dental Implants', duration: 60 },
      { name: 'Implant Maintenance', category: 'Dental Implants', duration: 45 }
    ],
    'Pediatric Care': [
      { name: 'Pediatric Check-up', category: 'Pediatric Care', duration: 20 },
      { name: 'Pediatric Cleaning', category: 'Pediatric Care', duration: 30 },
      { name: 'Fluoride for Kids', category: 'Pediatric Care', duration: 15 },
      { name: 'Baby Tooth Extraction', category: 'Pediatric Care', duration: 30 },
      { name: 'Space Maintainers', category: 'Pediatric Care', duration: 45 }
    ]
  };

  ngOnInit() {
    this.loadPatientData();
    this.generateCalendar();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 1: SERVICE SELECTION
  // ═════════════════════════════════════════════════════════════════════════════

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleService(service: ServiceDetail) {
    const serviceName = service.name;
    const index = this.selectedServices.indexOf(serviceName);

    if (index > -1) {
      // Remove service
      this.selectedServices.splice(index, 1);
      this.selectedSubServices = this.selectedSubServices.filter(s => s.name !== serviceName);
    } else {
      // Add service
      if (this.selectedServices.length >= this.MAX_SERVICES) {
        alert(`Maximum ${this.MAX_SERVICES} services allowed`);
        return;
      }

      const newDuration = this.totalSelectedDuration + service.duration;
      if (newDuration > this.MAX_MINUTES) {
        alert(`Total duration cannot exceed ${this.MAX_MINUTES} minutes`);
        return;
      }

      this.selectedServices.push(serviceName);
      this.selectedSubServices.push({
        name: service.name,
        category: service.category,
        duration: service.duration
      });
    }

    this.updateTotalDuration();
  }

  updateTotalDuration() {
    this.totalSelectedDuration = this.selectedSubServices.reduce((sum, s) => sum + s.duration, 0);
  }

  isServiceSelected(serviceName: string): boolean {
    return this.selectedServices.includes(serviceName);
  }

  proceedToScheduling() {
    if (this.selectedSubServices.length === 0) {
      alert('Please select at least one service');
      return;
    }

    // If only 1 service selected, use original booking flow
    if (this.selectedSubServices.length === 1) {
      this.currentStep = 3; // Skip to patient details (original flow)
      this.cdr.detectChanges();
      return;
    }

    // If 2-3 services selected, use composite scheduling flow
    this.serviceSchedules = this.selectedSubServices.map(service => ({
      service,
      selectedDate: '',
      selectedTime: '',
      availableSlots: [],
      isLoadingSlots: false,
      availableDentists: []
    }));

    this.currentStep = 2; // Go to individual scheduling
    this.currentServiceIndex = 0;
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 2: DATE & TIME SELECTION (Single Service)
  // ═════════════════════════════════════════════════════════════════════════════

  selectDateForService(date: string) {
    this.selectedDate = date;
    this.loadAvailableSlotsForSingleService();
  }

  async loadAvailableSlotsForSingleService() {
    if (!this.selectedDate) {
      alert('Please select a date');
      return;
    }

    this.isLoadingSlots = true;

    try {
      const service = this.selectedSubServices[0];
      
      // Get available dentists for this service
      const dentistsResponse = await this.api.get(
        `/api/composite-booking/dentists/${encodeURIComponent(service.name)}`
      ).toPromise();

      if (dentistsResponse.dentists.length === 0) {
        alert('No dentists available for this service');
        return;
      }

      // Use first available dentist
      const dentist = dentistsResponse.dentists[0];

      // Load available slots for this dentist
      const slotsResponse = await this.api.get(
        `/api/composite-booking/available-slots?date=${this.selectedDate}&serviceName=${encodeURIComponent(service.name)}&dentistId=${dentist.id}`
      ).toPromise();

      this.availableSlots = slotsResponse.availableSlots;

      if (this.availableSlots.length === 0) {
        alert('No available slots for this date');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      alert('Error loading available time slots');
    } finally {
      this.isLoadingSlots = false;
    }
  }

  selectTimeForSingleService(time: string) {
    this.selectedTime = time;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 2: INDIVIDUAL SERVICE SCHEDULING (Multi-Service)
  // ═════════════════════════════════════════════════════════════════════════════

  getCurrentServiceSchedule() {
    return this.serviceSchedules[this.currentServiceIndex];
  }

  selectDateForService(date: string) {
    const schedule = this.getCurrentServiceSchedule();
    schedule.selectedDate = date;
    this.loadAvailableSlotsForService();
  }

  async loadAvailableSlotsForService() {
    const schedule = this.getCurrentServiceSchedule();

    if (!schedule.selectedDate) {
      alert('Please select a date');
      return;
    }

    // First, get available dentists for this service
    schedule.isLoadingSlots = true;

    try {
      const dentistsResponse = await this.api.get(
        `/api/composite-booking/dentists/${encodeURIComponent(schedule.service.name)}`
      ).toPromise();

      schedule.availableDentists = dentistsResponse.dentists;

      if (schedule.availableDentists.length === 0) {
        alert('No dentists available for this service');
        return;
      }

      // Select first available dentist by default
      schedule.selectedDentist = schedule.availableDentists[0];

      // Load available slots for this dentist
      await this.loadSlotsForDentist(schedule);
    } catch (error) {
      console.error('Error loading dentists:', error);
      alert('Error loading available dentists');
    } finally {
      schedule.isLoadingSlots = false;
    }
  }

  async loadSlotsForDentist(schedule: any) {
    schedule.isLoadingSlots = true;

    try {
      const slotsResponse = await this.api.get(
        `/api/composite-booking/available-slots?date=${schedule.selectedDate}&serviceName=${encodeURIComponent(schedule.service.name)}&dentistId=${schedule.selectedDentist.id}`
      ).toPromise();

      schedule.availableSlots = slotsResponse.availableSlots;

      if (schedule.availableSlots.length === 0) {
        alert('No available time slots for this date and dentist');
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      alert('Error loading available time slots');
    } finally {
      schedule.isLoadingSlots = false;
    }
  }

  selectTimeForService(time: string) {
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
    schedule.service.dentistId = schedule.selectedDentist.id;
    schedule.service.dentistName = `${schedule.selectedDentist.first_name} ${schedule.selectedDentist.last_name}`;
  }

  changeDentistForService(dentist: any) {
    const schedule = this.getCurrentServiceSchedule();
    schedule.selectedDentist = dentist;
    schedule.selectedTime = '';
    this.loadSlotsForDentist(schedule);
  }

  proceedToNextService() {
    const schedule = this.getCurrentServiceSchedule();

    if (!schedule.selectedDate || !schedule.selectedTime) {
      alert('Please select both date and time for this service');
      return;
    }

    if (this.currentServiceIndex < this.serviceSchedules.length - 1) {
      this.currentServiceIndex++;
      // Reset calendar view for next service
      this.viewDate = new Date();
      this.generateCalendar();
      this.cdr.detectChanges();
    } else {
      // All services scheduled, proceed to patient details
      this.currentStep = 3;
      this.cdr.detectChanges();
    }
  }

  goBackToService() {
    if (this.currentServiceIndex > 0) {
      this.currentServiceIndex--;
    } else {
      this.currentStep = 1;
      this.selectedCategory = '';
    }
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 3: PATIENT DETAILS
  // ═════════════════════════════════════════════════════════════════════════════

  loadPatientData() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.patientDetails.firstName = user.first_name || '';
      this.patientDetails.lastName = user.last_name || '';
      this.patientDetails.email = user.email || '';
      this.patientDetails.phone = user.phone || '';
    }
  }

  validatePatientDetails(): boolean {
    const { firstName, lastName, email, phone } = this.patientDetails;

    if (!firstName || !lastName) {
      this.submitError = 'First and last name are required';
      return false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.submitError = 'Valid email is required';
      return false;
    }

    if (!phone || !/^\d{10,}$/.test(phone.replace(/\D/g, ''))) {
      this.submitError = 'Valid phone number is required';
      return false;
    }

    return true;
  }

  proceedToReview() {
    if (!this.validatePatientDetails()) {
      return;
    }

    // Prepare appointments data based on number of services
    if (this.selectedSubServices.length === 1) {
      // Single service
      this.confirmedBooking.appointments = [{
        sequence: 1,
        service: this.selectedSubServices[0].name,
        category: this.selectedSubServices[0].category,
        date: this.selectedDate,
        time: this.selectedTime,
        duration: this.selectedSubServices[0].duration
      }];
    } else {
      // Multi-service
      this.confirmedBooking.appointments = this.serviceSchedules.map((schedule, index) => ({
        sequence: index + 1,
        service: schedule.service.name,
        category: schedule.service.category,
        dentist: schedule.service.dentistName,
        date: schedule.selectedDate,
        time: schedule.selectedTime,
        endTime: schedule.service.endTime,
        duration: schedule.service.duration
      }));
    }

    this.confirmedBooking.fullName = `${this.patientDetails.firstName} ${this.patientDetails.lastName}`;
    this.confirmedBooking.services = this.selectedSubServices;

    this.currentStep = 4;
    this.cdr.detectChanges();
  }

  goBackToDetails() {
    this.currentStep = 3;
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 4: REVIEW & CONFIRM
  // ═════════════════════════════════════════════════════════════════════════════

  async submitCompositeBooking() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = '';

    try {
      // Prepare appointments based on number of services
      let appointments: any[];

      if (this.selectedSubServices.length === 1) {
        // Single service: use the selected date/time
        appointments = [{
          date: this.selectedDate,
          time: this.selectedTime
        }];
      } else {
        // Multi-service: use individual schedules
        appointments = this.serviceSchedules.map(schedule => ({
          date: schedule.selectedDate,
          time: schedule.selectedTime
        }));
      }

      const bookingRequest = {
        services: this.selectedSubServices.map(s => ({
          name: s.name,
          category: s.category,
          duration: s.duration
        })),
        appointments,
        patientDetails: this.patientDetails,
        bookingType: 'Patient',
        intakePriority: 'Standard',
        intakeSource: 'Online'
      };

      const response = await this.api.post('/api/composite-booking/create', bookingRequest).toPromise();

      this.confirmedBooking.bookingId = response.compositeBooking.bookingId;
      this.bookingConfirmed = true;
      this.showSuccessModal = true;

      // Redirect after 3 seconds
      setTimeout(() => {
        this.router.navigate(['/patient-appointments']);
      }, 3000);
    } catch (error: any) {
      console.error('Booking error:', error);
      this.submitError = error.error?.error || 'Failed to create booking. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // CALENDAR UTILITIES
  // ═════════════════════════════════════════════════════════════════════════════

  generateCalendar() {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    this.currentYear = year;
    this.currentMonthName = this.viewDate.toLocaleString('default', { month: 'long' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    this.calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = this.isToday(date);
      const isPast = date < new Date();

      this.calendarDays.push({
        day,
        date: date.toISOString().split('T')[0],
        isToday,
        isPast,
        isSelected: date.toISOString().split('T')[0] === this.getCurrentServiceSchedule()?.selectedDate
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  previousMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1);
    this.generateCalendar();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // NAVIGATION & CANCELLATION
  // ═════════════════════════════════════════════════════════════════════════════

  cancelBooking() {
    this.showCancelConfirm = true;
  }

  confirmCancel() {
    this.router.navigate(['/patient-appointments']);
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/patient-appointments']);
  }
}
