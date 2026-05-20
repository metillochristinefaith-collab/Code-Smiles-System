import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-terms.html',
  styleUrl: './patient-terms.css',
})
export class PatientTerms {
  protected initial: string = 'P';

  protected get patientProfile() {
    const user = this.auth.getUser();
    if (user) {
      this.initial = (user?.first_name?.charAt(0) ?? 'P').toUpperCase();
    }
    return {
      name: user ? `${user.first_name} ${user.last_name}` : 'Patient',
      id:   user ? `CS-${String(user.id).padStart(5, '0')}` : '—',
    };
  }

  constructor(private auth: AuthService) {}
  protected readonly featureCards = [
    {
      title: 'Clear Expectations',
      description: 'Understand how the patient portal should be used for appointments, records, and communication.',
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M7 3.5h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z', 'M15 3.5v4h4', 'M9 12h6'],
    },
    {
      title: 'Secure Account Use',
      description: 'Keep login details private and make sure the information you submit remains accurate and current.',
      tone: 'mint',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M8 11V8a4 4 0 1 1 8 0v3', 'M6.5 11.5h11A1.5 1.5 0 0 1 19 13v6A1.5 1.5 0 0 1 17.5 20.5h-11A1.5 1.5 0 0 1 5 19v-6A1.5 1.5 0 0 1 6.5 11.5Z'],
    },
    {
      title: 'Responsible Communication',
      description: 'Portal messages and requests should be used for routine coordination unless the clinic instructs otherwise.',
      tone: 'amber',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5Z'],
    },
  ];

  protected readonly termsPoints = [
    {
      title: 'Account Responsibilities',
      description: 'You are responsible for keeping your login credentials secure and for updating your personal details when they change.',
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z', 'M5.5 19.5a6.8 6.8 0 0 1 13 0'],
    },
    {
      title: 'Appointment Requests',
      description: 'Appointment bookings, reschedules, and treatment requests submitted through the portal may require clinic confirmation before they are finalized.',
      tone: 'mint',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M4 5.5h16v14H4z', 'M8 3.5v4M16 3.5v4M4 9.5h16'],
    },
    {
      title: 'Records and Updates',
      description: 'Portal information is provided to help you follow your care plan, but the clinic may still confirm details directly when needed.',
      tone: 'violet',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-8A2.5 2.5 0 0 1 6 19V6a2.5 2.5 0 0 1 2-2.5Z', 'M14 3.5v5h5', 'M9 12h6M9 16h4'],
    },
    {
      title: 'Appropriate Use',
      description: 'The portal should be used for routine dental coordination and account management, not as a substitute for urgent emergency care.',
      tone: 'amber',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M12 4 20 19H4L12 4Z', 'M12 9v4', 'M12 16h.01'],
    },
  ];

  protected readonly quickLinks = [
    { title: 'Privacy Policy', description: 'Review how your data is protected', route: '/patient-privacy-policy' },
    { title: 'Help Center', description: 'Get support for portal questions', route: '/patient-help-center' },
    { title: 'Manage Appointments', description: 'Open your appointment page', route: '/patient-appointments' },
    { title: 'Contact Clinic', description: 'Ask a question directly', route: '/patient-contact' },
  ];
}
