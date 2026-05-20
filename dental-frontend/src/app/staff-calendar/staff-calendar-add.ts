import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StaffCalendarService } from './staff-calendar.service';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';

@Component({
  selector: 'app-staff-calendar-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StaffSidebar],
  templateUrl: './staff-calendar-add.html',
  styleUrls: ['./staff-calendar-form.css'],
})
export class StaffCalendarAddComponent {
  form: FormGroup;
  submitted = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private service: StaffCalendarService,
    private router: Router
  ) {
    this.form = this.fb.group({
      patientName: ['', [Validators.required]],
      staffName: ['', [Validators.required]],
      date: ['', [Validators.required]],
      time: ['', [Validators.required]],
      type: ['', [Validators.required]],
      status: ['Pending', [Validators.required]],
      notes: [''],
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.valid) {
      this.loading = true;
      setTimeout(() => {
        this.service.addSchedule(this.form.value);
        this.loading = false;
        this.router.navigate(['/staff-calendar']);
      }, 300);
    }
  }

  onCancel(): void {
    this.router.navigate(['/staff-calendar']);
  }
}
