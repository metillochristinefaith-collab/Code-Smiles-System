import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-dashboard.html',
  styleUrl: './patient-dashboard.css',
})
export class PatientDashboardComponent implements OnInit {
  protected firstName: string;
  protected fullName: string;
  protected patientId: string;
  protected initial: string;
  protected isLoading = true;
  protected avatarUrl: string | null = null;

  protected stats = { pending: 0, upcoming: 0, completed: 0 };
  protected nextAppointment: any = null;

  protected careChecklist = [
    { label: 'Brush for two full minutes twice daily.',                    done: false },
    { label: 'Drink more water to support enamel and gum health.',         done: false },
    { label: 'Wear your aligners for the recommended hours today.',        done: false },
    { label: 'Review aftercare notes before your next adjustment.',        done: false },
  ];

  constructor(private auth: AuthService, private api: ApiService, private avatarService: AvatarService, private cdr: ChangeDetectorRef, private router: Router) {
    const user = this.auth.getUser();
    this.firstName  = user?.first_name ?? 'Patient';
    this.fullName   = user ? `${user.first_name} ${user.last_name}` : 'Patient';
    this.patientId  = user ? `CS-${user.id.toString().padStart(5, '0')}` : 'CS-00000';
    this.initial    = (user?.first_name?.charAt(0) ?? 'P').toUpperCase();

    // Listen for navigation events to refresh dashboard data when navigating to dashboard
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd && this.router.url === '/patient-dashboard')
    ).subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnInit() {
    // Load avatar from localStorage or database
    this.avatarUrl = this.avatarService.getAvatar();
    if (!this.avatarUrl) {
      this.avatarService.loadAvatarFromDB().then(() => {
        // After loading from DB, check localStorage again
        this.avatarUrl = this.avatarService.getAvatar();
        this.cdr.detectChanges();
      }).catch((err: any) => {
        console.error('Failed to load avatar:', err);
      });
    }

    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    const user = this.auth.getUser();
    if (!user?.id) { this.isLoading = false; return; }
    this.isLoading = true;
    this.api.getPatientDashboardStats(user.id).subscribe({
      next: (data) => {
        this.stats = { pending: data.pending, upcoming: data.upcoming, completed: data.completed };
        this.nextAppointment = data.nextAppointment || null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  protected toggleChecklistItem(index: number): void {
    const item = this.careChecklist[index];
    if (!item) return;
    item.done = !item.done;
  }

  protected formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  protected formatTime(t: string): string {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
}
