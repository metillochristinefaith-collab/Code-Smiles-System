import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/**
 * Real-time Synchronization Service
 * 
 * Handles automatic polling and updates for dentist appointments
 * to ensure the portal stays in sync with database changes.
 */
@Injectable({
  providedIn: 'root'
})
export class SyncService {
  
  // Observable that emits whenever appointments need to be refreshed
  private appointmentRefreshSubject = new BehaviorSubject<boolean>(false);
  public appointmentRefresh$ = this.appointmentRefreshSubject.asObservable();
  
  // Polling subscription
  private pollingSubscription: Subscription | null = null;
  
  // Polling interval in milliseconds (default: 10 seconds)
  private pollingInterval = 10000;
  
  // Track if polling is active
  private isPollingActive = false;

  constructor(
    private api: ApiService,
    private auth: AuthService
  ) {}

  /**
   * Start polling for appointment updates
   * Automatically refreshes dentist appointments at regular intervals
   */
  startPolling(): void {
    if (this.isPollingActive) {
      console.log('[Sync] Polling already active');
      return;
    }

    console.log('[Sync] Starting appointment polling...');
    this.isPollingActive = true;

    // Poll every 10 seconds
    this.pollingSubscription = interval(this.pollingInterval)
      .pipe(
        switchMap(() => {
          const user = this.auth.getUser();
          if (!user) {
            return of(null);
          }
          const dentistName = `Dr. ${user.first_name} ${user.last_name}`;
          return this.api.getDentistAppointments(dentistName).pipe(
            catchError(err => {
              console.error('[Sync] Polling error:', err);
              return of(null);
            })
          );
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            console.log('[Sync] Appointments updated via polling');
            // Emit refresh signal
            this.appointmentRefreshSubject.next(true);
          }
        },
        error: (err) => {
          console.error('[Sync] Polling subscription error:', err);
        }
      });
  }

  /**
   * Stop polling for appointment updates
   */
  stopPolling(): void {
    if (this.pollingSubscription) {
      console.log('[Sync] Stopping appointment polling...');
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
      this.isPollingActive = false;
    }
  }

  /**
   * Manually trigger an appointment refresh
   * Use this after actions like approval, completion, etc.
   */
  triggerRefresh(): void {
    console.log('[Sync] Manual refresh triggered');
    this.appointmentRefreshSubject.next(true);
  }

  /**
   * Set the polling interval (in milliseconds)
   * Default is 10000ms (10 seconds)
   */
  setPollingInterval(intervalMs: number): void {
    if (intervalMs < 5000) {
      console.warn('[Sync] Polling interval too low, setting to 5000ms');
      this.pollingInterval = 5000;
    } else {
      this.pollingInterval = intervalMs;
    }
  }

  /**
   * Check if polling is currently active
   */
  isPolling(): boolean {
    return this.isPollingActive;
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }
}
