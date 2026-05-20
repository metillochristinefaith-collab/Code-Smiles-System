import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { PatientProfile } from '../patient-profile/patient-profile.models';
import { PatientProfileStore } from '../patient-profile/patient-profile.store';
import { AvatarService } from '../services/avatar.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-profile-edit.html',
  styleUrl: './patient-profile-edit.css',
})
export class PatientProfileEditComponent implements OnInit {
  protected form: PatientProfile;
  protected isLoading = true;
  protected isSaving = false;
  protected saveError = '';
  protected showSuccessModal = false;
  protected avatarUrl = '';
  protected isUploadingAvatar = false;

  readonly bloodTypes = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'];

  constructor(
    private readonly router: Router,
    private readonly profileStore: PatientProfileStore,
    private readonly avatarSvc: AvatarService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.profileStore.getProfile();
  }

  ngOnInit(): void {
    // Always load fresh data from DB when opening edit page
    this.profileStore.loadFromServer().subscribe({
      next: () => {
        this.form = this.profileStore.getProfile();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.form = this.profileStore.getProfile();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });

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
    this.isSaving = true;
    this.saveError = '';

    this.profileStore.saveToServer(this.form).subscribe({
      next: () => {
        this.isSaving = false;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
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
    this.router.navigate(['/patient-profile']);
  }

  protected stayOnPage(): void {
    this.showSuccessModal = false;
  }

  protected cancel(): void {
    this.router.navigate(['/patient-profile']);
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
    const names = this.form.fullName.trim().split(' ');
    return `${names[0]?.charAt(0) ?? ''}${names[names.length - 1]?.charAt(0) ?? ''}`.toUpperCase();
  }
}
