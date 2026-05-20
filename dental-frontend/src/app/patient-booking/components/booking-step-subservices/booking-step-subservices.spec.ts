import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingStepSubservices } from './booking-step-subservices';

describe('BookingStepSubservices', () => {
  let component: BookingStepSubservices;
  let fixture: ComponentFixture<BookingStepSubservices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepSubservices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingStepSubservices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
