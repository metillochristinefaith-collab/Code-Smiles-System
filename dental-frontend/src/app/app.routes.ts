import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';
import { guestGuard } from './guards/guest.guard';

// Public
import { PublicHomeComponent } from './public-home/public-home';
import { PublicAboutComponent } from './public-about/public-about';
import { PublicContactComponent } from './public-contact/public-contact';
import { PublicServicesComponent } from './public-services/public-services';

// Auth / General
import { AdminComponent } from './admin/admin';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy';
import { CheckEmailComponent } from './check-email/check-email';
import { VerifyEmailResultComponent } from './verify-email-result/verify-email-result';
import { ResetPasswordComponent } from './reset-password/reset-password';
import { VerifyEmailComponent } from './verify-email/verify-email';

// Patient
import { PatientBookingComponent } from './patient-booking/patient-booking';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard';
import { MyAppointments } from './patient-appointments/patient-appointments';
import { PatientAppointmentDetailsComponent } from './patient-appointments/patient-appointment-details';
import { PatientMedicalVault } from './patient-medical-vault/patient-medical-vault';
import { PatientNotificationsComponent } from './patient-notifications/patient-notifications';
import { PatientMessagesComponent } from './patient-messages/patient-messages';
import { PatientProfileComponent } from './patient-profile/patient-profile';
import { PatientProfileEditComponent } from './patient-profile-edit/patient-profile-edit';
import { PatientChangePasswordComponent } from './patient-change-password/patient-change-password';
import { PatientForgotPasswordComponent } from './patient-forgot-password/patient-forgot-password';
import { PatientAbout } from './patient-about/patient-about';
import { PatientContact } from './patient-contact/patient-contact';
import { PatientServicesComponent } from './patient-services/patient-services';
import { PatientHelpCenter } from './patient-help-center/patient-help-center';
import { PatientPrivacyPolicy } from './patient-privacy-policy/patient-privacy-policy';
import { PatientTerms } from './patient-terms/patient-terms';
import { PatientTreatmentProgress } from './patient-treatment-progress/patient-treatment-progress';

// Staff
import { StaffDashboard } from './staff-dashboard/staff-dashboard';
import { StaffAppointmentsComponent } from './staff-appointments/staff-appointments';
import { StaffAppointmentDetailComponent } from './staff-appointments/staff-appointment-detail';
import { StaffRescheduleComponent } from './staff-appointments/staff-reschedule';
import { StaffPatientsComponent } from './staff-patients/staff-patients';
import { StaffCalendar } from './staff-calendar/staff-calendar';
import { StaffCalendarEditComponent } from './staff-calendar/staff-calendar-edit';
import { StaffCalendarViewComponent } from './staff-calendar/staff-calendar-view';
import { StaffRequestsComponent } from './staff-requests/staff-requests';
import { StaffNotificationsComponent } from './staff-notifications/staff-notifications';
import { StaffProfile } from './staff-profile/staff-profile';
import { StaffHelpCenter } from './staff-help-center/staff-help-center';
import { StaffBookingComponent } from './staff-booking/staff-booking';

// Dentist
import { DentistDashboard } from './dentist-dashboard/dentist-dashboard';
import { DentistCalendarComponent } from './dentist-calendar/dentist-calendar';
import { DentistAppointmentsComponent } from './dentist-appointments/dentist-appointments';
import { DentistPatientsComponent } from './dentist-patients/dentist-patients';
import { DentistMedicalVault } from './dentist-medical-vault/dentist-medical-vault';
import { DentistTreatmentPlansComponent } from './dentist-treatment-plans/dentist-treatment-plans';
import { DentistPrescriptionsComponent } from './dentist-prescriptions/dentist-prescriptions';
import { DentistNotificationsComponent } from './dentist-notifications/dentist-notifications';
import { DentistProfile } from './dentist-profile/dentist-profile';
import { DentistProfileEditComponent } from './dentist-profile-edit/dentist-profile-edit';
import { DentistChangePasswordComponent } from './dentist-change-password/dentist-change-password';
import { DentistHelpCenter } from './dentist-help-center/dentist-help-center';

