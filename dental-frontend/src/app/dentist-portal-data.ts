export interface DentistInfo {
  fullName: string;
  email: string;
  specialty: string;
  categories: string[];
  services: string[];
}

export const DENTIST_ROSTER: DentistInfo[] = [
  {
    fullName: 'Dr. Raphoncel Eduria',
    email: 'eduria@codesmiles.com',
    specialty: 'General Dentistry, Oral Surgery',
    categories: ['General Dentistry', 'Oral Surgery'],
    services: [
      'Oral Consultation', 'Dental Cleaning', 'Digital X-Rays',
      'Tooth Fillings', 'Fluoride Treatment', 'Dental Sealants',
      'Simple Tooth Extraction', 'Emergency Dental Care',
      'Surgical Tooth Extraction', 'Wisdom Tooth Removal',
      'Cyst Removal', 'Minor Oral Surgery', 'Frenectomy',
    ],
  },
  {
    fullName: 'Dr. Christine Faith Metillo',
    email: 'metillo@codesmiles.com',
    specialty: 'Orthodontics, Dental Implants',
    categories: ['Orthodontics', 'Dental Implants'],
    services: [
      'Traditional Braces', 'Ceramic Braces', 'Self-Ligating Braces',
      'Clear Aligners', 'Retainers', 'Orthodontic Consultation',
      'Implant Consultation', 'Single Tooth Implant', 'Multiple Tooth Implant',
      'Implant Crown Placement', 'Implant Maintenance',
    ],
  },
  {
    fullName: 'Dr. Nico Bongolto',
    email: 'bongolto@codesmiles.com',
    specialty: 'Pediatric Care',
    categories: ['Pediatric Care'],
    services: [
      'Pediatric Check-up', 'Pediatric Cleaning', 'Fluoride for Kids',
      'Dental Sealants', 'Baby Tooth Extraction', 'Space Maintainers',
    ],
  },
  {
    fullName: 'Dr. Derence Acojedo',
    email: 'acojedo@codesmiles.com',
    specialty: 'Cosmetic Arts',
    categories: ['Cosmetic Arts'],
    services: [
      'Teeth Whitening', 'Dental Veneers', 'Dental Bonding',
      'Smile Makeover', 'Tooth Contouring', 'Gum Contouring',
    ],
  },
];

export function getDentistInfo(email: string): DentistInfo | undefined {
  const normalized = (email || '').trim().toLowerCase();
  return DENTIST_ROSTER.find((dentist) => dentist.email.toLowerCase() === normalized);
}

/** Canonical display name for API queries — matches roster / DB after staff approval */
export function getDentistDisplayName(user: {
  email?: string;
  first_name?: string;
  last_name?: string;
} | null | undefined): string {
  if (!user) return '';
  const roster = getDentistInfo(user.email ?? '');
  if (roster?.fullName) return roster.fullName;
  if (user.first_name && user.last_name) return `Dr. ${user.first_name} ${user.last_name}`;
  return '';
}
