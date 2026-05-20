import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface PatientRecord {
  id: string;
  db_id: number;
  name: string;
  initials: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  allergies: string;
  chiefComplaint: string;
  diagnosis: string;
  lastVisit: string;
  nextAppointment: string;
  currentTreatment: string;
  treatmentCategory: string;
  status: 'Active' | 'Completed' | 'Consultation' | 'Follow-up';
  treatmentHistory: TreatmentSession[];
  clinicalNotes: ClinicalNote[];
  prescriptions: Prescription[];
  attachments: Attachment[];
  odontogram: ToothStatus[];
  treatmentProgress: ProgressSession[];
}

export interface TreatmentSession {
  date: string; procedure: string; tooth: string; dentist: string; notes: string; followUp: string;
}
export interface ClinicalNote {
  date: string; type: 'Consultation' | 'Procedure' | 'Post-treatment' | 'Observation'; note: string;
}
export interface Prescription {
  medication: string; dosage: string; frequency: string; duration: string; instructions: string; date: string;
}
export interface Attachment {
  name: string; type: 'X-ray' | 'Photo' | 'Lab Result' | 'Consent Form' | 'Scan'; date: string; size: string;
}
export interface ToothStatus {
  number: number; status: 'healthy' | 'cavity' | 'filled' | 'missing' | 'crown' | 'extraction' | 'planned'; note?: string;
}
export interface ProgressSession {
  session: number; title: string; date: string; status: 'done' | 'pending' | 'upcoming'; note: string;
}

@Component({
  selector: 'app-dentist-patient',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-patients.html',
  styleUrl: './dentist-patients.css',
})
export class DentistPatientsComponent implements OnInit {

  searchQuery = '';
  filterStatus = 'All';
  activeTab = 'overview';
  selectedPatient: PatientRecord | null = null;
  isLoading = true;

  readonly statusOptions = ['All', 'Active', 'Completed', 'Consultation', 'Follow-up'];
  readonly tabs = [
    { key: 'overview',    label: 'Overview'         },
    { key: 'medical',     label: 'Medical Record'   },
    { key: 'history',     label: 'Treatment History'},
    { key: 'odontogram',  label: 'Odontogram'       },
    { key: 'notes',       label: 'Clinical Notes'   },
    { key: 'attachments', label: 'Attachments'      },
  ];

  patients: PatientRecord[] = [];

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    this.api.getDentistPatients(dentistName).subscribe({
      next: (data) => {
        this.patients = data.map(p => this.mapPatient(p));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private mapPatient(p: any): PatientRecord {
    const name = `${p.first_name} ${p.last_name}`;
    const status = this.deriveStatus(p.treatment_status);
    return {
      db_id:            p.id,
      id:               `CS-${String(p.id).padStart(5,'0')}`,
      name,
      initials:         name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
      age:              p.date_of_birth ? this.calcAge(p.date_of_birth) : 0,
      gender:           p.gender || '—',
      phone:            p.phone || '—',
      email:            p.email || '—',
      address:          p.home_address || '—',
      bloodType:        p.blood_type || '—',
      allergies:        '—',
      chiefComplaint:   '—',
      diagnosis:        p.current_treatment || '—',
      lastVisit:        p.last_visit ? this.fmtDate(p.last_visit) : '—',
      nextAppointment:  p.next_appointment ? this.fmtDate(p.next_appointment) : 'No booking',
      currentTreatment: p.current_treatment || '—',
      treatmentCategory:'—',
      status,
      treatmentHistory: [],
      clinicalNotes:    [],
      prescriptions:    [],
      attachments:      [],
      odontogram:       this.defaultOdontogram(),
      treatmentProgress:[],
    };
  }

  private deriveStatus(s: string): 'Active' | 'Completed' | 'Consultation' | 'Follow-up' {
    if (s === 'Approved') return 'Active';
    if (s === 'Completed') return 'Completed';
    if (s === 'Pending') return 'Consultation';
    return 'Active';
  }

  private calcAge(dob: string): number {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  private fmtDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  private defaultOdontogram(): ToothStatus[] {
    const teeth: ToothStatus[] = [];
    for (let n = 11; n <= 18; n++) teeth.push({ number: n, status: 'healthy' });
    for (let n = 21; n <= 28; n++) teeth.push({ number: n, status: 'healthy' });
    for (let n = 31; n <= 38; n++) teeth.push({ number: n, status: 'healthy' });
    for (let n = 41; n <= 48; n++) teeth.push({ number: n, status: 'healthy' });
    return teeth;
  }

  selectPatient(p: PatientRecord) {
    this.selectedPatient = p;
    this.activeTab = 'overview';
    // Load appointment history
    this.api.getDentistPatientHistory(p.db_id).subscribe({
      next: (data) => {
        if (this.selectedPatient) {
          this.selectedPatient.treatmentHistory = data.map(a => ({
            date:      this.fmtDate(a.appointment_date),
            procedure: a.treatment,
            tooth:     (a.services || []).join(', ') || '—',
            dentist:   a.dentist_name || '—',
            notes:     a.notes || '—',
            followUp:  '—',
          }));
          this.selectedPatient.treatmentProgress = data.map((a, i) => ({
            session: i + 1,
            title:   a.treatment,
            date:    this.fmtDate(a.appointment_date),
            status:  a.status === 'Completed' ? 'done' : a.status === 'Approved' ? 'pending' : 'upcoming',
            note:    a.notes || '',
          }));
          this.cdr.detectChanges();
        }
      }
    });
  }

  get filtered(): PatientRecord[] {
    return this.patients.filter(p => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      const matchStatus = this.filterStatus === 'All' || p.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  setTab(tab: string) { this.activeTab = tab; }

  statusTone(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Consultation: 'consult', 'Follow-up': 'followup' } as any)[s] || 'active';
  }
  toothColor(status: string): string {
    return ({ healthy: '#e8f5e9', cavity: '#ffcdd2', filled: '#bbdefb', missing: '#eeeeee', crown: '#fff9c4', extraction: '#ffccbc', planned: '#e1bee7' } as any)[status] || '#e8f5e9';
  }
  toothBorder(status: string): string {
    return ({ healthy: '#a5d6a7', cavity: '#ef9a9a', filled: '#90caf9', missing: '#bdbdbd', crown: '#fff176', extraction: '#ffab91', planned: '#ce93d8' } as any)[status] || '#a5d6a7';
  }
  noteTypeColor(type: string): string {
    return ({ Consultation: 'blue', Procedure: 'teal', 'Post-treatment': 'green', Observation: 'amber' } as any)[type] || 'blue';
  }
  attachIcon(type: string): string {
    return ({ 'X-ray': '🩻', Photo: '📷', 'Lab Result': '🧪', 'Consent Form': '📄', Scan: '🔍' } as any)[type] || '📎';
  }
  upperTeeth(p: PatientRecord) { return p.odontogram.filter(t => t.number >= 11 && t.number <= 28).sort((a,b) => a.number - b.number); }
  lowerTeeth(p: PatientRecord) { return p.odontogram.filter(t => t.number >= 31 && t.number <= 48).sort((a,b) => a.number - b.number); }
}
