import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffPatient } from './staff-patients';

describe('StaffPatient', () => {
  let component: StaffPatient;
  let fixture: ComponentFixture<StaffPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffPatient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
