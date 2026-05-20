import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-patient-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-privacy-policy.html',
  styleUrl: './patient-privacy-policy.css',
})
export class PatientPrivacyPolicy {
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
      title: 'Your Privacy Is Our Priority',
      description: 'We follow strict security practices to keep your health information safe and secure.',
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M12 4 19 7.5v4.8c0 4.1-2.7 7.6-7 8.7-4.3-1.1-7-4.6-7-8.7V7.5Z'],
    },
    {
      title: 'HIPAA Compliant',
      description: 'Code Smiles adheres to HIPAA regulations to protect your protected health information.',
      tone: 'mint',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M8 11V8a4 4 0 1 1 8 0v3', 'M6.5 11.5h11A1.5 1.5 0 0 1 19 13v6A1.5 1.5 0 0 1 17.5 20.5h-11A1.5 1.5 0 0 1 5 19v-6A1.5 1.5 0 0 1 6.5 11.5Z'],
    },
    {
      title: 'Transparent & Trustworthy',
      description: 'We believe in being clear about how we collect, use, and protect your data.',
      tone: 'violet',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M15 3v4h4', 'M9 12h6'],
    },
  ];

  protected readonly policyPoints = [
    {
      title: 'Information We Collect',
      description: 'We collect personal information you provide, health records, appointment details, insurance information, and communication preferences.',
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M5 7.5C5 6.1 8.1 5 12 5s7 1.1 7 2.5S15.9 10 12 10 5 8.9 5 7.5Z', 'M5 7.5v4C5 12.9 8.1 14 12 14s7-1.1 7-2.5v-4', 'M5 11.5v4C5 16.9 8.1 18 12 18s7-1.1 7-2.5v-4'],
    },
    {
      title: 'How We Use Your Information',
      description: 'We use your information to provide dental care services, manage appointments, communicate with you, process insurance, and improve your experience.',
      tone: 'mint',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M12 4 19 7.5v4.8c0 4.1-2.7 7.6-7 8.7-4.3-1.1-7-4.6-7-8.7V7.5Z', 'M12 9v5', 'M9.5 11.5h5'],
    },
    {
      title: 'How We Protect Your Information',
      description: 'We use industry-standard security measures, encryption, and secure systems to protect your data from unauthorized access, disclosure, or misuse.',
      tone: 'violet',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M8 11V8a4 4 0 1 1 8 0v3', 'M6.5 11.5h11A1.5 1.5 0 0 1 19 13v6A1.5 1.5 0 0 1 17.5 20.5h-11A1.5 1.5 0 0 1 5 19v-6A1.5 1.5 0 0 1 6.5 11.5Z'],
    },
    {
      title: 'Your Rights',
      description: 'You can access, update, or request deletion of your personal information at any time. Contact us if you have questions or need assistance.',
      tone: 'amber',
      iconViewBox: '0 0 24 24',
      iconPaths: ['M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Z', 'M5.5 19.5a6.8 6.8 0 0 1 13 0'],
    },
  ];

  protected readonly quickLinks = [
    { title: 'HIPAA Notice of Privacy Practices', description: 'View our HIPAA Summary', route: '/patient-privacy-policy' },
    { title: 'Data Security Measures', description: 'Learn how we keep your data safe', route: '/patient-privacy-policy' },
    { title: 'Your Privacy Rights', description: 'Understand your rights and choices', route: '/patient-help-center' },
    { title: 'Contact Privacy Officer', description: 'privacy@codesmiles.com', route: '/patient-contact' },
  ];
}
