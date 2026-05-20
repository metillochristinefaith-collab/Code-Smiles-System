import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {
  email = '';
  submitted = false;
  isLoading = false;
  errorMessage = '';
  cooldown = 0;
  private cooldownTimer?: ReturnType<typeof setInterval>;

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  sendResetLink(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.isEmailValid || this.isLoading || this.cooldown > 0) return;

    this.isLoading = true;

    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.isLoading = false;
        // Redirect to check-email page in reset mode
        this.router.navigate(['/check-email'], {
          queryParams: { email: this.email.trim(), mode: 'reset' }
        });
      },
      error: (err) => {
        this.isLoading = false;
        const wait = err?.error?.wait;
        if (wait) {
          this.errorMessage = err.error.message;
          this.startCooldown(wait);
        } else {
          this.errorMessage = err?.error?.message ?? 'Failed to send reset email. Please try again.';
        }
        this.cdr.detectChanges();
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
      this.cdr.detectChanges();
    }, 1000);
  }

  onInputChange(): void {
    this.errorMessage = '';
  }
}

