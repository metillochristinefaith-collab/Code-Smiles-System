import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

type VerifyStatus = 'success' | 'already' | 'expired' | 'invalid' | 'error';

@Component({
  selector: 'app-verify-email-result',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './verify-email-result.html',
  styleUrls: ['./verify-email-result.css'],
})
export class VerifyEmailResultComponent implements OnInit, OnDestroy {
  status: VerifyStatus = 'invalid';

  // Resend state
  email = '';
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
      const s = params.get('status') as VerifyStatus;
      this.status = ['success', 'already', 'expired', 'invalid', 'error'].includes(s)
        ? s : 'invalid';
      this.email = params.get('email') ?? '';
    });
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  get isSuccess(): boolean {
    return this.status === 'success' || this.status === 'already';
  }

  /** expired and invalid both show the resend panel */
  get canResend(): boolean {
    return this.status === 'expired' || this.status === 'invalid';
  }

  get icon(): 'success' | 'warning' | 'error' {
    if (this.isSuccess) return 'success';
    if (this.status === 'expired') return 'warning';
    return 'error';
  }

  get title(): string {
    switch (this.status) {
      case 'success':  return 'Email Verified!';
      case 'already':  return 'Already Verified';
      case 'expired':  return 'Link Expired';
      case 'invalid':  return 'Invalid Link';
      default:         return 'Something Went Wrong';
    }
  }

  get message(): string {
    switch (this.status) {
      case 'success':  return 'Your email has been verified successfully. You may now sign in to your account.';
      case 'already':  return 'Your email is already verified. You can sign in right away.';
      case 'expired':  return 'This verification link has expired. Enter your email below to get a new one.';
      case 'invalid':  return 'This verification link is invalid or has already been used. Enter your email below to request a new one.';
      default:         return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  resend(): void {
    if (this.cooldown > 0 || this.isResending || !this.email.trim()) return;
    this.isResending = true;
    this.resendMessage = '';
    this.resendError = '';

    this.auth.resendVerification(this.email.trim()).subscribe({
      next: (res: any) => {
        this.isResending = false;
        this.resendMessage = res?.message ?? 'Verification email sent! Check your inbox.';
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
