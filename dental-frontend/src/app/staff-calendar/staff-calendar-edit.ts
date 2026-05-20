import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffCalendarService } from './staff-calendar.service';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';

@Component({
  selector: 'app-staff-calendar-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, StaffSidebar],
  templateUrl: './staff-calendar-edit.html',
  styleUrls: ['./staff-calendar-form.css'],
})
export class StaffCalendarEditComponent implements OnInit {
  form: FormGroup;
  submitted = false;
  loading = false;
  scheduleId: string = '';
  notFound = false;

  constructor(
    private fb: FormBuilder,
    private service: StaffCalendarService,
    private route: ActivatedRoute,
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

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.scheduleId = params['id'];
      const schedule = this.service.getScheduleById(this.scheduleId);
      if (schedule) {
        this.form.patchValue(schedule);
      } else {
        this.notFound = true;
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.valid) {
      this.loading = true;
      setTimeout(() => {
        this.service.updateSchedule(this.scheduleId, this.form.value);
        this.loading = false;
        this.router.navigate(['/staff-calendar']);
      }, 300);
    }
  }

  onCancel(): void {
    this.router.navigate(['/staff-calendar']);
  }
}
