import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guest guard — blocks already-logged-in users from accessing
 * auth pages (login, register, forgot-password, reset-password).
 * Redirects them to their role dashboard instead.
 */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    router.navigate([auth.getDashboardRoute()]);
    return false;
  }

  return true;
};
