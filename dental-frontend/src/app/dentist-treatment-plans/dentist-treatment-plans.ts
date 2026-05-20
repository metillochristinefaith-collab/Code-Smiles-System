import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export type Priority = 'Urgent' | 'High Priority' | 'Regular' | 'Follow-up';
export type PlanStatus = 'Active' | 'Completed' | 'Pending' | 'On Hold';
export type StepStatus = 'done' | 'ongoing' | 'pending' | 'upcoming';

export interface TreatmentStep {
  session: number; title: string; date: string; status: StepStatus; notes: string;
}
export interface PlannedProcedure {
  name: string; category: string; tooth: string; sessions: number; priority: Priority; status: StepStatus; steps: TreatmentStep[];
}
export interface ClinicalNote {
  date: string; type: 'Consultation' | 'Procedure' | 'Progress' | 'Recommendation'; note: string; dentist: string;
}
export interface Prescription {
  medication: string; dosage: string; frequency: string; duration: string; instructions: string; date: string; status: 'Active' | 'Completed' | 'Pending';
}
export interface Attachment {
  name: string; type: 'X-ray' | 'Photo' | 'Lab Result' | 'Consent Form' | 'Reference'; date: string; size: string;
}
export interface TreatmentPlan {
  id: string;
  db_id: number;
  patient: string;
  initials: string;
  age: number;
  gender: string;
  diagnosis: string;
  chiefComplaint: string;
  treatmentType: string;
  category: string;
  status: PlanStatus;
  priority: Priority;
  progress: number;
  estimatedSessions: number;
  completedSessions: number;
  startDate: string;
  targetDate: string;
  assignedDentist: string;
  procedures: PlannedProcedure[];
  clinicalNotes: ClinicalNote[];
  prescriptions: Prescription[];
  attachments: Attachment[];
}

@Component({
  selector: 'app-dentist-treatment-plan',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-treatment-plans.html',
  styleUrl: './dentist-treatment-plans.css',
})
export class DentistTreatmentPlansComponent implements OnInit {

  searchQuery = '';
  filterStatus = 'All';
  activeTab = 'diagnosis';
  selectedPlan: TreatmentPlan | null = null;
  isLoading = true;

  readonly statusOptions = ['All', 'Active', 'Completed', 'Pending', 'On Hold'];
  readonly tabs = [
    { key: 'diagnosis',    label: 'Diagnosis'      },
    { key: 'procedures',   label: 'Procedures'     },
    { key: 'progress',     label: 'Progress'       },
    { key: 'notes',        label: 'Clinical Notes' },
    { key: 'prescriptions',label: 'Prescriptions'  },
    { key: 'attachments',  label: 'Attachments'    },
  ];

  plans: TreatmentPlan[] = [];

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    this.api.getDentistAppointments(dentistName).subscribe({
      next: (data) => {
        this.plans = data.map(a => this.mapAppointmentToPlan(a));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private mapAppointmentToPlan(a: any): TreatmentPlan {
    const name = a.patient_name || '—';
    const isCompleted = a.status === 'Completed';
    const isApproved  = a.status === 'Approved';
    const planStatus: PlanStatus = isCompleted ? 'Completed' : isApproved ? 'Active' : 'Pending';
    const progress = isCompleted ? 100 : isApproved ? 50 : 0;
    const services: string[] = Array.isArray(a.services) ? a.services : [];

    const stepStatus: StepStatus = isCompleted ? 'done' : isApproved ? 'ongoing' : 'pending';

    const apptDateFmt = a.appointment_date
      ? new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return {
      db_id:             a.id,
      id:                `TP-${String(a.id).padStart(5, '0')}`,
      patient:           name,
      initials:          name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      age:               0,
      gender:            '—',
      diagnosis:         a.treatment || '—',
      chiefComplaint:    '—',
      treatmentType:     a.treatment || '—',
      category:          a.treatment || '—',
      status:            planStatus,
      priority:          'Regular' as Priority,
      progress,
      estimatedSessions: 1,
      completedSessions: isCompleted ? 1 : 0,
      startDate:         apptDateFmt,
      targetDate:        apptDateFmt,
      assignedDentist:   a.dentist_name || '—',
      procedures: [{
        name:     services.length > 0 ? services.join(', ') : (a.treatment || '—'),
        category: a.treatment || '—',
        tooth:    '—',
        sessions: 1,
        priority: 'Regular' as Priority,
        status:   stepStatus,
        steps: [{
          session: 1,
          title:   services.length > 0 ? services.join(', ') : (a.treatment || '—'),
          date:    apptDateFmt,
          status:  stepStatus,
          notes:   a.notes || '',
        }],
      }],
      clinicalNotes:  [],
      prescriptions:  [],
      attachments:    [],
    };
  }

  get filtered(): TreatmentPlan[] {
    return this.plans.filter(p => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || p.patient.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.treatmentType.toLowerCase().includes(q);
      const matchStatus = this.filterStatus === 'All' || p.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  selectPlan(p: TreatmentPlan) { this.selectedPlan = p; this.activeTab = 'diagnosis'; }
  setTab(tab: string) { this.activeTab = tab; }

  statusTone(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Pending: 'pending', 'On Hold': 'hold' } as any)[s] || 'pending';
  }
  priorityTone(p: string): string {
    return ({ Urgent: 'urgent', 'High Priority': 'high', Regular: 'regular', 'Follow-up': 'followup' } as any)[p] || 'regular';
  }
  stepTone(s: string): string {
    return ({ done: 'done', ongoing: 'ongoing', pending: 'pending', upcoming: 'upcoming' } as any)[s] || 'upcoming';
  }
  noteTypeColor(t: string): string {
    return ({ Consultation: 'blue', Procedure: 'teal', Progress: 'green', Recommendation: 'amber' } as any)[t] || 'blue';
  }
  rxStatusColor(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Pending: 'pending' } as any)[s] || 'pending';
  }
  attachIcon(t: string): string {
    return ({ 'X-ray': '🩻', Photo: '📷', 'Lab Result': '🧪', 'Consent Form': '📄', Reference: '🔗' } as any)[t] || '📎';
  }
  progressWidth(v: number): string { return `${v}%`; }
}
