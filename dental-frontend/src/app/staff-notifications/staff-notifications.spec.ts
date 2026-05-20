import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffNotification } from './staff-notifications';

describe('StaffNotification', () => {
  let component: StaffNotification;
  let fixture: ComponentFixture<StaffNotification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffNotification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffNotification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
