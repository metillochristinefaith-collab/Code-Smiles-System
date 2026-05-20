import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistPrescription } from './dentist-prescriptions';

describe('DentistPrescription', () => {
  let component: DentistPrescription;
  let fixture: ComponentFixture<DentistPrescription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistPrescription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistPrescription);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
