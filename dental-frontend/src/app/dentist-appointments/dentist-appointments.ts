import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { AvatarService } from '../services/avatar.service';
import { SyncService } from '../services/sync.service';
import { getDentistInfo, getDentistDisplayName } from '../dentist-portal-data';

export interface Appointment {
  id: number;
  patient_id: number | null;
  patient_name: string;
  email: string;
  phone: string;
  treatment: string;
  services: string[];
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  notes: string;
  dentist_name: string;
  urgency: string;
  created_at: string;
  initials?: string;
}

@Component({
  selector: 'app-dentist-appointment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-appointments.html',
  styleUrl: './dentist-appointments.css',
})
export class DentistAppointmentsComponent implements OnInit, OnDestroy {

  readonly tabs = ['Upcoming', 'Today', 'Completed', 'Rescheduled', 'Cancelled'];
  activeTab = 'Upcoming';
  searchQuery = '';
  selectedAppointment: Appointment | null = null;
  isLoading = true;
  actionMessage = '';
  treatmentNote = '';
  avatarUrl: string | null = null;

  // Follow-up modal
  showFollowUpModal = false;
  followUpDate = '';
  followUpType = 'Procedure Continuation';
  followUpNote = '';

  // Cancel modal
  showCancelModal = false;
  cancelReason = '';

  // Reschedule request modal
  showRescheduleModal = false;
  reschedulePreferredDate = '';
  reschedulePreferredTime = '';
  rescheduleReason = '';

  allAppointments: Appointment[] = [];

  // Keep these for template compatibility
  readonly statusOptions = ['All', 'Approved', 'Completed', 'Rescheduled by Staff', 'Rescheduled by Dentist', 'Cancelled by Staff', 'Cancelled by Dentist', 'Cancelled by Patient', 'Pending'];
  readonly treatmentOptions = ['All', 'General Dentistry', 'Cosmetic Arts', 'Orthodontics', 'Oral Surgery', 'Dental Implants', 'Pediatric Care'];
  filterStatus = 'All';
  filterTreatment = 'All';
  private todayStr = new Date().toISOString().split('T')[0];

