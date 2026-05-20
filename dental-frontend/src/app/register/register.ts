import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent implements OnInit, OnDestroy {

  constructor(
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  registerData = {
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  };

  submitted = false;
  isLoading = false;
  isGoogleLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadGoogleScript();
  }

  ngOnDestroy(): void {
    try { window.google?.accounts?.id?.cancel(); } catch {}
    const hiddenDiv = document.getElementById('google-hidden-btn-register');
    if (hiddenDiv) hiddenDiv.remove();
  }

  // ── Google Sign-Up ─────────────────────────────────────────────────────────

  private loadGoogleScript(): void {
    if (document.getElementById('google-gsi-script')) {
      // Script already loaded — initialize directly
      setTimeout(() => this.initGoogle(), 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initGoogle();
    document.head.appendChild(script);
  }

  private initGoogle(): void {
    if (!window.google?.accounts?.id) {
      setTimeout(() => this.initGoogle(), 300);
      return;
    }

    // Create a hidden div and render Google's real button into it.
    // We click it programmatically — this is the most reliable way to
    // trigger the Google OAuth popup without using prompt() which can be blocked.
    let hiddenDiv = document.getElementById('google-hidden-btn-register');
    if (!hiddenDiv) {
      hiddenDiv = document.createElement('div');
      hiddenDiv.id = 'google-hidden-btn-register';
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
      text: 'signup_with',
      locale: 'en',
    });
  }

  signUpWithGoogle(): void {
    if (!window.google?.accounts?.id) {
      this.errorMessage = 'Google Sign-In is loading. Please wait a moment and try again.';
      this.cdr.detectChanges();
      return;
    }

    // Find and click the hidden Google button to trigger the real OAuth popup
    const hiddenBtn = document.querySelector(
      '#google-hidden-btn-register div[role="button"], #google-hidden-btn-register iframe'
    ) as HTMLElement;

    if (hiddenBtn) {
      hiddenBtn.click();
    } else {
      // Fallback: use prompt
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
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: (err) => {
        this.isGoogleLoading = false;
        this.errorMessage = err?.error?.message || 'Google sign-up failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Name validation ────────────────────────────────────────────────────────

  private isHumanLikeName(name: string): boolean {
    const trimmedName = name.trim();
    if (!/^[A-Za-zÀ-ÿ\s'-]{2,30}$/.test(trimmedName)) return false;
    if (/(.)\1{3,}/i.test(trimmedName)) return false;
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(trimmedName)) return false;
    const parts = trimmedName.split(/[\s'-]+/).filter(Boolean);
    if (parts.some((part) => part.length < 2)) return false;
    return true;
  }

  // ── Validation getters ─────────────────────────────────────────────────────

  get isFirstNameValid(): boolean { return this.isHumanLikeName(this.registerData.firstName); }
  get isLastNameValid(): boolean  { return this.isHumanLikeName(this.registerData.lastName); }
  get isRegisterEmailValid(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.registerData.email.trim()); }
  get isContactValid(): boolean   { return /^09\d{9}$/.test(this.registerData.contactNumber.trim()); }
  get isRegisterPasswordValid(): boolean { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(this.registerData.password); }
  get isConfirmPasswordFilled(): boolean { return this.registerData.confirmPassword.trim().length > 0; }
  get doPasswordsMatch(): boolean { return this.isConfirmPasswordFilled && this.registerData.password === this.registerData.confirmPassword; }
  get isTermsAccepted(): boolean  { return this.registerData.agreeTerms; }

  get isFormValid(): boolean {
    return (
      this.isFirstNameValid &&
      this.isLastNameValid &&
      this.isRegisterEmailValid &&
      this.isContactValid &&
      this.isRegisterPasswordValid &&
      this.doPasswordsMatch &&
      this.isTermsAccepted
    );
  }

  get submitButtonText(): string {
    return this.isLoading ? 'Creating Account…' : 'Create Account →';
  }

  // ── Toggles ────────────────────────────────────────────────────────────────

  togglePassword(): void        { this.showPassword = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  onContactInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 11);
    this.registerData.contactNumber = input.value;
  }

  // ── Register ───────────────────────────────────────────────────────────────

  register(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.isFormValid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.auth.register({
      first_name: this.registerData.firstName.trim(),
      last_name:  this.registerData.lastName.trim(),
      email:      this.registerData.email.trim(),
      phone:      this.registerData.contactNumber.trim(),
      password:   this.registerData.password,
    }).pipe(
      timeout(15000) // 15-second safety net — never stay stuck
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/check-email'], {
          queryParams: { email: this.registerData.email.trim() }
        });
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.name === 'TimeoutError') {
          this.errorMessage = 'Request timed out. Please check your connection and try again.';
        } else {
          this.errorMessage = err?.error?.message ?? 'Registration failed. Please try again.';
        }
        this.cdr.detectChanges();
      },
    });
  }
}
