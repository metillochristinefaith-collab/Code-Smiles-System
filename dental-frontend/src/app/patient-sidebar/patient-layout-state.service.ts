import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PatientLayoutStateService {
  private readonly storageKey = 'patient-sidebar-collapsed';
  private readonly sidebarCollapsedState = signal(this.readInitialCollapsedState());

  readonly sidebarCollapsed = this.sidebarCollapsedState.asReadonly();

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsedState.set(collapsed);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, String(collapsed));
    }
  }

  private readInitialCollapsedState(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.storageKey) === 'true';
  }
}