  // Sync subscription
  private syncSubscription: Subscription | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private avatarService: AvatarService,
    private syncService: SyncService,
  ) {}

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

    // Load initial appointments
    this.loadAppointments();

    // Subscribe to sync service for real-time updates
    this.syncSubscription = this.syncService.appointmentRefresh$.subscribe({
      next: (shouldRefresh) => {
        if (shouldRefresh) {
          console.log('[DentistAppointments] Refreshing appointments from sync service');
          this.loadAppointments();
        }
      }
    });

    // Start polling for appointment updates
    this.syncService.startPolling();
  }

  ngOnDestroy() {
    // Cleanup subscriptions
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
    // Stop polling when component is destroyed
    this.syncService.stopPolling();
  }

  get displayDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  get dentistDisplayName(): string {
    return getDentistDisplayName(this.auth.getUser()) || 'Dentist';
  }

  get dentistInitials(): string {
    const user = this.auth.getUser();
    if (!user) return 'DR';
    return `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}`.toUpperCase();
  }

  get dentistSpecialty(): string {
    const user = this.auth.getUser();
    return getDentistInfo(user?.email ?? '')?.specialty ?? 'Dentist';
  }

  loadAppointments() {
    this.isLoading = true;
    this.api.getMyDentistAppointments().subscribe({
      next: (data) => {
        this.allAppointments = data.map(a => ({
          ...a,
          initials: a.patient_name
            ? a.patient_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : '??',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); },
    });
  }

  // ── Tab filtering ──────────────────────────────────────────────────────────

  get filteredAppointments(): Appointment[] {
    const rescheduledStatuses = ['Rescheduled by Staff', 'Rescheduled by Dentist', 'Reschedule Requested by Patient', 'Reschedule Requested by Dentist'];
    const cancelledStatuses   = ['Cancelled by Staff', 'Cancelled by Dentist', 'Cancelled by Patient', 'No-show'];

    return this.allAppointments.filter(a => {
      const matchTab =
        this.activeTab === 'Today'       ? a.appointment_date === this.todayStr && a.status === 'Approved' :
        this.activeTab === 'Upcoming'    ? a.appointment_date >= this.todayStr && a.status === 'Approved' :
        this.activeTab === 'Completed'   ? a.status === 'Completed' :
        this.activeTab === 'Rescheduled' ? rescheduledStatuses.includes(a.status) :
        cancelledStatuses.includes(a.status);

      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || a.patient_name.toLowerCase().includes(q) || a.treatment.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }

  get todayCount()       { return this.allAppointments.filter(a => a.appointment_date === this.todayStr && a.status === 'Approved').length; }
  get upcomingCount()    { return this.allAppointments.filter(a => a.appointment_date > this.todayStr && a.status === 'Approved').length; }
  get completedCount()   { return this.allAppointments.filter(a => a.status === 'Completed').length; }
  get cancelledCount()   { return this.allAppointments.filter(a => ['Cancelled by Staff','Cancelled by Dentist','Cancelled by Patient','No-show'].includes(a.status)).length; }
  get rescheduledCount() { return this.allAppointments.filter(a => ['Rescheduled by Staff','Rescheduled by Dentist','Reschedule Requested by Patient','Reschedule Requested by Dentist'].includes(a.status)).length; }

  setTab(tab: string)        { this.activeTab = tab; this.selectedAppointment = null; }
  openDetail(a: Appointment) { this.selectedAppointment = a; }
  clearSelection()           { this.selectedAppointment = null; }

  // ── Mark Completed ─────────────────────────────────────────────────────────

  markCompleted(a: Appointment) {
    this.api.updateAppointmentStatus(a.id, 'Completed', this.treatmentNote || undefined).subscribe({
      next: () => {
        a.status = 'Completed';
        if (this.treatmentNote) { a.notes = this.treatmentNote; this.treatmentNote = ''; }
        this.showSuccess(`${a.patient_name}'s appointment marked as completed.`);
      },
      error: (err) => this.showError(err?.error?.message || 'Failed to mark completed.'),
    });
  }

  saveTreatmentNote(a: Appointment) {
    if (!this.treatmentNote.trim()) return;
    this.api.updateAppointmentStatus(a.id, a.status, this.treatmentNote).subscribe({
      next: () => {
        a.notes = this.treatmentNote;
        this.treatmentNote = '';
        this.showSuccess('Treatment note saved.');
      },
      error: (err) => this.showError(err?.error?.message || 'Failed to save note.'),
    });
  }

  // ── Mark No-show ───────────────────────────────────────────────────────────

  markNoShow(a: Appointment) {
    this.api.markNoShow(a.id).subscribe({
      next: () => {
        a.status = 'No-show';
        this.showSuccess(`${a.patient_name} marked as no-show.`);
        this.clearSelection();
      },
      error: (err) => this.showError(err?.error?.message || 'Failed to mark no-show.'),
    });
  }

  // ── Cancel by Dentist ──────────────────────────────────────────────────────

  openCancelModal() {
    this.showCancelModal = true;
    this.cancelReason = '';
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.cancelReason = '';
  }

  submitCancel() {
    if (!this.selectedAppointment) return;
    const a = this.selectedAppointment;
    this.api.cancelByDentist(a.id, this.cancelReason).subscribe({
      next: () => {
        a.status = 'Cancelled by Dentist';
        this.closeCancelModal();
        this.showSuccess(`${a.patient_name}'s appointment cancelled.`);
        this.clearSelection();
      },
      error: (err) => this.showError(err?.error?.message || 'Failed to cancel.'),
    });
  }

  // ── Request Reschedule by Dentist ──────────────────────────────────────────

  openRescheduleModal() {
    this.showRescheduleModal = true;
    this.reschedulePreferredDate = '';
    this.reschedulePreferredTime = '';
    this.rescheduleReason = '';
  }

  closeRescheduleModal() {
    this.showRescheduleModal = false;
  }

  submitRescheduleRequest() {
    if (!this.selectedAppointment) return;
    const a = this.selectedAppointment;
    this.api.requestRescheduleByDentist(a.id, this.reschedulePreferredDate, this.reschedulePreferredTime, this.rescheduleReason).subscribe({
      next: () => {
        a.status = 'Reschedule Requested by Dentist';
        this.closeRescheduleModal();
        this.showSuccess(`Reschedule request sent for ${a.patient_name}.`);
        this.clearSelection();
      },
      error: (err) => this.showError(err?.error?.message || 'Failed to send reschedule request.'),
    });
  }

  // ── Follow-up ──────────────────────────────────────────────────────────────

  openFollowUp()  { this.showFollowUpModal = true; }
  closeFollowUp() { this.showFollowUpModal = false; this.followUpDate = ''; this.followUpNote = ''; }

  scheduleFollowUp() {
    if (!this.selectedAppointment || !this.followUpDate) return;
    const a = this.selectedAppointment;
    this.api.bookAppointment({
      patient_id: a.patient_id, full_name: a.patient_name,
      phone: a.phone, email: a.email, treatment: a.treatment,
      services: a.services, appointment_date: this.followUpDate,
      appointment_time: a.appointment_time, duration_minutes: a.duration_minutes,
      notes: this.followUpNote || 'Follow-up appointment',
    }).subscribe({
      next: () => {
        this.showSuccess(`Follow-up scheduled for ${this.followUpDate}.`);
        this.closeFollowUp();
      },
      error: () => this.showError('Failed to schedule follow-up.'),
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private showSuccess(msg: string) {
    this.actionMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.actionMessage = ''; this.cdr.detectChanges(); }, 3500);
  }

  private showError(msg: string) {
    this.actionMessage = `⚠ ${msg}`;
    this.cdr.detectChanges();
    setTimeout(() => { this.actionMessage = ''; this.cdr.detectChanges(); }, 4000);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  statusTone(status: string): string {
    if (status === 'Approved') return 'confirmed';
    if (status === 'Completed') return 'completed';
    if (status.startsWith('Cancelled')) return 'cancelled';
    if (status.includes('Rescheduled') || status.includes('Reschedule')) return 'rescheduled';
    if (status === 'No-show') return 'cancelled';
    return 'pending';
  }

  get canActOnSelected(): boolean {
    if (!this.selectedAppointment) return false;
    const nonActionable = ['Completed', 'Cancelled by Staff', 'Cancelled by Dentist', 'Cancelled by Patient', 'No-show'];
    return !nonActionable.includes(this.selectedAppointment.status);
  }
}
