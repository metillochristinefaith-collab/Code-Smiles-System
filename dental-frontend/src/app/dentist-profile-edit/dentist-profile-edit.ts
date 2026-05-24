import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { getDentistInfo } from '../dentist-portal-data';

@Component({
  selector: 'app-dentist-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DentistSidebar],
  templateUrl: './dentist-profile-edit.html',
  styleUrl: './dentist-profile-edit.css',
})
export class DentistProfileEditComponent implements OnInit {
  protected isSaving = false;
  protected saveError = '';
  protected showSuccessModal = false;
  protected avatarUrl = '';
  protected isUploadingAvatar = false;

  protected form = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '—',
    specialization: 'General Dentistry',
    department: 'General Dentistry',
    licenseNumber: 'PRC-DEN-2012-08741',
    clinic: 'Code Smiles Dental Clinic — Main Branch',
    education: 'Doctor of Dental Medicine',
    theme: 'system',
    inAppNotif: true,
    emailNotif: true,
    showContactToPatients: false,
  };

  protected dentistId = 'CS-1023';

  constructor(
    private readonly router: Router,
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly avatarSvc: AvatarService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) {
      this.form.firstName = user.first_name || '';
      this.form.lastName = user.last_name || '';
      this.form.email = user.email || '';
      this.loadCachedProfile(user.id);
      const info = getDentistInfo(user.email);
      if (info?.specialty) {
        this.form.specialization = info.specialty;
        this.form.department = info.categories[0] || this.form.department;
      }
      this.api.getUserProfile(user.id).subscribe({
        next: (profile) => {
          this.form.firstName = profile.first_name || this.form.firstName;
          this.form.lastName = profile.last_name || this.form.lastName;
          this.form.email = profile.email || this.form.email;
          this.form.phone = profile.phone || this.form.phone;
          this.saveCachedProfile(user.id);
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }

    // Load avatar - first check localStorage, then database
    this.loadAvatar();
  }

  private async loadAvatar(): Promise<void> {
    // First try to get from localStorage
    this.avatarUrl = this.avatarSvc.getAvatar();

    // If not in localStorage, load from database
    if (!this.avatarUrl) {
      try {
        await this.avatarSvc.loadAvatarFromDB();
        this.avatarUrl = this.avatarSvc.getAvatar();
        this.cdr.detectChanges();
      } catch (err) {
        console.error('Failed to load avatar from DB:', err);
      }
    }
  }

  protected saveProfile(): void {
    if (this.isSaving) return;
    const user = this.auth.getUser();
    if (!user?.id) {
      this.saveError = 'Session expired. Please sign in again.';
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    // Prepare data for API call
    const updateData = {
      phone: this.form.phone?.trim() || undefined,
      specialization: this.form.specialization,
      department: this.form.department,
      education: this.form.education,
      gender: this.form.gender !== '—' ? this.form.gender : undefined,
    };

    this.api.updateUserProfile(user.id, {
      first_name: this.form.firstName.trim(),
      last_name: this.form.lastName.trim(),
      phone: this.form.phone?.trim() || undefined,
    }).subscribe({
      next: () => {
        // Update dentist profile in database
        this.api.updateDentistProfile(updateData).subscribe({
          next: () => {
            const updatedUser = {
              ...user,
              first_name: this.form.firstName.trim(),
              last_name: this.form.lastName.trim(),
              email: this.form.email,
              phone: this.form.phone?.trim() || undefined,
            };
            const storage = localStorage.getItem('auth_user') ? localStorage : sessionStorage;
            storage.setItem('auth_user', JSON.stringify(updatedUser));
            this.saveCachedProfile(user.id);
            this.isSaving = false;
            this.showSuccessModal = true;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isSaving = false;
            this.saveError = err?.error?.message || 'Failed to save profile. Please try again.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = err?.error?.message || 'Failed to save. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  protected closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/dentist-profile']);
  }

  protected stayOnPage(): void {
    this.showSuccessModal = false;
  }

  protected cancel(): void {
    this.router.navigate(['/dentist-profile']);
  }

  protected onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.isUploadingAvatar = true;
    this.avatarSvc.uploadFromFile(file).then(url => {
      this.avatarUrl = url;
      this.isUploadingAvatar = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.isUploadingAvatar = false;
      this.cdr.detectChanges();
    });
  }

  protected get initials(): string {
    return `${this.form.firstName.charAt(0)}${this.form.lastName.charAt(0)}`.toUpperCase() || 'DR';
  }

  private cacheKey(userId: number): string {
    return `dentist_profile_${userId}`;
  }

  private loadCachedProfile(userId: number): void {
    const raw = localStorage.getItem(this.cacheKey(userId));
    if (!raw) return;
    try {
      const cached = JSON.parse(raw);
      this.form.firstName = cached.firstName || this.form.firstName;
      this.form.lastName = cached.lastName || this.form.lastName;
      this.form.email = cached.email || this.form.email;
      this.form.phone = cached.phone || this.form.phone;
      this.form.gender = cached.gender || this.form.gender;
      this.form.inAppNotif = cached.inAppNotif ?? this.form.inAppNotif;
      this.form.emailNotif = cached.emailNotif ?? this.form.emailNotif;
      this.form.showContactToPatients = cached.showContactToPatients ?? this.form.showContactToPatients;
    } catch {}
  }

  private saveCachedProfile(userId: number): void {
    localStorage.setItem(this.cacheKey(userId), JSON.stringify({
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      email: this.form.email,
      phone: this.form.phone,
      gender: this.form.gender,
      inAppNotif: this.form.inAppNotif,
      emailNotif: this.form.emailNotif,
      showContactToPatients: this.form.showContactToPatients,
    }));
  }
}
