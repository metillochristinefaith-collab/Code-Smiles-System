import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export interface MedicalRecord {
  id: string;
  db_id: number;
  patient: string;
  initials: string;
  age: number;
  gender: string;
  diagnosis: string;
  chiefComplaint: string;
  lastTreatmentDate: string;
  treatmentStatus: 'Active' | 'Completed' | 'Pending' | 'Follow-up';
  assignedDentist: string;
  bloodType: string;
  allergies: string[];
  medications: string[];
  pastIllnesses: string[];
  surgeries: string[];
  healthConditions: string[];
  dentalHistory: DentalProcedure[];
  treatmentPlan: TreatmentStep[];
  clinicalNotes: ClinicalNote[];
  odontogram: ToothStatus[];
  prescriptions: Prescription[];
  attachments: Attachment[];
}

export interface DentalProcedure {
  date: string; procedure: string; tooth: string; notes: string;
}
export interface TreatmentStep {
  step: number; procedure: string; scheduledDate: string; status: 'done' | 'pending' | 'upcoming'; notes: string;
}
export interface ClinicalNote {
  date: string; type: 'Consultation' | 'Procedure' | 'Post-treatment' | 'Observation'; note: string; dentist: string;
}
export interface ToothStatus {
  number: number; status: 'healthy' | 'cavity' | 'filled' | 'missing' | 'crown' | 'extraction' | 'planned'; note?: string;
}
export interface Prescription {
  medication: string; dosage: string; frequency: string; duration: string; instructions: string; date: string; status: 'Active' | 'Completed' | 'Pending';
}
export interface Attachment {
  name: string; type: 'X-ray' | 'Photo' | 'Lab Result' | 'Consent Form' | 'Scan'; date: string; size: string;
}

@Component({
  selector: 'app-dentist-medical-vault',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-medical-vault.html',
  styleUrl: './dentist-medical-vault.css',
})
export class DentistMedicalVault implements OnInit {

  searchQuery = '';
  filterStatus = 'All';
  activeTab = 'overview';
  selectedRecord: MedicalRecord | null = null;
  isLoading = true;

  readonly statusOptions = ['All', 'Active', 'Completed', 'Pending', 'Follow-up'];
  readonly tabs = [
    { key: 'overview', label: 'Overview'       },
    { key: 'dental',   label: 'Dental History' },
    { key: 'shared',   label: 'Shared Files'   },
  ];

