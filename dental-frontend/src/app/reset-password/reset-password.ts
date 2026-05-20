import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

type PageState = 'validating' | 'form' | 'success' | 'invalid' | 'expired' | 'error';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css'],
})
export class ResetPasswordComponent implements OnInit {
  state: PageState = 'validating';
  token = '';

  newPassword = '';
  confirmPassword = '';
  showNew = false;
  showConfirm = false;
  submitted = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token') ?? '';
      if (!this.token) {
        this.state = 'invalid';
        return;
      }
      this.validateToken();
    });
  }

  private validateToken(): void {
    this.state = 'validating';
    this.auth.validateResetToken(this.token).subscribe({
      next: (res: any) => {
        this.state = res.valid ? 'form' : (res.code === 'expired' ? 'expired' : 'invalid');
        this.cdr.detectChanges();
      },
      error: () => {
        this.state = 'error';
        this.cdr.detectChanges();
      },
    });
  }

  get isPasswordValid(): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(this.newPassword);
  }

  get doPasswordsMatch(): boolean {
    return this.newPassword === this.confirmPassword && this.confirmPassword.length > 0;
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const pw = this.newPassword;
    if (pw.length < 6) return 'weak';
    const hasUpper   = /[A-Z]/.test(pw);
    const hasNumber  = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasNumber && hasSpecial) return 'strong';
    if (pw.length >= 8  && (hasUpper || hasNumber))             return 'medium';
    return 'weak';
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (!this.isPasswordValid || !this.doPasswordsMatch || this.isLoading) return;

    this.isLoading = true;

    this.auth.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.state = 'success';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const code = err?.error?.code;
        if (code === 'expired') { this.state = 'expired'; return; }
        if (code === 'invalid') { this.state = 'invalid'; return; }
        this.errorMessage = err?.error?.message ?? 'Failed to reset password. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  goToLogin(): void { this.router.navigate(['/login']); }
  goToForgot(): void { this.router.navigate(['/forgot-password']); }
}
