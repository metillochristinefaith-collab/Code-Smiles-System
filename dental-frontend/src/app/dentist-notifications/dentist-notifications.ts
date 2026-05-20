import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export type NotifType = 'Appointment' | 'Treatment' | 'Prescription' | 'Follow-up' | 'Urgent' | 'System' | 'Lab Result';
export type NotifStatus = 'Unread' | 'Read';

export interface DentistNotif {
  id: number;
  type: NotifType;
  title: string;
  detail: string;
  patient: string;
  time: string;
  date: string;
  status: NotifStatus;
  actionRoute?: string;
  actionLabel?: string;
}

@Component({
  selector: 'app-dentist-notification',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-notifications.html',
  styleUrl: './dentist-notifications.css',
})
export class DentistNotificationsComponent implements OnInit {

  activeFilter = 'All';
  searchQuery = '';
  isLoading = true;

  readonly filters = ['All', 'Appointments', 'Treatment', 'Prescriptions', 'Follow-ups', 'Urgent', 'Lab Results', 'System'];

  notifications: DentistNotif[] = [];

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    this.api.getDentistNotifications(dentistName).subscribe({
      next: (data) => {
        this.notifications = data.map((a: any) => ({
          id:          a.id,
          type:        this.typeForStatus(a.status),
          title:       this.titleForStatus(a.status, a.patient_name),
          detail:      `${a.patient_name} — ${a.treatment}${a.notes ? '. ' + a.notes : ''}`,
          patient:     a.patient_name,
          time:        this.relativeTime(a.updated_at || a.created_at),
          date:        this.fmtDate(a.appointment_date),
          status:      'Unread' as NotifStatus,
          actionRoute: '/dentist-appointments',
          actionLabel: 'View Schedule',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private typeForStatus(status: string): NotifType {
    if (status === 'Approved')    return 'Appointment';
    if (status === 'Rescheduled') return 'Follow-up';
    if (status === 'Cancelled')   return 'System';
    if (status === 'Completed')   return 'Treatment';
    return 'Appointment';
  }

  private titleForStatus(status: string, patient: string): string {
    if (status === 'Approved')    return `Appointment Confirmed — ${patient}`;
    if (status === 'Rescheduled') return `Appointment Rescheduled — ${patient}`;
    if (status === 'Cancelled')   return `Appointment Cancelled — ${patient}`;
    if (status === 'Completed')   return `Appointment Completed — ${patient}`;
    return `Appointment Update — ${patient}`;
  }

  private fmtDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private relativeTime(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  }

  get unreadCount(): number { return this.notifications.filter(n => n.status === 'Unread').length; }

  get filtered(): DentistNotif[] {
    return this.notifications.filter(n => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || n.title.toLowerCase().includes(q) || n.patient.toLowerCase().includes(q) || n.detail.toLowerCase().includes(q);
      const matchFilter =
        this.activeFilter === 'All'          ? true :
        this.activeFilter === 'Appointments' ? n.type === 'Appointment' :
        this.activeFilter === 'Treatment'    ? n.type === 'Treatment' :
        this.activeFilter === 'Prescriptions'? n.type === 'Prescription' :
        this.activeFilter === 'Follow-ups'   ? n.type === 'Follow-up' :
        this.activeFilter === 'Urgent'       ? n.type === 'Urgent' :
        this.activeFilter === 'Lab Results'  ? n.type === 'Lab Result' :
        n.type === 'System';
      return matchSearch && matchFilter;
    });
  }

  get unreadFiltered(): number { return this.filtered.filter(n => n.status === 'Unread').length; }

  setFilter(f: string) { this.activeFilter = f; }
  markRead(n: DentistNotif) { n.status = 'Read'; }
  markAllRead() { this.notifications.forEach(n => n.status = 'Read'); }

  typeIcon(t: NotifType): string {
    return ({ Appointment: '📅', Treatment: '🦷', Prescription: '💊', 'Follow-up': '↩', Urgent: '🚨', System: '⚙', 'Lab Result': '🩻' } as any)[t] || '🔔';
  }
  typeTone(t: NotifType): string {
    return ({ Appointment: 'blue', Treatment: 'teal', Prescription: 'violet', 'Follow-up': 'green', Urgent: 'red', System: 'grey', 'Lab Result': 'amber' } as any)[t] || 'blue';
  }
  countByFilter(f: string): number {
    if (f === 'All') return this.notifications.filter(n => n.status === 'Unread').length;
    const type = f === 'Appointments' ? 'Appointment' : f === 'Prescriptions' ? 'Prescription' :
                 f === 'Follow-ups' ? 'Follow-up' : f === 'Lab Results' ? 'Lab Result' :
                 f === 'Treatment' ? 'Treatment' : f === 'Urgent' ? 'Urgent' : 'System';
    return this.notifications.filter(n => n.type === type && n.status === 'Unread').length;
  }
}
