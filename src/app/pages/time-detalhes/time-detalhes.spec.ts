import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeDetalhesComponent } from './time-detalhes';

describe('TimeDetalhesComponent', () => {
  let component: TimeDetalhesComponent;
  let fixture: ComponentFixture<TimeDetalhesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeDetalhesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeDetalhesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
