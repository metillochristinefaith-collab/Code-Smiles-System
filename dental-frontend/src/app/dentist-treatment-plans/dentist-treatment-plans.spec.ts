import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistTreatmentPlan } from './dentist-treatment-plans';

describe('DentistTreatmentPlan', () => {
  let component: DentistTreatmentPlan;
  let fixture: ComponentFixture<DentistTreatmentPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistTreatmentPlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistTreatmentPlan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
