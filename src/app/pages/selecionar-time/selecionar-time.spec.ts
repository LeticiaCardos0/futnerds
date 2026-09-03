import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelecionarTimeComponent } from './selecionar-time';

describe('SelecionarTimeComponent', () => {
  let component: SelecionarTimeComponent;
  let fixture: ComponentFixture<SelecionarTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelecionarTimeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelecionarTimeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
