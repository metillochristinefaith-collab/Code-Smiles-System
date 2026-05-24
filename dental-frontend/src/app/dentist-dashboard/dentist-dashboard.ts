import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { getDentistInfo } from '../dentist-portal-data';

@Component({
  selector: 'app-dentist-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DentistSidebar],
  templateUrl: './dentist-dashboard.html',
  styleUrl: './dentist-dashboard.css',
})
export class DentistDashboard implements OnInit {
  fullName: string;
  initial: string;
  specialty: string;
  today: string;
  isLoading = true;
  avatarUrl: string | null = null;

  private dbStats = { today: 0, upcoming: 0, completed: 0, patients: 0 };
  private dbRecent: any[] = [];

  readonly quickActions = [
    { label: 'Add Prescription',      icon: 'Rx', route: '/dentist-prescriptions',   tone: 'blue'   as const },
    { label: 'Open Patient Record',   icon: '📂', route: '/dentist-medical-vault',   tone: 'green'  as const },
    { label: 'View Full Schedule',    icon: '📅', route: '/dentist-appointments',    tone: 'violet' as const },
    { label: 'Create Treatment Plan', icon: '📋', route: '/dentist-treatment-plans', tone: 'amber'  as const },
  ];

  constructor(private auth: AuthService, private api: ApiService, private cdr: ChangeDetectorRef, private avatarService: AvatarService) {
    const user     = this.auth.getUser();
    this.fullName  = user ? `Dr. ${user.first_name} ${user.last_name}` : 'Dentist';
    this.initial   = (user?.first_name?.charAt(0) ?? 'D').toUpperCase();
    const info     = getDentistInfo(user?.email ?? '');
    this.specialty = info?.specialty ?? 'Dentist';
    this.today     = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());
  }

  ngOnInit() {
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

    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    
    // Debug: Log the token and user info
    const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token');
    console.log('Dashboard Init - User:', user);
    console.log('Dashboard Init - Dentist Name:', dentistName);
    console.log('Dashboard Init - Token exists:', !!token);
    
    if (!dentistName) {
      console.error('No dentist name available');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }
    
    this.api.getDentistDashboardStats(dentistName).subscribe({
      next: (data) => {
        console.log('Dashboard stats received:', data);
        this.dbStats  = data;
        this.dbRecent = data.recentAppointments || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { 
        console.error('Dashboard stats error:', err);
        this.isLoading = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  get stats() {
    return [
      { label: 'Total Patients',       value: String(this.dbStats.patients),  unit: 'Registered', tone: 'blue',   icon: '👥' },
      { label: "Today's Appointments", value: String(this.dbStats.today),     unit: 'Scheduled',  tone: 'green',  icon: '📅' },
      { label: 'Upcoming',             value: String(this.dbStats.upcoming),  unit: 'Approved',   tone: 'violet', icon: '🕐' },
      { label: 'Completed',            value: String(this.dbStats.completed), unit: 'All time',   tone: 'amber',  icon: '✅' },
    ];
  }

  // Today's appointments list for the dashboard card
  get todayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    const list = this.dbRecent.filter(a => a.appointment_date === today);
    // If no today appointments, show upcoming ones
    const source = list.length > 0 ? list : this.dbRecent;
    return source.slice(0, 4).map(a => ({
      time:      this.formatTime(a.appointment_time),
      initials:  this.getInitials(a.patient_name),
      patient:   a.patient_name,
      treatment: a.treatment,
      status:    this.statusTone(a.status),
    }));
  }

  // Pending plans — show upcoming approved appointments as "plans"
  get pendingPlans() {
    return this.dbRecent
      .filter(a => a.status === 'Approved')
      .slice(0, 3)
      .map(a => ({
        initials:  this.getInitials(a.patient_name),
        patient:   a.patient_name,
        procedure: a.treatment,
        followUp:  this.formatDate(a.appointment_date),
        priority:  'normal' as const,
      }));
  }

  // Notifications — recent activity
  get notifications() {
    return this.dbRecent.slice(0, 4).map(a => ({
      type:    this.notifType(a.status),
      message: `${a.patient_name} — ${a.treatment}`,
      time:    this.formatDate(a.appointment_date),
    }));
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      'confirmed': 'Confirmed', 'progress': 'In Progress',
      'pending': 'Pending', 'cancelled': 'Cancelled',
      'Approved': 'Confirmed', 'Completed': 'Completed',
    };
    return map[s] || s;
  }

  notifIcon(type: string): string {
    const map: Record<string, string> = { cancel: '✕', reschedule: '↻', urgent: '!', followup: '↩', info: 'ℹ' };
    return map[type] || 'ℹ';
  }

  private notifType(status: string): string {
    if (status === 'Cancelled') return 'cancel';
    if (status === 'Rescheduled') return 'reschedule';
    return 'info';
  }

  private statusTone(s: string): string {
    const map: Record<string, string> = {
      'Approved': 'confirmed', 'Completed': 'completed',
      'Pending': 'pending', 'Cancelled': 'cancelled'
    };
    return map[s] || 'pending';
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
}

