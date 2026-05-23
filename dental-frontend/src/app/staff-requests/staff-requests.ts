import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';
import { SyncService } from '../services/sync.service';
import { DENTIST_ROSTER } from '../dentist-portal-data';

interface Appointment {
  id: number;
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
}

@Component({
  selector: 'app-staff-request',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-requests.html',
  styleUrls: ['./staff-requests.css'],
})
export class StaffRequestsComponent implements OnInit {
  protected appointments: Appointment[] = [];
  protected isLoading = true;
  protected loadError = '';
  protected selectedRequest: Appointment | null = null;
  protected showRescheduleForm = false;
  protected showRejectForm = false;
  protected actionMessage = '';
  protected actionType: 'success' | 'error' = 'success';

  // Search + sort
  protected searchTerm = '';
  protected sortBy: 'newest' | 'oldest' | 'az' | 'za' | 'date_asc' | 'date_desc' = 'newest';

  // Dentist assignment — editable before approving
  protected assignedDentist = '';
  protected readonly dentistOptions = DENTIST_ROSTER.map(d => d.fullName);

  // Confirm approve dialog
  protected showConfirmApprove = false;
  protected pendingApproveReq: Appointment | null = null;
  protected isApproving = false;
  protected isRejecting = false;
  protected isRescheduling = false;

  protected newDate = '';
  protected newTime = '';
  protected rescheduleReason = '';
  protected rejectReason = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private syncService: SyncService
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.loadError = '';

    this.api.getStaffAppointments().subscribe({
      next: (data) => {
        this.appointments = Array.isArray(data) ? data : [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Could not connect to server. Make sure the backend is running.';
        this.appointments = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Auto-assigns a dentist based on the treatment/service.
   * Looks up DENTIST_ROSTER to find who offers that service or category.
   * Falls back to the first dentist if no match found.
   */
  private autoAssignDentist(treatment: string): string {
    const treatmentLower = treatment.toLowerCase();
    const match = DENTIST_ROSTER.find(d =>
      d.services.some(s => s.toLowerCase() === treatmentLower) ||
      d.categories.some(c => c.toLowerCase() === treatmentLower)
    );
    return match?.fullName ?? DENTIST_ROSTER[0].fullName;
  }

  protected get pendingRequests(): Appointment[] {
    return this.appointments.filter(a => a.status === 'Pending');
  }

  protected get filteredRequests(): Appointment[] {
    const q = this.searchTerm.trim().toLowerCase();
    let list = this.pendingRequests.filter(a => {
      if (!q) return true;
      return [a.patient_name, a.treatment, a.phone, (a.services || []).join(' ')]
        .join(' ').toLowerCase().includes(q);
    });

    switch (this.sortBy) {
      case 'oldest':    list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case 'az':        list = [...list].sort((a, b) => a.patient_name.localeCompare(b.patient_name)); break;
      case 'za':        list = [...list].sort((a, b) => b.patient_name.localeCompare(a.patient_name)); break;
      case 'date_asc':  list = [...list].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date)); break;
      case 'date_desc': list = [...list].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)); break;
      default:          list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
    }
    return list;
  }

  protected get pendingCount(): number  { return this.appointments.filter(a => a.status === 'Pending').length; }
  protected get approvedCount(): number { return this.appointments.filter(a => a.status === 'Approved').length; }
  protected get changedCount(): number  {
    return this.appointments.filter(a =>
      a.status === 'Cancelled by Staff' || a.status === 'Cancelled by Patient' ||
      a.status === 'Cancelled by Dentist' ||
      a.status === 'Rescheduled by Dentist'
    ).length;
  }

  protected openDetails(req: Appointment): void {
    this.selectedRequest = req;
    this.showRescheduleForm = false;
    this.showRejectForm = false;
    // Pre-fill dentist — editable by staff before approving
    this.assignedDentist = req.dentist_name || this.autoAssignDentist(req.treatment);
  }

