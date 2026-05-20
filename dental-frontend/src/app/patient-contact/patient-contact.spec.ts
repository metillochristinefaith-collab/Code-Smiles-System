import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientContact } from './patient-contact';

describe('PatientContact', () => {
  let component: PatientContact;
  let fixture: ComponentFixture<PatientContact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientContact]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientContact);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
