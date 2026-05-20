import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffHeader } from './staff-sidebar';

describe('StaffHeader', () => {
  let component: StaffHeader;
  let fixture: ComponentFixture<StaffHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
