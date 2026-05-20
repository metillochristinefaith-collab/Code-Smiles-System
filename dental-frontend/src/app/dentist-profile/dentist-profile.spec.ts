import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistProfile } from './dentist-profile';

describe('DentistProfile', () => {
  let component: DentistProfile;
  let fixture: ComponentFixture<DentistProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
