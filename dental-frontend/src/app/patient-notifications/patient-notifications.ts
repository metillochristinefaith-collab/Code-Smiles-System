import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { AvatarService } from '../services/avatar.service';

type NotificationFilterKey =
  | 'all'
  | 'appointments'
  | 'treatment'
  | 'messages'
  | 'medical-vault'
  | 'clinic-updates';

type NotificationType = 'appointment' | 'message' | 'document' | 'update';
type NotificationStatus = 'approved' | 'pending' | 'info';
type NotificationTone = 'green' | 'orange' | 'blue' | 'violet' | 'teal';
type NotificationActionKind =
  | 'view-appointment'
  | 'add-calendar'
  | 'view-details'
  | 'open-message'
  | 'view-document'
  | 'view-update'
  | 'confirm-attendance'
  | 'request-reschedule-reminder';

interface NotificationFilter {
  key: NotificationFilterKey;
  label: string;
}

interface NotificationAction {
  label: string;
  kind: NotificationActionKind;
  style: 'primary' | 'secondary' | 'confirm' | 'reschedule';
}

interface NotificationItem {
  id: string;
  dbId?: number;
  appointmentId?: number;
  confirmationStatus?: string;
  section: 'needs-action' | 'recent';
  filter: Exclude<NotificationFilterKey, 'all'>;
  type: NotificationType;
  title: string;
  description: string;
  subtitle: string;
  status: NotificationStatus;
  isRead: boolean;
  createdAt: Date;
  badge: string;
  tone: NotificationTone;
  calendarTitle?: string;
  calendarDescription?: string;
  calendarLocation?: string;
  calendarStart?: string;
  calendarEnd?: string;
  documentTitle?: string;
  actions: NotificationAction[];
  iconViewBox: string;
  iconPaths: string[];
}

interface NotificationPreference {
  key: 'email' | 'sms' | 'dentistMessages';
  title: string;
  description: string;
  enabled: boolean;
  tone: NotificationTone;
  iconViewBox: string;
  iconPaths: string[];
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, PatientSidebarComponent],
  templateUrl: './patient-notifications.html',
  styleUrl: './patient-notifications.css',
})
export class PatientNotificationsComponent implements OnInit {
  protected selectedFilter: NotificationFilterKey = 'all';
  protected activeMenuId: string | null = null;
  protected toastMessage = '';

  protected readonly filters: NotificationFilter[] = [
    { key: 'all', label: 'All' },
    { key: 'appointments', label: 'Appointments' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'messages', label: 'Messages' },
    { key: 'medical-vault', label: 'Medical Vault' },
    { key: 'clinic-updates', label: 'Clinic Updates' },
  ];

  protected notifications: NotificationItem[] = [];

