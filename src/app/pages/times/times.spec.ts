import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Times } from './times';

describe('Times', () => {
  let component: Times;
  let fixture: ComponentFixture<Times>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Times],
    }).compileComponents();

    fixture = TestBed.createComponent(Times);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
