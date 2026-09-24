import { Component, input, output } from '@angular/core';

/**
 * Controles do mapa: bússola (volta ao enquadramento do país), zoom e Vista 3D.
 *
 * Componente sem estado: recebe se o 3D está ligado e emite a intenção. Quem
 * conhece o mapa é a página — assim os controles não precisam de referência ao
 * MapLibre nem duplicam o estado da câmera.
 */
@Component({
  selector: 'app-controles-mapa',
  standalone: true,
  templateUrl: './controles-mapa.html',
})
export class ControlesMapaComponent {
  readonly ativo3d = input<boolean>(false);

  readonly bussola = output<void>();
  readonly aproximar = output<void>();
  readonly afastar = output<void>();
  readonly alternar3d = output<boolean>();
}
