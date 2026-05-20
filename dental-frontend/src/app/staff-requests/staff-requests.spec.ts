import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffRequest } from './staff-requests';

describe('StaffRequest', () => {
  let component: StaffRequest;
  let fixture: ComponentFixture<StaffRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
