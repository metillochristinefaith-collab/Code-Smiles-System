import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicContactComponent } from './public-contact';

describe('PublicContactComponent', () => {
  let component: PublicContactComponent;
  let fixture: ComponentFixture<PublicContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicContactComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicContactComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});