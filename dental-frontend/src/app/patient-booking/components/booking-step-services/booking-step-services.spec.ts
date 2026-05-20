import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingStepServices } from './booking-step-services';

describe('BookingStepServices', () => {
  let component: BookingStepServices;
  let fixture: ComponentFixture<BookingStepServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingStepServices);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
