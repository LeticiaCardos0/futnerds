import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubeNoMapa } from '../liga-mapa.service';

/**
 * Painel direito: o clube selecionado.
 *
 * Identidade e localização vêm do JSON + base; os números do elenco vêm do DTO
 * de GET /api/times. A fundação é a única que exige o endpoint de detalhes, e
 * por isso chega separada (input `fundacao`) e pode estar ausente.
 */
@Component({
  selector: 'app-painel-clube',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './painel-clube.html',
})
export class PainelClubeComponent {
  readonly clube = input.required<ClubeNoMapa>();
  readonly paisNome = input.required<string>();
  readonly ligaNome = input.required<string>();
  /** null enquanto GET /api/times/{id} não responde, ou se a base não tiver. */
  readonly fundacao = input<number | null>(null);

  /** Só visual nesta etapa — nada é persistido. */
  protected readonly favorito = signal(false);

  /**
   * Fundo do topo: a foto do estádio, sem tingir.
   *
   * COM foto, a única camada por cima é um véu neutro e fraco — escuro só o
   * suficiente para o texto branco se sustentar. Nada de cor do clube: ela
   * mascarava a imagem, que é o que se quer ver. O resto da legibilidade vem
   * do `text-shadow` em .ml-clube-topo.
   *
   * SEM foto, aí sim entra a cor do clube, que é melhor que um retângulo vazio.
   * (`cor` já cai no verde do FutNerds quando o JSON não traz nenhuma.)
   *
   * Em `background`, a primeira camada fica na FRENTE — por isso o véu vem
   * antes da url da imagem.
   */
  protected readonly fundoTopo = computed(() => {
    const c = this.clube();
    if (!c.imagemEstadio) {
      return `linear-gradient(150deg, ${c.cor} 0%, rgba(3,5,6,.9) 100%)`;
    }
    const veu = 'linear-gradient(180deg, rgba(3,5,6,.25) 0%, rgba(3,5,6,.55) 100%)';
    return `${veu}, url('${c.imagemEstadio}')`;
  });

  protected alternarFavorito(): void {
    this.favorito.update((v) => !v);
  }

  /** 1.234.567 -> "1,2 mi". Valores de elenco ficam ilegíveis por extenso. */
  protected formatarValor(v: number): string {
    if (!v) return '—';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`;
    if (v >= 1_000) return `${Math.round(v / 1_000)} mil`;
    return String(v);
  }

  protected formatarNumero(v: number | null, casas = 1): string {
    return v == null ? '—' : v.toFixed(casas).replace('.', ',');
  }
}
