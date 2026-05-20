import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistNotification } from './dentist-notifications';

describe('DentistNotification', () => {
  let component: DentistNotification;
  let fixture: ComponentFixture<DentistNotification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistNotification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistNotification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
