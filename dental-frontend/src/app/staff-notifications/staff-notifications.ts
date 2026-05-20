import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';

type NotificationCategory = 'appointments' | 'treatment' | 'messages' | 'medical-vault' | 'clinic-updates';
type NotificationTone = 'green' | 'amber' | 'blue' | 'purple' | 'slate';
type NotificationPriority = 'urgent' | 'needs-action' | 'informational';
type NotificationIcon = 'calendar' | 'hourglass' | 'message' | 'document' | 'announcement';
type SortOption = 'newest' | 'oldest' | 'priority';
type StatusFilter = 'all' | 'unread' | 'read' | 'needs-action';

interface StaffNotification {
  id: number;
  category: NotificationCategory;
  tone: NotificationTone;
  priority: NotificationPriority;
  label: string;
  title: string;
  meta: string;
  detail: string;
  time: string;
  exactTime: string;
  icon: NotificationIcon;
  needsAction: boolean;
  unread: boolean;
  actionable: boolean;
  patientName?: string;
  appointmentId?: string;
  appointmentDbId?: number;
  status?: string;
}

interface FilterChip {
  key: 'all' | NotificationCategory;
  label: string;
}

@Component({
  selector: 'app-staff-notification',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-notifications.html',
  styleUrls: ['./staff-notifications.css'],
})
export class StaffNotificationsComponent implements OnInit, OnDestroy {
  selectedFilter: FilterChip['key'] = 'all';
  statusFilter: StatusFilter = 'all';
  sortBy: SortOption = 'newest';
  searchQuery = '';
  showSearch = false;

  selectedNotification: StaffNotification | null = null;
  showRejectModal = false;
  rejectTarget: StaffNotification | null = null;
  rejectReason = '';
  rejectError = '';

  approvingId: number | null = null;
  rejectingId: number | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;
  private pollInterval: any;

  filters: FilterChip[] = [
    { key: 'all',            label: 'All'           },
    { key: 'appointments',   label: 'Appointments'  },
    { key: 'treatment',      label: 'Treatment'     },
    { key: 'messages',       label: 'Messages'      },
    { key: 'medical-vault',  label: 'Medical Vault' },
    { key: 'clinic-updates', label: 'Clinic Updates'},
  ];

