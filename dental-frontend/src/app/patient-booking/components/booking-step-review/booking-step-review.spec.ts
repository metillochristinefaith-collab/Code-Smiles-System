import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingStepReview } from './booking-step-review';

describe('BookingStepReview', () => {
  let component: BookingStepReview;
  let fixture: ComponentFixture<BookingStepReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepReview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingStepReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
