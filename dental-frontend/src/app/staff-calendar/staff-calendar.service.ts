import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Schedule {
  id: string;
  patientName: string;
  staffName: string;
  date: string;
  time: string;
  type: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes: string;
}

@Injectable({
  providedIn: 'root',
})
export class StaffCalendarService {
  private schedules$ = new BehaviorSubject<Schedule[]>([]);

  constructor() {}

  getSchedules(): Observable<Schedule[]> {
    return this.schedules$.asObservable();
  }

  getScheduleById(id: string): Schedule | undefined {
    return this.schedules$.value.find((s) => s.id === id);
  }

  addSchedule(schedule: Omit<Schedule, 'id'>): Schedule {
    const newSchedule: Schedule = {
      ...schedule,
      id: `SCH-${Date.now()}`,
    };
    this.schedules$.next([...this.schedules$.value, newSchedule]);
    return newSchedule;
  }

  updateSchedule(id: string, updates: Partial<Schedule>): Schedule | undefined {
    const schedules = this.schedules$.value;
    const index = schedules.findIndex((s) => s.id === id);
    if (index !== -1) {
      schedules[index] = { ...schedules[index], ...updates };
      this.schedules$.next([...schedules]);
      return schedules[index];
    }
    return undefined;
  }

  deleteSchedule(id: string): boolean {
    const schedules = this.schedules$.value;
    const filtered = schedules.filter((s) => s.id !== id);
    if (filtered.length < schedules.length) {
      this.schedules$.next(filtered);
      return true;
    }
    return false;
  }

  getSchedulesByDate(date: string): Observable<Schedule[]> {
    return new Observable((observer) => {
      const filtered = this.schedules$.value.filter((s) => s.date === date);
      observer.next(filtered);
    });
  }

  getSchedulesByDateRange(startDate: Date, endDate: Date): Observable<Schedule[]> {
    return new Observable((observer) => {
      const filtered = this.schedules$.value.filter((s) => {
        const scheduleDate = new Date(s.date);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      observer.next(filtered);
      observer.complete();
    });
  }
}
