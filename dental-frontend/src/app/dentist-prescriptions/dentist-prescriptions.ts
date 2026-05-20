import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export type RxStatus = 'Active' | 'Completed' | 'Pending' | 'Cancelled';

export interface RxMedication {
  name: string; dosage: string; frequency: string; duration: string; instructions: string;
}
export interface Prescription {
  id: string;
  db_id: number;
  patient: string;
  patient_id: number | null;
  initials: string;
  diagnosis: string;
  condition: string;
  date: string;
  status: RxStatus;
  dentist: string;
  medications: RxMedication[];
  notes: string;
}

@Component({
  selector: 'app-dentist-prescription',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-prescriptions.html',
  styleUrl: './dentist-prescriptions.css',
})
export class DentistPrescriptionsComponent implements OnInit {

  searchQuery  = '';
  filterStatus = 'All';
  activeTab    = 'details';
  selectedRx: Prescription | null = null;
  isLoading = true;
  actionMessage = '';

  // New prescription form
  showForm    = false;
  isSaving    = false;
  formError   = '';
  patients: any[] = [];

  form = {
    patient_id:     null as number | null,
    patient_name:   '',
    medication:     '',
    dosage:         '',
    frequency:      '',
    duration:       '',
    instructions:   '',
    diagnosis:      '',
    condition_note: '',
    notes:          '',
  };

  // Status update
  showStatusModal  = false;
  pendingStatus: RxStatus = 'Active';

  readonly statusOptions = ['All', 'Active', 'Completed', 'Pending', 'Cancelled'];
  readonly tabs = [
    { key: 'details',  label: 'Details'    },
    { key: 'notes',    label: 'Notes'      },
  ];

  prescriptions: Prescription[] = [];
  private dentistName = '';
  private dentistId: number | null = null;

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    this.dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';
    this.dentistId   = user?.id ?? null;
    this.loadPrescriptions();
    this.loadPatients();
  }

  private loadPrescriptions() {
    this.isLoading = true;
    this.api.getDentistPrescriptions(this.dentistName).subscribe({
      next: (data) => {
        this.prescriptions = data.map(p => this.mapPrescription(p));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private loadPatients() {
    this.api.getDentistPatients(this.dentistName).subscribe({
      next: (data) => { this.patients = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  private mapPrescription(p: any): Prescription {
    const name = p.patient_name || '—';
    return {
      db_id:      p.id,
      id:         `RX-${String(p.id).padStart(5, '0')}`,
      patient:    name,
      patient_id: p.patient_id || null,
      initials:   name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      diagnosis:  p.diagnosis || '—',
      condition:  p.condition_note || '—',
      date:       p.date_fmt || '—',
      status:     (p.status || 'Active') as RxStatus,
      dentist:    p.dentist_name || '—',
      medications: p.medication ? [{
        name:         p.medication,
        dosage:       p.dosage || '—',
        frequency:    p.frequency || '—',
        duration:     p.duration || '—',
        instructions: p.instructions || '',
      }] : [],
      notes: p.instructions || '',
    };
  }

  get filtered(): Prescription[] {
    return this.prescriptions.filter(rx => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || rx.patient.toLowerCase().includes(q) || rx.id.toLowerCase().includes(q) || rx.diagnosis.toLowerCase().includes(q);
      const matchStatus = this.filterStatus === 'All' || rx.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  openForm() {
    this.form = { patient_id: null, patient_name: '', medication: '', dosage: '',
                  frequency: '', duration: '', instructions: '', diagnosis: '', condition_note: '', notes: '' };
    this.formError = '';
    this.showForm  = true;
  }

  closeForm() { this.showForm = false; }

  onPatientSelect() {
    const selectedId = this.form.patient_id;
    const p = this.patients.find(pt => String(pt.id) === String(selectedId));
    if (p) {
      this.form.patient_name = `${p.first_name} ${p.last_name}`;
      this.form.diagnosis    = p.current_treatment || '';
    }
  }

  submitForm() {
    // Ensure patient_name is set even if onPatientSelect was missed
    if (!this.form.patient_name.trim() && this.form.patient_id) {
      const p = this.patients.find(pt => String(pt.id) === String(this.form.patient_id));
      if (p) this.form.patient_name = `${p.first_name} ${p.last_name}`;
    }

    if (!this.form.patient_id)            { this.formError = 'Please select a patient.'; return; }
    if (!this.form.patient_name.trim())   { this.formError = 'Patient not found. Please re-select.'; return; }
    if (!this.form.medication.trim())     { this.formError = 'Medication name is required.'; return; }
    if (!this.form.dosage.trim())         { this.formError = 'Dosage is required.'; return; }

    this.isSaving  = true;
    this.formError = '';

    const payload = {
      patient_id:     this.form.patient_id ? Number(this.form.patient_id) : null,
      patient_name:   this.form.patient_name,
      dentist_id:     this.dentistId,
      dentist_name:   this.dentistName,
      medication:     this.form.medication,
      dosage:         this.form.dosage,
      frequency:      this.form.frequency,
      duration:       this.form.duration,
      instructions:   this.form.instructions || this.form.notes,
      diagnosis:      this.form.diagnosis,
      condition_note: this.form.condition_note,
    };

    this.api.createDentistPrescription(payload).subscribe({
      next: (saved) => {
        this.prescriptions.unshift(this.mapPrescription({ ...saved, date_fmt: new Date().toISOString().split('T')[0] }));
        this.isSaving = false;
        this.showForm = false;
        this.showSuccess('Prescription created successfully.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to save. Please restart the backend server and try again.';
        this.formError = msg;
        this.isSaving  = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Select / Status ───────────────────────────────────────────────────────

  selectRx(rx: Prescription) { this.selectedRx = rx; this.activeTab = 'details'; }
  setTab(tab: string)         { this.activeTab = tab; }

  openStatusModal(rx: Prescription) {
    this.selectedRx      = rx;
    this.pendingStatus   = rx.status;
    this.showStatusModal = true;
  }

  closeStatusModal() { this.showStatusModal = false; }

  saveStatus() {
    if (!this.selectedRx) return;
    this.api.updatePrescriptionStatus(this.selectedRx.db_id, this.pendingStatus).subscribe({
      next: () => {
        this.selectedRx!.status = this.pendingStatus;
        this.showStatusModal = false;
        this.showSuccess('Status updated.');
        this.cdr.detectChanges();
      },
      error: () => { this.showStatusModal = false; }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showSuccess(msg: string) {
    this.actionMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.actionMessage = ''; this.cdr.detectChanges(); }, 3000);
  }

  statusTone(s: string): string {
    return ({ Active: 'active', Completed: 'completed', Pending: 'pending', Cancelled: 'cancelled' } as any)[s] || 'pending';
  }
}