  records: MedicalRecord[] = [];

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    
    this.api.getDentistPatients(dentistName).subscribe({
      next: (data) => {
        this.records = data.map(p => this.mapRecord(p));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private mapRecord(p: any): MedicalRecord {
    const name = `${p.first_name} ${p.last_name}`;
    const status = this.deriveStatus(p.treatment_status);
    return {
      db_id:             p.id,
      id:                `MR-${String(p.id).padStart(5,'0')}`,
      patient:           name,
      initials:          name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
      age:               p.date_of_birth ? this.calcAge(p.date_of_birth) : 0,
      gender:            p.gender || 'N/A',
      diagnosis:         p.current_treatment || 'N/A',
      chiefComplaint:    'N/A',
      lastTreatmentDate: p.last_visit ? this.fmtDate(p.last_visit) : 'N/A',
      treatmentStatus:   status,
      assignedDentist:   p.primary_dentist || 'N/A',
      bloodType:         p.blood_type || 'N/A',
      allergies:         ['N/A'],
      medications:       ['N/A'],
      pastIllnesses:     ['N/A'],
      surgeries:         ['N/A'],
      healthConditions:  ['N/A'],
      dentalHistory:     [],
      treatmentPlan:     [],
      clinicalNotes:     [],
      odontogram:        this.defaultOdontogram(),
      prescriptions:     [],
      attachments:       [],
    };
  }

  private deriveStatus(s: string): 'Active' | 'Completed' | 'Pending' | 'Follow-up' {
    if (s === 'Approved') return 'Active';
    if (s === 'Completed') return 'Completed';
    if (s === 'Pending') return 'Pending';
    return 'Active';
  }

  private mapRecordTypeToAttachmentType(recordType: string): 'X-ray' | 'Photo' | 'Lab Result' | 'Consent Form' | 'Scan' {
    const typeMap: { [key: string]: 'X-ray' | 'Photo' | 'Lab Result' | 'Consent Form' | 'Scan' } = {
      'X-Ray': 'X-ray',
      'Lab Result': 'Lab Result',
      'Medical Form': 'Consent Form',
      'Treatment Plan': 'Scan',
      'Prescription': 'Consent Form',
      'Insurance': 'Consent Form',
    };
    return typeMap[recordType] || 'Scan';
  }

  private calcAge(dob: string): number {
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
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

  selectRecord(r: MedicalRecord) {
    this.selectedRecord = r;
    this.activeTab = 'overview';
    
    this.api.getDentistPatientHistory(r.db_id).subscribe({
      next: (data) => {
        if (this.selectedRecord) {
          this.selectedRecord.dentalHistory = data.map(a => ({
            date:      this.fmtDate(a.appointment_date),
            procedure: a.treatment,
            tooth:     (a.services || []).join(', ') || 'N/A',
            notes:     a.notes || 'N/A',
          }));
          this.selectedRecord.treatmentPlan = data.map((a, i) => ({
            step:          i + 1,
            procedure:     a.treatment,
            scheduledDate: this.fmtDate(a.appointment_date),
            status:        a.status === 'Completed' ? 'done' : a.status === 'Approved' ? 'pending' : 'upcoming',
            notes:         a.notes || '',
          }));
        }
      }
    });

    // Load shared vault records for this patient
    const user = this.auth.getUser();
    this.api.getDentistVaultRecords(user?.id).subscribe({
      next: (sharedRecords) => {
        console.log('Shared records received:', sharedRecords);
        if (this.selectedRecord) {
          const patientSharedRecords = sharedRecords.filter(
            sr => sr.patient_id === r.db_id
          );
          console.log('Patient shared records:', patientSharedRecords);
          this.selectedRecord.attachments = patientSharedRecords.map(sr => ({
            name: sr.file_name,
            type: this.mapRecordTypeToAttachmentType(sr.record_type),
            date: sr.display_date,
            size: sr.file_size,
          }));
          console.log('Attachments set:', this.selectedRecord.attachments);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error loading shared records:', err);
      }
    });
  }

  get filtered(): MedicalRecord[] {
    return this.records.filter(r => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || r.patient.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.diagnosis.toLowerCase().includes(q);
      const matchStatus = this.filterStatus === 'All' || r.treatmentStatus === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  setTab(tab: string) { this.activeTab = tab; }

  statusTone(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Pending: 'pending', 'Follow-up': 'followup' } as any)[s] || 'active';
  }
  toothColor(s: string): string {
    return ({ healthy: '#e8f5e9', cavity: '#ffcdd2', filled: '#bbdefb', missing: '#eeeeee', crown: '#fff9c4', extraction: '#ffccbc', planned: '#e1bee7' } as any)[s] || '#e8f5e9';
  }
  toothBorder(s: string): string {
    return ({ healthy: '#a5d6a7', cavity: '#ef9a9a', filled: '#90caf9', missing: '#bdbdbd', crown: '#fff176', extraction: '#ffab91', planned: '#ce93d8' } as any)[s] || '#a5d6a7';
  }
  noteTypeColor(t: string): string {
    return ({ Consultation: 'blue', Procedure: 'teal', 'Post-treatment': 'green', Observation: 'amber' } as any)[t] || 'blue';
  }
  attachIcon(t: string): string {
    return ({ 'X-ray': '📷', Photo: '📸', 'Lab Result': '🧪', 'Consent Form': '📋', Scan: '🖼' } as any)[t] || '📎';
  }
  rxStatusColor(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Pending: 'pending' } as any)[s] || 'pending';
  }
  upperTeeth(r: MedicalRecord) { return r.odontogram.filter(t => t.number >= 11 && t.number <= 28).sort((a,b) => a.number - b.number); }
  lowerTeeth(r: MedicalRecord) { return r.odontogram.filter(t => t.number >= 31 && t.number <= 48).sort((a,b) => a.number - b.number); }
  toothNotes(r: MedicalRecord) { return r.odontogram.filter(t => t.note); }
}
