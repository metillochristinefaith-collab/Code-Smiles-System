import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface CalendarDay {
  date: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: any[];
}

@Component({
  selector: 'app-dentist-calendar-redesign',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-calendar-redesign.html',
  styleUrls: ['./dentist-calendar-redesign.css'],
})
export class DentistCalendarRedesign implements OnInit {
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  allAppointments: any[] = [];
  selectedDay: CalendarDay | null = null;
  noteText = '';
  isLoading = true;
  calendarNotes: Record<string, string[]> = {};
  private dentistName = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    this.loadNotes();
    this.loadAppointments();
    this.buildCalendar();
  }

  private loadAppointments() {
    if (!this.dentistName) return;
    const startDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const endDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    const start = this.toDateStr(startDate);
    const end = this.toDateStr(endDate);

    this.api.getDentistAppointments(this.dentistName).subscribe({
      next: (data) => {
        this.allAppointments = (data || []).filter(a =>
          a.appointment_date >= start && a.appointment_date <= end
        );
        this.buildCalendar();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private buildCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    this.calendarDays = [];

    // Previous month's days
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, daysInPrevMonth - i);
      this.calendarDays.push({
        date: dayDate.getDate(),
        dateStr: this.toDateStr(dayDate),
        isCurrentMonth: false,
        isToday: false,
        appointments: []
      });
    }

    // Current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const isToday = date === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const appointments = this.allAppointments.filter(a => a.appointment_date === dateStr);

      this.calendarDays.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isToday,
        appointments
      });
    }

    // Next month's days
    const remainingDays = 42 - this.calendarDays.length;
    for (let date = 1; date <= remainingDays; date++) {
      const dayDate = new Date(year, month + 1, date);
      this.calendarDays.push({
        date: dayDate.getDate(),
        dateStr: this.toDateStr(dayDate),
        isCurrentMonth: false,
        isToday: false,
        appointments: []
      });
    }
  }

  goToToday() {
    this.currentMonth = new Date();
    this.loadAppointments();
  }

  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1);
    this.loadAppointments();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1);
    this.loadAppointments();
  }

  selectDay(day: CalendarDay) {
    this.selectedDay = day;
    this.noteText = '';
  }

  closeModal() {
    this.selectedDay = null;
    this.noteText = '';
  }

  saveNote() {
    if (!this.selectedDay || !this.noteText.trim()) return;
    const dateStr = this.selectedDay.dateStr;
    const note = this.noteText.trim();
    this.calendarNotes = {
      ...this.calendarNotes,
      [dateStr]: [...(this.calendarNotes[dateStr] || []), note],
    };
    this.saveNotes();
    this.noteText = '';
    this.cdr.detectChanges();
  }

  getNotesForDay(day: CalendarDay | null): string[] {
    if (!day?.dateStr) return [];
    return this.calendarNotes[day.dateStr] || [];
  }

  private get notesStorageKey(): string {
    const owner = this.dentistName || 'dentist';
    return `dentist-calendar-notes:${owner}`;
  }

  private loadNotes(): void {
    try {
      const stored = localStorage.getItem(this.notesStorageKey);
      this.calendarNotes = stored ? JSON.parse(stored) : {};
    } catch {
      this.calendarNotes = {};
    }
  }

  private saveNotes(): void {
    try {
      localStorage.setItem(this.notesStorageKey, JSON.stringify(this.calendarNotes));
    } catch {
      // Notes are still visible for this session even if browser storage is unavailable.
    }
  }

  formatDateLong(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(time: string): string {
    if (!time) return '—';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Approved': 'approved',
      'Pending': 'pending',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'Rescheduled': 'rescheduled'
    };
    return map[status] || 'approved';
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
