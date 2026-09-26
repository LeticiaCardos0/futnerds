import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura'; // Importação da nova biblioteca

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Sem isto a rolagem da tela anterior vinha junto: saindo da Home rolada,
    // Nações abria no rodapé, com o globo fora da tela. 'enabled' = navegação
    // nova abre no topo; voltar/avançar do navegador devolve a posição.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    provideHttpClient(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark' // o site é só escuro: a classe fica fixa no <html> (index.html)
        }
      }
    })
  ]
};