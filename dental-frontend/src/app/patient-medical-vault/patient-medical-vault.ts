import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PatientSidebarComponent } from '../patient-sidebar/patient-sidebar';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { AvatarService } from '../services/avatar.service';
import { DENTIST_ROSTER } from '../dentist-portal-data';

type VaultFilterKey =
  | 'all'
  | 'xray'
  | 'prescription'
  | 'treatment-plan'
  | 'medical-form'
  | 'insurance'
  | 'lab';

type RecordType =
  | 'X-Ray'
  | 'Prescription'
  | 'Treatment Plan'
  | 'Medical Form'
  | 'Insurance'
  | 'Lab Result';

interface SummaryCard {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'violet' | 'amber' | 'green';
  iconViewBox: string;
  iconPaths: string[];
}

interface HealthStat {
  label: string;
  value: string;
  tone: 'red' | 'amber' | 'blue' | 'green';
  iconViewBox?: string;
  iconPaths?: string[];
}

interface VaultRecord {
  id: string;
  title: string;
  description: string;
  uploadedBy: string;
  uploadedOrg: string;
  date: string;
  type: RecordType;
  category: Exclude<VaultFilterKey, 'all'>;
  fileName: string;
  fileSize: string;
  source: 'Clinic' | 'Patient';
  summary: string;
  notes: string[];
  iconViewBox: string;
  iconPaths: string[];
  addedAtRank: number;
  previewKind?: 'image' | 'pdf' | 'document';
  previewUrl?: string;
  storedPreviewUrl?: string;
  safePreviewUrl?: SafeResourceUrl;
}

interface FilterOption {
  key: VaultFilterKey;
  label: string;
}

interface QuickAction {
  title: string;
  description: string;
  tone: 'blue' | 'green' | 'amber';
  iconViewBox: string;
  iconPaths: string[];
  action: 'upload' | 'share' | 'request';
}

