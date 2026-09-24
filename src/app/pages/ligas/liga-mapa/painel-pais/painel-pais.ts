import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubeNoMapa } from '../liga-mapa.service';

/**
 * Painel esquerdo: identidade do país, números da liga e a lista de clubes.
 *
 * Só apresenta e avisa — a seleção vive na página, no mesmo signal que o mapa
 * usa. Clicar aqui não move a câmera, igual a clicar num waypoint.
 */
@Component({
  selector: 'app-painel-pais',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './painel-pais.html',
})
export class PainelPaisComponent {
  readonly paisNome = input.required<string>();
  readonly paisCodigo = input.required<string>();
  readonly ligaNome = input.required<string>();
  readonly clubes = input<ClubeNoMapa[]>([]);
  readonly selecionadoId = input<number | null>(null);

  readonly clubeSelecionado = output<ClubeNoMapa>();

  /**
   * Lista em ordem alfabética. A ordenação é do painel, não do serviço: o mapa
   * consome a mesma lista e não se importa com ordem, então isso é decisão de
   * apresentação.
   *
   * Copia antes de ordenar — `sort` altera o array no lugar, e mexer no array
   * de entrada seria efeito colateral sobre dado compartilhado com o mapa.
   */
  protected readonly clubesOrdenados = computed(() =>
    [...this.clubes()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );
}
