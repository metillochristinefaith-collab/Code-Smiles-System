import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dentist-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DentistSidebar],
  templateUrl: './dentist-change-password.html',
  styleUrl: './dentist-change-password.css',
})
export class DentistChangePasswordComponent {
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
        setTimeout(() => this.router.navigate(['/dentist-profile']), 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Failed to update password. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  protected cancel(): void {
    this.router.navigate(['/dentist-profile']);
  }

  protected goToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  protected toggleVisibility(field: 'currentPassword' | 'newPassword' | 'confirmPassword'): void {
    this.visibility[field] = !this.visibility[field];
  }
}
