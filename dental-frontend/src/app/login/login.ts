import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

// ── IMPORTANT ──────────────────────────────────────────────────────────────
// Google OAuth Client ID is loaded from environment.ts / environment.prod.ts
// ──────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {

  selectedRole: UserRole = 'Patient';
  showPassword = false;
  submitted = false;
  isLoading = false;
  isGoogleLoading = false;
  errorMessage = '';
  bookingRedirect = false;
  googleReady = false;
  googleNotConfigured = false;

  loginData = { email: '', password: '', rememberMe: false };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.bookingRedirect = params.get('redirect') === 'booking';
    });
    this.loadGoogleScript();
  }

  ngOnDestroy(): void {
    try { window.google?.accounts?.id?.cancel(); } catch {}
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────

  private loadGoogleScript(): void {
    if (document.getElementById('google-gsi-script')) {
      this.initAndRender();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initAndRender();
    script.onerror = () => {
      console.warn('Google GSI script failed to load.');
    };
    document.head.appendChild(script);
  }

  private initAndRender(): void {
    if (!window.google?.accounts?.id) {
      setTimeout(() => this.initAndRender(), 300);
      return;
    }

    // Create a hidden div and render Google's real button into it
    let hiddenDiv = document.getElementById('google-hidden-btn-login');
    if (!hiddenDiv) {
      hiddenDiv = document.createElement('div');
      hiddenDiv.id = 'google-hidden-btn-login';
      hiddenDiv.style.cssText = 'position:fixed;bottom:-200px;left:-200px;width:200px;height:50px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1;';
      document.body.appendChild(hiddenDiv);
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => {
        this.handleGoogleCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(hiddenDiv, {
      type: 'standard',
      size: 'large',
      text: 'signin_with',
      locale: 'en',
    });

    this.googleReady = true;
    this.cdr.detectChanges();
  }

  signInWithGoogle(): void {
    if (!window.google?.accounts?.id) return;

    const hiddenBtn = document.querySelector(
      '#google-hidden-btn-login div[role="button"], #google-hidden-btn-login iframe'
    ) as HTMLElement;

    if (hiddenBtn) {
      hiddenBtn.click();
    } else {
      window.google.accounts.id.prompt();
    }
  }

  private handleGoogleCredential(credential: string): void {
    this.isGoogleLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.auth.googleLogin(credential).subscribe({
      next: () => {
        this.isGoogleLoading = false;
        if (this.bookingRedirect && this.auth.getRole() === 'Patient') {
          this.router.navigate(['/patient-booking']);
        } else {
          this.router.navigate([this.auth.getDashboardRoute()]);
        }
      },
      error: (err) => {
        this.isGoogleLoading = false;
        this.errorMessage = err?.error?.message || 'Google sign-in failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Email/Password Login ──────────────────────────────────────────────────

  selectRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  get roleDescription(): string {
    switch (this.selectedRole) {
      case 'Patient': return 'Access your appointments, requests, and profile.';
      case 'Staff':   return 'Manage schedules, bookings, and patient requests.';
      case 'Admin':   return 'Oversee the system, users, and portal settings.';
      default:        return '';
    }
  }

  get loginButtonText(): string {
    if (this.isLoading) return 'Signing in…';
    switch (this.selectedRole) {
      case 'Patient': return 'Sign In as Patient';
      case 'Staff':   return 'Sign In as Staff';
      case 'Admin':   return 'Sign In as Dentist';
      default:        return 'Sign In';
    }
  }

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.loginData.email.trim());
  }

  get isPasswordValid(): boolean {
    return this.loginData.password.trim().length >= 6;
  }

  get canLogin(): boolean {
    return this.isEmailValid && this.isPasswordValid;
  }

  login(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (!this.canLogin) return;
    this.isLoading = true;

    this.auth.login(this.loginData.email.trim(), this.loginData.password, this.selectedRole, this.loginData.rememberMe)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.isLoading = false;
          if (this.bookingRedirect && this.auth.getRole() === 'Patient') {
            this.router.navigate(['/patient-booking']);
          } else {
            this.router.navigate([this.auth.getDashboardRoute()]);
          }
        },
        error: (err) => {
          this.isLoading = false;
          if (err?.name === 'TimeoutError') {
            this.errorMessage = 'Request timed out. Please check your connection and try again.';
            this.cdr.detectChanges();
            return;
          }
          // Handle unverified account — redirect to check-email page
          if (err?.error?.unverified) {
            this.isLoading = false;
            this.router.navigate(['/check-email'], {
              queryParams: { email: err.error.email }
            });
            return;
          }
          this.errorMessage = err?.error?.message ?? 'Invalid email or password. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }
}
