import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientAbout } from './patient-about';

describe('PatientAbout', () => {
  let component: PatientAbout;
  let fixture: ComponentFixture<PatientAbout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientAbout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientAbout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
