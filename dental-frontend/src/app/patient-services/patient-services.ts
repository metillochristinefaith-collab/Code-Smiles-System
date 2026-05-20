import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';

@Component({
  selector: 'app-patient-service',
  standalone: true,
  imports: [CommonModule, RouterLink, PatientSidebarComponent],
  templateUrl: './patient-services.html',
  styleUrl: './patient-services.css',
})
export class PatientServicesComponent {
  allServices = [
    {
      id: '01',
      title: 'General Dentistry',
      desc: 'Comprehensive preventative care designed to protect your natural smile for a lifetime.',
      img: 'general.png',
      subServices: [
        'Oral Consultation / Check-up',
        'Dental Cleaning',
        'Digital X-Rays',
        'Tooth Fillings',
        'Fluoride Treatment',
        'Dental Sealants',
        'Simple Tooth Extraction',
        'Emergency Dental Care'
      ]
    },
    {
      id: '02',
      title: 'Cosmetic Arts',
      desc: 'Master-level aesthetic treatments combining artistry and precision for your perfect smile.',
      img: 'cosmetics_art.png',
      subServices: [
        'Teeth Whitening',
        'Dental Veneers',
        'Dental Bonding',
        'Smile Makeover',
        'Tooth Contouring',
        'Gum Contouring'
      ]
    },
    {
      id: '03',
      title: 'Orthodontics',
      desc: 'Advanced alignment technology offering discreet and efficient solutions for all ages.',
      img: 'ortho.jpg',
      subServices: [
        'Traditional Braces',
        'Ceramic Braces',
        'Self-Ligating Braces',
        'Clear Aligners',
        'Retainers',
        'Orthodontic Consultation'
      ]
    },
    {
      id: '04',
      title: 'Oral Surgery',
      desc: 'Specialist surgical care focused on patient comfort and optimal recovery outcomes.',
      img: 'oral_surgery.jpg',
      subServices: [
        'Surgical Tooth Extraction',
        'Wisdom Tooth Removal',
        'Cyst Removal',
        'Minor Oral Surgery',
        'Frenectomy'
      ]
    },
    {
      id: '05',
      title: 'Dental Implants',
      desc: 'State-of-the-art restorative solutions that look, feel, and function like natural teeth.',
      img: 'implants.jpg',
      subServices: [
        'Implant Consultation',
        'Single Tooth Implant',
        'Multiple Tooth Implant',
        'Implant Crown Placement',
        'Implant Maintenance'
      ]
    },
    {
      id: '06',
      title: 'Pediatric Care',
      desc: 'A gentle, fun-filled approach to dentistry to build a lifetime of oral health.',
      img: 'pediatic.jpg',
      subServices: [
        'Pediatric Check-up',
        'Pediatric Cleaning',
        'Fluoride for Kids',
        'Dental Sealants',
        'Baby Tooth Extraction',
        'Space Maintainers'
      ]
    }
  ];

}
