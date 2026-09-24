import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { MapaLigaComponent, ClubeMapa } from '../../../shared/mapa-liga/mapa-liga';
import { configDaLiga } from '../../../shared/mapa-liga/config-liga';
import { ClubeNoMapa, LigaMapaService } from './liga-mapa.service';
import { PainelPaisComponent } from './painel-pais/painel-pais';
import { PainelClubeComponent } from './painel-clube/painel-clube';
import { ControlesMapaComponent } from './controles-mapa/controles-mapa';

/**
 * Página do mapa de uma liga (/ligas/:ligaId).
 *
 * A página só busca os dados e guarda a seleção; quem desenha é o
 * MapaLigaComponent. Os painéis laterais entram na próxima etapa.
 */
@Component({
  selector: 'app-liga-mapa-page',
  standalone: true,
  imports: [
    MapaLigaComponent,
    PainelPaisComponent,
    PainelClubeComponent,
    ControlesMapaComponent,
    RouterLink,
  ],
  templateUrl: './liga-mapa.html',
})
export class LigaMapaPageComponent {
  private readonly servico = inject(LigaMapaService);

  // paramMap e não snapshot: navegar de /ligas/a para /ligas/b reaproveita o
  // componente, e com snapshot a página ficaria presa no primeiro id.
  private readonly ligaId$ = inject(ActivatedRoute).paramMap.pipe(
    map((p) => p.get('ligaId') ?? ''),
  );

  private readonly ligaId = toSignal(this.ligaId$, { initialValue: '' });

  protected readonly config = computed(() => configDaLiga(this.ligaId()));

  /**
   * Os dados chegam de forma assíncrona; o mapa é montado antes deles. O
   * MapaLigaComponent trata as duas ordens de chegada (ver o effect lá).
   */
  private readonly dados = toSignal(
    this.ligaId$.pipe(
      switchMap((id) => {
        const cfg = configDaLiga(id);
        return cfg ? this.servico.carregar(cfg) : of(null);
      }),
      // Sem este catch, um erro no fluxo faz o toSignal RELANCAR a cada leitura
      // do template — e como clubes()/cidades() sao lidos em toda deteccao de
      // mudanca, a pagina inteira deixa de renderizar (tela preta) em vez de
      // so ficar sem marcadores.
      catchError((erro) => {
        console.error('FutNerds · falha ao carregar os dados do mapa da liga:', erro);
        return of(null);
      }),
    ),
    { initialValue: null },
  );

  // ClubeNoMapa e o superconjunto: tem os campos do mapa mais as estatisticas
  // do elenco que o painel direito usa. O mapa aceita por estrutura.
  protected readonly clubes = computed<ClubeNoMapa[]>(() => this.dados()?.clubes ?? []);
  protected readonly cidades = computed(() => this.dados()?.cidades ?? []);
  protected readonly cidadesSemTime = computed(() => this.dados()?.cidadesSemTime ?? []);

  protected readonly selecionadoId = signal<number | null>(null);
  protected readonly ativo3d = signal(false);

  /** O clube inteiro, resolvido a partir do id — o painel direito precisa dele. */
  protected readonly clubeSelecionado = computed<ClubeNoMapa | null>(() => {
    const id = this.selecionadoId();
    return id == null ? null : (this.clubes().find((c) => c.id === id) ?? null);
  });

  /** Fundação vem de GET /api/times/{id}; null enquanto não chega. */
  protected readonly fundacao = signal<number | null>(null);

  constructor() {
    // Busca os detalhes só do clube selecionado. Carregar os 20 de uma vez
    // seria 20 requisições pesadas (cada uma traz elenco e uniformes) para
    // exibir um único campo.
    effect(() => {
      const id = this.selecionadoId();
      this.fundacao.set(null);
      if (id == null) return;
      this.servico.detalhes(id).subscribe({
        next: (d) => this.fundacao.set(d.fundacao ?? null),
        error: () => this.fundacao.set(null), // campo opcional, não quebra o painel
      });
    });
  }

  /**
   * Seleciona e leva a camera ate o clube.
   *
   * Vale para os dois caminhos — clique no pino e clique na lista do painel —
   * de proposito: eles escrevem no mesmo signal e devem se comportar igual.
   */
  protected aoSelecionar(clube: ClubeMapa | ClubeNoMapa, mapa: MapaLigaComponent): void {
    this.selecionadoId.set(clube.id);
    mapa.voarPara(clube.lng, clube.lat);
  }

  protected alternar3d(mapa: MapaLigaComponent, ligado: boolean): void {
    this.ativo3d.set(ligado);
    mapa.definir3D(ligado);
  }
}