@Component({
  selector: 'app-patient-medical-vault',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PatientSidebarComponent],
  templateUrl: './patient-medical-vault.html',
  styleUrl: './patient-medical-vault.css',
})
export class PatientMedicalVault implements OnInit {
  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly api: ApiService,
    private readonly avatarSvc: AvatarService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.route.queryParamMap.subscribe((params) => {
      this.pendingRecordTitle = params.get('record');
      this.openPendingRecord();
    });
  }

  avatarUrl: string = '';

  get patientProfile() {
    const user = this.auth.getUser();
    return {
      name: user ? `${user.first_name} ${user.last_name}` : 'Patient',
      id:   user ? `CS-${String(user.id).padStart(5, '0')}` : '—',
    };
  }

  searchTerm = '';
  selectedFilter: VaultFilterKey = 'all';
  selectedFilterLabel: VaultFilterKey = 'all';
  toastMessage = '';

  activeModal: 'view' | 'upload' | 'share' | 'request' | null = null;
  selectedRecord: VaultRecord | null = null;

  uploadDraft = {
    title: '',
    type: 'Medical Form' as RecordType,
    description: '',
    fileName: '',
  };

  selectedUploadFileLabel = '';

  shareDraft = {
    recordId: '',
    recipient: DENTIST_ROSTER[0].fullName,
    message: '',
  };

  readonly dentistOptions = DENTIST_ROSTER;

  requestDraft = {
    documentName: '',
    reason: '',
  };

  private nextRecordNumber = 1006;
  private nextAddedRank = 6;
  private pendingRecordTitle: string | null = null;
  private pendingUploadPreview:
    | {
        previewKind: 'image' | 'pdf' | 'document';
        previewUrl?: string;
        storedPreviewUrl?: string;
        safePreviewUrl?: SafeResourceUrl;
      }
    | null = null;

  readonly summaryCards: SummaryCard[] = [
    {
      label: 'Documents Stored',
      value: '0',
      detail: 'Across all uploaded and clinic-issued files',
      tone: 'blue',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z',
        'M15 3.5v4h4',
        'M9 11h6M9 15h6',
      ],
    },
    {
      label: 'X-Rays & Images',
      value: '0',
      detail: 'Latest imaging ready for viewing and download',
      tone: 'violet',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M4.5 6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19H6a1.5 1.5 0 0 1-1.5-1.5v-11Z',
        'M8 15l2.8-3 2.2 2.4 2.2-2.8L18 15',
        'M9 9.5h.01',
      ],
    },
    {
      label: 'Last Updated',
      value: 'No activity',
      detail: 'Most recent vault activity synced from the clinic',
      tone: 'amber',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M7 3v3M17 3v3M4 8h16',
        'M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5V7A1.5 1.5 0 0 1 5.5 5.5Z',
      ],
    },
    {
      label: 'Protected Access',
      value: 'Secure',
      detail: 'Encrypted access for uploads, downloads, sharing, and requests',
      tone: 'green',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M12 3 18 5.5v5.4c0 4-2.5 7.6-6 9.1-3.5-1.5-6-5.1-6-9.1V5.5L12 3Z',
        'M10.5 12 12 13.5l2.8-3.4',
      ],
    },
  ];

  readonly healthSummary: HealthStat[] = [];

  readonly reminderItems = [
    'Inform the clinic about any new allergies before sharing records.',
    'Upload clear scans or images so the dental team can review them faster.',
    'Keep insurance and consent forms updated before upcoming appointments.',
  ];

  readonly filters: FilterOption[] = [
    { key: 'all', label: 'All Records' },
    { key: 'xray', label: 'X-Rays' },
    { key: 'prescription', label: 'Prescriptions' },
    { key: 'treatment-plan', label: 'Treatment Plans' },
    { key: 'medical-form', label: 'Medical Forms' },
    { key: 'insurance', label: 'Insurance' },
  ];

  records: VaultRecord[] = [];

  ngOnInit(): void {
    // Load avatar
    this.avatarUrl = this.avatarSvc.getAvatar();
    if (!this.avatarUrl) {
      this.avatarSvc.loadAvatarFromDB().then(() => {
        this.avatarUrl = this.avatarSvc.getAvatar();
        this.cdr.detectChanges();
      }).catch(() => {});
    }

    const user = this.auth.getUser();
    if (!user?.id) return;

    this.records = this.loadCachedRecords(user.id);

    this.api.getPatientVaultRecords(user.id).subscribe({
      next: (rows) => {
        if (rows.length === 0 && this.records.length > 0) {
          this.openPendingRecord();
          return;
        }
        this.records = this.mergeRecords(rows.map((row) => this.mapVaultRecord(row)), this.records);
        this.saveCachedRecords(user.id);
        this.openPendingRecord();
      },
      error: () => {
        if (this.records.length === 0) {
          this.toastMessage = 'Could not load medical vault records.';
          this.clearToastLater();
        }
      },
    });
  }

  readonly quickActions: QuickAction[] = [
    {
      title: 'Share with Clinic',
      description: 'Give your dentist access to selected records',
      tone: 'green',
      action: 'share',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
        'M16 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
        'M16 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
        'm10.6 7.5 2.8-1.4M10.6 10.5l2.8 1.4',
      ],
    },
    {
      title: 'Request Record',
      description: 'Ask the clinic to add or update a document',
      tone: 'amber',
      action: 'request',
      iconViewBox: '0 0 24 24',
      iconPaths: [
        'M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z',
        'M15 3.5v4h4',
        'M9 11h6M9 15h4',
      ],
    },
  ];

  setFilter(filterKey: VaultFilterKey): void {
    this.selectedFilter = filterKey;
    this.selectedFilterLabel = filterKey;
  }

  onFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as VaultFilterKey;
    this.selectedFilter = val;
    this.selectedFilterLabel = val;
  }

  get filteredRecords(): VaultRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    return this.records.filter((record) => {
      const matchesFilter =
        this.selectedFilter === 'all' || record.category === this.selectedFilter;

      const matchesSearch =
        !normalizedSearch ||
        record.title.toLowerCase().includes(normalizedSearch) ||
        record.description.toLowerCase().includes(normalizedSearch) ||
        record.uploadedBy.toLowerCase().includes(normalizedSearch) ||
        record.type.toLowerCase().includes(normalizedSearch) ||
        record.fileName.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }

  get recentRecords(): VaultRecord[] {
    return [...this.records]
      .sort((first, second) => second.addedAtRank - first.addedAtRank)
      .slice(0, 3);
  }

  getTypeClass(type: RecordType): string {
    return type.toLowerCase().replace(/\s+/g, '-');
  }

  openRecord(record: VaultRecord): void {
    this.selectedRecord = record;
    this.activeModal = 'view';
  }

  downloadRecord(record: VaultRecord): void {
    this.toastMessage = `${record.fileName} download started.`;
    this.clearToastLater();
  }

  openUploadModal(): void {
    this.uploadDraft = {
      title: '',
      type: 'Medical Form',
      description: '',
      fileName: '',
    };
    this.selectedUploadFileLabel = '';
    this.pendingUploadPreview = null;
    this.activeModal = 'upload';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      this.selectedUploadFileLabel = '';
      this.uploadDraft.fileName = '';
      this.pendingUploadPreview = null;
      return;
    }

    this.selectedUploadFileLabel = file.name;
    this.uploadDraft.fileName = file.name;
    Promise.resolve(this.buildPreviewFromFile(file)).then((preview) => {
      this.pendingUploadPreview = preview;
    });
  }

  submitUpload(): void {
    if (!this.uploadDraft.title.trim() || !this.uploadDraft.fileName.trim()) {
      this.toastMessage = 'Please add a document title and file name.';
      this.clearToastLater();
      return;
    }

    const type = this.uploadDraft.type;
    const category = this.getCategoryFromType(type);
    const preview =
      this.pendingUploadPreview || this.getPreviewDataFromFileName(this.uploadDraft.fileName.trim());

    this.api.createPatientVaultRecord({
      title: this.uploadDraft.title.trim(),
      description: this.uploadDraft.description.trim() || 'Patient-uploaded document',
      record_type: type,
      category,
      file_name: this.uploadDraft.fileName.trim(),
      file_size: 'Pending review',
      preview_kind: preview.previewKind,
    }).subscribe({
      next: (row) => {
        const user = this.auth.getUser();
        const savedRecord = this.withPreviewData(this.mapVaultRecord(row), preview);
        this.records = this.mergeRecords([savedRecord], this.records);
        if (user?.id) this.saveCachedRecords(user.id);
        this.toastMessage = `${savedRecord.title} was added to your upload queue.`;
        this.closeModal();
        this.clearToastLater();
      },
      error: (err) => {
        const user = this.auth.getUser();
        const savedRecord = this.buildLocalVaultRecord(type, category, preview);
        this.records = this.mergeRecords([savedRecord], this.records);
        if (user?.id) this.saveCachedRecords(user.id);
        this.toastMessage = err?.error?.message || `${savedRecord.title} was saved locally.`;
        this.closeModal();
        this.clearToastLater();
      },
    });
  }

  openShareModal(record?: VaultRecord): void {
    if (!record && this.records.length === 0) {
      this.toastMessage = 'Upload a record before sharing with your dental team.';
      this.clearToastLater();
      return;
    }

    this.shareDraft = {
      recordId: record?.id || this.filteredRecords[0]?.id || '',
      recipient: this.dentistOptions[0].fullName,
      message: record ? `Sharing ${record.title} for review.` : '',
    };
    this.activeModal = 'share';
  }

  submitShare(): void {
    const record = this.records.find((item) => item.id === this.shareDraft.recordId);
    if (!record) {
      this.toastMessage = 'Record not found.';
      this.clearToastLater();
      return;
    }

    // Extract the numeric ID from "REC-123" format
    const recordNumericId = parseInt(record.id.replace('REC-', ''), 10);
    
    this.api.shareVaultRecord(recordNumericId, this.shareDraft.recipient).subscribe({
      next: () => {
        this.toastMessage = `${record.title} shared with ${this.shareDraft.recipient}.`;
        this.closeModal();
        this.clearToastLater();
      },
      error: (err) => {
        this.toastMessage = err?.error?.message || `Failed to share ${record.title}.`;
        this.clearToastLater();
      },
    });
  }

  openRequestModal(): void {
    this.requestDraft = {
      documentName: '',
      reason: '',
    };
    this.activeModal = 'request';
  }

  submitRequest(): void {
    if (!this.requestDraft.documentName.trim()) {
      this.toastMessage = 'Please enter the document you want to request.';
      this.clearToastLater();
      return;
    }

    const documentName = this.requestDraft.documentName.trim();

    this.records = [
      {
        id: `REC-${this.nextRecordNumber++}`,
        title: `${documentName} Request`,
        description: this.requestDraft.reason.trim() || 'Requested from the clinic',
        uploadedBy: 'Request Sent',
        uploadedOrg: 'Awaiting clinic upload',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        type: 'Medical Form',
        category: 'medical-form',
        fileName: `${documentName.toLowerCase().replace(/\s+/g, '-')}-request.txt`,
        fileSize: 'Pending',
        source: 'Patient',
        summary: 'A document request was sent to the clinic and is waiting for a response.',
        notes: [
          'The clinic will review this request and upload the requested file when available.',
          'You can monitor the request from the records table.',
        ],
        addedAtRank: this.nextAddedRank++,
        iconViewBox: '0 0 24 24',
        iconPaths: [
          'M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z',
          'M15 3.5v4h4',
          'M9 11h6M9 15h6',
        ],
      },
      ...this.records,
    ];

    this.toastMessage = `Request sent for ${this.requestDraft.documentName}.`;
    this.closeModal();
    this.clearToastLater();
  }

  triggerQuickAction(action: QuickAction['action']): void {
    if (action === 'upload') {
      this.openUploadModal();
      return;
    }

    if (action === 'share') {
      this.openShareModal();
      return;
    }

    this.openRequestModal();
  }

  viewAllDocuments(): void {
    this.selectedFilter = 'all';
    this.selectedFilterLabel = 'all';
    this.searchTerm = '';
    this.toastMessage = 'Showing all medical vault documents.';
    this.clearToastLater();
  }

  closeModal(): void {
    this.activeModal = null;
    this.selectedRecord = null;
  }

  get selectedRecordPreviewLabel(): string {
    if (!this.selectedRecord) {
      return '';
    }

    switch (this.selectedRecord.previewKind) {
      case 'image':
        return 'Image preview';
      case 'pdf':
        return 'PDF preview';
      default:
        return 'Document preview';
    }
  }

  private getCategoryFromType(type: RecordType): Exclude<VaultFilterKey, 'all'> {
    switch (type) {
      case 'X-Ray':
        return 'xray';
      case 'Prescription':
        return 'prescription';
      case 'Treatment Plan':
        return 'treatment-plan';
      case 'Insurance':
        return 'insurance';
      case 'Lab Result':
        return 'lab';
      default:
        return 'medical-form';
    }
  }

  private getIconForCategory(category: Exclude<VaultFilterKey, 'all'>): Pick<VaultRecord, 'iconViewBox' | 'iconPaths'> {
    switch (category) {
      case 'xray':
        return {
          iconViewBox: '0 0 24 24',
          iconPaths: [
            'M4.5 6.5A1.5 1.5 0 0 1 6 5h12a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19H6a1.5 1.5 0 0 1-1.5-1.5v-11Z',
            'M8 15l2.8-3 2.2 2.4 2.2-2.8L18 15',
            'M9 9.5h.01',
          ],
        };
      case 'prescription':
      case 'medical-form':
      case 'lab':
        return {
          iconViewBox: '0 0 24 24',
          iconPaths: [
            'M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z',
            'M15 3.5v4h4',
            'M9 11h6M9 15h6',
          ],
        };
      case 'insurance':
        return {
          iconViewBox: '0 0 24 24',
          iconPaths: [
            'M4.5 7h15A1.5 1.5 0 0 1 21 8.5v7A1.5 1.5 0 0 1 19.5 17h-15A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7Z',
            'M3 10.5h18',
            'M7 14.5h3',
            'M14 14.5h4',
          ],
        };
      default:
        return {
          iconViewBox: '0 0 24 24',
          iconPaths: [
            'M8 3.5h8l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z',
            'M11 8h5',
            'M8.5 12h7',
            'M8.5 16h4.5',
            'M7.5 8.5h.01',
          ],
        };
    }
  }

  private buildPreviewFromFile(file: File): {
    previewKind: 'image' | 'pdf' | 'document';
    previewUrl?: string;
    storedPreviewUrl?: string;
    safePreviewUrl?: SafeResourceUrl;
  } | Promise<{
    previewKind: 'image' | 'pdf' | 'document';
    previewUrl?: string;
    storedPreviewUrl?: string;
    safePreviewUrl?: SafeResourceUrl;
  }> {
    const objectUrl = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
      return this.readFileAsDataUrl(file).then((dataUrl) => ({
        previewKind: 'image' as const,
        previewUrl: dataUrl,
        storedPreviewUrl: dataUrl,
      }));
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return this.readFileAsDataUrl(file).then((dataUrl) => ({
        previewKind: 'pdf' as const,
        previewUrl: dataUrl,
        storedPreviewUrl: dataUrl,
        safePreviewUrl: this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl),
      })).catch(() => ({
        previewKind: 'pdf' as const,
        previewUrl: objectUrl,
        safePreviewUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
      }));
    }

    return {
      previewKind: 'document',
    };
  }

  private getPreviewDataFromFileName(fileName: string): {
    previewKind: 'image' | 'pdf' | 'document';
    previewUrl?: string;
    storedPreviewUrl?: string;
    safePreviewUrl?: SafeResourceUrl;
  } {
    const normalized = fileName.toLowerCase();

    if (
      normalized.endsWith('.png') ||
      normalized.endsWith('.jpg') ||
      normalized.endsWith('.jpeg') ||
      normalized.endsWith('.webp')
    ) {
      return { previewKind: 'image' };
    }

    if (normalized.endsWith('.pdf')) {
      return { previewKind: 'pdf' };
    }

    return { previewKind: 'document' };
  }

  private mapVaultRecord(row: any): VaultRecord {
    const category = row.category as Exclude<VaultFilterKey, 'all'>;
    const icon = this.getIconForCategory(category);
    const previewKind = (row.preview_kind || 'document') as 'image' | 'pdf' | 'document';
    return {
      id: `REC-${row.id}`,
      title: row.title,
      description: row.description || 'Patient-uploaded document',
      uploadedBy: 'You Uploaded',
      uploadedOrg: 'Patient Upload',
      date: row.display_date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: row.record_type as RecordType,
      category,
      fileName: row.file_name,
      fileSize: row.file_size || 'Pending review',
      source: row.source || 'Patient',
      summary: 'This document was added by the patient and is waiting for clinic review.',
      notes: [
        'Upload received in the medical vault.',
        'Clinic staff can review the file from the patient record workspace.',
      ],
      addedAtRank: Number(row.added_rank || this.nextAddedRank++),
      previewKind,
      iconViewBox: icon.iconViewBox,
      iconPaths: icon.iconPaths,
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private buildLocalVaultRecord(
    type: RecordType,
    category: Exclude<VaultFilterKey, 'all'>,
    preview: {
      previewKind: 'image' | 'pdf' | 'document';
      previewUrl?: string;
      storedPreviewUrl?: string;
      safePreviewUrl?: SafeResourceUrl;
    },
  ): VaultRecord {
    const icon = this.getIconForCategory(category);
    return {
      id: `REC-${this.nextRecordNumber++}`,
      title: this.uploadDraft.title.trim(),
      description: this.uploadDraft.description.trim() || 'Patient-uploaded document',
      uploadedBy: 'You Uploaded',
      uploadedOrg: 'Patient Upload',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type,
      category,
      fileName: this.uploadDraft.fileName.trim(),
      fileSize: 'Pending review',
      source: 'Patient',
      summary: 'This document was added by the patient and is waiting for clinic review.',
      notes: [
        'Upload received in the medical vault.',
        'Clinic staff can review the file from the patient record workspace.',
      ],
      addedAtRank: this.nextAddedRank++,
      previewKind: preview.previewKind,
      previewUrl: preview.storedPreviewUrl || preview.previewUrl,
      storedPreviewUrl: preview.storedPreviewUrl,
      safePreviewUrl: preview.safePreviewUrl,
      iconViewBox: icon.iconViewBox,
      iconPaths: icon.iconPaths,
    };
  }

  private withPreviewData(
    record: VaultRecord,
    preview: {
      previewKind: 'image' | 'pdf' | 'document';
      previewUrl?: string;
      storedPreviewUrl?: string;
      safePreviewUrl?: SafeResourceUrl;
    },
  ): VaultRecord {
    return {
      ...record,
      previewKind: preview.previewKind,
      previewUrl: preview.storedPreviewUrl || preview.previewUrl,
      storedPreviewUrl: preview.storedPreviewUrl,
      safePreviewUrl: preview.safePreviewUrl,
    };
  }

  private mergeRecords(incoming: VaultRecord[], existing: VaultRecord[]): VaultRecord[] {
    const merged: VaultRecord[] = [];

    for (const record of [...incoming, ...existing]) {
      const duplicateIndex = merged.findIndex((item) =>
        item.id === record.id ||
        (
          item.title.trim().toLowerCase() === record.title.trim().toLowerCase() &&
          item.fileName.trim().toLowerCase() === record.fileName.trim().toLowerCase() &&
          item.type === record.type
        ),
      );

      if (duplicateIndex === -1) {
        merged.push(record);
        continue;
      }

      const current = merged[duplicateIndex];
      merged[duplicateIndex] = {
        ...current,
        ...record,
        previewUrl: current.storedPreviewUrl || current.previewUrl || record.storedPreviewUrl || record.previewUrl,
        storedPreviewUrl: current.storedPreviewUrl || record.storedPreviewUrl,
        safePreviewUrl: current.safePreviewUrl || record.safePreviewUrl,
      };
    }

    return merged.sort((first, second) => second.addedAtRank - first.addedAtRank);
  }

  private openPendingRecord(): void {
    if (!this.pendingRecordTitle) return;
    const matchedRecord = this.records.find((record) =>
      record.title.toLowerCase().includes(this.pendingRecordTitle!.toLowerCase()),
    );
    if (matchedRecord) this.openRecord(matchedRecord);
  }

  private cacheKey(patientId: number): string {
    return `patient_vault_records_${patientId}`;
  }

  private loadCachedRecords(patientId: number): VaultRecord[] {
    const raw = localStorage.getItem(this.cacheKey(patientId));
    if (!raw) return [];
    try {
      return (JSON.parse(raw) as VaultRecord[]).map((record) => ({
        ...record,
        previewUrl: record.storedPreviewUrl || record.previewUrl,
        safePreviewUrl:
          record.previewKind === 'pdf' && record.storedPreviewUrl
            ? this.sanitizer.bypassSecurityTrustResourceUrl(record.storedPreviewUrl)
            : record.safePreviewUrl,
      }));
    } catch {
      return [];
    }
  }

  private saveCachedRecords(patientId: number): void {
    localStorage.setItem(this.cacheKey(patientId), JSON.stringify(this.records));
  }

  private clearToastLater(): void {
    window.clearTimeout((this as { toastTimeout?: number }).toastTimeout);
    (this as { toastTimeout?: number }).toastTimeout = window.setTimeout(() => {
      this.toastMessage = '';
    }, 2600);
  }
}
