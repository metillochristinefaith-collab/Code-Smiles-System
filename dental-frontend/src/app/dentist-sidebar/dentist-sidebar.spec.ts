import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DentistHeader } from './dentist-sidebar';

describe('DentistHeader', () => {
  let component: DentistHeader;
  let fixture: ComponentFixture<DentistHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DentistHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DentistHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
