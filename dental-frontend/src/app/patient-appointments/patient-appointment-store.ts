import { Injectable } from '@angular/core';

export type AppointmentTab = 'upcoming' | 'pending' | 'past';

export type PatientAppointmentStatus =
  | 'Approved'
  | 'Pending Approval'
  | 'Completed'
  | 'Cancelled';

export interface PatientAppointmentActionLog {
  label: string;
  value: string;
}

export interface PatientAppointment {
  id: string;
  service: string;
  category: string;
  dentist: string;
  location: string;
  dateMonth: string;
  dateDay: string;
  weekday: string;
  accent?: 'blue' | 'amber' | 'violet' | 'teal';
  time: string;
  status: PatientAppointmentStatus;
  tab: AppointmentTab;
  description: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAge: string;
  notes: string;
  bookedOn: string;
  durationLabel: string;
  servicesSummary: string[];
  requestedChanges?: string[];
  history: PatientAppointmentActionLog[];
}

interface CreateAppointmentInput {
  service: string;
  category: string;
  time: string;
  date: string;
  durationMinutes: number;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAge: string;
  notes: string;
  servicesSummary: string[];
}

const STORAGE_KEY = 'patient-appointments-store';
const DEMO_APPOINTMENT_IDS = new Set<string>();

@Injectable({
  providedIn: 'root',
})
export class PatientAppointmentStore {
  private appointments: PatientAppointment[] = this.loadAppointments();

  getAppointments(): PatientAppointment[] {
    return [...this.appointments].sort((left, right) => {
      const leftWeight = this.statusWeight(left.status);
      const rightWeight = this.statusWeight(right.status);

      if (leftWeight !== rightWeight) {
        return leftWeight - rightWeight;
      }

      return left.bookedOn < right.bookedOn ? 1 : -1;
    });
  }

  getAppointmentById(id: string | null): PatientAppointment | null {
    if (!id) {
      return null;
    }

    return this.appointments.find((appointment) => appointment.id === id) ?? null;
  }

  createAppointment(input: CreateAppointmentInput): PatientAppointment {
    const dateObject = new Date(`${input.date}T00:00:00`);
    const createdAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const appointment: PatientAppointment = {
      id: `APT-${Date.now().toString().slice(-6)}`,
      service: input.servicesSummary[0] ?? input.service,
      category: input.category,
      dentist: 'Dentist assignment pending',
      location: 'Code Smiles Dental Clinic',
      dateMonth: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObject).toUpperCase(),
      dateDay: new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(dateObject),
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObject).toUpperCase(),
      accent: 'blue',
      time: input.time,
      status: 'Pending Approval',
      tab: 'pending',
      description: `${input.servicesSummary.length} selected service(s) for review by the clinic team.`,
      patientName: input.patientName,
      patientEmail: input.patientEmail,
      patientPhone: input.patientPhone,
      patientAge: input.patientAge,
      notes: input.notes,
      bookedOn: createdAt,
      durationLabel: `${input.durationMinutes} minutes`,
      servicesSummary: input.servicesSummary,
      history: [
        {
          label: 'Request submitted',
          value: createdAt,
        },
        {
          label: 'Requested date',
          value: `${this.formatDateLong(input.date)} at ${input.time}`,
        },
      ],
    };

    this.appointments = [appointment, ...this.appointments];
    this.persist();
    return appointment;
  }

  rescheduleAppointment(
    id: string,
    nextDate: string,
    nextTime: string,
    servicesSummary: string[],
    durationMinutes: number,
  ): PatientAppointment | null {
    const appointment = this.getAppointmentById(id);

    if (!appointment) {
      return null;
    }

    const dateObject = new Date(`${nextDate}T00:00:00`);
    const updatedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    appointment.dateMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(dateObject).toUpperCase();
    appointment.dateDay = new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(dateObject);
    appointment.weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(dateObject).toUpperCase();
    appointment.time = nextTime;
    appointment.status = 'Pending Approval';
    appointment.tab = 'pending';
    appointment.durationLabel = `${durationMinutes} minutes`;
    appointment.servicesSummary = [...servicesSummary];
    appointment.service = servicesSummary[0] ?? appointment.service;
    appointment.description = 'Reschedule request sent to the clinic for confirmation.';
    appointment.requestedChanges = [`${this.formatDateLong(nextDate)} at ${nextTime}`];
    appointment.history = [
      {
        label: 'Reschedule requested',
        value: updatedAt,
      },
      {
        label: 'Requested new schedule',
        value: `${this.formatDateLong(nextDate)} at ${nextTime}`,
      },
      ...appointment.history,
    ];

    this.persist();
    return appointment;
  }

  cancelAppointment(id: string): PatientAppointment | null {
    const appointment = this.getAppointmentById(id);

    if (!appointment) {
      return null;
    }

    const updatedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    appointment.status = 'Cancelled';
    appointment.tab = 'past';
    appointment.description = 'Cancelled by the patient. Contact the clinic if you need help rebooking.';
    appointment.history = [
      {
        label: 'Cancelled',
        value: updatedAt,
      },
      ...appointment.history,
    ];

    this.persist();
    return appointment;
  }

  private loadAppointments(): PatientAppointment[] {
    const defaults = this.defaultAppointments();

    if (typeof localStorage === 'undefined') {
      return defaults;
    }

    const storedValue = localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }

    try {
      const storedAppointments = JSON.parse(storedValue) as PatientAppointment[];
      const customAppointments = storedAppointments.filter(
        (appointment) => !DEMO_APPOINTMENT_IDS.has(appointment.id),
      );
      const mergedAppointments = [...customAppointments, ...defaults];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedAppointments));
      return mergedAppointments;
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appointments));
  }

  private formatDateLong(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  }

  private statusWeight(status: PatientAppointmentStatus): number {
    if (status === 'Approved') {
      return 0;
    }

    if (status === 'Pending Approval') {
      return 1;
    }

    return 2;
  }

  private defaultAppointments(): PatientAppointment[] {
    return [];
  }
}
