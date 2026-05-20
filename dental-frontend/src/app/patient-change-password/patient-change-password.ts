import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-patient-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-change-password.html',
  styleUrl: './patient-change-password.css',
})
export class PatientChangePasswordComponent {
  protected form = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  protected visibility = {
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  };

  protected errorMessage = '';
  protected successMessage = '';
  protected isLoading = false;

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const pw = this.form.newPassword;
    if (pw.length < 6) return 'weak';
    const hasUpper   = /[A-Z]/.test(pw);
    const hasNumber  = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasNumber && hasSpecial) return 'strong';
    if (pw.length >= 8  && (hasUpper || hasNumber))             return 'medium';
    return 'weak';
  }

  protected submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.currentPassword.trim() || !this.form.newPassword.trim() || !this.form.confirmPassword.trim()) {
      this.errorMessage = 'Please complete all password fields.';
      return;
    }

    if (this.form.newPassword.length < 8) {
      this.errorMessage = 'New password must be at least 8 characters.';
      return;
    }

    if (this.form.newPassword !== this.form.confirmPassword) {
      this.errorMessage = 'New password and confirmation do not match.';
      return;
    }

    const user = this.auth.getUser();
    if (!user?.id) {
      this.errorMessage = 'Session expired. Please sign in again.';
      return;
    }

    this.isLoading = true;

    this.api.changePassword(user.id, this.form.currentPassword, this.form.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password updated successfully.';
        this.form = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/patient-profile']), 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Failed to update password. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['/patient-profile']);
  }

  protected goToForgotPassword(): void {
    this.router.navigate(['/patient-profile/forgot-password']);
  }

  protected toggleVisibility(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): void {
    this.visibility[field] = !this.visibility[field];
  }
}
