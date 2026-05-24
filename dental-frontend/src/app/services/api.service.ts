import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── USER PROFILE & AVATAR ───────────────────────────────────────────────────
  getUserProfile(userId: number): Observable<any> {
    return this.http.get(`${this.base}/user/profile/${userId}`, { headers: this.authHeaders() });
  }

  updateUserProfile(userId: number, data: { first_name?: string; last_name?: string; phone?: string }): Observable<any> {
    return this.http.put(`${this.base}/user/profile/${userId}`, data, { headers: this.authHeaders() });
  }

  changePassword(userId: number, current_password: string, new_password: string): Observable<any> {
    return this.http.put(`${this.base}/user/change-password/${userId}`,
      { current_password, new_password }, { headers: this.authHeaders() });
  }

  updateAvatar(userId: number, avatar_url: string): Observable<any> {
    return this.http.put(`${this.base}/user/avatar/${userId}`, { avatar_url }, { headers: this.authHeaders() });
  }

  getPatientVaultRecords(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patient-vault-records/${patientId}`, { headers: this.authHeaders() });
  }

  createPatientVaultRecord(data: {
    title: string;
    description: string;
    record_type: string;
    category: string;
    file_name: string;
    file_size: string;
    preview_kind: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/patient-vault-records`, data, { headers: this.authHeaders() });
  }

  shareVaultRecord(recordId: number, dentist_name: string): Observable<any> {
    return this.http.post(`${this.base}/patient-vault-records/${recordId}/share`,
      { dentist_name }, { headers: this.authHeaders() });
  }

  revokeVaultRecordShare(recordId: number, dentist_name: string): Observable<any> {
    return this.http.post(`${this.base}/patient-vault-records/${recordId}/revoke-share`,
      { dentist_name }, { headers: this.authHeaders() });
  }

  getDentistVaultRecords(dentistId?: number): Observable<any[]> {
    const url = dentistId 
      ? `${this.base}/dentist/vault-records?dentistId=${dentistId}`
      : `${this.base}/dentist/vault-records`;
    return this.http.get<any[]>(url, { headers: this.authHeaders() });
  }

  // ── AUTH ────────────────────────────────────────────────────────────────────
  login(email: string, password: string, role: string): Observable<any> {
    return this.http.post(`${this.base}/auth/login`, { email, password, role });
  }

  register(data: {
    first_name: string; last_name: string;
    email: string; phone: string; password: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/auth/register`, data);
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.base}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.base}/auth/forgot-password`, { email });
  }

  validateResetToken(token: string): Observable<any> {
    return this.http.get(`${this.base}/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
  }

  resetPassword(token: string, new_password: string): Observable<any> {
    return this.http.post(`${this.base}/auth/reset-password`, { token, new_password });
  }

  // ── ADMIN: Staff/Dentist account management ─────────────────────────────────
  createStaffAccount(data: { first_name: string; last_name: string; email: string; phone?: string; role: string; password: string }): Observable<any> {
    return this.http.post(`${this.base}/admin/create-account`, data, { headers: this.authHeaders() });
  }

  getStaffAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/staff-accounts`, { headers: this.authHeaders() });
  }

  googleLogin(credential: string): Observable<any> {
    return this.http.post(`${this.base}/auth/google`, { credential });
  }

  // ── DASHBOARD STATS (GET — no auth needed) ─────────────────────────────────
  getStaffDashboardStats(): Observable<any> {
    return this.http.get(`${this.base}/staff/dashboard-stats`);
  }

  getDentistDashboardStats(dentistName: string): Observable<any> {
    return this.http.get(`${this.base}/dentist/dashboard-stats?dentist=${encodeURIComponent(dentistName)}`);
  }

  getPatientDashboardStats(patientId: number): Observable<any> {
    return this.http.get(`${this.base}/patient/dashboard-stats/${patientId}`);
  }

  // ── PATIENTS (GET — no auth needed) ────────────────────────────────────────
  getPatients(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/list-patients`, { headers: this.authHeaders() });
  }

  /** Patients enriched with profile data (gender, DOB, address) and
   *  appointment summary (last visit, next appointment). */
  getPatientsEnriched(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/staff/patients-enriched`, { headers: this.authHeaders() });
  }

  addPatient(data: { first_name: string; last_name: string; phone: string }): Observable<any> {
    return this.http.post(`${this.base}/add-patient`, data, {
      headers: this.authHeaders(),
      responseType: 'text',
    });
  }

  updatePatient(id: number, data: { first_name: string; last_name: string; phone?: string; gender?: string; home_address?: string }): Observable<any> {
    return this.http.put(`${this.base}/update-patient/${id}`, data, { headers: this.authHeaders() });
  }

  deletePatient(id: number): Observable<any> {
    return this.http.delete(`${this.base}/delete-patient/${id}`, {
      headers: this.authHeaders(),
      responseType: 'text',
    });
  }

  // ── APPOINTMENTS (patient) ──────────────────────────────────────────────────
  bookAppointment(data: {
    patient_id:       number | null;
    full_name:        string;
    phone:            string;
    email:            string;
    treatment:        string;
    services:         string[];
    appointment_date: string;
    appointment_time: string;
    duration_minutes: number;
    notes:            string;
    booking_type?:    string;
  }): Observable<any> {
    return this.http.post(`${this.base}/add-appointment`, data);
  }

  // ── UNIFIED BOOKING (single or multiple services) ────────────────────────────
  createUnifiedBooking(data: {
    full_name: string;
    email: string;
    phone: string;
    treatment?: string;
    services?: Array<{ name: string; duration?: number }>;
    appointments?: Array<{ date: string; time: string }>;
    appointment_date?: string;
    appointment_time?: string;
    duration_minutes?: number;
    booking_type?: string;
    notes?: string;
    patient_id?: number | null;
  }): Observable<any> {
    return this.http.post(`${this.base}/api/bookings/create`, data);
  }

  // ── COMPOSITE BOOKING (multi-service) ────────────────────────────────────────
  createCompositeBooking(data: {
    services: Array<{ name: string; category: string; duration: number }>;
    appointments: Array<{ date: string; time: string }>;
    patientDetails: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      age: string;
      notes: string;
    };
    bookingType: string;
    intakePriority: string;
    intakeSource: string;
  }, userId?: number | null): Observable<any> {
    const payload = {
      ...data,
      userId: userId || null
    };
    return this.http.post(`${this.base}/api/composite-booking/create`, payload);
  }

  getMyAppointments(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/my-appointments/${patientId}`);
  }

  cancelMyAppointment(id: number, reason: string): Observable<any> {
    return this.http.put(`${this.base}/appointments/${id}/cancel`, { reason }, {
      headers: this.authHeaders(),
    });
  }

  requestRescheduleByPatient(id: number, preferred_date: string, preferred_time: string, reason: string): Observable<any> {
    return this.http.put(`${this.base}/appointments/${id}/request-reschedule`,
      { preferred_date, preferred_time, reason }, { headers: this.authHeaders() });
  }

  confirmAttendance(id: number): Observable<any> {
    return this.http.put(`${this.base}/appointments/${id}/confirm`, {},
      { headers: this.authHeaders() });
  }

  confirmRescheduleFromReminder(id: number): Observable<any> {
    return this.http.put(`${this.base}/appointments/${id}/confirm-reschedule`, {},
      { headers: this.authHeaders() });
  }

  getPatientReliability(patientId: number): Observable<any> {
    return this.http.get(`${this.base}/patient/reliability/${patientId}`);
  }

  getStaffPatientReliability(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/staff/patient-reliability`);
  }

  cancelByDentist(id: number, reason: string): Observable<any> {
    return this.http.put(`${this.base}/dentist/appointments/${id}/cancel`,
      { reason }, { headers: this.authHeaders() });
  }

  requestRescheduleByDentist(id: number, preferred_date: string, preferred_time: string, reason: string): Observable<any> {
    return this.http.put(`${this.base}/dentist/appointments/${id}/request-reschedule`,
      { preferred_date, preferred_time, reason }, { headers: this.authHeaders() });
  }

  markNoShow(id: number): Observable<any> {
    return this.http.put(`${this.base}/dentist/appointments/${id}/no-show`, {},
      { headers: this.authHeaders() });
  }

  checkAvailability(date: string): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/check-availability/${date}`);
  }

  getAvailableTimes(date: string, service: string): Observable<any> {
    return this.http.get(`${this.base}/api/scheduling/available-times?date=${encodeURIComponent(date)}&service=${encodeURIComponent(service)}`);
  }

  getAvailableTimesForDentist(date: string, dentistId: string, service: string): Observable<any> {
    return this.http.get(`${this.base}/api/scheduling/available-times?date=${encodeURIComponent(date)}&dentist_id=${dentistId}&service=${encodeURIComponent(service)}`);
  }

  // ── APPOINTMENTS (staff) ────────────────────────────────────────────────────
  getStaffAppointments(status?: string): Observable<any[]> {
    const url = status
      ? `${this.base}/staff/appointments?status=${status}`
      : `${this.base}/staff/appointments`;
    return this.http.get<any[]>(url);
  }

  getStaffAppointmentById(id: number): Observable<any> {
    return this.http.get(`${this.base}/staff/appointments/${id}`);
  }

  // Write operations keep auth
  approveAppointment(id: number, dentist_name: string, notes?: string): Observable<any> {
    return this.http.put(`${this.base}/staff/appointments/${id}/approve`,
      { dentist_name, notes }, { headers: this.authHeaders() });
  }

  cancelAppointment(id: number, reason: string): Observable<any> {
    return this.http.put(`${this.base}/staff/appointments/${id}/cancel`,
      { reason }, { headers: this.authHeaders() });
  }

  rescheduleAppointment(id: number, appointment_date: string, appointment_time: string, reason: string): Observable<any> {
    return this.http.put(`${this.base}/staff/appointments/${id}/reschedule`,
      { appointment_date, appointment_time, reason }, { headers: this.authHeaders() });
  }

  // ── APPOINTMENTS (dentist) ─────────────────────────────────────────────────
  getDentistAppointments(dentistName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/appointments?dentist=${encodeURIComponent(dentistName)}`);
  }

  updateAppointmentStatus(id: number, status: string, notes?: string): Observable<any> {
    return this.http.put(`${this.base}/staff/appointments/${id}/status`,
      { status, notes }, { headers: this.authHeaders() });
  }

  // ── DENTIST PORTAL (GET — no auth needed) ───────────────────────────────────
  getDentistPatients(dentistName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/patients?dentist=${encodeURIComponent(dentistName)}`);
  }

  getDentistPatientHistory(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/patients/${patientId}/history`);
  }

  getDentistPrescriptions(dentistName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/prescriptions?dentist=${encodeURIComponent(dentistName)}`);
  }

  createDentistPrescription(data: any): Observable<any> {
    return this.http.post(`${this.base}/dentist/prescriptions`, data, { headers: this.authHeaders() });
  }

  updatePrescriptionStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.base}/dentist/prescriptions/${id}/status`, { status }, { headers: this.authHeaders() });
  }

  getDentistTreatmentPlans(dentistName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/treatment-plans?dentist=${encodeURIComponent(dentistName)}`);
  }

  getDentistNotifications(dentistName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/dentist/notifications?dentist=${encodeURIComponent(dentistName)}`);
  }

  // ── STAFF NOTIFICATIONS (GET — no auth needed) ───────────────────────────────
  getStaffNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/staff/notifications`);
  }

  // ── CALENDAR (GET — no auth needed) ──────────────────────────────────────────
  getCalendarAppointments(startDate: string, endDate: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/staff/calendar?startDate=${startDate}&endDate=${endDate}`);
  }

  getDentistCalendarAppointments(dentistName: string, startDate: string, endDate: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.base}/dentist/calendar?dentist=${encodeURIComponent(dentistName)}&startDate=${startDate}&endDate=${endDate}`
    );
  }

  // ── PATIENT PROFILE (DB) ────────────────────────────────────────────────────
  getPatientProfile(userId: number): Observable<any> {
    return this.http.get(`${this.base}/patient-profile/${userId}`, { headers: this.authHeaders() });
  }

  updatePatientProfile(userId: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/patient-profile/${userId}`, data, {
      headers: this.authHeaders(),
    });
  }

  // ── HELP CENTER ─────────────────────────────────────────────────────────────
  getFaqs(role?: string, category?: string): Observable<any[]> {
    let url = `${this.base}/faqs`;
    const params: string[] = [];
    if (role)     params.push(`role=${encodeURIComponent(role)}`);
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (params.length) url += '?' + params.join('&');
    return this.http.get<any[]>(url);
  }

  submitSupportRequest(data: {
    user_id?: number | null;
    user_name?: string;
    user_email?: string;
    user_role?: string;
    subject: string;
    message: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/support-request`, data);
  }

  getSupportRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/support-requests`);
  }

  updateSupportRequestStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.base}/support-requests/${id}/status`, { status }, {
      headers: this.authHeaders(),
    });
  }
  getAppointments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/list-appointments`);
  }

  updateAppointment(id: number, data: any): Observable<any> {
    return this.http.put(`${this.base}/update-appointment/${id}`, data, { responseType: 'text' });
  }

  deleteAppointment(id: number): Observable<any> {
    return this.http.delete(`${this.base}/delete-appointment/${id}`, { responseType: 'text' });
  }

  // ── NOTIFICATIONS (GET — no auth needed) ────────────────────────────────────
  getNotifications(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/notifications/${userId}`, { headers: this.authHeaders() });
  }

  markNotificationRead(id: number): Observable<any> {
    return this.http.put(`${this.base}/notifications/${id}/read`, {}, {
      headers: this.authHeaders(),
    });
  }
}
