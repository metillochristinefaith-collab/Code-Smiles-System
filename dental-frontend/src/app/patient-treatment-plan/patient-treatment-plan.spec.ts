import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PatientTreatmentPlan } from './patient-treatment-plan';

describe('PatientTreatmentPlan', () => {
  let component: PatientTreatmentPlan;
  let fixture: ComponentFixture<PatientTreatmentPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientTreatmentPlan],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientTreatmentPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
