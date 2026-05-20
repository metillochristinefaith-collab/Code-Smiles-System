import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-staff-calendar',
  standalone: true,
  imports: [CommonModule, StaffSidebar],
  templateUrl: './staff-calendar.html',
  styleUrls: ['./staff-calendar.css'],
})
export class StaffCalendar implements OnInit {
  currentDate: Date = new Date();
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  currentView: 'day' | 'week' | 'month' = 'week';

  // Week/Day appointments
  protected allAppointments: any[] = [];
  // All future appointments for sidebar + month view
  allUpcoming: any[] = [];

  calendarDays: { label: string; date: string; active?: boolean }[] = [
    { label: 'MON', date: '' }, { label: 'TUE', date: '' },
    { label: 'WED', date: '' }, { label: 'THU', date: '' },
    { label: 'FRI', date: '' }, { label: 'SAT', date: '' },
    { label: 'SUN', date: '' },
  ];

  readonly boardTimeLabels = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM',  '2:00 PM',  '3:00 PM',  '4:00 PM',  '5:00 PM',
    '6:00 PM',  '7:00 PM',  '8:00 PM',  '9:00 PM',
  ];

  readonly legendItems = [
    { label: 'Approved',    cls: 'legend-confirmed'   },
    { label: 'In Progress', cls: 'legend-progress'    },
    { label: 'Pending',     cls: 'legend-pending'     },
    { label: 'Cancelled',   cls: 'legend-cancelled'   },
    { label: 'Unavailable', cls: 'legend-unavailable' },
  ];

  readonly miniCalendarWeekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  constructor(private api: ApiService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.goToToday();
    this.loadAllUpcoming();
  }

  // ── Load all upcoming appointments for sidebar + month view ──────────────
  private loadAllUpcoming(): void {
    const today = this.toDateStr(new Date());
    const farFuture = `${new Date().getFullYear() + 2}-12-31`;
    this.api.getCalendarAppointments(today, farFuture).subscribe({
      next: (data) => {
        this.allUpcoming = data;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  navigateToNotifications(): void { this.router.navigate(['/staff-notifications']); }

  goToToday(): void {
    this.currentDate = new Date();
    this.calculateWeekRange();
    this.loadWeekData();
  }

  previousWeek(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.calculateWeekRange();
    this.loadWeekData();
  }

  nextWeek(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.calculateWeekRange();
    this.loadWeekData();
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.calculateWeekRange();
    this.cdr.detectChanges();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.calculateWeekRange();
    this.cdr.detectChanges();
  }

  private calculateWeekRange(): void {
    const day = this.currentDate.getDay();
    const diff = this.currentDate.getDate() - day + (day === 0 ? -6 : 1);
    this.currentWeekStart = new Date(this.currentDate);
    this.currentWeekStart.setDate(diff);
    this.currentWeekStart.setHours(0, 0, 0, 0);
    this.currentWeekEnd = new Date(this.currentWeekStart);
    this.currentWeekEnd.setDate(this.currentWeekStart.getDate() + 6);
    this.currentWeekEnd.setHours(23, 59, 59, 999);
    this.updateCalendarDays();
  }

  private updateCalendarDays(): void {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      this.calendarDays[i] = {
        label: days[i],
        date: `${months[date.getMonth()]} ${date.getDate()}`,
        active: this.isToday(date),
      } as any;
    }
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private loadWeekData(): void {
    const start = this.toDateStr(this.currentWeekStart);
    const end   = this.toDateStr(this.currentWeekEnd);
    this.api.getCalendarAppointments(start, end).subscribe({
      next: (data) => { this.allAppointments = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  // ── Week board events ────────────────────────────────────────────────────
  get boardEvents(): any[] {
    return this.allAppointments.map(a => {
      const apptDate = new Date(a.appointment_date + 'T00:00:00');
      const dayOfWeek = apptDate.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const [h] = a.appointment_time.split(':').map(Number);
      const startSlot = Math.max(0, h - 8);
      return {
        dayIndex, startSlot,
        startTime: this.formatTime(a.appointment_time),
        patient:   a.patient_name,
        service:   a.treatment,
        status:    a.status === 'Approved' ? 'Confirmed' : a.status,
        dentist:   a.dentist_name,
      };
    });
  }

  // ── Upcoming sidebar — from allUpcoming (not just current week) ──────────
  get upcomingAppointments(): any[] {
    return this.allUpcoming
      .filter(a => a.status !== 'Cancelled')
      .slice(0, 5)
      .map(a => ({
        time:    this.formatTime(a.appointment_time),
        date:    this.formatDateShort(a.appointment_date),
        patient: a.patient_name,
        service: a.treatment,
        status:  a.status === 'Approved' ? 'Confirmed' : a.status,
      }));
  }

  // ── Month view grid ──────────────────────────────────────────────────────
  get monthName(): string {
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get monthDays(): any[] {
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
    const today = this.toDateStr(new Date());
    const days: any[] = [];

    // Blank cells before month starts
    for (let i = 0; i < offset; i++) days.push({ day: null, dateStr: '', events: [] });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const events = this.allUpcoming.filter(a => a.appointment_date === dateStr && a.status !== 'Cancelled');
      days.push({ day: d, dateStr, isToday: dateStr === today, events });
    }
    return days;
  }

  getWeekRangeDisplay(): string {
    if (this.currentView === 'month') return this.monthName;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const s = this.currentWeekStart, e = this.currentWeekEnd;
    const sm = months[s.getMonth()], em = months[e.getMonth()];
    return sm === em
      ? `${sm} ${s.getDate()} – ${e.getDate()}, ${e.getFullYear()}`
      : `${sm} ${s.getDate()} – ${em} ${e.getDate()}, ${e.getFullYear()}`;
  }

  changeView(view: 'day' | 'week' | 'month'): void {
    this.currentView = view;
    if (view === 'month') this.loadAllUpcoming();
    this.cdr.detectChanges();
  }

  selectDate(day: any): void {}
  addWalkIn(): void { this.router.navigate(['/staff-booking']); }
  viewAllAppointments(): void { this.router.navigate(['/staff-appointments']); }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      Confirmed: 'badge-confirmed', Approved: 'badge-confirmed',
      Pending: 'badge-pending', 'In Progress': 'badge-progress', Cancelled: 'badge-cancelled',
    };
    return map[status] ?? 'badge-confirmed';
  }

  getEventClass(status: string): string {
    const map: Record<string, string> = {
      Confirmed: 'status-confirmed', Approved: 'status-confirmed',
      Pending: 'status-pending', 'In Progress': 'status-in-progress', Cancelled: 'status-cancelled',
    };
    return map[status] ?? 'status-confirmed';
  }

  getCardAccentClass(index: number): string {
    return ['card-accent-blue', 'card-accent-orange', 'card-accent-purple'][index] ?? 'card-accent-blue';
  }

  private readonly closingSlots = [13, 13, 13, 13, 13, 14, 14];
  isAfterHours(dayIndex: number, rowIndex: number): boolean { return rowIndex >= this.closingSlots[dayIndex]; }
  getClosingTime(dayIndex: number): string {
    return ['8:30 PM','8:30 PM','8:30 PM','8:30 PM','8:30 PM','9:00 PM','9:30 PM'][dayIndex];
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  formatDateShort(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  get miniCalendarDates(): any[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const dates: any[] = [];
    for (let i = offset - 1; i >= 0; i--) dates.push({ day: prevDays - i, otherMonth: true, active: false });
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      dates.push({ day: d, otherMonth: false, active: isToday });
    }
    let next = 1;
    while (dates.length % 7 !== 0) dates.push({ day: next++, otherMonth: true, active: false });
    return dates;
  }
}
