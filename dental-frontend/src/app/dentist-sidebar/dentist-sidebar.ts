import { Component, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getDentistInfo } from '../dentist-portal-data';
import { filter } from 'rxjs';

@Component({
  selector: 'app-dentist-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dentist-sidebar.html',
  styleUrls: ['./dentist-sidebar.css'],
})
export class DentistSidebar {
  fullName: string;
  initial: string;
  specialty: string;
  sidebarOpen = false;

  @HostBinding('class.sidebar-open')
  get isSidebarOpen(): boolean {
    return this.sidebarOpen;
  }

  constructor(private auth: AuthService, private router: Router) {
    const user = this.auth.getUser();
    this.fullName = user ? `${user.first_name} ${user.last_name}` : 'Dentist';
    this.initial  = (user?.first_name?.charAt(0) ?? 'D').toUpperCase();
    const info    = getDentistInfo(user?.email ?? '');
    this.specialty = info?.specialty ?? 'Dentist';

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => { this.sidebarOpen = false; });
  }

  openSidebar(): void  { this.sidebarOpen = true; }
  closeSidebar(): void { this.sidebarOpen = false; }

  logout(): void {
    this.auth.logout();
  }
}
