import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientMedicalVault } from './patient-medical-vault';

describe('PatientMedicalVault', () => {
  let component: PatientMedicalVault;
  let fixture: ComponentFixture<PatientMedicalVault>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientMedicalVault]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientMedicalVault);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
