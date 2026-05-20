import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

/**
 * verify-email component
 *
 * This is the landing page for the verification link inside the email.
 * The email contains: http://localhost:4200/verify-email?token=xxx
 *
 * This component reads the token from the URL, then calls the BACKEND
 * verification endpoint (http://localhost:3000/verify-email?token=xxx)
 * which validates the token and redirects back to:
 *   /verify-email-result?status=success|expired|invalid|already|error
 *
 * Without this component, the Angular router had no handler for /verify-email
 * and fell through to the ** wildcard, sending users to the public homepage.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verify-redirect-page">
      <div class="verify-card">
        <div class="verify-spinner" aria-hidden="true">
          <svg class="spin" viewBox="0 0 24 24" fill="none" stroke="#1b67a9" stroke-width="2" stroke-linecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
        <p class="verify-text">Verifying your email…</p>
        <p class="verify-sub" *ngIf="hasToken">Please wait a moment.</p>
        <p class="verify-sub error" *ngIf="!hasToken">No verification token found. Please check your email link.</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }

    .verify-redirect-page {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #fafdff 0%, #edf6ff 48%, #e5f1fe 100%);
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }

    .verify-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 48px;
      background: rgba(255,255,255,0.88);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 24px;
      box-shadow: 0 44px 100px rgba(21,74,119,0.18);
      text-align: center;
    }

    .verify-spinner svg {
      width: 48px;
      height: 48px;
    }

    .spin { animation: spinAnim 0.8s linear infinite; }
    @keyframes spinAnim { to { transform: rotate(360deg); } }

    .verify-text {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: #0e2742;
    }

    .verify-sub {
      margin: 0;
      font-size: 0.88rem;
      color: #5a7a9a;
    }

    .verify-sub.error { color: #c0334a; }
  `]
})
export class VerifyEmailComponent implements OnInit {
  hasToken = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');

      if (!token) {
        this.hasToken = false;
        // No token — go straight to invalid result page
        setTimeout(() => {
          this.router.navigate(['/verify-email-result'], { queryParams: { status: 'invalid' } });
        }, 1500);
        return;
      }

      this.hasToken = true;

      // Redirect the browser to the BACKEND verification endpoint.
      // The backend validates the token and redirects back to
      // /verify-email-result?status=success|expired|invalid|already|error
      window.location.href = `${environment.apiUrl}/verify-email?token=${encodeURIComponent(token)}`;
    });
  }
}
