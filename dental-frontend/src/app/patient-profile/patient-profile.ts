import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { NotificationKey, PatientProfile } from './patient-profile.models';
import { PatientProfileStore } from './patient-profile.store';
import { AvatarService } from '../services/avatar.service';

interface HeroMetaItem {
  label: string;
  value: string;
  iconViewBox: string;
  iconPaths: string[];
}

interface InfoField {
  label: string;
  value: string;
  iconViewBox: string;
  iconPaths: string[];
}

interface NotificationItem {
  key: NotificationKey;
  title: string;
  description: string;
  iconViewBox: string;
  iconPaths: string[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, PatientSidebarComponent],
  templateUrl: './patient-profile.html',
  styleUrl: './patient-profile.css',
})
export class PatientProfileComponent implements OnInit {
  protected profile: PatientProfile;
  protected toastMessage = '';
  protected avatarUrl = '';
  protected isUploadingAvatar = false;
  protected isLoading = true;

  constructor(
    private readonly router: Router,
    private readonly profileStore: PatientProfileStore,
    private readonly avatarSvc: AvatarService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.profile = this.profileStore.getProfile();
  }

  ngOnInit(): void {
    // Load profile data
    this.profileStore.loadFromServer().subscribe({
      next: () => {
        this.profile = this.profileStore.getProfile();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.profile = this.profileStore.getProfile();
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

  protected onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.isUploadingAvatar = true;
    this.avatarSvc.uploadFromFile(file).then(url => {
      this.avatarUrl = url;
      this.toastMessage = 'Profile photo updated!';
      this.isUploadingAvatar = false;
      this.cdr.detectChanges();
      setTimeout(() => { this.toastMessage = ''; this.cdr.detectChanges(); }, 2500);
    }).catch(err => {
      this.toastMessage = typeof err === 'string' ? err : 'Upload failed.';
      this.isUploadingAvatar = false;
      this.cdr.detectChanges();
      setTimeout(() => { this.toastMessage = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  protected readonly notificationItems: NotificationItem[] = [
    {
      key: 'email',
      title: 'Email Notifications',
      description: 'Appointment reminders, updates, and clinic news.',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Z',
        'M4 8l8 6 8-6',
      ],
    },
    {
      key: 'sms',
      title: 'SMS Notifications',
      description: 'Text reminders and important alerts from the clinic.',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M5.5 6.5h13A1.5 1.5 0 0 1 20 8v7a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z',
        'M8 10.5h8M8 13.5h5',
      ],
    },
    {
      key: 'announcements',
      title: 'Clinic Announcements',
      description: 'Special offers, service updates, and dental health tips.',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M5 12.5V9.8a1 1 0 0 1 .7-1l10-3.3a1 1 0 0 1 1.3 1V16a1 1 0 0 1-1.3 1l-10-3.3a1 1 0 0 1-.7-1v-.2Z',
        'M8.5 14.5v4',
        'M18.5 9a4.5 4.5 0 0 1 0 6',
      ],
    },
  ];

  protected navigateToEdit(): void {
    this.router.navigate(['/patient-profile/edit']);
  }

  protected navigateToChangePassword(): void {
    this.router.navigate(['/patient-profile/change-password']);
  }

  protected downloadMyData(): void {
    this.toastMessage = 'Your profile data export is being prepared.';
    window.clearTimeout((this as { toastTimeout?: number }).toastTimeout);
    (this as { toastTimeout?: number }).toastTimeout = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2400);
  }

  protected toggleNotification(key: NotificationKey): void {
    this.profile = this.profileStore.toggleNotification(key);
    this.toastMessage = 'Notification preferences updated.';
    window.clearTimeout((this as { toastTimeout?: number }).toastTimeout);
    (this as { toastTimeout?: number }).toastTimeout = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2200);
  }

  protected openHelpCenter(): void {
    this.router.navigate(['/patient-help-center']);
  }

  protected get initials(): string {
    const names = this.profile.fullName.trim().split(' ');
    return `${names[0]?.charAt(0) ?? ''}${names[names.length - 1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  protected display(val: string): string {
    return val?.trim() || '—';
  }

  protected get heroMeta(): HeroMetaItem[] {
    return [
      {
        label: 'Date of Birth',
        value: this.display(this.profile.dateOfBirth),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M7 3v3M17 3v3M4 8h16',
          'M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5.5 5.5Z',
        ],
      },
      {
        label: 'Gender',
        value: this.display(this.profile.gender),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z',
          'M5.5 19.5a6.8 6.8 0 0 1 13 0',
        ],
      },
      {
        label: 'Blood Type',
        value: this.display(this.profile.bloodType),
        iconViewBox: '0 0 24 24',
        iconPaths: ['M12 4c-2.3 3.4-5 6-5 9a5 5 0 1 0 10 0c0-3-2.7-5.6-5-9Z'],
      },
      {
        label: 'Language',
        value: this.display(this.profile.preferredLanguage),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M4 6.5h8v8H4z',
          'M12 11h8v6.5h-8z',
          'M8 10.5v7',
          'M16 6l-2 4h4z',
        ],
      },
    ];
  }

  protected get personalInfoFields(): InfoField[] {
    return [
      {
        label: 'Phone Number',
        value: this.display(this.profile.phoneNumber),
        iconViewBox: '0 0 24 24',
        iconPaths: ['M6.6 5.5h2.2l1.2 3.3-1.6 1.5a15.3 15.3 0 0 0 5.2 5.2l1.5-1.6 3.3 1.2v2.2a1.5 1.5 0 0 1-1.5 1.5A13.4 13.4 0 0 1 5.1 7a1.5 1.5 0 0 1 1.5-1.5Z'],
      },
      {
        label: 'Gender',
        value: this.display(this.profile.gender),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z',
          'M5.5 19.5a6.8 6.8 0 0 1 13 0',
        ],
      },
      {
        label: 'Email Address',
        value: this.display(this.profile.email),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Z',
          'M4 8l8 6 8-6',
        ],
      },
      {
        label: 'Blood Type',
        value: this.display(this.profile.bloodType),
        iconViewBox: '0 0 24 24',
        iconPaths: ['M12 4c-2.3 3.4-5 6-5 9a5 5 0 1 0 10 0c0-3-2.7-5.6-5-9Z'],
      },
      {
        label: 'Preferred Language',
        value: this.display(this.profile.preferredLanguage),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M4 6.5h8v8H4z',
          'M12 11h8v6.5h-8z',
          'M8 10.5v7',
          'M16 6l-2 4h4z',
        ],
      },
      {
        label: 'Primary Dentist',
        value: this.display(this.profile.primaryDentist),
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M8.5 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
          'M14.5 9h5M17 6.5v5',
          'M3.5 19.5a5.6 5.6 0 0 1 10 0',
        ],
      },
    ];
  }
}
