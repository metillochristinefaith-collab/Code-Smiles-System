import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-forgot-password.html',
  styleUrl: './patient-forgot-password.css',
})
export class PatientForgotPasswordComponent {
  protected email = '';
  protected submitted = false;
  protected isLoading = false;
  protected successMessage = '';
  protected errorMessage = '';
  protected cooldown = 0;
  private cooldownTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  protected sendRecovery(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isEmailValid || this.isLoading || this.cooldown > 0) return;

    this.isLoading = true;

    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = `Password reset instructions sent to ${this.email.trim()}.`;
        this.startCooldown(60);
        this.cdr.detectChanges();
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

  protected backToChangePassword(): void {
    this.router.navigate(['/patient-profile/change-password']);
  }
}
