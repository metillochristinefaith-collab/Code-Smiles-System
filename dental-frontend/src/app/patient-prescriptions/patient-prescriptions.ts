import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-prescriptions.html',
  styleUrl: './patient-prescriptions.css',
})
export class PatientPrescriptionsComponent implements OnInit {
  prescriptions: any[] = [];
  isLoading = true;
  selected: any = null;

  constructor(private api: ApiService, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (!user?.id) { this.isLoading = false; return; }

    // Fetch prescriptions for this patient via their appointments
    // We reuse getMyAppointments and filter for prescriptions via the notifications endpoint
    // Actually we query prescriptions directly by patient_id
    this.api.getPatientPrescriptions(user.id).subscribe({
      next: (data) => {
        this.prescriptions = data.map(p => this.map(p));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  private map(p: any): any {
    return {
      id:           `RX-${String(p.id).padStart(5, '0')}`,
      db_id:        p.id,
      medication:   p.medication || '—',
      dosage:       p.dosage || '—',
      frequency:    p.frequency || '—',
      duration:     p.duration || '—',
      instructions: p.instructions || '',
      diagnosis:    p.diagnosis || '—',
      condition:    p.condition_note || '—',
      dentist:      p.dentist_name || '—',
      date:         p.issued_at
        ? new Date(p.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      status:       p.status || 'Active',
      initials:     (p.dentist_name || 'DR').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
    };
  }

  select(rx: any) { this.selected = rx; }

  statusClass(s: string): string {
    return ({ Active: 'rx-active', Completed: 'rx-completed', Pending: 'rx-pending', Cancelled: 'rx-cancelled' } as any)[s] || 'rx-active';
  }
}
