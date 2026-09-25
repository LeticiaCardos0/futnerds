import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { Topbar } from "./pages/layout/topbar/topbar";
import { Footer } from "./pages/layout/footer/footer";
import { TemaService } from './tema/tema';

@Component({
  selector: 'app-root',
  imports: [Topbar, Footer, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('projeto-futnerds-ng');

  // Injetado aqui para aplicar a classe .dark/.light assim que o app inicializa
  protected readonly temaService = inject(TemaService);

  private readonly router = inject(Router);

  // Rotas com `data: { semFooter: true }` escondem o footer (ver app.routes.ts).
  // O flag é lido na rota mais interna, que é onde ele fica declarado.
  protected readonly mostrarFooter = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let rota = this.router.routerState.snapshot.root;
        while (rota.firstChild) rota = rota.firstChild;
        return !rota.data['semFooter'];
      }),
    ),
    { initialValue: true },
  );
}