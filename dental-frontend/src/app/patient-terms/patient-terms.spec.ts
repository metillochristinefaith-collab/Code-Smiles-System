import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientTerms } from './patient-terms';

describe('PatientTerms', () => {
  let component: PatientTerms;
  let fixture: ComponentFixture<PatientTerms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientTerms]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientTerms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
