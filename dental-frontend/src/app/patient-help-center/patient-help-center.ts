import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

export type HelpTab = 'faqs' | 'contact' | 'privacy' | 'terms';

interface Faq { id: number; question: string; answer: string; category: string; }

@Component({
  selector: 'app-patient-help-center',
  standalone: true,
  imports: [CommonModule, FormsModule, PatientSidebarComponent],
  templateUrl: './patient-help-center.html',
  styleUrl: './patient-help-center.css',
})
export class PatientHelpCenter implements OnInit {

  activeTab: HelpTab = 'faqs';

  // ── FAQ ────────────────────────────────────────────────────────────────────
  faqs: Faq[] = [];
  isLoadingFaqs = true;
  faqError = '';
  searchQuery = '';
  activeCategory = 'All';
  openFaqId: number | null = null;

  // ── Contact form ───────────────────────────────────────────────────────────
  contactSubject = '';
  contactMessage = '';
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Read fragment from URL to set active tab
    // e.g. /patient-help-center#privacy → privacy tab
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'privacy' || fragment === 'privacy-policy') {
        this.activeTab = 'privacy';
      } else if (fragment === 'terms' || fragment === 'terms-of-use') {
        this.activeTab = 'terms';
      } else if (fragment === 'contact') {
        this.activeTab = 'contact';
      } else {
        this.activeTab = 'faqs';
      }
    });

    this.loadFaqs();
  }

  setTab(tab: HelpTab): void {
    this.activeTab = tab;
    this.router.navigate([], { fragment: tab, replaceUrl: true });
    // Reset FAQ state when switching back
    if (tab === 'faqs') {
      this.searchQuery = '';
      this.activeCategory = 'All';
      this.openFaqId = null;
    }
    // Reset contact form when switching away
    if (tab !== 'contact') {
      this.submitSuccess = false;
      this.submitError = '';
    }
  }

  // ── FAQ ────────────────────────────────────────────────────────────────────
  loadFaqs(): void {
    this.isLoadingFaqs = true;
    this.faqError = '';
    this.api.getFaqs('Patient').subscribe({
      next: (data) => {
        this.faqs = Array.isArray(data) ? data : [];
        this.isLoadingFaqs = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.faqError = 'Could not load FAQs. Make sure the backend is running and try again.';
        this.isLoadingFaqs = false;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredFaqs(): Faq[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.faqs.filter(f => {
      const matchCat = this.activeCategory === 'All' || f.category === this.activeCategory;
      const matchQ   = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }

  get faqCategories(): string[] {
    const cats = [...new Set(this.faqs.map(f => f.category))];
    return ['All', ...cats];
  }

  toggleFaq(id: number): void {
    this.openFaqId = this.openFaqId === id ? null : id;
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.openFaqId = null;
  }

  // ── Contact ────────────────────────────────────────────────────────────────
  resetContact(): void {
    this.contactSubject = '';
    this.contactMessage = '';
    this.submitSuccess = false;
    this.submitError = '';
    this.isSubmitting = false;
  }

  submitContact(): void {
    if (!this.contactSubject.trim() || !this.contactMessage.trim()) {
      this.submitError = 'Please fill in both subject and message.';
      return;
    }
    const user = this.auth.getUser();
    this.isSubmitting = true;
    this.submitError = '';

    this.api.submitSupportRequest({
      user_id:    user?.id ?? null,
      user_name:  user ? `${user.first_name} ${user.last_name}` : 'Patient',
      user_email: user?.email ?? '',
      user_role:  'Patient',
      subject:    this.contactSubject.trim(),
      message:    this.contactMessage.trim(),
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.contactSubject = '';
        this.contactMessage = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err?.error?.message || 'Failed to send. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }
}
