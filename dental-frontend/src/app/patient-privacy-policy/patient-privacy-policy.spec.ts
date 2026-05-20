import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientPrivacyPolicy } from './patient-privacy-policy';

describe('PatientPrivacyPolicy', () => {
  let component: PatientPrivacyPolicy;
  let fixture: ComponentFixture<PatientPrivacyPolicy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientPrivacyPolicy]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientPrivacyPolicy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
