import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffCalendar } from './staff-calendar';

describe('StaffCalendar', () => {
  let component: StaffCalendar;
  let fixture: ComponentFixture<StaffCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffCalendar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