  notifications: StaffNotification[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.pollInterval = setInterval(() => this.loadNotifications(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.toastTimer)   clearTimeout(this.toastTimer);
  }

  // ── Load from API ─────────────────────────────────────────────────────────
  private loadNotifications(): void {
    this.api.getStaffNotifications().subscribe({
      next: (data) => {
        this.notifications = data.map((a: any) => ({
          id:              a.id,
          appointmentDbId: a.id,
          appointmentId:   `#${a.id}`,
          category:        'appointments' as NotificationCategory,
          tone:            this.toneForStatus(a.status),
          priority:        this.priorityForStatus(a.status),
          label:           this.labelForStatus(a.status),
          title:           this.titleForStatus(a.status, a.patient_name),
          meta:            `${this.formatDate(a.appointment_date)} – ${this.formatTime(a.appointment_time)}${a.dentist_name ? ' · ' + a.dentist_name : ''}`,
          detail:          `${a.patient_name} — ${a.treatment}${a.notes ? '. ' + a.notes : ''}`,
          time:            this.relativeTime(a.updated_at || a.created_at),
          exactTime:       this.formatDate(a.updated_at || a.created_at),
          icon:            (a.status === 'Pending' ? 'hourglass' : 'calendar') as NotificationIcon,
          needsAction:     a.status === 'Pending',
          unread:          a.status === 'Pending',
          actionable:      a.status === 'Pending',
          patientName:     a.patient_name,
          status:          a.status,
        }));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ── Approve — real API call ───────────────────────────────────────────────
  approve(notif: StaffNotification, event: Event): void {
    event.stopPropagation();
    if (!notif.appointmentDbId || this.approvingId === notif.id) return;
    this.approvingId = notif.id;

    this.api.approveAppointment(notif.appointmentDbId, '', '').subscribe({
      next: () => {
        notif.status      = 'Approved';
        notif.needsAction = false;
        notif.unread      = false;
        notif.tone        = 'green';
        notif.label       = 'Approved';
        notif.priority    = 'informational';
        notif.actionable  = false;
        this.approvingId  = null;
        this.showToast(`${notif.patientName}'s appointment approved.`, 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.approvingId = null;
        this.showToast(err?.error?.message ?? 'Failed to approve. Try from the Requests page.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Reject modal — real API call ──────────────────────────────────────────
  openReject(notif: StaffNotification, event: Event): void {
    event.stopPropagation();
    this.rejectTarget = notif;
    this.rejectReason = '';
    this.rejectError  = '';
    this.showRejectModal = true;
  }

  submitReject(): void {
    if (!this.rejectTarget || !this.rejectReason.trim()) {
      this.rejectError = 'Please provide a reason.';
      return;
    }
    if (!this.rejectTarget.appointmentDbId) return;
    this.rejectingId = this.rejectTarget.id;

    this.api.cancelAppointment(this.rejectTarget.appointmentDbId, this.rejectReason.trim()).subscribe({
      next: () => {
        if (this.rejectTarget) {
          this.rejectTarget.status      = 'Cancelled by Staff';
          this.rejectTarget.needsAction = false;
          this.rejectTarget.unread      = false;
          this.rejectTarget.tone        = 'slate';
          this.rejectTarget.label       = 'Rejected';
          this.rejectTarget.priority    = 'informational';
          this.rejectTarget.actionable  = false;
          this.showToast(`${this.rejectTarget.patientName}'s request rejected.`, 'success');
        }
        this.rejectingId = null;
        this.closeRejectModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rejectingId = null;
        this.rejectError = err?.error?.message ?? 'Failed to reject. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectTarget    = null;
    this.rejectReason    = '';
    this.rejectError     = '';
  }

  // ── Details modal ─────────────────────────────────────────────────────────
  openDetails(notif: StaffNotification, event?: Event): void {
    event?.stopPropagation();
    notif.unread = false;
    this.selectedNotification = notif;
  }

  closeDetails(): void { this.selectedNotification = null; }

  // ── Read state ────────────────────────────────────────────────────────────
  markAllAsRead(): void {
    this.notifications.forEach(n => n.unread = false);
    this.cdr.detectChanges();
  }

  markAsRead(notif: StaffNotification): void {
    notif.unread = false;
    this.cdr.detectChanges();
  }

  toggleRead(notif: StaffNotification, event: Event): void {
    event.stopPropagation();
    notif.unread = !notif.unread;
    this.cdr.detectChanges();
  }

  // ── Filters & sort ────────────────────────────────────────────────────────
  setFilter(key: FilterChip['key']): void { this.selectedFilter = key; }
  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.searchQuery = '';
  }

  // ── Computed lists ────────────────────────────────────────────────────────
  get visibleNotifications(): StaffNotification[] {
    let list = [...this.notifications];
    if (this.selectedFilter !== 'all') list = list.filter(n => n.category === this.selectedFilter);
    if (this.statusFilter === 'unread')       list = list.filter(n => n.unread);
    if (this.statusFilter === 'read')         list = list.filter(n => !n.unread);
    if (this.statusFilter === 'needs-action') list = list.filter(n => n.needsAction);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.detail.toLowerCase().includes(q) ||
        (n.patientName?.toLowerCase().includes(q))
      );
    }
    if (this.sortBy === 'newest')   list = list.sort((a, b) => b.id - a.id);
    if (this.sortBy === 'oldest')   list = list.sort((a, b) => a.id - b.id);
    if (this.sortBy === 'priority') {
      const order: Record<NotificationPriority, number> = { urgent: 0, 'needs-action': 1, informational: 2 };
      list = list.sort((a, b) => order[a.priority] - order[b.priority]);
    }
    return list;
  }

  get unreadCount():      number { return this.notifications.filter(n => n.unread).length; }
  get needsActionCount(): number { return this.notifications.filter(n => n.needsAction).length; }
  get urgentCount():      number { return this.notifications.filter(n => n.priority === 'urgent').length; }

  getFilterCount(key: FilterChip['key']): number {
    return key === 'all' ? this.notifications.length
      : this.notifications.filter(n => n.category === key).length;
  }

  getPriorityBorderClass(priority: NotificationPriority): string {
    return { urgent: 'border-urgent', 'needs-action': 'border-action', informational: 'border-info' }[priority];
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType    = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private toneForStatus(status: string): NotificationTone {
    if (status === 'Pending')                                                  return 'amber';
    if (status === 'Approved' || status === 'Completed')                       return 'green';
    if (status?.includes('Cancelled'))                                         return 'slate';
    if (status?.includes('Reschedule') || status?.includes('Rescheduled'))     return 'blue';
    if (status === 'No-show')                                                  return 'purple';
    return 'slate';
  }

  private priorityForStatus(status: string): NotificationPriority {
    if (status === 'Pending')  return 'needs-action';
    if (status === 'No-show')  return 'urgent';
    return 'informational';
  }

  private labelForStatus(status: string): string {
    const map: Record<string, string> = {
      'Pending':                          'Pending Approval',
      'Approved':                         'Approved',
      'Completed':                        'Completed',
      'No-show':                          'No-show',
      'Cancelled by Patient':             'Cancelled by Patient',
      'Cancelled by Staff':               'Cancelled by Staff',
      'Cancelled by Dentist':             'Cancelled by Dentist',
      'Rescheduled by Staff':             'Rescheduled',
      'Rescheduled by Dentist':           'Rescheduled',
      'Reschedule Requested by Patient':  'Reschedule Requested',
      'Reschedule Requested by Dentist':  'Reschedule Requested',
    };
    return map[status] || status;
  }

  private titleForStatus(status: string, patient: string): string {
    if (status === 'Pending')              return 'New Appointment Request';
    if (status === 'Approved')             return 'Appointment Confirmed';
    if (status === 'Completed')            return 'Appointment Completed';
    if (status === 'No-show')              return 'Patient No-Show';
    if (status?.includes('Cancelled'))     return 'Appointment Cancelled';
    if (status?.includes('Reschedule'))    return 'Reschedule Activity';
    return `Appointment Update — ${patient}`;
  }

  private formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatTime(t: string): string {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  private relativeTime(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
  }
}
