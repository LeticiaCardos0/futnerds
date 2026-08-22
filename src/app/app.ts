import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
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
}