  protected preferences: NotificationPreference[] = [
    {
      key: 'email',
      title: 'Email Notifications',
      description: 'Appointment reminders, updates',
      enabled: true,
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M4.5 6.5h15A1.5 1.5 0 0 1 21 8v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16V8a1.5 1.5 0 0 1 1.5-1.5Z',
        'M4 8l8 6 8-6',
      ],
    },
    {
      key: 'sms',
      title: 'SMS Notifications',
      description: 'Text reminders and alerts',
      enabled: true,
      tone: 'violet',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M5.5 6.5h13A1.5 1.5 0 0 1 20 8v7a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3v-3H5.5A1.5 1.5 0 0 1 4 15V8a1.5 1.5 0 0 1 1.5-1.5Z',
        'M8 10.5h8M8 13.5h5',
      ],
    },
    {
      key: 'dentistMessages',
      title: 'Messages from Dentists',
      description: 'Messages, instructions',
      enabled: true,
      tone: 'green',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M5 12.5V9.8a1 1 0 0 1 .7-1l10-3.3a1 1 0 0 1 1.3 1V16a1 1 0 0 1-1.3 1l-10-3.3a1 1 0 0 1-.7-1v-.2Z',
        'M8.5 14.5v4',
        'M18.5 9a4.5 4.5 0 0 1 0 6',
      ],
    },
  ];

  constructor(private readonly router: Router, private api: ApiService, private auth: AuthService, private avatarSvc: AvatarService, private cdr: ChangeDetectorRef) {}

  protected avatarUrl: string = '';

  protected get patientName(): string {
    const user = this.auth.getUser();
    return user ? `${user.first_name} ${user.last_name}` : 'Patient';
  }

  protected get patientId(): string {
    const user = this.auth.getUser();
    return user ? `CS-${String(user.id).padStart(5, '0')}` : 'CS-00000';
  }

  protected get patientInitials(): string {
    const user = this.auth.getUser();
    if (!user) return 'P';
    return `${user.first_name?.charAt(0) ?? ''}${user.last_name?.charAt(0) ?? ''}`.toUpperCase();
  }

  ngOnInit() {
    // Load avatar
    this.avatarUrl = this.avatarSvc.getAvatar();
    if (!this.avatarUrl) {
      this.avatarSvc.loadAvatarFromDB().then(() => {
        this.avatarUrl = this.avatarSvc.getAvatar();
        this.cdr.detectChanges();
      }).catch(() => {});
    }

    const user = this.auth.getUser();
    if (!user?.id) return;
    this.api.getNotifications(user.id).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          // Map real DB notifications into the NotificationItem shape
          const dbNotifs: NotificationItem[] = data.map((n: any) => {
            const isReminder     = n.title?.includes('Reminder') || n.title?.includes('3 Hours');
            const isNoShow       = n.title?.includes('No-show') || n.title?.includes('Missed');
            const isPrescription = n.title === 'Prescription Issued';
            const alreadyConfirmed    = n.confirmation_status === 'Confirmed';
            const alreadyRescheduled  = n.confirmation_status === 'Reschedule Requested';

            // Determine filter category
            const filter: Exclude<NotificationFilterKey, 'all'> = isPrescription
              ? 'messages'
              : 'appointments';

            // Build actions
            const actions: NotificationAction[] = [];
            if (isPrescription) {
              actions.push({ label: 'View Prescriptions', kind: 'view-details', style: 'primary' });
            } else if (isReminder && n.appointment_id && !alreadyConfirmed && !alreadyRescheduled) {
              actions.push({ label: '✓ Confirm Attendance', kind: 'confirm-attendance', style: 'confirm' });
              actions.push({ label: 'Request Reschedule', kind: 'request-reschedule-reminder', style: 'reschedule' });
            } else if (isReminder && alreadyConfirmed) {
              actions.push({ label: 'View Appointment', kind: 'view-appointment', style: 'primary' });
            } else {
              actions.push({ label: 'View Appointment', kind: 'view-appointment', style: 'primary' });
            }

            // Icon paths
            const prescriptionIconPaths = [
              'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2',
              'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z',
              'M9 12h6M9 16h4',
            ];
            const calendarIconPaths = [
              'M7 3v3M17 3v3M4 8h16',
              'M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5.5 5.5Z',
            ];

            return {
              id:                String(n.id),
              dbId:              n.id,
              appointmentId:     n.appointment_id || undefined,
              confirmationStatus: n.confirmation_status || 'Not Confirmed',
              section:           n.is_read ? 'recent' : 'needs-action',
              filter,
              type:              isPrescription ? 'message' as const : 'appointment' as const,
              title:             n.title,
              subtitle:          new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              description:       n.detail,
              status:            (n.level === 'Update' ? 'approved' : n.level === 'Warning' ? 'pending' : 'info') as NotificationStatus,
              isRead:            n.is_read,
              createdAt:         new Date(n.created_at),
              badge:             isPrescription ? 'Prescription' : isReminder ? 'Reminder' : isNoShow ? 'No-show' : n.title,
              tone:              (isPrescription ? 'teal' : isReminder ? 'blue' : n.level === 'Update' ? 'green' : n.level === 'Warning' ? 'orange' : 'blue') as NotificationTone,
              actions,
              iconViewBox: '0 0 24 24',
              iconPaths:   isPrescription ? prescriptionIconPaths : calendarIconPaths,
            };
          });
          this.notifications = dbNotifs;
        }
      },
      error: () => {}
    });
  }

  protected setFilter(filter: NotificationFilterKey): void {
    this.selectedFilter = filter;
    this.activeMenuId = null;
  }

  protected markAllAsRead(): void {
    this.notifications = this.notifications.map((item) => ({ ...item, isRead: true }));
    this.toastMessage = 'All notifications marked as read.';
    this.clearToastLater();
  }

  protected togglePreference(key: NotificationPreference['key']): void {
    this.preferences = this.preferences.map((item) =>
      item.key === key ? { ...item, enabled: !item.enabled } : item,
    );
    this.toastMessage = 'Notification preferences updated.';
    this.clearToastLater();
  }

  protected toggleMenu(notificationId: string): void {
    this.activeMenuId = this.activeMenuId === notificationId ? null : notificationId;
  }

  protected markAsRead(notificationId: string): void {
    this.notifications = this.notifications.map((item) =>
      item.id === notificationId ? { ...item, isRead: true } : item,
    );
    this.activeMenuId = null;
    this.toastMessage = 'Notification marked as read.';
    this.clearToastLater();
  }

  protected deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter((item) => item.id !== notificationId);
    this.activeMenuId = null;
    this.toastMessage = 'Notification removed.';
    this.clearToastLater();
  }

  protected handleAction(notification: NotificationItem, action: NotificationAction): void {
    this.notifications = this.notifications.map((item) =>
      item.id === notification.id ? { ...item, isRead: true } : item,
    );

    switch (action.kind) {
      case 'view-appointment':
      case 'view-details':
        if (notification.filter === 'messages') {
          this.router.navigate(['/patient-appointments']);
          return;
        }
        if (notification.appointmentId) {
          this.router.navigate(['/patient-appointments', `APT-${notification.appointmentId}`]);
        } else {
          this.router.navigate(['/patient-appointments']);
        }
        return;
      case 'add-calendar':
        this.downloadCalendarInvite(notification);
        this.toastMessage = `Calendar file downloaded for ${notification.title}.`;
        this.clearToastLater();
        return;
      case 'open-message':
        this.router.navigate(['/patient-messages']);
        return;
      case 'view-document':
        this.router.navigate(['/patient-medical-vault'], {
          queryParams: { record: notification.documentTitle || notification.title },
        });
        return;
      case 'view-update':
        this.toastMessage = 'Clinic update opened.';
        this.clearToastLater();
        return;
      case 'confirm-attendance':
        if (notification.appointmentId) {
          this.api.confirmAttendance(notification.appointmentId).subscribe({
            next: () => {
              // Update the notification's actions to show confirmed state
              this.notifications = this.notifications.map(item =>
                item.id === notification.id
                  ? {
                      ...item,
                      confirmationStatus: 'Confirmed',
                      actions: [{ label: 'View Appointment', kind: 'view-appointment' as const, style: 'primary' as const }],
                    }
                  : item
              );
              this.toastMessage = '✓ Attendance confirmed! See you at your appointment.';
              this.clearToastLater();
            },
            error: () => {
              this.toastMessage = 'Could not confirm attendance. Please try again.';
              this.clearToastLater();
            }
          });
        }
        return;
      case 'request-reschedule-reminder':
        if (notification.appointmentId) {
          this.api.confirmRescheduleFromReminder(notification.appointmentId).subscribe({
            next: () => {
              this.notifications = this.notifications.map(item =>
                item.id === notification.id
                  ? {
                      ...item,
                      confirmationStatus: 'Reschedule Requested',
                      actions: [{ label: 'View Appointment', kind: 'view-appointment' as const, style: 'primary' as const }],
                    }
                  : item
              );
              this.toastMessage = 'Reschedule request submitted. The clinic will contact you.';
              this.clearToastLater();
            },
            error: () => {
              this.toastMessage = 'Could not submit reschedule request. Please try again.';
              this.clearToastLater();
            }
          });
        }
        return;
    }
  }

  protected openHelpCenter(): void {
    this.router.navigate(['/help-center']);
  }

  protected get filteredNotifications(): NotificationItem[] {
    if (this.selectedFilter === 'all') {
      return this.notifications;
    }

    return this.notifications.filter((item) => item.filter === this.selectedFilter);
  }

  protected get needsActionNotifications(): NotificationItem[] {
    return this.filteredNotifications.filter((item) => item.section === 'needs-action');
  }

  protected get recentNotifications(): NotificationItem[] {
    return this.filteredNotifications.filter((item) => item.section === 'recent');
  }

  protected get filterCounts(): Record<NotificationFilterKey, number> {
    return {
      all: this.notifications.length,
      appointments: this.notifications.filter((item) => item.filter === 'appointments').length,
      treatment: this.notifications.filter((item) => item.filter === 'treatment').length,
      messages: this.notifications.filter((item) => item.filter === 'messages').length,
      'medical-vault': this.notifications.filter((item) => item.filter === 'medical-vault').length,
      'clinic-updates': this.notifications.filter((item) => item.filter === 'clinic-updates').length,
    };
  }

  protected get needsActionCount(): number {
    return this.notifications.filter((item) => item.section === 'needs-action' && !item.isRead).length;
  }

  protected get unreadCount(): number {
    return this.notifications.filter((item) => !item.isRead).length;
  }

  protected formatRelativeDate(value: Date): string {
    const diff = Date.now() - value.getTime();
    const minutes = Math.round(diff / 60000);

    if (minutes < 60) {
      return `${minutes} minutes ago`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  private clearToastLater(): void {
    window.clearTimeout((this as { toastTimeout?: number }).toastTimeout);
    (this as { toastTimeout?: number }).toastTimeout = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2200);
  }

  private downloadCalendarInvite(notification: NotificationItem): void {
    if (!notification.calendarStart || !notification.calendarEnd) {
      return;
    }

    const fileName = `${notification.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Code Smiles//Patient Portal//EN',
      'BEGIN:VEVENT',
      `UID:${notification.id}@codesmiles.local`,
      `DTSTAMP:${this.formatCalendarDate(new Date().toISOString())}`,
      `DTSTART:${this.formatCalendarDate(notification.calendarStart)}`,
      `DTEND:${this.formatCalendarDate(notification.calendarEnd)}`,
      `SUMMARY:${notification.calendarTitle || notification.title}`,
      `DESCRIPTION:${(notification.calendarDescription || notification.description).replace(/\n/g, '\\n')}`,
      `LOCATION:${notification.calendarLocation || 'Code Smiles Dental Clinic'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private formatCalendarDate(value: string): string {
    return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }
}
