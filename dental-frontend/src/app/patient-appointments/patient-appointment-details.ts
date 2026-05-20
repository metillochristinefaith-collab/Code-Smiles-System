import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { PatientAppointment } from './patient-appointments';

@Component({
  selector: 'app-patient-appointment-details',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-appointment-details.html',
  styleUrls: ['./patient-appointment-details.css'],
})
export class PatientAppointmentDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected appointment: PatientAppointment | null = null;
  protected isLoading = true;
  protected loadError = '';

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id') ?? '';
    // Route param is "APT-42" — extract the numeric part
    const appointmentId = this.normalizeAppointmentId(rawId);

    if (!appointmentId) {
      this.isLoading = false;
      this.loadError = 'Invalid appointment ID.';
      return;
    }

    const user = this.auth.getUser();
    if (!user?.id) {
      this.isLoading = false;
      this.loadError = 'Please sign in again to view your appointment details.';
      return;
    }

    // Load all appointments for this patient and find the matching one
    this.api.getMyAppointments(user.id).subscribe({
      next: (data) => {
        const raw = data.find(a =>
          this.normalizeAppointmentId(a.id) === appointmentId ||
          this.normalizeAppointmentId(a.appointment_id) === appointmentId ||
          this.normalizeAppointmentId(a.dbId) === appointmentId
        );
        if (raw) {
          this.appointment = this.mapDbAppointment(raw);
        } else {
          this.loadError = `Appointment ${rawId || appointmentId} was not found in your appointments.`;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = err?.error?.message || 'Failed to load appointment details.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeAppointmentId(value: unknown): string {
    return String(value ?? '').trim().replace(/^APT-/i, '');
  }

  private mapDbAppointment(a: any): PatientAppointment {
    const dateObj = new Date(`${a.appointment_date}T00:00:00`);
    const status = this.mapStatus(a.status);
    const tab = this.mapTab(a.status, a.appointment_date);
    const accent = this.mapAccent(a.status);
    const services: string[] = Array.isArray(a.services) ? a.services : [];

    return {
      id: `APT-${a.id}`,
      dbId: a.id,
      service: services[0] || a.treatment || 'Appointment',
      category: a.treatment || '—',
      dentist: a.dentist_name || 'Dentist assignment pending',
      location: 'Code Smiles Dental Clinic',
      dateMonth: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObj).toUpperCase(),
      dateDay: new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(dateObj),
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObj).toUpperCase(),
      accent,
      time: this.formatTime(a.appointment_time),
      status,
      confirmationStatus: a.confirmation_status || 'Not Confirmed',
      tab,
      description: services.length > 1 ? services.join(', ') : (a.notes || a.treatment || 'Appointment'),
      patientName: a.patient_name || '—',
      patientEmail: a.email || '—',
      patientPhone: a.phone || '—',
      patientAge: '—',
      notes: a.notes || '',
      rescheduledBy: a.rescheduled_by || null,
      bookedOn: a.created_at
        ? new Date(a.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
      durationLabel: a.duration_minutes ? `${a.duration_minutes} minutes` : '60 minutes',
      servicesSummary: services,
      history: [
        { label: 'Request submitted', value: a.created_at ? new Date(a.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
        ...(a.status === 'Approved' ? [{ label: 'Approved by clinic', value: a.updated_at ? new Date(a.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }] : []),
        ...(a.status === 'Completed' ? [{ label: 'Completed', value: a.updated_at ? new Date(a.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }] : []),
        ...(a.status !== 'Approved' && a.status !== 'Completed' && a.status !== 'Pending' ? [{ label: a.status, value: a.updated_at ? new Date(a.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—' }] : []),
      ],
    };
  }

  private mapStatus(dbStatus: string): PatientAppointment['status'] {
    const map: Record<string, PatientAppointment['status']> = {
      'Pending':                         'Pending Approval',
      'Approved':                        'Approved',
      'Completed':                       'Completed',
      'Cancelled by Patient':            'Cancelled by You',
      'Cancelled by Staff':              'Cancelled by Clinic',
      'Cancelled by Dentist':            'Cancelled by Dentist',
      'Rescheduled by Staff':            'Rescheduled by Clinic',
      'Rescheduled by Dentist':          'Rescheduled by Dentist',
      'Reschedule Requested by Patient': 'Reschedule Requested',
      'Reschedule Requested by Dentist': 'Dentist Requested Reschedule',
      'No-show':                         'No-show',
    };
    return map[dbStatus] ?? dbStatus;
  }

  private mapTab(dbStatus: string, dateStr: string): 'upcoming' | 'pending' | 'past' {
    const cancelledOrPast = ['Cancelled by Patient', 'Cancelled by Staff', 'Cancelled by Dentist', 'Completed', 'No-show'];
    const pendingStatuses = ['Pending', 'Reschedule Requested by Patient', 'Reschedule Requested by Dentist', 'Rescheduled by Staff', 'Rescheduled by Dentist'];
    if (cancelledOrPast.includes(dbStatus)) return 'past';
    if (pendingStatuses.includes(dbStatus)) return 'pending';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(`${dateStr}T00:00:00`) >= today ? 'upcoming' : 'past';
  }

  private mapAccent(dbStatus: string): PatientAppointment['accent'] {
    const map: Record<string, PatientAppointment['accent']> = {
      'Approved':                        'blue',
      'Pending':                         'amber',
      'Completed':                       'teal',
      'Cancelled by Patient':            'violet',
      'Cancelled by Staff':              'violet',
      'Cancelled by Dentist':            'violet',
      'Rescheduled by Staff':            'amber',
      'Rescheduled by Dentist':          'amber',
      'Reschedule Requested by Patient': 'amber',
      'Reschedule Requested by Dentist': 'amber',
      'No-show':                         'violet',
    };
    return map[dbStatus] ?? 'blue';
  }

  private formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  protected goBack(): void {
    this.router.navigate(['/patient-appointments']);
  }

  protected requestReschedule(): void {
    if (!this.appointment) return;
    this.router.navigate(['/patient-booking'], {
      queryParams: { reschedule: this.appointment.id },
    });
  }

  protected cancelAppointment(): void {
    if (!this.appointment) return;

    const shouldCancel = window.confirm(
      'Cancel this appointment request? You can still book a new appointment after this.',
    );
    if (!shouldCancel) return;

    this.api.cancelMyAppointment(this.appointment.dbId, 'Cancelled by patient').subscribe({
      next: () => this.router.navigate(['/patient-appointments']),
      error: () => this.router.navigate(['/patient-appointments']),
    });
  }

  protected getStatusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  protected get canManageAppointment(): boolean {
    if (!this.appointment) return false;
    const unmanageable = ['Completed', 'Cancelled by Patient', 'Cancelled by Staff', 'Cancelled by Dentist', 'No-show'];
    return !unmanageable.includes(this.appointment.status as string);
  }
}
