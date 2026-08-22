import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Jogadores } from './jogadores';

describe('Jogadores', () => {
  let component: Jogadores;
  let fixture: ComponentFixture<Jogadores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Jogadores],
    }).compileComponents();

    fixture = TestBed.createComponent(Jogadores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
