import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Global HTTP interceptor — handles 401 Unauthorized responses.
 * Clears all stored tokens and redirects to /login.
 * This prevents stale sessions from causing silent failures across the app.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      const hadAuthHeader = req.headers.has('Authorization');
      if (error.status === 401 && hadAuthHeader) {
        // Clear both storage locations (covers rememberMe=true and false)
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('user_avatar');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_user');
        sessionStorage.removeItem('user_avatar');

        // Only redirect if not already on a public/auth page
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password',
                             '/verify-email', '/verify-email-result', '/check-email', '/'];
        const currentPath = window.location.pathname;
        const isPublic = publicPaths.some(p => currentPath === p || currentPath.startsWith(p + '?'));

        if (!isPublic) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
