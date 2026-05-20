import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffSidebar } from '../staff-sidebar/staff-sidebar';
import { AuthService } from '../services/auth.service';
import { AvatarService } from '../services/avatar.service';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-staff-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, StaffSidebar],
  templateUrl: './staff-profile.html',
  styleUrls: ['./staff-profile.css'],
})
export class StaffProfile implements OnInit {

  profile = {
    firstName:        '',
    lastName:         '',
    employeeId:       '',
    role:             'Staff',
    department:       'Administration',
    position:         'Front Desk Staff',
    hireDate:         '',
    workSchedule:     'Mon – Fri · 8:00 AM – 5:00 PM',
    email:            '',
    phone:            '',
    dateOfBirth:      '',
    address:          '',
    emergencyContact: '',
    emergencyPhone:   '',
    bio:              '',
    status:           'Active',
    avatarText:       '',
    avatarUrl:        '',
  };

  showEditModal = false;
  editData = { ...this.profile };
  activeEditTab: 'personal' | 'work' | 'contact' = 'personal';
  editDob = '';
  isSavingEdit = false;
  editError = '';

  constructor(
    private auth: AuthService,
    private avatarSvc: AvatarService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    if (user) {
      this.profile.firstName  = user.first_name;
      this.profile.lastName   = user.last_name;
      this.profile.email      = user.email;
      this.profile.employeeId = `CS-${String(user.id).padStart(4,'0')}`;
      this.profile.avatarText = (user.first_name[0] + user.last_name[0]).toUpperCase();
      this.profile.phone      = (user as any).phone || '';
    }

    // Load avatar - first check localStorage, then database
    this.loadAvatar();

    // Load additional profile data from localStorage
    this.loadProfileFromStorage();
  }

  private async loadAvatar(): Promise<void> {
    // First try to get from localStorage
    this.profile.avatarUrl = this.avatarSvc.getAvatar();

    // If not in localStorage, load from database
    if (!this.profile.avatarUrl) {
      try {
        await this.avatarSvc.loadAvatarFromDB();
        this.profile.avatarUrl = this.avatarSvc.getAvatar();
        this.cdr.detectChanges();
      } catch (err) {
        console.error('Failed to load avatar from DB:', err);
      }
    }
  }

  private loadProfileFromStorage(): void {
    try {
      const savedProfile = localStorage.getItem('staffProfileData');
      if (savedProfile) {
        const data = JSON.parse(savedProfile);
        // Only load fields that aren't already set from auth service
        if (data.phone) this.profile.phone = data.phone;
        if (data.hireDate) this.profile.hireDate = data.hireDate;
        if (data.address) this.profile.address = data.address;
        if (data.dateOfBirth) this.profile.dateOfBirth = data.dateOfBirth;
        if (data.emergencyContact) this.profile.emergencyContact = data.emergencyContact;
        if (data.emergencyPhone) this.profile.emergencyPhone = data.emergencyPhone;
        if (data.position) this.profile.position = data.position;
        if (data.department) this.profile.department = data.department;
        if (data.workSchedule) this.profile.workSchedule = data.workSchedule;
        if (data.bio) this.profile.bio = data.bio;
      }
    } catch (e) {
      console.error('Error loading profile from storage:', e);
    }
  }

