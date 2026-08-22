import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComissaoTecnicaComponent } from './comissao-tecnica';

describe('ComissaoTecnica', () => {
  let component: ComissaoTecnicaComponent;
  let fixture: ComponentFixture<ComissaoTecnicaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComissaoTecnicaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ComissaoTecnicaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
