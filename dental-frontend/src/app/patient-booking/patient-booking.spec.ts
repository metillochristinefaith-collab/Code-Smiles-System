import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientBookingComponent } from './patient-booking';

describe('PatientBookingComponent', () => {
  let component: PatientBookingComponent;
  let fixture: ComponentFixture<PatientBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientBookingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientBookingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});