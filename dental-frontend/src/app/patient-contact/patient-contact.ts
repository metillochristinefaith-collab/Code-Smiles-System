import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';

@Component({
  selector: 'app-patient-contact',
  standalone: true,
  imports: [CommonModule, PatientSidebarComponent],
  templateUrl: './patient-contact.html',
  styleUrl: './patient-contact.css',
})
export class PatientContact {
}
