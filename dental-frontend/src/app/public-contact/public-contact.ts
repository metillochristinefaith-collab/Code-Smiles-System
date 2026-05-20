import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-public-contact',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './public-contact.html',
  styleUrls: ['./public-contact.css'],
})
export class PublicContactComponent {
  selectedDate: Date | null = null;

  appointmentData = {
    full_name: '',
    phone: '',
    email: '',
    treatment: '',
    appointment_date: '',
    appointment_time: '',
  };

  allTimeSlots: string[] = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  bookedSlots: string[] = [];

  constructor(private api: ApiService) {}

  onDateSelected(date: Date | null) {
    if (!date) return;
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    this.appointmentData.appointment_date = `${year}-${month}-${day}`;
    this.checkDateAvailability();
  }

  checkDateAvailability() {
    this.api.checkAvailability(this.appointmentData.appointment_date).subscribe({
      next: (times) => {
        this.bookedSlots = times.map((t) => t.substring(0, 5));
        this.appointmentData.appointment_time = '';
      },
    });
  }

  submitBooking() {
    this.api.bookAppointment({
      patient_id:       null,
      full_name:        this.appointmentData.full_name,
      phone:            this.appointmentData.phone,
      email:            this.appointmentData.email,
      treatment:        this.appointmentData.treatment,
      services:         [],
      appointment_date: this.appointmentData.appointment_date,
      appointment_time: this.appointmentData.appointment_time,
      duration_minutes: 60,
      notes:            '',
    }).subscribe({
      next: () => {
        alert('Booking Request Sent! We will contact you shortly.');
        this.resetForm();
      },
      error: () => alert('Error: Please check your connection.'),
    });
  }

  resetForm() {
    this.appointmentData = {
      full_name: '',
      phone: '',
      email: '',
      treatment: '',
      appointment_date: '',
      appointment_time: '',
    };
    this.selectedDate = null;
    this.bookedSlots = [];
  }
}
