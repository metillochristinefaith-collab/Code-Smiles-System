import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-staff-appointment-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-appointment-detail.html',
  styleUrls: ['./staff-appointment-detail.css'],
})
export class StaffAppointmentDetailComponent implements OnInit {
  protected appointment: any = null;
  protected isLoading = true;
  protected loadError = '';

  // Cancel modal
  protected showCancelModal = false;
  protected cancelReason = '';
  protected isCancelling = false;
  protected cancelError = '';

  // Complete action
  protected isCompleting = false;

  // Toast
  protected toastMessage = '';
  protected toastType: 'success' | 'error' = 'success';
  private toastTimer?: ReturnType<typeof setTimeout>;

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
    this.loadAppointment(Number(id));
  }

  private loadAppointment(id: number): void {
    this.isLoading = true;
    this.api.getStaffAppointmentById(id).subscribe({
      next: (data) => {
        this.appointment = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = err?.error?.message ?? 'Could not load appointment. Make sure the backend is running.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Computed display helpers ──────────────────────────────────────────────

  get patientInitials(): string {
    const name = this.appointment?.patient_name ?? '';
    return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  get formattedDate(): string {
    if (!this.appointment?.appointment_date) return '—';
    return new Date(this.appointment.appointment_date + 'T00:00:00')
      .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  get formattedTime(): string {
    return this.formatTime(this.appointment?.appointment_time);
  }

  get formattedEndTime(): string {
    if (!this.appointment?.appointment_time || !this.appointment?.duration_minutes) return '—';
    const [h, m] = this.appointment.appointment_time.split(':').map(Number);
    const totalMins = h * 60 + m + (this.appointment.duration_minutes || 60);
    const eh = Math.floor(totalMins / 60) % 24;
    const em = totalMins % 60;
    const suffix = eh >= 12 ? 'PM' : 'AM';
    const hour = eh % 12 || 12;
    return `${hour}:${String(em).padStart(2, '0')} ${suffix}`;
  }

  get formattedUpdatedAt(): string {
    if (!this.appointment?.updated_at) return '—';
    return new Date(this.appointment.updated_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  get formattedCreatedAt(): string {
    if (!this.appointment?.created_at) return '—';
    return new Date(this.appointment.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  get servicesList(): string[] {
    return Array.isArray(this.appointment?.services) ? this.appointment.services : [];
  }

  get patientIdDisplay(): string {
    const pid = this.appointment?.patient_id;
    return pid ? `CS-${String(pid).padStart(5, '0')}` : 'Guest';
  }

  get reliabilityLabel(): string {
    const s = this.appointment?.reliability_score ?? 0;
    if (s >= 8)  return 'High';
    if (s >= 3)  return 'Good';
    if (s >= 0)  return 'Fair';
    if (s >= -5) return 'Low';
    return 'Poor';
  }

  get reliabilityTone(): string {
    const s = this.appointment?.reliability_score ?? 0;
    if (s >= 8)  return 'mint';
    if (s >= 3)  return 'blue';
    if (s >= 0)  return 'amber';
    if (s >= -5) return 'orange';
    return 'rose';
  }

  get canComplete(): boolean {
    return this.appointment?.status === 'Approved';
  }

  get canCancel(): boolean {
    const s = this.appointment?.status ?? '';
    return !['Cancelled by Staff', 'Cancelled by Patient', 'Cancelled by Dentist',
             'Completed', 'No-show'].includes(s);
  }

  get canReschedule(): boolean {
    return this.canCancel;
  }

  // ── Status styling ────────────────────────────────────────────────────────

  getStatusClass(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/\s+/g, '-');
    if (s.includes('approved'))    return 'status-approved';
    if (s.includes('pending'))     return 'status-pending';
    if (s.includes('completed'))   return 'status-completed';
    if (s.includes('cancelled'))   return 'status-cancelled';
    if (s.includes('no-show'))     return 'status-noshow';
    if (s.includes('reschedule'))  return 'status-rescheduled';
    return 'status-pending';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  protected markComplete(): void {
    if (!this.appointment || this.isCompleting) return;
    this.isCompleting = true;
    this.api.updateAppointmentStatus(this.appointment.id, 'Completed').subscribe({
      next: () => {
        this.appointment.status = 'Completed';
        this.isCompleting = false;
        this.showToast('Appointment marked as completed.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isCompleting = false;
        this.showToast(err?.error?.message ?? 'Failed to update status.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  protected reschedule(): void {
    if (this.appointment) {
      this.router.navigate(['/staff-appointments', this.appointment.id, 'reschedule']);
    }
  }

  protected openCancelModal(): void {
    this.cancelReason = '';
    this.cancelError = '';
    this.showCancelModal = true;
  }

  protected closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelReason = '';
    this.cancelError = '';
  }

  protected confirmCancel(): void {
    if (!this.cancelReason.trim()) {
      this.cancelError = 'Please provide a reason for cancellation.';
      return;
    }
    this.isCancelling = true;
    this.cancelError = '';
    this.api.cancelAppointment(this.appointment.id, this.cancelReason.trim()).subscribe({
      next: () => {
        this.appointment.status = 'Cancelled by Staff';
        this.isCancelling = false;
        this.closeCancelModal();
        this.showToast('Appointment cancelled. Patient has been notified.', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isCancelling = false;
        this.cancelError = err?.error?.message ?? 'Failed to cancel. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  protected goBack(): void {
    this.router.navigate(['/staff-appointments']);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMessage = msg;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }
}
