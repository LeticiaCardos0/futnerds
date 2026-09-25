import {
  afterNextRender,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import {
  BIG_TOWNS,
  CidadeSemTime,
  ConfigPaisLiga,
  COR_PADRAO,
  COR_TEXTO_PADRAO,
  ESCALA_WP_MIN,
  MIN_GAP,
  TAM_CIDADE_MAX,
  TAM_CIDADE_MIN,
  WP_ALTURA,
  WP_LARGURA,
  ZOOM_AO_SELECIONAR,
  ZOOM_ESCALA_CHEIA,
  zoomDoRank,
} from './config-liga';

/** Clube já pronto para o mapa (a página monta isto via LigaMapaService). */
export interface ClubeMapa {
  id: number;
  nome: string;
  escudoUrl: string;
  /** Versão pequena do escudo para o pino; sem ela, usa `escudoUrl`. */
  escudoMiniUrl?: string;
  cidade: string;
  estadio: string;
  lat: number;
  lng: number;
  cor?: string;
  corTexto?: string;
}

export interface CidadeMapa {
  nome: string;
  lat: number;
  lng: number;
}

interface RotuloRuntime {
  el: HTMLElement;
  span: HTMLElement;
  dot: HTMLElement | null;
  marker: Marker;
  lat: number;
  lng: number;
  comTime: boolean;
  /** Cidade de país vizinho: cede lugar às do país (ver layoutRotulos). */
  vizinha: boolean;
  rank: number;
  /** Quantos clubes da liga estao nesta cidade. Define a ordem de colocacao. */
  clubes: number;
  /** Largura/altura medidas UMA vez, no corpo base (TAM_CIDADE_MAX). */
  w: number;
  h: number;
}

interface WaypointRuntime {
  clube: ClubeMapa;
  marker: Marker;
  btn: HTMLElement;
  lead: HTMLElement;
  spot: HTMLElement;
}

interface Caixa {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/** Sigla do clube para o fallback do escudo: até 3 letras. */
function sigla(nome: string): string {
  const partes = nome.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(Boolean);
  if (partes.length >= 3) return partes.slice(0, 3).map((p) => p[0]).join('').toUpperCase();
  if (partes.length === 2) return (partes[0].slice(0, 2) + partes[1][0]).toUpperCase();
  return nome.slice(0, 3).toUpperCase();
}

function areaSobreposta(a: Caixa, b: Caixa): number {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Mapa de satélite da liga com os waypoints dos clubes e os nomes das cidades.
 *
 * Não usa NgZone.runOutsideAngular: este projeto não tem zone.js (não está em
 * dependencies, nem em node_modules, e angular.json não declara polyfills), ou
 * seja, roda zoneless. Não existe zona da qual sair.
 */
@Component({
  selector: 'app-mapa-liga',
  standalone: true,
  templateUrl: './mapa-liga.html',
})
export class MapaLigaComponent implements OnDestroy {
  readonly config = input.required<ConfigPaisLiga>();
  readonly clubes = input<ClubeMapa[]>([]);
  readonly cidades = input<CidadeMapa[]>([]);
  readonly cidadesSemTime = input<CidadeSemTime[]>([]);
  readonly selecionadoId = input<number | null>(null);

  readonly clubeSelecionado = output<ClubeMapa>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  private mapa?: MapLibreMap;
  private mapaPronto = false;
  private rotulos: RotuloRuntime[] = [];
  private waypoints: WaypointRuntime[] = [];

  private observador?: ResizeObserver;
  private enquadrou = false;


  private readonly aoRedimensionar = () => {
    this.aplicarZoomMinimo();
    this.declutter();
  };

  private readonly aoCarregarFontes = () => {
    this.medirRotulos();
    this.declutter();
  };

  constructor() {
    // afterNextRender: só no browser, e com o elemento já medido.
    afterNextRender(() => {
      try {
        this.criarMapa();
      } catch (erro) {
        // Falha aqui deixava a area do mapa em preto sem explicacao.
        console.error('FutNerds · falha ao criar o mapa da liga:', erro);
      }
    });

    // Os dados podem chegar antes OU depois da criação do mapa. O effect
    // reage às duas ordens; `desenhar()` sempre limpa antes de recriar, então
    // rodar de novo não duplica marcador.
    effect(() => {
      const clubes = this.clubes();
      const cidades = this.cidades();
      const semTime = this.cidadesSemTime();
      if (!this.mapaPronto) return;
      this.desenhar(clubes, cidades, semTime);
    });

    // Seleção vinda de fora (ex.: painel lateral, nas próximas etapas).
    effect(() => {
      const id = this.selecionadoId();
      for (const w of this.waypoints) w.btn.classList.toggle('ml-sel', w.clube.id === id);
    });
  }

  // --- mapa ---------------------------------------------------------------

  /**
   * Padding do enquadramento ajustado ao tamanho real do container.
   *
   * A demo usa valores fixos (360 a esquerda, 420 a direita) porque assume uma
   * janela larga com os paineis por cima. Quando a area do mapa e mais estreita
   * que a soma do padding, o MapLibre nao consegue enquadrar, avisa
   * "Map cannot fit within canvas" e deixa a camera sem posicao — mapa preto,
   * sem erro. Aqui o padding encolhe junto, sempre deixando pelo menos
   * FRACAO_LIVRE do eixo para o mapa.
   */
  private paddingEfetivo(): { top: number; bottom: number; left: number; right: number } {
    const p = this.config().enquadramento.padding;
    const alvo = this.container().nativeElement;
    const largura = alvo.clientWidth || 1;
    const altura = alvo.clientHeight || 1;
    const FRACAO_LIVRE = 0.45; // no minimo 45% de cada eixo fica para o mapa

    const fx = Math.min(1, (largura * (1 - FRACAO_LIVRE)) / Math.max(1, p.left + p.right));
    const fy = Math.min(1, (altura * (1 - FRACAO_LIVRE)) / Math.max(1, p.top + p.bottom));

    return {
      left: Math.floor(p.left * fx),
      right: Math.floor(p.right * fx),
      top: Math.floor(p.top * fy),
      bottom: Math.floor(p.bottom * fy),
    };
  }

  private criarMapa(): void {
    const cfg = this.config();
    const alvo = this.container().nativeElement;
    this.mapa = new MapLibreMap({
      container: alvo,
      bounds: cfg.enquadramento.bounds,
      fitBoundsOptions: { padding: this.paddingEfetivo() },
      maxZoom: cfg.maxZoom,
      maxPitch: 45,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          satelite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Esri, Maxar, Earthstar Geographics',
          },
          // Relevo para o hillshade e para a Vista 3D (terreno).
          relevo: {
            type: 'raster-dem',
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14,
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            attribution: 'Relevo: Mapzen/AWS Terrain Tiles',
          },
          mascara: { type: 'geojson', data: cfg.mascaraUrl },
        },
        layers: [
          {
            id: 'sat',
            type: 'raster',
            source: 'satelite',
            paint: {
              'raster-brightness-max': 0.95,
              'raster-saturation': 0.12,
              'raster-contrast': 0.05,
            },
          },
          {
            // Sombreamento do relevo. Some entre o zoom 10 e o 13: de perto o
            // proprio satelite ja mostra o terreno, e a sombra so sujaria.
            id: 'sombra',
            type: 'hillshade',
            source: 'relevo',
            paint: {
              'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 10, 0.22, 13, 0],
              'hillshade-shadow-color': 'rgba(0,0,0,0.6)',
              'hillshade-highlight-color': 'rgba(255,255,255,0.08)',
            },
          },
          {
            id: 'mascara',
            type: 'fill',
            source: 'mascara',
            paint: { 'fill-color': '#020506', 'fill-opacity': 0.35, 'fill-antialias': false },
          },
        ],
      },
    });

    // Erro de estilo, de tile ou da mascara chegaria em silencio sem isto.
    this.mapa.on('error', (e: any) =>
      console.error('FutNerds · erro do MapLibre no mapa da liga:', e?.error ?? e),
    );

    // A correção de posição roda só quando o movimento TERMINA. Corrigir no
    // `move` faz o MapLibre cancelar o zoom do scroll e o arrasto.
    this.mapa.on('moveend', (e: any) => {
      if (e.clamp) return; // este movimento já é a própria correção
      const alvo = this.calcularCorrecao();
      if (alvo) this.mapa!.easeTo({ center: alvo, duration: 450 }, { clamp: true });
    });

    this.mapa.on('move', () => this.declutter());
    window.addEventListener('resize', this.aoRedimensionar);

    // Se o CSS ainda nao tiver sido aplicado quando o mapa e criado, o
    // container mede 0 e o canvas nasce 0x0 — mapa preto, sem erro nenhum.
    // O observador devolve o tamanho assim que ele existir, e tambem cobre
    // mudancas de layout que o evento resize da janela nao ve.
    this.observador = new ResizeObserver(() => {
      if (!this.mapa) return;
      this.mapa.resize();
      this.aplicarZoomMinimo();
      this.declutter();
    });
    this.observador.observe(alvo);

    // As fontes mudam a largura dos rótulos; sem remedir, o layout usa
    // medidas da fonte de fallback e as colisões saem erradas. `loadingdone`,
    // e não `fonts.ready`: a Source Serif só começa a baixar quando o primeiro
    // rótulo de cidade sem time aparece, depois de o `ready` já ter resolvido.
    document.fonts?.addEventListener('loadingdone', this.aoCarregarFontes);

    // Desenha já, sem esperar o `load`. Pinos e rótulos são DOM puro (Marker)
    // e só dependem da câmera, que o construtor posiciona com `bounds`. O
    // `load` só dispara quando TODOS os tiles chegam, inclusive os de relevo
    // da AWS: medido, a lista de clubes aparecia em ~0,2 s e os pinos em ~1,7 s.
    this.mapaPronto = true;
    this.aplicarZoomMinimo();
    this.desenhar(this.clubes(), this.cidades(), this.cidadesSemTime());
  }

  /**
   * Zoom mínimo = o enquadramento do país. Depende do tamanho da tela e do
   * padding dos painéis, por isso é calculado aqui e não fica na config.
   */
  private aplicarZoomMinimo(): void {
    if (!this.mapa) return;

    // Sem tamanho nao ha o que calcular: cameraForBounds devolveria undefined
    // e o canvas 0x0 e justamente o que produz o aviso "Map cannot fit within
    // canvas". Espera o ResizeObserver chamar de novo.
    const alvo = this.container().nativeElement;
    if (alvo.clientWidth === 0 || alvo.clientHeight === 0) return;

    const cfg = this.config();
    const padding = this.paddingEfetivo();

    // ANTES do cameraForBounds de proposito: se o mapa nasceu sem tamanho, o
    // enquadramento inicial nao aconteceu, e deixar este bloco depois do
    // `return` acima tornava a recuperacao inalcancavel no unico caso em que
    // ela importa.
    if (!this.enquadrou) {
      this.enquadrou = true;
      this.mapa.fitBounds(cfg.enquadramento.bounds, { padding, animate: false });
    }

    const cam = this.mapa.cameraForBounds(cfg.enquadramento.bounds, { padding });
    if (!cam || cam.zoom == null) return;
    this.mapa.setMinZoom(Math.min(cam.zoom - 0.25, cfg.maxZoom - 1));
  }

  /**
   * Mantém o MEIO DA ÁREA ÚTIL (entre os painéis) dentro do `limite`. Devolve
   * o centro corrigido da câmera, ou null se já estiver dentro.
   *
   * Prender o ponto, e não a tela inteira, é o que deixa o zoom em paz. A
   * versão anterior exigia a tela dentro do limite (ou o limite inteiro na
   * tela, quando ela era maior): o zoom do scroll aproxima em volta do cursor,
   * e bastava aproximar perto de uma borda para a outra sair da tela e a
   * correção jogar a câmera de lado. Com o ponto, aproximar em qualquer lugar
   * dentro do limite nunca dispara correção; só arrastar o país para fora.
   *
   * O meio da área útil, e não o centro da câmera: com 360px de painel à
   * esquerda e 420 à direita eles diferem, e o enquadramento inicial põe o
   * meio dos bounds no meio da área útil — que assim nunca é corrigido.
   */
  private calcularCorrecao(): [number, number] | null {
    if (!this.mapa) return null;
    const l = this.config().limite;
    const p = this.paddingEfetivo();
    const cont = this.mapa.getContainer();
    const cw = cont.clientWidth;
    const ch = cont.clientHeight;

    const meio = { x: (p.left + cw - p.right) / 2, y: (p.top + ch - p.bottom) / 2 };
    const util = this.mapa.unproject([meio.x, meio.y]);
    const lng = Math.min(l.e, Math.max(l.w, util.lng));
    const lat = Math.min(l.n, Math.max(l.s, util.lat));
    if (Math.abs(lng - util.lng) < 1e-5 && Math.abs(lat - util.lat) < 1e-5) return null;

    // O deslocamento em pixels, e não em graus: no Mercator um grau de
    // latitude não tem o mesmo tamanho no meio da tela e no centro da câmera.
    const alvo = this.mapa.project([lng, lat]);
    const c = this.mapa.unproject([cw / 2 + alvo.x - meio.x, ch / 2 + alvo.y - meio.y]);
    return [c.lng, c.lat];
  }

  // --- desenho ------------------------------------------------------------

  private desenhar(clubes: ClubeMapa[], cidades: CidadeMapa[], semTime: CidadeSemTime[]): void {
    this.limparMarcadores();

    const clubesPorCidade = new Map<string, number>();
    for (const c of clubes) clubesPorCidade.set(c.cidade, (clubesPorCidade.get(c.cidade) ?? 0) + 1);

    this.criarRotulos(cidades, semTime, clubesPorCidade);
    this.criarWaypoints(clubes);
    this.medirRotulos();
    this.declutter();
  }

  private limparMarcadores(): void {
    for (const r of this.rotulos) r.marker.remove();
    for (const w of this.waypoints) w.marker.remove();
    this.rotulos = [];
    this.waypoints = [];
  }

  private criarRotulos(
    cidades: CidadeMapa[],
    semTime: CidadeSemTime[],
    clubesPorCidade: Map<string, number>,
  ): void {
    const add = (
      nome: string,
      lat: number,
      lng: number,
      comTime: boolean,
      rank: number,
      vizinha = false,
      grande = false,
    ) => {
      const classes = comTime
        ? 'ml-lbl ml-club'
        : `ml-lbl ml-minor ml-r${rank}${grande || BIG_TOWNS.includes(nome) ? ' ml-big' : ''}`;
      const w = el('div', classes);
      const s = el('span');
      s.textContent = nome;
      w.appendChild(s);
      let d: HTMLElement | null = null;
      if (!comTime) {
        d = el('span', 'ml-cdot');
        w.appendChild(d);
      }
      const marker = new Marker({ element: w, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(this.mapa!);
      this.rotulos.push({
        el: w,
        span: s,
        dot: d,
        marker,
        lat,
        lng,
        comTime,
        vizinha,
        rank,
        clubes: clubesPorCidade.get(nome) ?? 0,
        w: 0,
        h: 0,
      });
    };

    for (const c of cidades) add(c.nome, c.lat, c.lng, true, 0);
    for (const t of semTime) add(t.nome, t.lat, t.lng, false, t.rank, t.vizinha, t.grande);

    // Ordem de colocacao: quem tem mais clubes escolhe primeiro. Londres (6)
    // pega a melhor posicao, depois Liverpool e Manchester (2), e assim por
    // diante — as cidades importantes deixam de perder lugar para vilarejos.
    this.rotulos.sort((a, b) => {
      if (a.comTime !== b.comTime) return a.comTime ? -1 : 1;
      if (a.clubes !== b.clubes) return b.clubes - a.clubes;
      return a.rank - b.rank;
    });
  }

  private criarWaypoints(clubes: ClubeMapa[]): void {
    for (const clube of clubes) {
      const wrap = el('div', 'ml-wpm');
      const lead = el('span', 'ml-lead');
      const spot = el('span', 'ml-spot');

      const btn = el('button', 'ml-wp');
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', clube.nome);

      const head = el('span', 'ml-head');
      const img = document.createElement('img');
      const mini = clube.escudoMiniUrl ?? clube.escudoUrl;
      let tentouOriginal = mini === clube.escudoUrl;
      img.src = mini;
      img.alt = '';
      // Miniatura quebrada tenta o escudo original; escudo quebrado vira a
      // sigla sobre a cor do clube — nunca um vazio.
      img.onerror = () => {
        if (!tentouOriginal) {
          tentouOriginal = true;
          img.src = clube.escudoUrl;
          return;
        }
        img.remove();
        const dot = el('span', 'ml-dot');
        dot.textContent = sigla(clube.nome);
        dot.style.background = clube.cor ?? COR_PADRAO;
        dot.style.color = clube.corTexto ?? COR_TEXTO_PADRAO;
        head.appendChild(dot);
      };
      head.appendChild(img);

      // Sem rotulo de nome no pino: o escudo identifica o clube, e o
      // aria-label acima mantem a leitura por leitor de tela.
      btn.appendChild(el('span', 'ml-tip'));
      btn.appendChild(head);
      // Só seleciona; a câmera não se move.
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.clubeSelecionado.emit(clube);
      });

      wrap.appendChild(lead);
      wrap.appendChild(spot);
      wrap.appendChild(btn);

      const marker = new Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat([clube.lng, clube.lat])
        .addTo(this.mapa!);

      if (this.selecionadoId() === clube.id) btn.classList.add('ml-sel');
      this.waypoints.push({ clube, marker, btn, lead, spot });
    }
  }

  /**
   * Fracao 0..1 entre o zoom minimo e ZOOM_ESCALA_CHEIA. E a base tanto da
   * escala dos waypoints quanto do corpo dos nomes de cidade.
   */
  private fatorZoom(): number {
    if (!this.mapa) return 1;
    const min = this.mapa.getMinZoom();
    const faixa = ZOOM_ESCALA_CHEIA - min;
    if (faixa <= 0) return 1;
    return Math.max(0, Math.min(1, (this.mapa.getZoom() - min) / faixa));
  }

  /**
   * Retangulos ocupados pelos nomes das cidades com time, no ponto da cidade.
   * Usado pelo declutter para tirar os pinos de cima deles.
   */
  private caixasCidadesComTime(): Caixa[] {
    if (!this.mapa) return [];
    const escalaTexto = this.corpoCidade() / TAM_CIDADE_MAX;
    const pad = 4;
    const caixas: Caixa[] = [];
    for (const l of this.rotulos) {
      if (!l.comTime || l.w === 0) continue;
      const p = this.mapa.project([l.lng, l.lat]);
      const W = (l.w * escalaTexto) / 2 + pad;
      const H = (l.h * escalaTexto) / 2 + pad;
      caixas.push({ x1: p.x - W, x2: p.x + W, y1: p.y - H, y2: p.y + H });
    }
    return caixas;
  }

  private escalaWaypoint(): number {
    return ESCALA_WP_MIN + (1 - ESCALA_WP_MIN) * this.fatorZoom();
  }

  private corpoCidade(): number {
    return TAM_CIDADE_MIN + (TAM_CIDADE_MAX - TAM_CIDADE_MIN) * this.fatorZoom();
  }

  /**
   * Mede UMA vez, sempre no corpo base, com o tamanho inline limpo. O layout
   * depois multiplica por escala em vez de remedir — medir o DOM a cada quadro
   * forcaria reflow no arrasto do mapa.
   */
  private medirRotulos(): void {
    // Rótulo que o layout escondeu (display: none) mede 0, e com largura 0 ele
    // nunca colide — voltava a aparecer por cima dos pinos. Mede todos visíveis
    // e devolve o display de antes; o declutter em seguida decide de novo.
    // Escreve tudo, lê tudo, restaura: um reflow só, não um por rótulo.
    const displays = this.rotulos.map((r) => r.el.style.display);
    for (const r of this.rotulos) {
      r.el.style.display = 'block';
      if (r.comTime) r.span.style.fontSize = '';
    }
    for (const r of this.rotulos) {
      r.w = r.span.offsetWidth;
      r.h = r.span.offsetHeight;
    }
    this.rotulos.forEach((r, i) => (r.el.style.display = displays[i]));
  }

  /**
   * Estádios muito próximos na tela (Londres tem 6) ficariam empilhados. Os
   * pinos se afastam o mínimo necessário e uma linha fina liga cada um ao ponto
   * exato do estádio. Com zoom, eles voltam sozinhos para o lugar certo.
   */
  private declutter(): void {
    if (!this.mapa || this.waypoints.length === 0) {
      this.layoutRotulos([]);
      return;
    }
    const escala = this.escalaWaypoint();
    // Caixas dos nomes de cidade com time. Eles ficam fixos NO ponto da cidade
    // (como no Maps), entao sao obstaculo para os pinos, e nao o contrario.
    const caixasCidade = this.caixasCidadesComTime();
    // O pino encolhe com o zoom, entao a distancia minima encolhe junto —
    // senao eles se afastariam mais do que o proprio tamanho pede.
    const gap = MIN_GAP * escala;

    const orig = this.waypoints.map((w) => this.mapa!.project([w.clube.lng, w.clube.lat]));
    const pos = orig.map((p) => ({ x: p.x, y: p.y }));

    for (let it = 0; it < 40; it++) {
      let mexeu = false;
      for (let i = 0; i < pos.length; i++) {
        for (let j = i + 1; j < pos.length; j++) {
          let dx = pos[j].x - pos[i].x;
          let dy = pos[j].y - pos[i].y;
          let d = Math.hypot(dx, dy);
          if (d >= gap) continue;
          if (d < 0.01) {
            // exatamente sobrepostos: desempata num ângulo determinístico
            const a = (i * 2.4 + j) % 6.283;
            dx = Math.cos(a);
            dy = Math.sin(a);
            d = 1;
          }
          const empurrao = (gap - d) / 2 + 0.1;
          pos[i].x -= (dx / d) * empurrao;
          pos[i].y -= (dy / d) * empurrao;
          pos[j].x += (dx / d) * empurrao;
          pos[j].y += (dy / d) * empurrao;
          mexeu = true;
        }
      }
      // Empurra o pino para fora do nome da cidade, pelo lado mais curto.
      for (let i = 0; i < pos.length; i++) {
        for (const c of caixasCidade) {
          const meiaL = (WP_LARGURA / 2) * escala;
          const caixaPino = {
            x1: pos[i].x - meiaL,
            x2: pos[i].x + meiaL,
            y1: pos[i].y - WP_ALTURA * escala,
            y2: pos[i].y + 2,
          };
          if (areaSobreposta(caixaPino, c) <= 0) continue;
          const saidaEsq = c.x1 - caixaPino.x2;
          const saidaDir = c.x2 - caixaPino.x1;
          const saidaCima = c.y1 - caixaPino.y2;
          const saidaBaixo = c.y2 - caixaPino.y1;
          const opcoes = [saidaEsq, saidaDir, saidaCima, saidaBaixo];
          let menor = 0;
          for (let k = 1; k < 4; k++) if (Math.abs(opcoes[k]) < Math.abs(opcoes[menor])) menor = k;
          if (menor < 2) pos[i].x += opcoes[menor];
          else pos[i].y += opcoes[menor];
          mexeu = true;
        }
      }

      if (!mexeu) break;
    }

    this.waypoints.forEach((w, i) => {
      const ox = pos[i].x - orig[i].x;
      const oy = pos[i].y - orig[i].y;
      const len = Math.hypot(ox, oy);
      w.marker.setOffset([ox, oy]);
      // No BOTAO, nunca no elemento raiz: o raiz e posicionado pelo MapLibre
      // via transform, e escrever transform la quebraria o posicionamento.
      w.btn.style.setProperty('--ml-escala', String(escala));
      const visivel = len > 2 ? 'block' : 'none';
      w.lead.style.display = visivel;
      w.spot.style.display = visivel;
      w.lead.style.width = `${len}px`;
      w.lead.style.transform = `rotate(${Math.atan2(-oy, -ox)}rad)`;
      w.spot.style.left = `${WP_LARGURA / 2 - ox - 3.5}px`;
      w.spot.style.top = `${WP_ALTURA - oy - 3.5}px`;
    });

    // Caixa de colisao de cada waypoint: a uniao do pino deslocado (cabeca +
    // ponta, ja na escala atual) com o ponto do estadio. Como e um retangulo
    // que contem as duas pontas, ele cobre tambem a linha fina entre elas —
    // que antes ficava de fora e deixava rotulo por cima dela.
    const meiaLargura = (WP_LARGURA / 2) * escala + 1;
    const alturaPino = WP_ALTURA * escala + 2;
    const caixas = pos.map((q, i) => {
      const o = orig[i];
      return {
        x1: Math.min(q.x - meiaLargura, o.x - 5),
        x2: Math.max(q.x + meiaLargura, o.x + 5),
        y1: Math.min(q.y - alturaPino, o.y - 5),
        y2: Math.max(q.y + 2, o.y + 5),
      };
    });

    this.layoutRotulos(caixas);
  }

  /**
   * Posiciona os nomes das cidades desviando dos waypoints e uns dos outros.
   *
   * Cidade COM time fica centrada no ponto da cidade e sempre aparece — quem
   * sai da frente sao os pinos. Cidade SEM time procura lugar livre em 4
   * direcoes e 2 distancias, e some quando nao cabe.
   * Rank 2 e 3 so a partir de zoomDoRank.
   *
   * Cidades de paises vizinhos cedem lugar as do pais. Com Bristol escrito por
   * cima do ponto de Cardiff, o leitor ligava o ponto ao nome errado; entao os
   * nomes evitam o ponto de uma vizinha quando ha outra direcao livre na mesma
   * distancia, e a vizinha com o ponto coberto mesmo assim some ate o zoom
   * abrir espaco. As cidades do pais seguem o layout de sempre: aplicar essas
   * regras a elas escondia nomes que o usuario ja via (Kassel, Magdeburg).
   */
  private layoutRotulos(caixasPinos: Caixa[]): void {
    if (!this.mapa) return;
    const postas = caixasPinos.slice();
    const z = this.mapa.getZoom();
    const zMin = this.mapa.getMinZoom();
    const rankVisivel = (rank: number) => z >= zoomDoRank(rank, zMin);
    const cw = this.mapa.getContainer().clientWidth;
    const ch = this.mapa.getContainer().clientHeight;
    const pad = 4;
    const naTela = (p: { x: number; y: number }) =>
      p.x >= -50 && p.y >= -50 && p.x <= cw + 50 && p.y <= ch + 50;

    // Pontos das vizinhas que podem aparecer. Calculados antes do laco porque
    // elas sao posicionadas por ultimo, depois dos nomes que as cobririam.
    const pontosVizinhas = new Map<RotuloRuntime, Caixa>();
    for (const l of this.rotulos) {
      if (!l.vizinha || !rankVisivel(l.rank)) continue;
      const p = this.mapa.project([l.lng, l.lat]);
      if (naTela(p)) pontosVizinhas.set(l, { x1: p.x - 5, x2: p.x + 5, y1: p.y - 5, y2: p.y + 5 });
    }

    const corpo = this.corpoCidade();
    // As medidas foram tiradas no corpo base; escalar e mais barato que remedir.
    const escalaTexto = corpo / TAM_CIDADE_MAX;

    // 8 direcoes. Cidade com time tenta todas em duas distancias (16 tentativas);
    // cidade sem time mantem as 4 de sempre, na distancia normal.
    // So as cidades SEM time procuram lugar: 4 direcoes em 2 distancias.
    const DIRECOES_MINOR: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const AFASTAMENTO_EXTRA = 18;

    // `this.rotulos` ja vem ordenado por numero de clubes (ver criarRotulos):
    // quem tem mais clubes escolhe posicao primeiro.
    for (const l of this.rotulos) {
      const mostrar = l.comTime || rankVisivel(l.rank);
      const p = this.mapa.project([l.lng, l.lat]);
      if (!mostrar || !naTela(p)) {
        l.el.style.display = 'none';
        continue;
      }

      if (l.comTime) l.span.style.fontSize = `${corpo.toFixed(1)}px`;
      const W = (l.comTime ? l.w * escalaTexto : l.w) / 2;
      const H = (l.comTime ? l.h * escalaTexto : l.h) / 2;
      const g = l.comTime ? 10 : 7;

      // Cidade COM time: o nome fica centrado NO ponto da cidade, como no Maps.
      // Nao procura lugar livre — quem desvia sao os pinos (ver declutter).
      if (l.comTime) {
        l.el.style.display = 'block';
        l.marker.setOffset([0, 0]);
        postas.push({
          x1: p.x - W - pad,
          x2: p.x + W + pad,
          y1: p.y - H - pad,
          y2: p.y + H + pad,
        });
        continue;
      }

      const meuPonto: Caixa = { x1: p.x - 5, x2: p.x + 5, y1: p.y - 5, y2: p.y + 5 };

      // Vizinha com o ponto ja coberto por um nome (ou pelo ponto de outra
      // cidade) posto antes: o nome ficaria ao lado de um ponto que ninguem ve.
      // As caixas dos pinos (o comeco de `postas`) ficam de fora: sao
      // retangulos folgados, pino + linha ate o estadio.
      if (l.vizinha) {
        let coberto = false;
        for (let i = caixasPinos.length; i < postas.length && !coberto; i++) {
          coberto = areaSobreposta(meuPonto, postas[i]) > 0;
        }
        if (coberto) {
          l.el.style.display = 'none';
          continue;
        }
      }

      const distancias = [0, AFASTAMENTO_EXTRA];
      const direcoes = DIRECOES_MINOR;

      // Primeira posicao livre, como sempre — com uma preferencia: dentro da
      // MESMA distancia, uma livre que nao cubra o ponto de uma vizinha ganha
      // da primeira livre. Nunca se afasta mais so por causa de ponto: o nome
      // longe do proprio ponto ocupa o lugar de outros e confunde a leitura.
      let escolhida: { c: [number, number]; caixa: Caixa } | null = null;
      busca: for (const extra of distancias) {
        let primeiraLivre: { c: [number, number]; caixa: Caixa } | null = null;
        for (const [dx, dy] of direcoes) {
          const c: [number, number] = [dx * (W + g + extra), dy * (H + g + extra)];
          const caixa: Caixa = {
            x1: p.x + c[0] - W - pad,
            x2: p.x + c[0] + W + pad,
            y1: p.y + c[1] - H - pad,
            y2: p.y + c[1] + H + pad,
          };
          if (postas.some((b) => areaSobreposta(caixa, b) > 0)) continue;
          let cobre = false;
          for (const [outra, ponto] of pontosVizinhas) {
            if (outra !== l && areaSobreposta(caixa, ponto) > 0) {
              cobre = true;
              break;
            }
          }
          if (!cobre) {
            escolhida = { c, caixa };
            break busca;
          }
          primeiraLivre ??= { c, caixa };
        }
        if (primeiraLivre) {
          escolhida = primeiraLivre;
          break;
        }
      }

      if (!escolhida) {
        l.el.style.display = 'none';
        continue;
      }
      l.el.style.display = 'block';
      l.marker.setOffset(escolhida.c);
      if (l.dot) {
        l.dot.style.left = `${-escolhida.c[0] - 3.5}px`;
        l.dot.style.top = `${-escolhida.c[1] - 3.5}px`;
        postas.push(meuPonto);
      }
      postas.push(escolhida.caixa);
    }
  }

  // --- API para os controles ----------------------------------------------

  /** Volta ao enquadramento do pais, desligando a inclinacao. */
  voltarEnquadramento(): void {
    if (!this.mapa) return;
    this.definir3D(false);
    this.mapa.fitBounds(this.config().enquadramento.bounds, {
      padding: this.paddingEfetivo(),
      pitch: 0,
      bearing: 0,
      duration: this.movimentoReduzido() ? 0 : 1200,
    });
  }

  /**
   * Leva a camera ate o clube: centraliza no estadio e aproxima um pouco.
   *
   * `offset` compensa os paineis. O centro da viewport nao e o centro da area
   * VISIVEL — com 360px de painel a esquerda e 420 a direita, o meio util fica
   * 30px a esquerda. Sem isso o clube pararia parcialmente atras do painel.
   *
   * O zoom nunca diminui: se o usuario ja estava mais perto, respeita.
   */
  voarPara(lng: number, lat: number): void {
    if (!this.mapa) return;
    const p = this.paddingEfetivo();
    this.mapa.easeTo({
      center: [lng, lat],
      zoom: Math.max(this.mapa.getZoom(), ZOOM_AO_SELECIONAR),
      offset: [(p.left - p.right) / 2, (p.top - p.bottom) / 2],
      duration: this.movimentoReduzido() ? 0 : 900,
    });
  }

  aproximar(): void {
    this.mapa?.zoomIn();
  }

  afastar(): void {
    this.mapa?.zoomOut();
  }

  /**
   * Vista 3D: liga o terreno (mesma fonte de relevo do hillshade) e inclina a
   * camera. Desligar volta o pitch a 0 e remove o terreno — mante-lo ligado
   * sem inclinacao so custaria processamento.
   */
  definir3D(ligado: boolean): void {
    if (!this.mapa) return;
    this.mapa.setTerrain(ligado ? { source: 'relevo', exaggeration: 1.4 } : null);
    this.mapa.easeTo({
      pitch: ligado ? 45 : 0,
      duration: this.movimentoReduzido() ? 0 : 900,
    });
  }

  private movimentoReduzido(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.aoRedimensionar);
    document.fonts?.removeEventListener('loadingdone', this.aoCarregarFontes);
    this.observador?.disconnect();
    this.limparMarcadores();
    // Libera o contexto WebGL e os listeners internos do MapLibre.
    this.mapa?.remove();
  }
}
