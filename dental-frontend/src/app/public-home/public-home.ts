import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicAboutComponent } from '../public-about/public-about';
import { PublicContactComponent } from '../public-contact/public-contact';
import { PublicServicesComponent } from '../public-services/public-services';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [
    CommonModule,
    PublicServicesComponent,
    PublicAboutComponent,
    PublicContactComponent,
    RouterLink
  ],
  templateUrl: './public-home.html',
  styleUrls: ['./public-home.css']
})
export class PublicHomeComponent {
  constructor(private router: Router, private auth: AuthService) {}

  handleBook(): void {
    if (this.auth.isLoggedIn() && this.auth.getRole() === 'Patient') {
      this.router.navigate(['/patient-booking']);
    } else if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.getDashboardRoute()]);
    } else {
      this.router.navigate(['/login'], { queryParams: { redirect: 'booking' } });
    }
  }
}