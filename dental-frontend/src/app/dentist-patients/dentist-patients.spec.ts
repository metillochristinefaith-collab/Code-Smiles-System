import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistPatient } from './dentist-patients';

describe('DentistPatient', () => {
  let component: DentistPatient;
  let fixture: ComponentFixture<DentistPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistPatient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
