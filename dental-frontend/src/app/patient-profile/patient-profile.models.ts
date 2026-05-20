export interface PatientProfile {
  fullName: string;
  patientId: string;
  memberSince: string;
  status: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  preferredLanguage: string;
  phoneNumber: string;
  email: string;
  homeAddress: string;
  preferredContactMethod: string;
  primaryDentist: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    announcements: boolean;
  };
}

export type NotificationKey = keyof PatientProfile['notifications'];
