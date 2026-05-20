import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingStepDatetime } from './booking-step-datetime';

describe('BookingStepDatetime', () => {
  let component: BookingStepDatetime;
  let fixture: ComponentFixture<BookingStepDatetime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingStepDatetime]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingStepDatetime);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
