import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { ApiService } from '../services/api.service';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive';
  lastVisit: string;
  nextAppointment: string;
  registeredDate: string;
  reliabilityScore: number;
  totalAppointments: number;
  // raw DB fields
  db_id?: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at?: string;
}

@Component({
  selector: 'app-staff-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-patients.html',
  styleUrls: ['./staff-patients.css'],
})
export class StaffPatientsComponent implements OnInit {

  protected patients: Patient[] = [];
  protected isLoading = true;

  protected searchTerm = '';
  protected genderFilter = '';
  protected statusFilter = '';

  protected isModalOpen = false;
  protected editingPatient: Patient | null = null;
  protected showSuccessAlert = false;
  protected successMessage = '';
  protected form: Partial<Patient> = {};
  protected viewingPatient: Patient | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.isLoading = true;
    this.api.getPatientsEnriched().toPromise().then((data) => {
      this.patients = (data || []).map((p: any) => {
        // Calculate age from date_of_birth if available
        let age = 0;
        if (p.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          const today = new Date();
          age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        }

        // Format last visit
        let lastVisit = '—';
        if (p.last_visit) {
          lastVisit = new Date(p.last_visit + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });
        }

        // Format next appointment
        let nextAppointment = 'No booking';
        if (p.next_appointment) {
          nextAppointment = new Date(p.next_appointment + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });
        }

        return {
          db_id:             p.id,
          id:                `CS-${String(p.id).padStart(5, '0')}`,
          name:              `${p.first_name} ${p.last_name}`,
          first_name:        p.first_name,
          last_name:         p.last_name,
          age,
          gender:            p.gender || '',
          contact:           p.phone || '—',
          phone:             p.phone || '—',
          email:             p.email || '—',
          address:           p.home_address || '—',
          status:            (p.status === 'Active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
          lastVisit,
          nextAppointment,
          registeredDate:    p.created_at ? p.created_at.split('T')[0] : '—',
          created_at:        p.created_at,
          reliabilityScore:  p.reliability_score ?? 0,
          totalAppointments: Number(p.total_appointments) || 0,
        };
      });
      this.isLoading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  protected get filteredPatients(): Patient[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.patients.filter(p => {
      const matchSearch = !q || [p.name, p.contact, p.email, p.id]
        .join(' ').toLowerCase().includes(q);
      const matchGender = !this.genderFilter || p.gender === this.genderFilter;
      const matchStatus = !this.statusFilter || p.status === this.statusFilter;
      return matchSearch && matchGender && matchStatus;
    });
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.genderFilter = '';
    this.statusFilter = '';
  }

  protected get activePatientsCount(): number {
    return this.patients.filter(p => p.status === 'Active').length;
  }

  protected get inactivePatientsCount(): number {
    return this.patients.filter(p => p.status === 'Inactive').length;
  }

  protected get newThisMonth(): number {
    const now = new Date();
    return this.patients.filter(p => {
      if (!p.registeredDate || p.registeredDate === '—') return false;
      const d = new Date(p.registeredDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  protected openAddModal(): void {
    this.editingPatient = null;
    this.form = { status: 'Active', gender: '' };
    this.isModalOpen = true;
  }

  protected openEditModal(p: Patient): void {
    this.editingPatient = p;
    this.form = { ...p };
    this.isModalOpen = true;
  }

  protected closeModal(): void {
    this.isModalOpen = false;
    this.editingPatient = null;
    this.form = {};
  }

  protected savePatient(): void {
    if (!this.form.name?.trim() && !(this.form.first_name?.trim())) return;

    const firstName = this.form.first_name?.trim() || this.form.name?.split(' ')[0] || '';
    const lastName  = this.form.last_name?.trim()  || this.form.name?.split(' ').slice(1).join(' ') || '';

    if (this.editingPatient) {
      // Edit existing patient — call API
      const dbId = this.editingPatient.db_id;
      if (!dbId) return;
      this.api.updatePatient(dbId, {
        first_name: firstName,
        last_name:  lastName,
        phone:      this.form.contact?.trim() || undefined,
        gender:     this.form.gender || undefined,
        home_address: this.form.address?.trim() || undefined,
      }).subscribe({
        next: (updated: any) => {
          const idx = this.patients.findIndex(p => p.db_id === dbId);
          if (idx !== -1) {
            this.patients[idx] = {
              ...this.patients[idx],
              name:       `${firstName} ${lastName}`,
              first_name: firstName,
              last_name:  lastName,
              contact:    this.form.contact || this.patients[idx].contact,
              phone:      this.form.contact || this.patients[idx].phone,
              gender:     this.form.gender  || this.patients[idx].gender,
              address:    this.form.address || this.patients[idx].address,
            };
          }
          this.successMessage = `Patient "${firstName} ${lastName}" updated.`;
          this.closeModal();
          this.flashSuccess();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.successMessage = err?.error?.message ?? 'Failed to update patient.';
          this.flashSuccess();
          this.cdr.detectChanges();
        },
      });
    } else {
      // Add new patient — call API
      this.api.addPatient({ first_name: firstName, last_name: lastName, phone: this.form.contact || '' }).subscribe({
        next: () => {
          this.successMessage = `Patient "${firstName} ${lastName}" registered successfully.`;
          this.closeModal();
          this.flashSuccess();
          this.loadPatients();
        },
        error: () => {
          this.successMessage = 'Failed to register patient. Please try again.';
          this.flashSuccess();
        }
      });
    }
  }

  private flashSuccess(): void {
    this.showSuccessAlert = true;
    setTimeout(() => { this.showSuccessAlert = false; }, 4000);
  }

  protected viewProfile(p: Patient): void {
    this.viewingPatient = p;
  }

  protected closeProfile(): void {
    this.viewingPatient = null;
  }

  protected dismissAlert(): void {
    this.showSuccessAlert = false;
  }

  protected getReliabilityLabel(score: number): string {
    if (score >= 8)  return 'High';
    if (score >= 3)  return 'Good';
    if (score >= 0)  return 'Fair';
    if (score >= -5) return 'Low';
    return 'Poor';
  }

  protected getReliabilityTone(score: number): string {
    if (score >= 8)  return 'mint';
    if (score >= 3)  return 'blue';
    if (score >= 0)  return 'amber';
    if (score >= -5) return 'orange';
    return 'rose';
  }
}
