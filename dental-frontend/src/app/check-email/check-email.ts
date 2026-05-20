import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Shared "Check Your Email" page used for two flows:
 *  - mode=verify  (default) — email verification after registration
 *  - mode=reset             — password reset link sent
 */
@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './check-email.html',
  styleUrls: ['./check-email.css'],
})
export class CheckEmailComponent implements OnInit, OnDestroy {
  email = '';
  mode: 'verify' | 'reset' = 'verify';

  isResending = false;
  resendMessage = '';
  resendError = '';
  cooldown = 0;
  private cooldownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.email = params.get('email') ?? '';
      this.mode  = (params.get('mode') === 'reset') ? 'reset' : 'verify';
    });
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  // ── Dynamic copy based on mode ────────────────────────────────────────────

  get title(): string {
    return this.mode === 'reset' ? 'Check Your Email' : 'Verify Your Email';
  }

  get subtitle(): string {
    return this.mode === 'reset'
      ? 'We sent a password reset link to'
      : 'We sent a verification link to';
  }

  get instruction(): string {
    return this.mode === 'reset'
      ? 'Open the email and click the reset button to create a new password. The link expires in 1 hour.'
      : 'Open the email and click the verification button to activate your account. The link expires in 24 hours.';
  }

  get resendLabel(): string {
    return this.mode === 'reset' ? 'Resend Reset Email' : 'Resend Verification Email';
  }

  get maskedEmail(): string {
    if (!this.email) return 'your email address';
    const [local, domain] = this.email.split('@');
    if (!domain) return this.email;
    const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(local.length - 3, 2))}@${domain}`;
  }

  // ── Resend — calls the correct API based on mode ──────────────────────────

  resend(): void {
    if (this.cooldown > 0 || this.isResending || !this.email) return;
    this.isResending = true;
    this.resendMessage = '';
    this.resendError = '';

    const request$ = this.mode === 'reset'
      ? this.auth.forgotPassword(this.email)
      : this.auth.resendVerification(this.email);

    request$.subscribe({
      next: (res: any) => {
        this.isResending = false;
        this.resendMessage = res?.message ?? 'Email sent!';
        this.startCooldown(60);
      },
      error: (err) => {
        this.isResending = false;
        const wait = err?.error?.wait;
        if (wait) {
          this.resendError = err.error.message;
          this.startCooldown(wait);
        } else {
          this.resendError = err?.error?.message ?? 'Failed to resend. Please try again.';
        }
      },
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldown = seconds;
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0) {
        this.cooldown = 0;
        clearInterval(this.cooldownTimer);
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
