import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElencoComponent } from './elenco';

describe('ElencoComponent', () => {
  let component: ElencoComponent;
  let fixture: ComponentFixture<ElencoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElencoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ElencoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
