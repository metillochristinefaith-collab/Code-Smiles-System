import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { DENTIST_ROSTER } from '../dentist-portal-data';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StaffSidebar],
  templateUrl: './staff-dashboard.html',
  styleUrls: ['./staff-dashboard.css'],
})
export class StaffDashboard implements OnInit {
  fullName: string;
  initial: string;
  role: string;
  today: string;
  isLoading = true;
  avatarUrl: string | null = null;

  private dbStats = { total: 0, pending: 0, approved: 0, cancelled: 0, today: 0, patients: 0 };
  private dbRecent: any[] = [];
  private scheduleAppts: any[] = [];
  scheduleMode: 'today' | 'upcoming' = 'today';
  private todayIso = '';

  readonly quickActions = [
    { title: 'New Appointment',  emoji: '📅', route: '/staff-booking',     tone: 'sky'   },
    { title: 'Register Patient', emoji: '👤', route: '/staff-patients',     tone: 'mint'  },
    { title: 'View Requests',    emoji: '📋', route: '/staff-requests',     tone: 'amber' },
  ];

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private avatarService: AvatarService,
  ) {
    const user = this.auth.getUser();
    this.fullName = user ? `${user.first_name} ${user.last_name}` : 'Staff';
    this.initial  = (user?.first_name?.charAt(0) ?? 'S').toUpperCase();
    // Role label from real auth — map 'Staff' → 'Front Desk Staff', 'Admin' → 'Dentist'
    this.role = user?.role === 'Admin' ? 'Dentist' : user?.role === 'Staff' ? 'Front Desk Staff' : 'Staff';
    this.today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());
  }

  ngOnInit() {
    this.todayIso = this.localDateStr();
    const scheduleEnd = this.addDays(this.todayIso, 180);

    // Load avatar from localStorage or database
    this.avatarUrl = this.avatarService.getAvatar();
    if (!this.avatarUrl) {
      this.avatarService.loadAvatarFromDB().then(() => {
        // After loading from DB, check localStorage again
        this.avatarUrl = this.avatarService.getAvatar();
        this.cdr.detectChanges();
      }).catch((err: any) => {
        console.error('Failed to load avatar:', err);
      });
    }

    // Load dashboard stats
    this.api.getStaffDashboardStats().subscribe({
      next: (data) => {
        this.dbStats  = data;
        this.dbRecent = data.recentAppointments || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    // Today + upcoming window — show upcoming when nothing is scheduled today
    this.api.getCalendarAppointments(this.todayIso, scheduleEnd).subscribe({
      next: (data) => {
        this.scheduleAppts = this.sortByDateTime(data);
        const todayRows = this.scheduleAppts.filter(
          (a) => this.normalizeDate(a.appointment_date) === this.todayIso
        );
        this.scheduleMode = todayRows.length > 0 ? 'today' : 'upcoming';
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  get scheduleTitle(): string {
    return this.scheduleMode === 'today' ? "Today's Schedule" : 'Upcoming Schedule';
  }

  get scheduleSubtitle(): string {
    return this.scheduleMode === 'upcoming'
      ? 'No visits today — showing your next scheduled appointments.'
      : '';
  }

  get statCards() {
    return [
      { label: "Today's Appointments", value: this.dbStats.today,    delta: 'Scheduled today', tone: 'sky',    emoji: '📅' },
      { label: 'Pending Requests',     value: this.dbStats.pending,  delta: 'Needs action',    tone: 'violet', emoji: '⏳' },
      { label: 'Approved',             value: this.dbStats.approved, delta: 'Confirmed',       tone: 'mint',   emoji: '✅' },
      { label: 'Total Patients',       value: this.dbStats.patients, delta: 'Registered',      tone: 'amber',  emoji: '👥' },
    ];
  }

  get todaySchedule() {
    const pool = this.scheduleMode === 'today'
      ? this.scheduleAppts.filter((a) => this.normalizeDate(a.appointment_date) === this.todayIso)
      : this.scheduleAppts;

    return pool
      .filter((a) => !this.isCancelled(a.status))
      .slice(0, 6)
      .map((a) => ({
        time:     this.formatTime(a.appointment_time),
        date:     this.formatDate(a.appointment_date),
        initials: this.getInitials(a.patient_name),
        patient:  a.patient_name,
        service:  a.treatment,
        status:   a.status,
      }));
  }

  // Approval queue — from pending count in recent, link to requests page
  get requests() {
    return this.dbRecent
      .filter(a => a.status === 'Pending')
      .slice(0, 4)
      .map(a => ({
        initials:  this.getInitials(a.patient_name),
        patient:   a.patient_name,
        service:   a.treatment,
        shortDate: this.formatDate(a.appointment_date),
        urgency:   a.urgency || 'Standard',
      }));
  }

  // Recent updates — last 5 appointments with real status
  get activityFeed() {
    return this.dbRecent.slice(0, 5).map(a => ({
      title:  a.patient_name,
      detail: `${a.treatment} — ${a.status}`,
      time:   this.formatDate(a.appointment_date),
    }));
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getScheduleStatusClass(status: string): string {
    return status?.toLowerCase().replace(/[\s/]+/g, '-') || 'pending';
  }

  getUrgencyClass(urgency: string): string {
    return urgency ? urgency.toLowerCase() : 'standard';
  }

  getInitials(name: string): string {
    return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  private localDateStr(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private addDays(isoDate: string, days: number): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return this.localDateStr(dt);
  }

  private normalizeDate(d: string): string {
    if (!d) return '';
    return String(d).split(/[T\s]/)[0];
  }

  private isCancelled(status: string): boolean {
    return status === 'Cancelled'
      || status === 'Cancelled by Patient'
      || status === 'Cancelled by Staff'
      || status === 'Cancelled by Dentist';
  }

  private sortByDateTime(rows: any[]): any[] {
    return [...rows].sort((a, b) => {
      const da = `${this.normalizeDate(a.appointment_date)}T${a.appointment_time || '00:00'}`;
      const db = `${this.normalizeDate(b.appointment_date)}T${b.appointment_time || '00:00'}`;
      return da.localeCompare(db);
    });
  }
}

