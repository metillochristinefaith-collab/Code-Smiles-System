export type TreatmentStatus = 'active' | 'completed' | 'pending' | 'upcoming';
export type TreatmentIcon = 'orthodontics' | 'whitening' | 'filling' | 'retainer' | 'consultation';

export interface LinkedRecord {
  title: string;
  type: 'xray' | 'plan' | 'notes';
}

export interface TreatmentStep {
  order: number;
  title: string;
  date: string;
  dentist: string;
  note: string;
  status: string;
  statusClass: 'completed' | 'pending' | 'upcoming';
  stage: 'done' | 'current' | 'next';
  appointment?: {
    date: string;
    time: string;
    doctor: string;
  };
  linkedRecords?: LinkedRecord[];
}

export interface TreatmentPlan {
  id: string;
  appointmentId?: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  status: string;
  statusClass: TreatmentStatus;
  progress: number;
  stepsCompleted: number;
  totalSteps: number;
  icon: TreatmentIcon;
  cardDescription: string;
  nextStepTitle: string;
  nextStepDate: string;
  nextStepTime: string;
  nextStepDoctor: string;
  nextStepDescription: string;
  steps: TreatmentStep[];
}

export const PATIENT_TREATMENT_PLANS: TreatmentPlan[] = [];