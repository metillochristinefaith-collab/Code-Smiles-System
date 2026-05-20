import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientNotificationsComponent } from './patient-notifications';

describe('PatientNotificationsComponent', () => {
  let component: PatientNotificationsComponent;
  let fixture: ComponentFixture<PatientNotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientNotificationsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientNotificationsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});