import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientTreatmentProgress } from './patient-treatment-progress';

describe('PatientTreatmentProgress', () => {
  let component: PatientTreatmentProgress;
  let fixture: ComponentFixture<PatientTreatmentProgress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientTreatmentProgress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientTreatmentProgress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
