import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistDashboard } from './dentist-dashboard';

describe('DentistDashboard', () => {
  let component: DentistDashboard;
  let fixture: ComponentFixture<DentistDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
