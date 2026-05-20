import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistAppointment } from './dentist-appointments';

describe('DentistAppointment', () => {
  let component: DentistAppointment;
  let fixture: ComponentFixture<DentistAppointment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistAppointment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistAppointment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
