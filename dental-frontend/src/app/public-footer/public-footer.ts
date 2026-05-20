import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
})

export class PublicFooterComponent {
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

  // reusable scroll handler
  scrollToSection(sectionId: string) {
    if (this.router.url === '/' || this.router.url === '/home') {
      this.scrollNow(sectionId);
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(() => this.scrollNow(sectionId), 100);
      });
    }
  }

  // 👇 ADD THIS (this fixes your error)
  goToContact() {
    this.scrollToSection('contact');
  }

  // smooth scroll
  private scrollNow(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}