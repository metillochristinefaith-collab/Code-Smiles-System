import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffCalendarService, Schedule } from './staff-calendar.service';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-staff-calendar-view',
  standalone: true,
  imports: [CommonModule, StaffSidebar],
  templateUrl: './staff-calendar-view.html',
  styleUrls: ['./staff-calendar.css'],
})
export class StaffCalendarViewComponent implements OnInit {
  // Existing data
  schedule: Schedule | undefined;
  schedules: Schedule[] = [];
  notFound = false;
  scheduleId: string = '';

  calendarDays = this.buildCalendarDays();

  boardTimeLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  boardEvents: any[] = [];
  unavailableBlocks: any[] = [];
  
  miniCalendarWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  miniCalendarDates = Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, i) => i + 1);
  
  legendItems = [
    { label: 'Confirmed', className: 'legend-confirmed' },
    { label: 'In Progress', className: 'legend-progress' },
    { label: 'Needs Prep', className: 'legend-needs-prep' },
    { label: 'Cancelled', className: 'legend-cancelled' },
    { label: 'Unavailable', className: 'legend-unavailable' }
  ];

  constructor(
    private service: StaffCalendarService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // Load single schedule if ID exists
    this.route.params.subscribe((params) => {
      this.scheduleId = params['id'];
      if (this.scheduleId) {
        this.schedule = this.service.getScheduleById(this.scheduleId);
        if (!this.schedule) { this.notFound = true; }
      }
    });

    // Load full list for calendar
    this.service.getSchedules().subscribe((data: Schedule[]) => {
      this.schedules = data;
    });
  }

  // --- UI Methods ---

  navigateToNotifications(): void {
    // Update path if needed
    this.router.navigate(['/notifications']);
  }

  get staffName(): string {
    const user = this.auth.getUser();
    return user ? `${user.first_name} ${user.last_name}` : 'Staff';
  }

  get staffInitial(): string {
    return this.staffName.charAt(0).toUpperCase();
  }

  get currentMonthLabel(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get confirmedCount(): number {
    return this.schedules.filter(schedule => schedule.status === 'Confirmed').length;
  }

  get pendingCount(): number {
    return this.schedules.filter(schedule => schedule.status === 'Pending').length;
  }

  getBoardEventClass(status: string): string {
    const map: Record<string, string> = {
      'Confirmed': 'status-confirmed',
      'Pending': 'status-pending',
    };
    return map[status] || 'status-pending';
  }

  getBoardEventStyle(event: any): any {
    // Placeholder logic for positioning events
    return { 'grid-row': '2 / 4' }; 
  }

  getBoardStatusLabel(status: string): string {
    return status;
  }

  // --- Existing Logic ---

  onEdit(): void {
    this.router.navigate(['/staff-calendar/edit', this.scheduleId]);
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this schedule?')) {
      this.service.deleteSchedule(this.scheduleId);
      this.router.navigate(['/staff-calendar']);
    }
  }

  onBack(): void {
    this.router.navigate(['/staff-calendar']);
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      Confirmed: '#2aa483',
      Pending: '#d99b3f',
      Completed: '#4d8fe1',
      Cancelled: '#df6f7d',
    };
    return colors[status] || '#7a8fa7';
  }

  private buildCalendarDays(): { label: string; date: string; active: boolean }[] {
    const today = new Date();
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return labels.map((label, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + mondayOffset + index);

      return {
        label,
        date: String(date.getDate()),
        active: date.toDateString() === today.toDateString(),
      };
    });
  }
}
