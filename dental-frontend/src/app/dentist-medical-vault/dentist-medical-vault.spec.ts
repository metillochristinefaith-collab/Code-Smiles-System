import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistMedicalVault } from './dentist-medical-vault';

describe('DentistMedicalVault', () => {
  let component: DentistMedicalVault;
  let fixture: ComponentFixture<DentistMedicalVault>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistMedicalVault]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistMedicalVault);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
