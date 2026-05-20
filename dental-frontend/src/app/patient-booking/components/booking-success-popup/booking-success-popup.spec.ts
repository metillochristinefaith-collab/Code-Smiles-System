import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingSuccessPopup } from './booking-success-popup';

describe('BookingSuccessPopup', () => {
  let component: BookingSuccessPopup;
  let fixture: ComponentFixture<BookingSuccessPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingSuccessPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingSuccessPopup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