export const routes: Routes = [
  // ── Public ──────────────────────────────────────────────────────────────
  { path: '', component: PublicHomeComponent },
  { path: 'about', component: PublicAboutComponent },
  { path: 'contact', component: PublicContactComponent },
  { path: 'services', component: PublicServicesComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },

  // ── Auth ─────────────────────────────────────────────────────────────────
  { path: 'login',               component: LoginComponent,           canActivate: [guestGuard] },
  { path: 'register',            component: RegisterComponent,        canActivate: [guestGuard] },
  { path: 'forgot-password',     component: ForgotPasswordComponent,  canActivate: [guestGuard] },
  { path: 'reset-password',      component: ResetPasswordComponent },
  { path: 'check-email',         component: CheckEmailComponent },
  { path: 'verify-email',        component: VerifyEmailComponent },
  { path: 'verify-email-result', component: VerifyEmailResultComponent },

  // ── Admin (dentist role) ─────────────────────────────────────────────────
  { path: 'admin', component: AdminComponent, canActivate: [roleGuard('Admin')] },

  // ── Redirects ────────────────────────────────────────────────────────────
  { path: 'booking',        redirectTo: 'patient-booking',        pathMatch: 'full' },
  { path: 'my-appointments',redirectTo: 'patient-appointments',   pathMatch: 'full' },
  { path: 'profile',        redirectTo: 'patient-profile',        pathMatch: 'full' },
  { path: 'notifications',  redirectTo: 'patient-notifications',  pathMatch: 'full' },
  { path: 'help-center',    redirectTo: 'patient-help-center',    pathMatch: 'full' },

  // ── Patient Portal ───────────────────────────────────────────────────────
  { path: 'patient-booking',           component: PatientBookingComponent,           canActivate: [roleGuard('Patient')] },
  { path: 'patient-dashboard',         component: PatientDashboardComponent,         canActivate: [roleGuard('Patient')] },
  { path: 'patient-appointments',      component: MyAppointments,                    canActivate: [roleGuard('Patient')] },
  { path: 'patient-appointments/:id',  component: PatientAppointmentDetailsComponent,canActivate: [roleGuard('Patient')] },
  { path: 'patient-medical-vault',     component: PatientMedicalVault,               canActivate: [roleGuard('Patient')] },
  { path: 'patient-notifications',     component: PatientNotificationsComponent,     canActivate: [roleGuard('Patient')] },
  { path: 'patient-messages',          component: PatientMessagesComponent,          canActivate: [roleGuard('Patient')] },
  { path: 'patient-profile',           component: PatientProfileComponent,           canActivate: [roleGuard('Patient')] },
  { path: 'patient-profile/edit',      component: PatientProfileEditComponent,       canActivate: [roleGuard('Patient')] },
  { path: 'patient-profile/change-password', component: PatientChangePasswordComponent, canActivate: [roleGuard('Patient')] },
  { path: 'patient-profile/forgot-password', component: PatientForgotPasswordComponent, canActivate: [roleGuard('Patient')] },
  { path: 'patient-about',             component: PatientAbout,                      canActivate: [roleGuard('Patient')] },
  { path: 'patient-contact',           component: PatientContact,                    canActivate: [roleGuard('Patient')] },
  { path: 'patient-services',          component: PatientServicesComponent,          canActivate: [roleGuard('Patient')] },
  { path: 'patient-help-center',       component: PatientHelpCenter,                 canActivate: [roleGuard('Patient')] },
  { path: 'patient-privacy-policy',    component: PatientPrivacyPolicy,              canActivate: [roleGuard('Patient')] },
  { path: 'patient-terms',             component: PatientTerms,                      canActivate: [roleGuard('Patient')] },
  { path: 'patient-treatment-progress',component: PatientTreatmentProgress,          canActivate: [roleGuard('Patient')] },
  {
    path: 'patient-treatment-plan/:id',
    canActivate: [roleGuard('Patient')],
    loadComponent: () =>
      import('./patient-treatment-plan/patient-treatment-plan').then((m) => m.PatientTreatmentPlan),
  },

  // ── Staff Portal ─────────────────────────────────────────────────────────
  { path: 'staff-dashboard',              component: StaffDashboard,                canActivate: [roleGuard('Staff')] },
  { path: 'staff-appointments',           component: StaffAppointmentsComponent,    canActivate: [roleGuard('Staff')] },
  { path: 'staff-appointments/:id',       component: StaffAppointmentDetailComponent, canActivate: [roleGuard('Staff')] },
  { path: 'staff-appointments/:id/reschedule', component: StaffRescheduleComponent, canActivate: [roleGuard('Staff')] },
  { path: 'staff-patients',               component: StaffPatientsComponent,        canActivate: [roleGuard('Staff')] },
  { path: 'staff-calendar',               component: StaffCalendar,                 canActivate: [roleGuard('Staff')] },
  { path: 'staff-calendar/edit/:id',      component: StaffCalendarEditComponent,    canActivate: [roleGuard('Staff')] },
  { path: 'staff-calendar/view/:id',      component: StaffCalendarViewComponent,    canActivate: [roleGuard('Staff')] },
  { path: 'staff-requests',               component: StaffRequestsComponent,        canActivate: [roleGuard('Staff')] },
  { path: 'staff-notifications',          component: StaffNotificationsComponent,   canActivate: [roleGuard('Staff')] },
  { path: 'staff-profile',                component: StaffProfile,                  canActivate: [roleGuard('Staff')] },
  { path: 'staff-help-center',            component: StaffHelpCenter,               canActivate: [roleGuard('Staff')] },
  { path: 'staff-booking',               component: StaffBookingComponent,          canActivate: [roleGuard('Staff')] },

  // ── Dentist Portal ───────────────────────────────────────────────────────
  { path: 'dentist-dashboard',        component: DentistDashboard,              canActivate: [roleGuard('Admin')] },
  { path: 'dentist-appointments',     component: DentistAppointmentsComponent,  canActivate: [roleGuard('Admin')] },
  { path: 'dentist-schedule',         component: DentistCalendarComponent,      canActivate: [roleGuard('Admin')] },
  { path: 'dentist-calendar',         component: DentistCalendarComponent,      canActivate: [roleGuard('Admin')] },
  { path: 'dentist-patients',         component: DentistPatientsComponent,      canActivate: [roleGuard('Admin')] },
  { path: 'dentist-medical-vault',    component: DentistMedicalVault,           canActivate: [roleGuard('Admin')] },
  { path: 'dentist-treatment-plans',  component: DentistTreatmentPlansComponent,canActivate: [roleGuard('Admin')] },
  { path: 'dentist-prescriptions',    component: DentistPrescriptionsComponent, canActivate: [roleGuard('Admin')] },
  { path: 'dentist-notifications',    component: DentistNotificationsComponent, canActivate: [roleGuard('Admin')] },
  { path: 'dentist-profile',          component: DentistProfile,                canActivate: [roleGuard('Admin')] },
  { path: 'dentist-profile/edit',     component: DentistProfileEditComponent,   canActivate: [roleGuard('Admin')] },
  { path: 'dentist-profile/change-password', component: DentistChangePasswordComponent, canActivate: [roleGuard('Admin')] },
  { path: 'dentist-help-center',      component: DentistHelpCenter,             canActivate: [roleGuard('Admin')] },

  // ── Fallback ─────────────────────────────────────────────────────────────
  { path: '**', redirectTo: '' },
];
