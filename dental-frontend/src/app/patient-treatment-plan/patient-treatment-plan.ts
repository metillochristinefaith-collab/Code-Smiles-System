import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';
import {
  LinkedRecord,
  PATIENT_TREATMENT_PLANS,
  TreatmentPlan,
  TreatmentStep,
} from '../patient-treatment-progress/patient-treatment-plan-data';

const EMPTY_TREATMENT_PLAN: TreatmentPlan = {
  id: 'empty',
  title: 'No Treatment Plan Available',
  shortTitle: 'No Plan',
  subtitle: 'Awaiting clinic update',
  status: 'No treatment plan',
  statusClass: 'upcoming',
  progress: 0,
  stepsCompleted: 0,
  totalSteps: 0,
  icon: 'consultation',
  cardDescription: 'No plan yet',
  nextStepTitle: 'No next step',
  nextStepDate: 'Not scheduled',
  nextStepTime: 'TBD',
  nextStepDoctor: 'Clinic Review Team',
  nextStepDescription: 'A treatment plan will appear here once the clinic creates one.',
  steps: [],
};

@Component({
  selector: 'app-patient-treatment-plan',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-treatment-plan.html',
  styleUrl: './patient-treatment-plan.css',
})
export class PatientTreatmentPlan implements OnInit {
  protected initial: string = 'P';

  protected get patientProfile() {
    const user = this.auth.getUser();
    if (user) {
      this.initial = (user?.first_name?.charAt(0) ?? 'P').toUpperCase();
    }
    return {
      name: user ? `${user.first_name} ${user.last_name}` : 'Patient',
      id:   user ? `CS-${String(user.id).padStart(5, '0')}` : '—',
    };
  }

  protected readonly treatmentPlans = PATIENT_TREATMENT_PLANS;
  protected treatmentPlan: TreatmentPlan = PATIENT_TREATMENT_PLANS[0] ?? EMPTY_TREATMENT_PLAN;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const requestedPlan = params.get('id');
      this.treatmentPlan =
        this.treatmentPlans.find((plan) => plan.id === requestedPlan) ??
        this.treatmentPlans[0] ??
        EMPTY_TREATMENT_PLAN;
    });
  }

  protected get currentStep(): TreatmentStep {
    return (
      this.treatmentPlan.steps.find((step) => step.stage === 'current') ??
      this.treatmentPlan.steps[this.treatmentPlan.steps.length - 1] ?? {
        order: 0,
        title: 'No treatment steps yet',
        date: 'Not scheduled',
        dentist: 'Clinic Review Team',
        note: 'Treatment steps will appear after your dentist creates a plan.',
        status: 'Pending',
        statusClass: 'upcoming',
        stage: 'next',
      }
    );
  }

  protected get linkedRecords(): LinkedRecord[] {
    return this.treatmentPlan.steps.flatMap((step) => step.linkedRecords ?? []);
  }

  protected viewLinkedRecord(record: LinkedRecord): void {
    this.router.navigate(['/patient-medical-vault'], {
      queryParams: { record: record.title },
    });
  }
}
