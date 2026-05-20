import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingStepDetails } from './booking-step-details';

describe('BookingStepDetails', () => {
  let component: BookingStepDetails;
  let fixture: ComponentFixture<BookingStepDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingStepDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
