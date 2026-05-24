import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap, catchError } from 'rxjs';
import { PatientProfile, NotificationKey } from './patient-profile.models';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class PatientProfileStore {

  // In-memory cache — populated from DB on first load
  private _profile$ = new BehaviorSubject<PatientProfile | null>(null);
  readonly profile$ = this._profile$.asObservable();

  constructor(
    private auth: AuthService,
    private api: ApiService,
  ) {}

  /** Returns the cached profile synchronously (may be null before first load) */
  getProfile(): PatientProfile {
    return this._profile$.value ?? this.defaultProfile();
  }

  /** Fetch profile from DB and cache it. Returns observable. */
  loadFromServer(): Observable<any> {
    const user = this.auth.getUser();
    if (!user?.id) {
      this._profile$.next(this.defaultProfile());
      return new Observable(obs => { obs.next(null); obs.complete(); });
    }

    return this.api.getPatientProfile(user.id).pipe(
      tap((data: any) => {
        this._profile$.next(this.mapFromServer(data));
      })
    );
  }

  /** Save profile to DB and update cache. Returns observable. */
  saveToServer(profile: PatientProfile): Observable<any> {
    const user = this.auth.getUser();
    if (!user?.id) throw new Error('Not logged in');

    const payload = {
      date_of_birth:           profile.dateOfBirth || null,
      gender:                  profile.gender || null,
      blood_type:              profile.bloodType || null,
      preferred_language:      profile.preferredLanguage || null,
      home_address:            profile.homeAddress || null,
      preferred_contact:       profile.preferredContactMethod || null,
      primary_dentist:         profile.primaryDentist || null,
      emergency_contact_name:  profile.emergencyContact.name || null,
      emergency_contact_rel:   profile.emergencyContact.relationship || null,
      emergency_contact_phone: profile.emergencyContact.phoneNumber || null,
      notif_email:             profile.notifications.email,
      notif_sms:               profile.notifications.sms,
      notif_announcements:     profile.notifications.announcements,
    };

    // FIX: Optimistic update - update cache immediately
    this._profile$.next({ ...profile });

    return this.api.updatePatientProfile(user.id, payload).pipe(
      tap(() => {
        // Also update name/phone via user profile endpoint if changed
        const original = this.auth.getUser();
        const nameParts = profile.fullName.trim().split(' ');
        const first = nameParts[0] ?? '';
        const last  = nameParts.slice(1).join(' ') || '';
        if (original && (first !== original.first_name || last !== original.last_name)) {
          this.api.updateUserProfile(user.id, { first_name: first, last_name: last }).subscribe();
        }
        // FIX: Reload fresh data from server to verify save
        this.loadFromServer().subscribe({
          error: (err) => console.error('Failed to reload profile after save:', err)
        });
      }),
      catchError((err) => {
        // FIX: Revert cache on error
        const original = this._profile$.value;
        this._profile$.next(original);
        console.error('Profile save failed:', err);
        throw err;
      })
    );
  }

  /** Update notification preference locally + on server */
  toggleNotification(key: NotificationKey): PatientProfile {
    const current = this.getProfile();
    const updated: PatientProfile = {
      ...current,
      emergencyContact: { ...current.emergencyContact },
      notifications: {
        ...current.notifications,
        [key]: !current.notifications[key],
      },
    };
    this._profile$.next(updated);
    // Persist to server silently
    this.saveToServer(updated).subscribe();
    return updated;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private mapFromServer(data: any): PatientProfile {
    const user = this.auth.getUser();
    const firstName = data.first_name ?? user?.first_name ?? '';
    const lastName  = data.last_name  ?? user?.last_name  ?? '';
    const fullName  = `${firstName} ${lastName}`.trim() || 'Patient';

    return {
      fullName,
      patientId:              data.id ? `CS-${String(data.id).padStart(5, '0')}` : (user ? `CS-${String(user.id).padStart(5, '0')}` : 'CS-00000'),
      memberSince:            data.member_since ? new Date(data.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Member',
      status:                 data.status ?? 'Active Patient',
      dateOfBirth:            data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
      gender:                 data.gender ?? '',
      bloodType:              data.blood_type ?? '',
      preferredLanguage:      data.preferred_language ?? 'English',
      phoneNumber:            data.phone ?? '',
      email:                  data.email ?? user?.email ?? '',
      homeAddress:            data.home_address ?? '',
      preferredContactMethod: data.preferred_contact ?? 'Email',
      primaryDentist:         data.primary_dentist ?? '',
      emergencyContact: {
        name:         data.emergency_contact_name  ?? '',
        relationship: data.emergency_contact_rel   ?? '',
        phoneNumber:  data.emergency_contact_phone ?? '',
      },
      notifications: {
        email:         data.notif_email         ?? true,
        sms:           data.notif_sms           ?? false,
        announcements: data.notif_announcements ?? true,
      },
    };
  }

  private defaultProfile(): PatientProfile {
    const user = this.auth.getUser();
    return {
      fullName:               user ? `${user.first_name} ${user.last_name}` : 'Patient',
      patientId:              user ? `CS-${String(user.id).padStart(5, '0')}` : 'CS-00000',
      memberSince:            'Member',
      status:                 'Active Patient',
      dateOfBirth:            '',
      gender:                 '',
      bloodType:              '',
      preferredLanguage:      'English',
      phoneNumber:            '',
      email:                  user?.email ?? '',
      homeAddress:            '',
      preferredContactMethod: 'Email',
      primaryDentist:         '',
      emergencyContact: { name: '', relationship: '', phoneNumber: '' },
      notifications:    { email: true, sms: false, announcements: true },
    };
  }
}
