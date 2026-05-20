import { Component, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-staff-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-sidebar.html',
  styleUrls: ['./staff-sidebar.css'],
})
export class StaffSidebar implements OnInit, OnDestroy {
  fullName: string;
  initial: string;
  sidebarOpen = false;

  // Live badge counts
  pendingCount = 0;

  private pollInterval: any;

  @HostBinding('class.sidebar-open')
  get isSidebarOpen(): boolean {
    return this.sidebarOpen;
  }

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {
    const user = this.auth.getUser();
    this.fullName = user ? `${user.first_name} ${user.last_name}` : 'Staff';
    this.initial  = (user?.first_name?.charAt(0) ?? 'S').toUpperCase();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => { this.sidebarOpen = false; });
  }

  ngOnInit(): void {
    this.loadCounts();
    // Refresh badge every 60 seconds
    this.pollInterval = setInterval(() => this.loadCounts(), 60000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private loadCounts(): void {
    this.api.getStaffDashboardStats().subscribe({
      next: (data) => { this.pendingCount = data.pending ?? 0; },
      error: () => {}
    });
  }

  openSidebar(): void  { this.sidebarOpen = true; }
  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void {
    this.auth.logout();
  }
}
