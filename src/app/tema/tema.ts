import { Injectable, signal, effect } from '@angular/core';
 
export type Tema = 'light' | 'dark';
 
@Injectable({ providedIn: 'root' })
export class TemaService {
  tema = signal<Tema>(this.getInitialTema());
 
  constructor() {
    effect(() => {
      const tema = this.tema();
      document.documentElement.classList.toggle('dark', tema === 'dark');
      localStorage.setItem('futnerds-tema', tema);
    });
  }
 
  toggleTema(): void {
    this.tema.update((t) => (t === 'light' ? 'dark' : 'light'));
  }
 
  setTema(tema: Tema): void {
    this.tema.set(tema);
  }
 
  private getInitialTema(): Tema {
    const saved = localStorage.getItem('futnerds-tema') as Tema | null;
    if (saved === 'light' || saved === 'dark') return saved;
 
    // Sem preferência salva: mantém 'dark' como padrão da marca FUTNERDS
    return 'dark';
  }
}
 