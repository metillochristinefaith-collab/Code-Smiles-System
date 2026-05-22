import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
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

@Component({
  selector: 'app-composite-staff-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './composite-staff-booking.html',
  styleUrls: ['./composite-staff-booking.css']
})
export class CompositeStaffBookingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: PATIENT & BOOKING TYPE
  // ─────────────────────────────────────────────────────────────────────────────
  currentStep: number = 1;
  bookingType: 'Walk-in' | 'Registered patient' = 'Walk-in';
  intakePriority: 'Standard' | 'Urgent' = 'Standard';
  intakeSource: 'Front desk' | 'Phone call' | 'Staff referral' = 'Front desk';

  patientName = '';
  patientPhone = '';
  patientEmail = '';
  patientAge = '';
  notes = '';

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: SERVICE SELECTION
  // ─────────────────────────────────────────────────────────────────────────────
  selectedCategory: string = '';
  selectedServices: string[] = [];
  selectedSubServices: SelectedService[] = [];
  totalSelectedDuration: number = 0;
  readonly MAX_SERVICES = 3;
  readonly MAX_MINUTES = 120;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: INDIVIDUAL SERVICE SCHEDULING
  // ─────────────────────────────────────────────────────────────────────────────
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

  // Service map
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
    this.generateCalendar();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 1: PATIENT & BOOKING TYPE
  // ═════════════════════════════════════════════════════════════════════════════

  validatePatientInfo(): boolean {
    if (!this.patientName || this.patientName.trim() === '') {
      this.submitError = 'Patient name is required';
      return false;
    }

    if (!this.patientAge || parseInt(this.patientAge) <= 0) {
      this.submitError = 'Valid patient age is required';
      return false;
    }

    if (this.bookingType === 'Registered patient') {
      if (!this.patientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.patientEmail)) {
        this.submitError = 'Valid email is required for registered patients';
        return false;
      }
    }

    if (this.patientPhone && !/^\d{10,}$/.test(this.patientPhone.replace(/\D/g, ''))) {
      this.submitError = 'Valid phone number is required';
      return false;
    }

    return true;
  }

  proceedToServices() {
    this.submitError = '';
    if (!this.validatePatientInfo()) {
      return;
    }

    this.currentStep = 2;
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 2: SERVICE SELECTION
  // ═════════════════════════════════════════════════════════════════════════════

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleService(service: ServiceDetail) {
    const serviceName = service.name;
    const index = this.selectedServices.indexOf(serviceName);

    if (index > -1) {
      this.selectedServices.splice(index, 1);
      this.selectedSubServices = this.selectedSubServices.filter(s => s.name !== serviceName);
    } else {
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
      this.currentStep = 4; // Skip to review (original flow)
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

    this.currentStep = 3; // Go to individual scheduling
    this.currentServiceIndex = 0;
    this.cdr.detectChanges();
  }

  goBackToPatient() {
    this.currentStep = 1;
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 3: INDIVIDUAL SERVICE SCHEDULING
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

      schedule.selectedDentist = schedule.availableDentists[0];
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
      this.currentStep = 4;
      this.cdr.detectChanges();
    }
  }

  goBackToService() {
    if (this.currentServiceIndex > 0) {
      this.currentServiceIndex--;
    } else {
      this.currentStep = 2;
      this.selectedCategory = '';
    }
    this.cdr.detectChanges();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 4: REVIEW & CONFIRM
  // ═════════════════════════════════════════════════════════════════════════════

  prepareReview() {
    if (this.selectedSubServices.length === 1) {
      // Single service - no scheduling step was done, need to get date/time from somewhere
      // For staff booking single service, we skip scheduling, so we need to add a step
      // Actually, let me reconsider - for staff single service, we should still have scheduling
      this.confirmedBooking.appointments = [{
        sequence: 1,
        service: this.selectedSubServices[0].name,
        category: this.selectedSubServices[0].category,
        date: 'TBD',
        time: 'TBD',
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

    this.confirmedBooking.fullName = this.patientName;
    this.confirmedBooking.services = this.selectedSubServices;
  }

  async submitCompositeBooking() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = '';

    try {
      this.prepareReview();

      // Prepare appointments based on number of services
      let appointments: any[];

      if (this.selectedSubServices.length === 1) {
        // Single service: use the selected date/time from review
        const apt = this.confirmedBooking.appointments[0];
        appointments = [{
          date: apt.date,
          time: apt.time
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
        patientDetails: {
          firstName: this.patientName.split(' ')[0],
          lastName: this.patientName.split(' ').slice(1).join(' ') || 'Patient',
          email: this.patientEmail || `walk-in-${Date.now()}@codesmiles.local`,
          phone: this.patientPhone || '0000000000',
          age: this.patientAge,
          notes: this.notes
        },
        bookingType: this.bookingType === 'Walk-in' ? 'Walk-in' : 'Registered',
        intakePriority: this.intakePriority,
        intakeSource: this.intakeSource
      };

      const response = await this.api.post('/api/composite-booking/create', bookingRequest).toPromise();

      this.confirmedBooking.bookingId = response.compositeBooking.bookingId;
      this.bookingConfirmed = true;
      this.showSuccessModal = true;

      setTimeout(() => {
        this.router.navigate(['/staff-appointments']);
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

    for (let i = 0; i < startingDayOfWeek; i++) {
      this.calendarDays.push(null);
    }

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
  // NAVIGATION
  // ═════════════════════════════════════════════════════════════════════════════

  cancelBooking() {
    this.showCancelConfirm = true;
  }

  confirmCancel() {
    this.router.navigate(['/staff-appointments']);
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.router.navigate(['/staff-appointments']);
  }
}
