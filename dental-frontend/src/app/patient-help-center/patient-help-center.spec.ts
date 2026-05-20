import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientHelpCenter } from './patient-help-center';

describe('PatientHelpCenter', () => {
  let component: PatientHelpCenter;
  let fixture: ComponentFixture<PatientHelpCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientHelpCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientHelpCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
