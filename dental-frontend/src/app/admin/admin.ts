import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class AdminComponent implements OnInit {
  patients: any[] = [];
  appointments: any[] = [];
  editingAppointmentId: number | null = null;

  newPatient = { first_name: '', last_name: '', phone: '' };
  newAppointment = {
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    treatment: '',
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.getPatients();
    this.getAppointments();
  }

  getPatients() {
    this.api.getPatients().subscribe({
      next: (data) => {
        this.patients = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Server Down! Could not get patients.', err),
    });
  }

  savePatient() {
    this.api.addPatient(this.newPatient).subscribe({
      next: () => {
        this.getPatients();
        this.newPatient = { first_name: '', last_name: '', phone: '' };
      },
      error: () => alert('Failed to add patient. Is your Node server running?'),
    });
  }

  deletePatient(id: number) {
    if (confirm('Are you sure?')) {
      this.api.deletePatient(id).subscribe({
        next: () => this.getPatients(),
        error: (err) => console.error('Delete failed.', err),
      });
    }
  }

  getAppointments() {
    this.api.getAppointments().subscribe({
      next: (data) => {
        this.appointments = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Could not get appointments.', err),
    });
  }

  saveAppointment() {
    const request$ = this.editingAppointmentId
      ? this.api.updateAppointment(this.editingAppointmentId, this.newAppointment)
      : this.api.bookAppointment({
          patient_id:       null,
          full_name:        this.newAppointment.patient_id,
          phone:            '',
          email:            '',
          treatment:        this.newAppointment.treatment,
          services:         [],
          appointment_date: this.newAppointment.appointment_date,
          appointment_time: this.newAppointment.appointment_time,
          duration_minutes: 60,
          notes:            '',
        });

    request$.subscribe({
      next: () => {
        alert(this.editingAppointmentId ? 'Updated!' : 'Booked!');
        this.resetAppointmentForm();
      },
      error: (err: any) => console.error('Booking Error:', err),
    });
  }

  editAppointment(appt: any) {
    this.editingAppointmentId = appt.appointment_id;
    this.newAppointment = { ...appt };
  }

  resetAppointmentForm() {
    this.editingAppointmentId = null;
    this.newAppointment = {
      patient_id: '',
      appointment_date: '',
      appointment_time: '',
      treatment: '',
    };
    this.getAppointments();
  }

  deleteAppointment(id: number) {
    if (confirm('Cancel this?')) {
      this.api.deleteAppointment(id).subscribe({
        next: () => this.getAppointments(),
        error: (err) => console.error('Delete failed.', err),
      });
    }
  }
}
