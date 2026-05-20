import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientService } from './patient-services';

describe('PatientService', () => {
  let component: PatientService;
  let fixture: ComponentFixture<PatientService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
