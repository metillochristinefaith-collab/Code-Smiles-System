import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { PublicHeaderComponent } from './public-header/public-header';
import { PublicFooterComponent } from './public-footer/public-footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PublicHeaderComponent,
    PublicFooterComponent,
    CommonModule
  ],
  template: `
    <app-public-header *ngIf="headerMode === 'public'"></app-public-header>
  
    <main [class.no-scroll]="hideScrollLayout" [class.auth-page-wrap]="isAuthPage">
      <div class="route-shell">
        <router-outlet></router-outlet>
      </div>
    </main>

    <app-public-footer *ngIf="showFooter"></app-public-footer>
  `,
  styles: [`
    main {
      min-height: 80vh;
    }

    /* Auth pages (login/register/forgot) — hard lock to viewport */
    main.auth-page-wrap {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
    }

    main.auth-page-wrap .route-shell {
      height: 100vh;
      overflow: hidden;
    }

    /* Private portal pages — let the component manage its own scroll */
    main.no-scroll {
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    main.no-scroll .route-shell {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    .route-shell {
      position: relative;
      min-height: inherit;
    }
  `]
})
export class AppComponent {
  title = 'dental-frontend';

  showFooter = true;
  headerMode: 'none' | 'public' | 'patient' = 'public';
  hideScrollLayout = false;
  isAuthPage = false;
  private readonly roleThemeClasses = ['staff-theme', 'dentist-theme', 'patient-theme'];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;

        const hideAllLayout =
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/forgot-password') ||
          url.startsWith('/reset-password') ||
          url.startsWith('/check-email') ||
          url.startsWith('/verify-email-result') ||
          url.startsWith('/verify-email');

        const privatePatientRoutes =
          url.startsWith('/patient-dashboard') ||
          url.startsWith('/patient-appointments') ||
          url.startsWith('/patient-medical-vault') ||
          url.startsWith('/patient-services') ||
          url.startsWith('/patient-about') ||
          url.startsWith('/patient-contact') ||
          url.startsWith('/patient-notifications') ||
          url.startsWith('/patient-messages') ||
          url.startsWith('/patient-profile') ||
          url.startsWith('/patient-help-center') ||
          url.startsWith('/patient-privacy-policy') ||
          url.startsWith('/patient-terms') ||
          url.startsWith('/patient-treatment-progress') ||
          url.startsWith('/patient-treatment-plan') ||
          url.startsWith('/patient-booking');

        const privateStaffRoutes =
          url.startsWith('/staff-dashboard') ||
          url.startsWith('/staff-appointments') ||
          url.startsWith('/staff-patients') ||
          url.startsWith('/staff-calendar') ||
          url.startsWith('/staff-requests') ||
          url.startsWith('/staff-notifications') ||
          url.startsWith('/staff-profile') ||
          url.startsWith('/staff-help-center') ||
          url.startsWith('/staff-booking');

        const privateDentistRoutes =
          url.startsWith('/dentist-dashboard') ||
          url.startsWith('/dentist-appointments') ||
          url.startsWith('/dentist-schedule') ||
          url.startsWith('/dentist-calendar') ||
          url.startsWith('/dentist-patients') ||
          url.startsWith('/dentist-medical-vault') ||
          url.startsWith('/dentist-treatment-plans') ||
          url.startsWith('/dentist-prescriptions') ||
          url.startsWith('/dentist-notifications') ||
          url.startsWith('/dentist-profile') ||
          url.startsWith('/dentist-settings') ||
          url.startsWith('/dentist-help-center');

        const hideFooterOnly = url === '/patient-booking';

        const isPrivatePortal =
          privatePatientRoutes || privateStaffRoutes || privateDentistRoutes;

        if (hideAllLayout || privateStaffRoutes || privateDentistRoutes) {
          this.headerMode = 'none';
        } else if (privatePatientRoutes) {
          this.headerMode = 'patient';
        } else {
          this.headerMode = 'public';
        }

        this.showFooter = !(hideAllLayout || hideFooterOnly || isPrivatePortal);
        this.hideScrollLayout = isPrivatePortal;
        this.isAuthPage = hideAllLayout;
        this.applyRoleThemeClass(
          privateStaffRoutes ? 'staff-theme' :
          privateDentistRoutes ? 'dentist-theme' :
          privatePatientRoutes ? 'patient-theme' :
          null
        );
      });
  }

  private applyRoleThemeClass(themeClass: string | null): void {
    document.body.classList.remove(...this.roleThemeClasses);
    document.documentElement.classList.remove(...this.roleThemeClasses);

    if (!themeClass) {
      return;
    }

    document.body.classList.add(themeClass);
    document.documentElement.classList.add(themeClass);
  }
}
