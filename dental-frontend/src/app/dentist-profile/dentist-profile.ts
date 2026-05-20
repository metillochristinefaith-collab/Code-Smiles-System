import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DentistSidebar } from '../dentist-sidebar/dentist-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { getDentistInfo } from '../dentist-portal-data';

@Component({
  selector: 'app-dentist-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DentistSidebar],
  templateUrl: './dentist-profile.html',
  styleUrl: './dentist-profile.css',
})
export class DentistProfile implements OnInit {

  activeTab = 'personal';
  avatarUrl = '';
  avatarInitials = 'DR';
  toastMessage = '';

  readonly tabs = [
    { key: 'personal',      label: 'Personal Info'      },
    { key: 'professional',  label: 'Professional Info'  },
    { key: 'schedule',      label: 'Schedule'           },
    { key: 'security',      label: 'Security'           },
    { key: 'documents',     label: 'Documents'          },
    { key: 'settings',      label: 'Settings'           },
  ];

  // Editable personal info — populated from real auth
  personal = {
    firstName: '',
    lastName: '',
    gender: '—',
    birthdate: '',
    phone: '',
    email: '',
    address: '—',
  };

  constructor(
    private router: Router,
    private auth: AuthService,
    private api: ApiService,
    private avatarSvc: AvatarService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) {
      this.applyUserProfile(user);
      this.loadCachedProfile(user.id);
      const info = getDentistInfo(user.email);
      if (info?.specialty) this.professional.specialization = info.specialty;
      this.api.getUserProfile(user.id).subscribe({
        next: (profile) => {
          this.applyUserProfile({
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone,
          });
          this.loadCachedProfile(user.id);
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

  onPhotoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
    this.avatarSvc.uploadFromFile(file).then(url => {
      this.avatarUrl = url;
      this.showToast('Profile photo updated!');
      this.cdr.detectChanges();
    }).catch(err => {
      this.showToast(typeof err === 'string' ? err : 'Upload failed. Max 2MB.');
      this.cdr.detectChanges();
    });
  }

  triggerPhotoUpload(): void {
    document.getElementById('dentist-photo-upload')?.click();
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => { this.toastMessage = ''; this.cdr.detectChanges(); }, 3000);
  }

  navigateToEdit(): void {
    this.router.navigate(['/dentist-profile/edit']);
  }

  navigateToChangePassword(): void {
    this.router.navigate(['/dentist-profile/change-password']);
  }

  private applyUserProfile(user: { first_name?: string; last_name?: string; email?: string; phone?: string }): void {
    this.personal.firstName = user.first_name || this.personal.firstName || 'Dentist';
    this.personal.lastName = user.last_name || this.personal.lastName || '';
    this.personal.email = user.email || this.personal.email;
    this.personal.phone = user.phone || this.personal.phone;
    this.security.email = this.personal.email;
    this.avatarInitials = `${this.personal.firstName.charAt(0)}${this.personal.lastName.charAt(0)}`.toUpperCase() || 'DR';
  }

  private cacheKey(userId: number): string {
    return `dentist_profile_${userId}`;
  }

  private loadCachedProfile(userId: number): void {
    const raw = localStorage.getItem(this.cacheKey(userId));
    if (!raw) return;
    try {
      this.applyUserProfile(JSON.parse(raw));
    } catch {}
  }

  private saveCachedProfile(userId: number): void {
    localStorage.setItem(this.cacheKey(userId), JSON.stringify(this.personal));
  }

  // Professional info
  professional = {
    dentistId: 'CS-1023',
    licenseNumber: 'PRC-DEN-2012-08741',
    specialization: 'General & Cosmetic Dentistry',
    secondarySpec: 'Orthodontics',
    yearsExperience: 12,
    department: 'General Dentistry',
    clinic: 'Code Smiles Dental Clinic — Main Branch',
    education: 'Doctor of Dental Medicine, University of Santo Tomas (2012)',
  };

  // Patient overview stats
  patientStats = [
    { label: 'Active Patients',      value: '48',  icon: '👥', tone: 'blue'   },
    { label: 'Ongoing Treatments',   value: '12',  icon: '🦷', tone: 'teal'   },
    { label: "Today's Appointments", value: '4',   icon: '📅', tone: 'green'  },
    { label: 'Pending Follow-ups',   value: '7',   icon: '↩',  tone: 'amber'  },
  ];

  // Schedule
  schedule = {
    clinicDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '08:00',
    endTime: '17:00',
    lunchBreak: '12:00 – 13:00',
    consultationSlot: '30 minutes',
    maxPatientsPerDay: 12,
  };

  readonly allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Security — email loaded from auth service on init
  security = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    email: '',
    twoFactor: true,
  };

  readonly loginActivity = [
    { device: 'Chrome · Windows 11',  location: 'Quezon City, PH', time: 'Today, 8:30 AM',      status: 'current' },
    { device: 'Safari · iPhone 14',   location: 'Quezon City, PH', time: 'Yesterday, 7:15 PM',  status: 'past'    },
    { device: 'Chrome · Windows 11',  location: 'Quezon City, PH', time: 'Apr 29, 2026, 9:00 AM', status: 'past'  },
  ];

  // Documents
  readonly documents = [
    { name: 'PRC License 2024',              type: 'PRC License',     date: 'Jan 15, 2024', size: '1.2 MB', status: 'Valid'   },
    { name: 'Dental Board Certificate',      type: 'Certification',   date: 'Mar 10, 2022', size: '0.8 MB', status: 'Valid'   },
    { name: 'Orthodontics Specialization',   type: 'Specialization',  date: 'Jun 05, 2020', size: '1.5 MB', status: 'Valid'   },
    { name: 'CPR Training Certificate',      type: 'Training',        date: 'Feb 20, 2025', size: '0.4 MB', status: 'Valid'   },
    { name: 'Infection Control Certificate', type: 'Training',        date: 'Aug 12, 2024', size: '0.6 MB', status: 'Valid'   },
  ];

  // Notification preferences
  notifPrefs = {
    appointments: true,
    treatmentUpdates: true,
    followUpReminders: true,
    prescriptionAlerts: true,
    labResults: true,
    urgentCases: true,
    systemUpdates: false,
  };

  setTab(tab: string) { this.activeTab = tab; }

  isDayActive(day: string): boolean { return this.schedule.clinicDays.includes(day); }

  toggleDay(day: string) {
    const idx = this.schedule.clinicDays.indexOf(day);
    if (idx > -1) this.schedule.clinicDays.splice(idx, 1);
    else this.schedule.clinicDays.push(day);
  }

  savePersonal()  { /* save logic */ }
  saveSchedule()  { /* save logic */ }
  savePassword()  { /* save logic */ }
  saveSettings()  { /* save logic */ }

  docIcon(type: string): string {
    return ({ 'PRC License': '🪪', Certification: '🏅', Specialization: '🎓', Training: '📋' } as any)[type] || '📄';
  }
}
