import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';
import { DENTIST_ROSTER } from '../dentist-portal-data';

interface CalendarDay {
  number: number | '';
  date: string;
  isPast: boolean;
  isWeekend: boolean;
  isFullyBooked: boolean;
  isAvailable: boolean;
  isToday: boolean;
}

interface TimeSlot {
  label: string;
  value: string; // 24h format for API
  available: boolean;
}

@Component({
  selector: 'app-staff-reschedule',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-reschedule.html',
  styleUrls: ['./staff-reschedule.css'],
})
export class StaffRescheduleComponent implements OnInit {

  // Loaded from API
  protected appointment: any = null;
  protected isLoading = true;
  protected loadError = '';

  protected readonly dentists = DENTIST_ROSTER.map(d => d.fullName);

  // Form state
  protected selectedDentist = '';
  protected selectedDate = '';
  protected selectedTime = '';
  protected selectedTimeValue = ''; // 24h for API
  protected reason = '';
  protected notifyPatient = true;

  // Calendar
  protected viewDate = new Date();
  protected currentMonthName = '';
  protected currentYear = 0;
  protected calendarDays: CalendarDay[] = [];
  protected timeSlots: TimeSlot[] = [];

  // Booked times from DB for selected date
  private bookedTimes: string[] = [];

  // UI state
  protected submitted = false;
  protected isSubmitting = false;
  protected showConfirmDialog = false;
  protected formError = '';
  protected submitError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) {
      this.loadError = 'Invalid appointment ID.';
      this.isLoading = false;
      return;
    }
    this.api.getStaffAppointmentById(Number(id)).subscribe({
      next: (data) => {
        this.appointment = data;
        this.selectedDentist = data.dentist_name || this.dentists[0];
        this.isLoading = false;
        this.buildCalendar();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'Could not load appointment.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── CALENDAR ──────────────────────────────────────────────────────────────

  protected buildCalendar(): void {
    const year  = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    this.currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.viewDate);
    this.currentYear = year;
    this.calendarDays = [];

    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today       = new Date(); today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ number: '', date: '', isPast: true, isWeekend: false, isFullyBooked: false, isAvailable: false, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);
      const dow      = dateObj.getDay();
      const isPast   = dateObj < today;
      const isWeekend = dow === 0 || dow === 6;
      this.calendarDays.push({
        number: d,
        date: this.toIso(dateObj),
        isToday: dateObj.getTime() === today.getTime(),
        isPast,
        isWeekend,
        isFullyBooked: false,
        isAvailable: !isPast,
      });
    }
  }

  protected prevMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.buildCalendar();
  }

  protected nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.buildCalendar();
  }

  protected selectDate(day: CalendarDay): void {
    if (!day.isAvailable || !day.number) return;
    this.selectedDate = day.date;
    this.selectedTime = '';
    this.selectedTimeValue = '';
    // Load real booked times for this date
    this.api.checkAvailability(day.date).subscribe({
      next: (booked) => {
        this.bookedTimes = booked;
        this.buildTimeSlots();
        this.cdr.detectChanges();
      },
      error: () => {
        this.bookedTimes = [];
        this.buildTimeSlots();
        this.cdr.detectChanges();
      },
    });
  }

  // ── TIME SLOTS ────────────────────────────────────────────────────────────

  protected buildTimeSlots(): void {
    const slots = [
      { label: '8:00 AM',  value: '08:00' },
      { label: '9:00 AM',  value: '09:00' },
      { label: '10:00 AM', value: '10:00' },
      { label: '11:00 AM', value: '11:00' },
      { label: '1:00 PM',  value: '13:00' },
      { label: '2:00 PM',  value: '14:00' },
      { label: '3:00 PM',  value: '15:00' },
      { label: '4:00 PM',  value: '16:00' },
      { label: '5:00 PM',  value: '17:00' },
      { label: '6:00 PM',  value: '18:00' },
      { label: '7:00 PM',  value: '19:00' },
    ];
    this.timeSlots = slots.map(s => ({
      ...s,
      available: !this.bookedTimes.some(b => b.startsWith(s.value)),
    }));
  }

  protected selectTime(slot: TimeSlot): void {
    if (!slot.available) return;
    this.selectedTime = slot.label;
    this.selectedTimeValue = slot.value;
  }

  // ── VALIDATION ────────────────────────────────────────────────────────────

  protected get canSubmit(): boolean {
    return !!this.selectedDate && !!this.selectedTimeValue && !!this.selectedDentist && !!this.reason.trim();
  }

  protected get formattedDate(): string {
    if (!this.selectedDate) return '';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      .format(new Date(this.selectedDate + 'T00:00:00'));
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────────

  protected requestSubmit(): void {
    this.formError = '';
    if (!this.canSubmit) {
      this.formError = 'Please fill in all required fields before submitting.';
      return;
    }
    this.showConfirmDialog = true;
  }

  protected confirmReschedule(): void {
    if (!this.appointment || this.isSubmitting) return;
    this.isSubmitting = true;
    this.submitError = '';

    this.api.rescheduleAppointment(
      this.appointment.id,
      this.selectedDate,
      this.selectedTimeValue,
      this.reason.trim(),
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showConfirmDialog = false;
        this.submitted = true;
        // Update local appointment data for success screen
        this.appointment.appointment_date = this.selectedDate;
        this.appointment.appointment_time = this.selectedTimeValue;
        this.appointment.dentist_name = this.selectedDentist;
        this.appointment.status = 'Rescheduled by Staff';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message ?? 'Failed to reschedule. Please try again.';
        this.showConfirmDialog = false;
        this.cdr.detectChanges();
      },
    });
  }

  protected dismissConfirm(): void {
    this.showConfirmDialog = false;
  }

  protected goBack(): void {
    if (this.appointment) {
      this.router.navigate(['/staff-appointments', this.appointment.id]);
    } else {
      this.router.navigate(['/staff-appointments']);
    }
  }

  protected goToAppointments(): void {
    this.router.navigate(['/staff-appointments']);
  }

  // ── Display helpers ───────────────────────────────────────────────────────

  get patientInitials(): string {
    const name = this.appointment?.patient_name ?? '';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  get currentFormattedDate(): string {
    if (!this.appointment?.appointment_date) return '—';
    return new Date(this.appointment.appointment_date + 'T00:00:00')
      .toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }

  get currentFormattedTime(): string {
    return this.formatTime(this.appointment?.appointment_time);
  }

  protected getStatusClass(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/\s+/g, '-');
    if (s.includes('approved'))   return 'status-approved';
    if (s.includes('pending'))    return 'status-pending';
    if (s.includes('reschedule')) return 'status-rescheduled';
    if (s.includes('cancelled'))  return 'status-cancelled';
    return 'status-pending';
  }

  private formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  private toIso(d: Date): string {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