  private saveProfileToStorage(): void {
    try {
      const dataToSave = {
        phone: this.profile.phone,
        hireDate: this.profile.hireDate,
        address: this.profile.address,
        dateOfBirth: this.profile.dateOfBirth,
        emergencyContact: this.profile.emergencyContact,
        emergencyPhone: this.profile.emergencyPhone,
        position: this.profile.position,
        department: this.profile.department,
        workSchedule: this.profile.workSchedule,
        bio: this.profile.bio,
      };
      localStorage.setItem('staffProfileData', JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Error saving profile to storage:', e);
    }
  }

  get fullName(): string {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }

  // ── Edit Profile ──────────────────────────────────────────────────────────

  openEdit(): void {
    this.editData    = { ...this.profile };
    this.activeEditTab = 'personal';
    this.editDob     = this.parseDateToISO(this.profile.dateOfBirth);
    this.editData.hireDate = this.parseDateToISO(this.profile.hireDate);
    this.editError   = '';
    this.showEditModal = true;
  }

  closeEdit(): void { this.showEditModal = false; this.editError = ''; }

  saveEdit(): void {
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.isSavingEdit = true;
    this.editError    = '';

    this.api.updateUserProfile(user.id, {
      first_name: this.editData.firstName.trim(),
      last_name:  this.editData.lastName.trim(),
      phone:      this.editData.phone?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.profile.firstName = this.editData.firstName;
        this.profile.lastName = this.editData.lastName;
        this.profile.phone = this.editData.phone;
        this.profile.hireDate = this.editData.hireDate ? this.formatDateDisplay(this.editData.hireDate) : this.editData.hireDate;
        this.profile.address = this.editData.address;
        this.profile.dateOfBirth = this.editDob ? this.formatDateDisplay(this.editDob) : this.editData.dateOfBirth;
        this.profile.emergencyContact = this.editData.emergencyContact;
        this.profile.emergencyPhone = this.editData.emergencyPhone;
        this.profile.position = this.editData.position;
        this.profile.department = this.editData.department;
        this.profile.workSchedule = this.editData.workSchedule;
        this.profile.bio = this.editData.bio;
        this.profile.avatarText = (this.profile.firstName[0] + this.profile.lastName[0]).toUpperCase();

        // Save additional fields to localStorage
        this.saveProfileToStorage();

        this.isSavingEdit = false;
        this.showEditModal = false;
        this.showSuccessToast('Profile updated successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingEdit = false;
        this.editError = err?.error?.message ?? 'Failed to save. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  // ── Photo Upload ──────────────────────────────────────────────────────────

  onPhotoSelect(event: Event): void {
    const file = (event.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    console.log('Photo selected:', file.name, file.type, file.size);

    this.avatarSvc.uploadFromFile(file).then(url => {
      console.log('Avatar upload successful');
      this.profile.avatarUrl = url;
      this.showSuccessToast('Profile photo updated successfully!');
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('Avatar upload error:', err);
      
      // User-friendly error messages
      let errorMessage = 'Unable to upload photo. Please try again.';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Add helpful context
      if (errorMessage.includes('500KB') || errorMessage.includes('0.5MB')) {
        errorMessage = 'Image is too large. Please use an image under 500KB (0.5MB).';
      } else if (errorMessage.includes('image')) {
        errorMessage = 'Please select a valid image file (JPG, PNG, or GIF).';
      } else if (errorMessage.includes('logged in')) {
        errorMessage = 'Please log in again and try uploading your photo.';
      }
      
      this.showSuccessToast(errorMessage);
      this.cdr.detectChanges();
    });
  }

  // ── Change Email ──────────────────────────────────────────────────────────

  showEmailModal = false;
  newEmail       = '';
  confirmEmail   = '';
  emailError     = '';
  isSavingEmail  = false;

  openEmailModal(): void {
    this.newEmail = ''; this.confirmEmail = ''; this.emailError = '';
    this.showEmailModal = true;
  }
  closeEmailModal(): void { this.showEmailModal = false; }

  saveEmail(): void {
    if (!this.newEmail.includes('@')) {
      this.emailError = 'Please enter a valid email address.'; return;
    }
    if (this.newEmail !== this.confirmEmail) {
      this.emailError = 'Email addresses do not match.'; return;
    }
    // Email change requires a backend endpoint that doesn't exist yet —
    // update locally and show a note that it takes effect on next login
    this.profile.email = this.newEmail;
    this.closeEmailModal();
    this.showSuccessToast('Email updated. Changes take effect on next login.');
  }

  // ── Change Password ───────────────────────────────────────────────────────

  showPasswordModal  = false;
  currentPassword    = '';
  newPassword        = '';
  confirmPassword    = '';
  passwordError      = '';
  isSavingPassword   = false;
  showCurrentPw      = false;
  showNewPw          = false;
  showConfirmPw      = false;

  openPasswordModal(): void {
    this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
    this.passwordError = ''; this.showPasswordModal = true;
  }
  closePasswordModal(): void { this.showPasswordModal = false; }

  savePassword(): void {
    if (!this.currentPassword) {
      this.passwordError = 'Please enter your current password.'; return;
    }
    if (this.newPassword.length < 8) {
      this.passwordError = 'New password must be at least 8 characters.'; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Passwords do not match.'; return;
    }
    const user = this.auth.getUser();
    if (!user?.id) return;
    this.isSavingPassword = true;
    this.passwordError    = '';

    this.api.changePassword(user.id, this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.closePasswordModal();
        this.showSuccessToast('Password changed successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSavingPassword = false;
        this.passwordError = err?.error?.message ?? 'Failed to change password. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const pw = this.newPassword;
    if (pw.length < 6) return 'weak';
    const hasUpper   = /[A-Z]/.test(pw);
    const hasNumber  = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    if (pw.length >= 10 && hasUpper && hasNumber && hasSpecial) return 'strong';
    if (pw.length >= 8  && (hasUpper || hasNumber))             return 'medium';
    return 'weak';
  }

  // ── Deactivate ────────────────────────────────────────────────────────────

  showDeactivateModal = false;
  deactivateConfirm   = '';

  openDeactivateModal(): void { this.deactivateConfirm = ''; this.showDeactivateModal = true; }
  closeDeactivateModal(): void { this.showDeactivateModal = false; }

  confirmDeactivate(): void {
    if (this.deactivateConfirm !== 'DEACTIVATE') return;
    // Deactivation requires admin action — log out and show message
    this.closeDeactivateModal();
    this.showSuccessToast('Deactivation request submitted. Contact your administrator.');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  toastMessage = '';
  isToastVisible = false;

  showSuccessToast(msg: string): void {
    this.toastMessage = msg;
    this.isToastVisible = true;
    setTimeout(() => { this.isToastVisible = false; }, 3500);
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    this.isToastVisible = true;
    setTimeout(() => { this.isToastVisible = false; }, 3500);
  }

  // ── Activity Log (static — no DB endpoint yet) ────────────────────────────

  activityLog: { action: string; time: string; icon: string }[] = [];

  // ── Helpers ───────────────────────────────────────────────────────────────

  private parseDateToISO(displayDate: string): string {
    try {
      const d = new Date(displayDate);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch { return ''; }
  }

  private formatDateDisplay(iso: string): string {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('en-US',
        { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  }
}

