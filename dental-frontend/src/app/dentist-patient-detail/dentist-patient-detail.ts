import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface PatientDetail {
  db_id: number;
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  nextAppointment: string;
  currentTreatment: string;
  status: string;
}

interface TreatmentHistoryItem {
  date: string;
  procedure: string;
  tooth: string;
  dentist: string;
  notes: string;
}

@Component({
  selector: 'app-dentist-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, DentistSidebar],
  templateUrl: './dentist-patient-detail.html',
  styleUrls: ['./dentist-patient-detail.css'],
})
export class DentistPatientDetailComponent implements OnInit {
  patient: PatientDetail | null = null;
  history: TreatmentHistoryItem[] = [];
  isLoading = true;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const patientId = idParam ? Number(idParam) : null;
    if (!patientId) {
      this.notFound = true;
      this.isLoading = false;
      return;
    }

    const user = this.auth.getUser();
    const dentistName = user ? `Dr. ${user.first_name} ${user.last_name}` : '';

    this.api.getDentistPatients(dentistName).subscribe({
      next: (patients) => {
        const raw = patients.find((p: any) => p.id === patientId || p.db_id === patientId);
        if (!raw) {
          this.notFound = true;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.patient = {
          db_id: raw.id,
          id: `CS-${String(raw.id).padStart(5, '0')}`,
          name: `${raw.first_name} ${raw.last_name}`,
          initials: `${raw.first_name?.charAt(0) || ''}${raw.last_name?.charAt(0) || ''}`.toUpperCase(),
          age: raw.date_of_birth ? this.calcAge(raw.date_of_birth) : 0,
          gender: raw.gender || '—',
          phone: raw.phone || '—',
          email: raw.email || '—',
          address: raw.home_address || '—',
          bloodType: raw.blood_type || '—',
          nextAppointment: raw.next_appointment ? this.fmtDate(raw.next_appointment) : 'No upcoming appointment',
          currentTreatment: raw.current_treatment || 'No treatment assigned',
          status: this.deriveStatus(raw.treatment_status),
        };

        this.loadHistory(patientId);
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadHistory(patientId: number) {
    this.api.getDentistPatientHistory(patientId).subscribe({
      next: (history) => {
        this.history = history.map((a: any) => ({
          date: this.fmtDate(a.appointment_date),
          procedure: a.treatment || '—',
          tooth: (a.services || []).join(', ') || '—',
          dentist: a.dentist_name || '—',
          notes: a.notes || 'No notes available',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private deriveStatus(status: string): string {
    if (status === 'Approved') return 'Active';
    if (status === 'Completed') return 'Completed';
    if (status === 'Pending') return 'Consultation';
    return status || 'Active';
  }

  private calcAge(dob: string): number {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  private fmtDate(value: string): string {
    return new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  }
}
