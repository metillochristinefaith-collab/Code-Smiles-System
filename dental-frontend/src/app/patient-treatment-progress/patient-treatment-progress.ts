import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import {
  LinkedRecord,
  TreatmentPlan,
} from './patient-treatment-plan-data';

@Component({
  selector: 'app-patient-treatment-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-treatment-progress.html',
  styleUrls: ['./patient-treatment-progress.css'],
})
export class PatientTreatmentProgress implements OnInit {
  constructor(private readonly router: Router, private readonly auth: AuthService, private readonly api: ApiService, private readonly cdr: ChangeDetectorRef, private readonly avatarSvc: AvatarService) {}

  protected get patientProfile() {
    const user = this.auth.getUser();
    return {
      name: user ? `${user.first_name} ${user.last_name}` : 'Patient',
      id:   user ? `CS-${String(user.id).padStart(5, '0')}` : '—',
    };
  }

  protected avatarUrl: string = '';
  protected treatmentPlans: TreatmentPlan[] = [];
  protected isLoading = true;
  protected hasError = false;

  ngOnInit(): void {
    // Load avatar
    this.avatarUrl = this.avatarSvc.getAvatar();
    if (!this.avatarUrl) {
      this.avatarSvc.loadAvatarFromDB().then(() => {
        this.avatarUrl = this.avatarSvc.getAvatar();
        this.cdr.detectChanges();
      }).catch(() => {});
    }

    const user = this.auth.getUser();
    if (!user?.id) {
      this.isLoading = false;
      return;
    }

    this.api.getMyAppointments(user.id)
      .pipe(catchError(() => {
        this.hasError = true;
        return of([] as any[]);
      }))
      .subscribe({
        next: (appointments) => {
          this.treatmentPlans = appointments.map((a) => this.appointmentToTreatmentPlan(a));
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.hasError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  private appointmentToTreatmentPlan(a: any): TreatmentPlan {
    const status = this.mapAppointmentStatus(a.status);
    const statusClass = this.mapStatusClass(a.status);
    const progress = statusClass === 'completed' ? 100 : statusClass === 'active' ? 50 : 0;
    const stepsCompleted = statusClass === 'completed' ? 1 : 0;
    const totalSteps = 1;

    return {
      id: `APT-${a.id}`,
      appointmentId: a.id,
      title: a.treatment || 'Appointment',
      shortTitle: a.treatment || 'Appointment',
      subtitle: `${a.dentist_name || 'TBD'} • ${this.formatDate(a.appointment_date)}`,
      status: status,
      statusClass: statusClass,
      progress: progress,
      stepsCompleted: stepsCompleted,
      totalSteps: totalSteps,
      icon: 'consultation' as const,
      cardDescription: a.notes || `Appointment for ${a.treatment || 'dental care'}`,
      nextStepTitle: statusClass === 'pending' ? 'Awaiting Approval' : statusClass === 'active' ? 'Appointment Scheduled' : 'Completed',
      nextStepDate: this.formatDate(a.appointment_date),
      nextStepTime: this.formatTime(a.appointment_time),
      nextStepDoctor: a.dentist_name || 'TBD',
      nextStepDescription: statusClass === 'pending' ? 'Your appointment request is being reviewed by our staff.' : 
                          statusClass === 'active' ? 'Your appointment is confirmed and scheduled.' : 
                          'Appointment completed successfully.',
      steps: [{
        order: 1,
        title: a.treatment || 'Appointment',
        date: this.formatDate(a.appointment_date),
        dentist: a.dentist_name || 'TBD',
        note: a.notes || '',
        status: status,
        statusClass: statusClass === 'completed' ? 'completed' : statusClass === 'active' ? 'upcoming' : 'pending',
        stage: statusClass === 'completed' ? 'done' : statusClass === 'active' ? 'current' : 'next',
        appointment: {
          date: this.formatDate(a.appointment_date),
          time: this.formatTime(a.appointment_time),
          doctor: a.dentist_name || 'TBD',
        }
      }]
    };
  }

  private mapAppointmentStatus(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'Under Review',
      'Approved': 'Scheduled',
      'Completed': 'Completed',
      'Cancelled by Patient': 'Cancelled',
      'Cancelled by Staff': 'Cancelled',
      'Cancelled by Dentist': 'Cancelled',
      'No-show': 'No-show',
    };
    return map[status] || status;
  }

  private mapStatusClass(status: string): 'active' | 'completed' | 'pending' | 'upcoming' {
    if (status === 'Approved') return 'active';
    if (status === 'Completed') return 'completed';
    if (status === 'Pending') return 'pending';
    return 'upcoming';
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  private formatTime(timeStr: string): string {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  // ── Search / filter ──────────────────────────────────────────
  protected searchTerm = '';
  protected statusFilter = 'all';

  protected get filteredPlans(): TreatmentPlan[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.treatmentPlans.filter(p => {
      const matchesSearch = !q ||
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q);
      const matchesStatus = this.statusFilter === 'all' ||
        p.statusClass === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  protected get activePlans(): TreatmentPlan[] {
    return this.filteredPlans.filter(p =>
      p.statusClass === 'active' || p.statusClass === 'pending' || p.statusClass === 'upcoming'
    );
  }

  protected get completedPlans(): TreatmentPlan[] {
    return this.filteredPlans.filter(p => p.statusClass === 'completed');
  }

  protected get activeCount(): number {
    return this.treatmentPlans.filter(p => p.statusClass === 'active' || p.statusClass === 'pending').length;
  }

  protected get completedCount(): number {
    return this.treatmentPlans.filter(p => p.statusClass === 'completed').length;
  }

  // ── Accordion ────────────────────────────────────────────────
  protected expandedId: string | null = null;

  protected toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  protected isExpanded(id: string): boolean {
    return this.expandedId === id;
  }

  // ── Linked records ───────────────────────────────────────────
  protected viewLinkedRecord(record: LinkedRecord): void {
    this.router.navigate(['/patient-medical-vault'], {
      queryParams: { record: record.title },
    });
  }

  /** Collect all unique linked records across all steps of a plan */
  protected getLinkedRecords(plan: TreatmentPlan): LinkedRecord[] {
    const seen = new Set<string>();
    const result: LinkedRecord[] = [];
    for (const step of plan.steps) {
      for (const r of step.linkedRecords ?? []) {
        if (!seen.has(r.title)) {
          seen.add(r.title);
          result.push(r);
        }
      }
    }
    return result;
  }

  // ── Toast ────────────────────────────────────────────────────
  protected toastMessage = '';

  protected showToast(msg: string): void {
    this.toastMessage = msg;
    window.clearTimeout((this as { _tt?: number })._tt);
    (this as { _tt?: number })._tt = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2400);
  }

  // ── Step icon helper ─────────────────────────────────────────
  protected stepIcon(stage: string): 'done' | 'current' | 'next' {
    return stage as 'done' | 'current' | 'next';
  }
}