  protected closeDetails(): void {
    this.selectedRequest = null;
    this.showRescheduleForm = false;
    this.showRejectForm = false;
    this.showConfirmApprove = false;
    this.pendingApproveReq = null;
    this.assignedDentist = '';
  }

  // Step 1: open confirm dialog
  protected requestApprove(req: Appointment): void {
    this.pendingApproveReq = req;
    this.showConfirmApprove = true;
  }

  // Step 2: confirmed — call API
  protected confirmApprove(): void {
    if (!this.pendingApproveReq || this.isApproving) return;
    this.isApproving = true;

    this.api.approveAppointment(this.pendingApproveReq.id, this.assignedDentist, this.pendingApproveReq.notes).subscribe({
      next: () => {
        this.pendingApproveReq!.status = 'Approved';
        this.pendingApproveReq!.dentist_name = this.assignedDentist;
        this.isApproving = false;
        this.showConfirmApprove = false;
        this.showToast(`${this.pendingApproveReq!.patient_name}'s appointment approved — assigned to ${this.assignedDentist}.`, 'success');
        this.pendingApproveReq = null;
        this.closeDetails();
        
        // Trigger sync refresh for dentist portal
        console.log('[StaffRequests] Triggering sync refresh after approval');
        this.syncService.triggerRefresh();
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isApproving = false;
        this.showConfirmApprove = false;
        this.showToast(err?.error?.message ?? 'Failed to approve. Please try again.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  protected dismissConfirmApprove(): void {
    this.showConfirmApprove = false;
    this.pendingApproveReq = null;
  }

  // Keep old approve() for backward compat with direct calls
  protected approve(req: Appointment): void {
    this.requestApprove(req);
  }

  protected reject(req: Appointment): void {
    this.selectedRequest = req;
    this.showRejectForm = true;
    this.showRescheduleForm = false;
    this.rejectReason = '';
    this.assignedDentist = req.dentist_name || this.autoAssignDentist(req.treatment);
  }

  protected submitReject(): void {
    if (!this.selectedRequest || !this.rejectReason.trim() || this.isRejecting) return;
    this.isRejecting = true;
    this.api.cancelAppointment(this.selectedRequest.id, this.rejectReason).subscribe({
      next: () => {
        this.selectedRequest!.status = 'Cancelled by Staff';
        this.isRejecting = false;
        this.showToast(`${this.selectedRequest!.patient_name}'s request was rejected.`, 'success');
        this.closeDetails();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isRejecting = false;
        this.showToast(err?.error?.message ?? 'Failed to reject.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  protected reschedule(req: Appointment): void {
    this.selectedRequest = req;
    this.showRescheduleForm = true;
    this.showRejectForm = false;
    this.newDate = req.appointment_date;
    this.newTime = req.appointment_time;
    this.rescheduleReason = '';
    this.assignedDentist = req.dentist_name || this.autoAssignDentist(req.treatment);
  }

  protected submitReschedule(): void {
    if (!this.selectedRequest || !this.newDate || !this.newTime || this.isRescheduling) return;
    this.isRescheduling = true;
    this.api.rescheduleAppointment(
      this.selectedRequest.id, this.newDate, this.newTime, this.rescheduleReason
    ).subscribe({
      next: () => {
        this.selectedRequest!.status = 'Approved';
        this.selectedRequest!.appointment_date = this.newDate;
        this.selectedRequest!.appointment_time = this.newTime;
        this.isRescheduling = false;
        this.showToast(`${this.selectedRequest!.patient_name} rescheduled to ${this.formatDate(this.newDate)} at ${this.formatTime(this.newTime)}.`, 'success');
        this.closeDetails();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isRescheduling = false;
        this.showToast(err?.error?.message ?? 'Failed to reschedule.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType    = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  protected formatDate(date: string): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .format(new Date(date + 'T00:00:00'));
  }

  protected formatTime(time: string): string {
    if (!time) return '—';
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
