import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { API_URL } from '../../shared/api.util';
import { AtlasGlobe, PAISES_ATLAS, PaisAtlas } from '../../shared/atlas-globe/atlas-globe';
import { calcularDEF, calcularDRI, calcularPAC, calcularPAS, calcularPHY, calcularSHO, traduzirNacionalidade } from '../../shared/jogador-stats.util';
import { traduzirPosicao } from '../../shared/posicoes.util';
import { JogadorService } from '../jogadores/jogador.service';
import { Jogador } from '../jogadores/jogadores';

interface CardExplore {
  titulo: string;
  desc: string;
  img: string;
  link: string | null;
  // mostra a parede de escudos dos clubes (card Times)
  escudos?: boolean;
  // câmera voando pelo globo com as ligas (card Ligas)
  globo?: boolean;
  // loop curto (public/home/cards/): webm primeiro, mp4 de reserva, capa = 1º quadro do loop
  video?: { webm: string; mp4: string; capa: string };
}

interface Desafio {
  titulo: string;
  desc: string;
  img: string;
}

interface Wonderkid {
  id: number | null;
  nome: string;
  clube: string;
  pais: string;
  nacionalidade: string;
  posicao: string;
  idade: number;
  ovr: number;
  pot: number | null;
  valor: string | null;
  atributos: Array<{ sigla: string; valor: number }>;
}

interface Particula {
  x: number;
  y: number;
  r: number;
  vy: number;
  fase: number;
  amp: number;
  a: number;
  brilho: boolean;
}

// ordem do radar, no sentido horário a partir do topo
const RADAR = ['RIT', 'FIN', 'PAS', 'CON', 'DEF', 'FÍS'];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, AtlasGlobe],
  templateUrl: './home.html',
  // Três arquivos por causa do budget anyComponentStyle; a ordem importa.
  styleUrls: ['./home.scss', './home-2.scss', './home-3.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly img = '/home';

  readonly heroImg = `${this.img}/bento-jogadores.png`;
  readonly ctaImg = `${this.img}/asset-scouting.png`;
  readonly wonderkidImg = `${this.img}/card-lamine.webp`;

  private videoCard(nome: string) {
    const base = `${this.img}/cards/${nome}`;
    return { webm: `${base}.webm`, mp4: `${base}.mp4`, capa: `${base}-poster.jpg` };
  }

  readonly cards: CardExplore[] = [
    { titulo: 'Jogadores', desc: 'Atributos, potencial, valor de mercado e salário de todos os jogadores do jogo.', img: `${this.img}/asset-wonderkids.png`, link: '/jogadores', video: this.videoCard('jogadores') },
    { titulo: 'Times', desc: 'Elenco completo, orçamento de transferências e folha salarial de cada clube.', img: `${this.img}/asset-times.png`, link: '/times', escudos: true },
    { titulo: 'Ligas', desc: 'As principais ligas do mundo, com os clubes de cada uma em um mapa interativo.', img: `${this.img}/asset-globo-mundo.png`, link: '/ligas', globo: true },
  ];

  // TODO: sem tela de desafios ainda no projeto — cards ficam sem navegação
  readonly desafios: Desafio[] = [
    { titulo: 'Reconstrução', desc: 'Assuma um gigante em crise e devolva o clube ao topo em cinco temporadas.', img: `${this.img}/asset-reconstrucao.png` },
    { titulo: 'Road to Glory', desc: 'Comece na quarta divisão e suba até a Champions League.', img: `${this.img}/asset-road-to-glory.png` },
    { titulo: 'Jovens Talentos', desc: 'Só contrate sub-21. A base decide todos os títulos.', img: `${this.img}/asset-jovens-talentos.png` },
    { titulo: 'Desafio Semanal', desc: 'Restrições novas toda semana, criadas e votadas pela comunidade.', img: `${this.img}/asset-desafio.png` },
  ];

  // chips do "Futebol do mundo": bandeira (flagcdn) + id do país no globo (PAISES_ATLAS)
  readonly paises = [
    { id: 'br', bandeira: 'br' },
    { id: 'en', bandeira: 'gb-eng' },
    { id: 'es', bandeira: 'es' },
    { id: 'it', bandeira: 'it' },
    { id: 'de', bandeira: 'de' },
    { id: 'fr', bandeira: 'fr' },
    { id: 'ar', bandeira: 'ar' },
    { id: 'pt', bandeira: 'pt' },
  ].map((p) => ({ ...p, nome: PAISES_ATLAS.find((a) => a.id === p.id)?.nome ?? p.id }));

  // signals: o app é zoneless, então o que chega por HTTP ou evento do globo precisa avisar a view
  // escudos dos clubes de maior overall médio, divididos em 5 colunas para a parede do card Times
  readonly colunasEscudos = signal<Array<Array<{ nome: string; url: string }>>>([]);

  // paradas do voo do globo do card Ligas; x/y = posição do país na foto do globo (fração de 1920 px)
  private readonly paradasLigas = [
    { nome: 'Premier League', pais: 'Inglaterra', logo: '/ligas/Premier League.png', x: 0.522, y: 0.205 },
    { nome: 'LaLiga', pais: 'Espanha', logo: '/ligas/La Liga.png', x: 0.502, y: 0.272 },
    { nome: 'Bundesliga', pais: 'Alemanha', logo: '/ligas/Bundesliga.png', x: 0.572, y: 0.205 },
    { nome: 'Serie A', pais: 'Itália', logo: '/ligas/Serie A.png', x: 0.588, y: 0.262 },
    { nome: 'Ligue 1', pais: 'França', logo: '/ligas/Ligue 1.png', x: 0.535, y: 0.232 },
    { nome: 'Brasileirão', pais: 'Brasil', logo: '/ligas/Brasileirao.png', x: 0.3, y: 0.64 },
    { nome: 'MLS', pais: 'Estados Unidos', logo: '/ligas/Major League Soccer.png', x: 0.2, y: 0.3 },
  ].map((p) => ({ ...p, logo: encodeURI(p.logo) }));
  readonly ligaAtual = signal<{ nome: string; pais: string; logo: string } | null>(null);
  readonly paisSelecionado = signal<PaisAtlas>(PAISES_ATLAS[0]);

  // valores de exemplo, trocados pelos da base assim que a API responde
  readonly wonderkid = signal<Wonderkid>({
    id: null,
    nome: 'Lamine Yamal',
    clube: 'FC Barcelona',
    pais: 'es',
    nacionalidade: 'Espanha',
    posicao: 'PD',
    idade: 19,
    ovr: 90,
    pot: 94,
    valor: '€ 120,5M',
    atributos: [86, 84, 87, 93, 38, 62].map((valor, i) => ({ sigla: RADAR[i], valor })),
  });

  private readonly cleanupFns: Array<() => void> = [];
  private reduced = false;

  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly http: HttpClient,
    private readonly jogadorService: JogadorService,
  ) {}

  ngOnInit(): void {
    this.jogadorService.listar(0, 1, 'Lamine Yamal').subscribe({
      next: (res) => {
        const j = res.jogadores?.[0];
        if (j) this.wonderkid.set(this.montarWonderkid(j));
      },
      error: () => {},
    });

    // a API já devolve os times ordenados pelo overall médio; sem resposta, o card fica com a foto
    this.http
      .get<{ times: Array<{ nome: string; escudoUrl?: string }> }>(`${API_URL}/times`, { params: { page: 0, size: 40 } })
      .subscribe({
        next: (res) => {
          const escudos = (res.times ?? []).filter((t) => t.escudoUrl).slice(0, 25).map((t) => ({ nome: t.nome, url: t.escudoUrl! }));
          if (escudos.length < 8) return;
          // 5 colunas: o card é largo desde que o Explore passou a ter 3 cards
          const colunas: Array<Array<{ nome: string; url: string }>> = [[], [], [], [], []];
          escudos.forEach((e, i) => colunas[i % 5].push(e));
          this.colunasEscudos.set(colunas);
        },
        error: () => {},
      });
  }

  ngAfterViewInit(): void {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.reveals();
    this.parallax();
    this.host.querySelectorAll<HTMLCanvasElement>('canvas[data-particles]').forEach((cv) =>
      this.particulas(cv, Number(cv.dataset['particles']) || 60)
    );
    const palco = this.host.querySelector<HTMLCanvasElement>('canvas[data-palco]');
    if (palco) this.palco(palco);
    this.videosDosCards();
    this.globoLigas();
  }

  ngOnDestroy(): void {
    this.cleanupFns.forEach((fn) => fn());
  }

  onCountrySelect(pais: PaisAtlas): void {
    this.paisSelecionado.set(pais);
  }

  selecionarPais(id: string): void {
    const pais = PAISES_ATLAS.find((p) => p.id === id);
    if (pais) this.paisSelecionado.set(pais);
  }

  // --- radar hexagonal do wonderkid (viewBox 300 × 300, centro 150,150) ------------------------
  readonly radarRaio = 100;

  private ponto(i: number, raio: number): [number, number] {
    const ang = ((-90 + i * 60) * Math.PI) / 180;
    return [150 + Math.cos(ang) * raio, 150 + Math.sin(ang) * raio];
  }

  private hexagono(raio: number): string {
    return RADAR.map((_, i) => this.ponto(i, raio).map((n) => n.toFixed(1)).join(',')).join(' ');
  }

  readonly radarGrade = [1, 0.66, 0.33].map((f) => this.hexagono(this.radarRaio * f));
  readonly radarEixos = RADAR.map((_, i) => this.ponto(i, this.radarRaio));

  radarPontos(): Array<[number, number]> {
    return this.wonderkid().atributos.map((a, i) => this.ponto(i, (this.radarRaio * a.valor) / 100));
  }

  radarForma(): string {
    return this.radarPontos().map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  }

  // tudo de um atributo junto (rótulo, ponto do dado e fim do eixo), para o hover do
  // template destacar o conjunto
  radarRotulos() {
    const pontos = this.radarPontos();
    return this.wonderkid().atributos.map((a, i) => {
      const [x, y] = this.ponto(i, this.radarRaio + 32);
      const [px, py] = pontos[i];
      const [ex, ey] = this.radarEixos[i];
      return { ...a, x, y, px, py, ex, ey };
    });
  }

  private montarWonderkid(j: Jogador): Wonderkid {
    const base = this.wonderkid();
    const valores = [calcularPAC(j), calcularSHO(j), calcularPAS(j), calcularDRI(j), calcularDEF(j), calcularPHY(j)];
    return {
      id: j.id,
      nome: j.nome,
      clube: j.timeAtual ?? base.clube,
      pais: j.paisCodigo ?? base.pais,
      nacionalidade: j.nacionalidade ? traduzirNacionalidade(j.nacionalidade) : base.nacionalidade,
      posicao: traduzirPosicao(j.posicao) || base.posicao,
      idade: j.idade ?? base.idade,
      ovr: j.overall ?? base.ovr,
      pot: j.potencial ?? base.pot,
      valor: j.valor ? `€ ${(j.valor / 1_000_000).toFixed(1).replace('.', ',')}M` : base.valor,
      atributos: valores.map((v, i) => ({ sigla: RADAR[i], valor: v ?? base.atributos[i].valor })),
    };
  }

  private get host(): HTMLElement {
    return this.el.nativeElement;
  }

  // --- loop de canvas compartilhado -----------------------------------------------------------
  // Redimensiona com o bloco pai, pausa fora da tela e com a aba oculta. Com
  // prefers-reduced-motion desenha um quadro só (no instante `parado`) e não anima.
  private animarCanvas(
    cv: HTMLCanvasElement,
    desenhar: (ctx: CanvasRenderingContext2D, W: number, H: number, dt: number, tempo: number) => void,
    opts: { dprMax?: number; parado?: number } = {}
  ): void {
    const ctx = cv.getContext('2d');
    const caixa = cv.parentElement;
    if (!ctx || !caixa) return;
    const dpr = Math.min(opts.dprMax ?? 2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const medir = () => {
      W = caixa.clientWidth;
      H = caixa.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();

    if (this.reduced) {
      desenhar(ctx, W, H, 0, opts.parado ?? 0);
      return;
    }

    let raf: number | null = null;
    let ultimo = 0;
    let tempo = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // teto de 0,1 s por quadro: evita salto depois de um travamento, mas mantém o
      // ciclo de 12 s no tempo certo mesmo em aparelhos lentos (até ~10 fps)
      const dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : 0;
      ultimo = t;
      tempo += dt;
      desenhar(ctx, W, H, dt, tempo);
    };
    const ligar = (on: boolean) => {
      if (on && raf == null && !document.hidden) {
        ultimo = 0;
        raf = requestAnimationFrame(tick);
      } else if (!on && raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    let visivel = false;
    const io = new IntersectionObserver((e) => ligar((visivel = e[0].isIntersecting)), { threshold: 0 });
    io.observe(caixa);
    const ro = new ResizeObserver(medir);
    ro.observe(caixa);
    const aba = () => ligar(visivel && !document.hidden);
    document.addEventListener('visibilitychange', aba);
    this.cleanupFns.push(() => {
      ligar(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', aba);
    });
  }

  // --- partículas verdes: uma por <canvas data-particles="N"> ---------------------------------
  private particulas(cv: HTMLCanvasElement, qtd: number): void {
    const nova = (inicio: boolean): Particula => ({
      x: Math.random(),
      y: inicio ? Math.random() : 1.04,
      r: 0.6 + Math.random() * 1.9,
      vy: 0.012 + Math.random() * 0.035, // fração da altura por segundo
      fase: Math.random() * Math.PI * 2,
      amp: 4 + Math.random() * 14,
      a: 0.2 + Math.random() * 0.6,
      brilho: Math.random() > 0.8,
    });
    const ps = Array.from({ length: qtd }, () => nova(true));

    this.animarCanvas(cv, (ctx, W, H, dt) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y -= p.vy * dt;
        p.fase += dt * 0.9;
        if (p.y < -0.04) Object.assign(p, nova(false));
        const x = p.x * W + Math.sin(p.fase) * p.amp;
        const y = p.y * H;
        const a = p.a * (0.55 + 0.45 * Math.sin(p.fase * 1.7));
        if (p.brilho) {
          ctx.fillStyle = `rgba(0,230,95,${(a * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, p.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = p.brilho ? `rgba(190,255,215,${a.toFixed(3)})` : `rgba(0,230,95,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // --- palco do hero: holofotes, luzes da torcida e faixas de LED ------------------------------
  // Ciclo de 12 s que fecha em loop: arena escura → holofotes varrem → os cinco convergem
  // no jogador → voltam à posição inicial. Tudo é posicionado em coordenadas da FOTO
  // (fração da largura/altura de bento-jogadores.png) e convertido para a tela a cada
  // quadro, então acompanha o background-size/position de cada breakpoint, a aproximação
  // da câmera e o parallax. O lado esquerdo (texto) fica de fora.
  private palco(cv: HTMLCanvasElement): void {
    const img = this.host.querySelector<HTMLElement>('.fn-hero-img');
    if (!img) return;
    const CICLO = 12;
    const PROPORCAO = 2176 / 1259; // tamanho original da foto do hero
    const JOGADOR: [number, number] = [0.7, 0.4]; // peito do jogador
    const TAU = Math.PI * 2;
    const ss = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };

    // ---- texturas pré-desenhadas uma vez (esticadas/giradas a cada quadro) ----
    const textura = (w: number, h: number, pixel: (x: number, y: number) => [number, number, number, number]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d')!;
      const d = g.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const [r, gg, b, a] = pixel(x / (w - 1), (y / (h - 1)) * 2 - 1);
          const i = (y * w + x) * 4;
          d.data[i] = r;
          d.data[i + 1] = gg;
          d.data[i + 2] = b;
          d.data[i + 3] = a * 255;
        }
      }
      g.putImageData(d, 0, 0);
      return c;
    };
    // cone de luz: origem à esquerda (x = 0), abre para a direita. Perfil gaussiano na
    // largura, queda de intensidade no comprimento e raios internos saindo da origem.
    const cone = textura(512, 256, (u, v) => {
      const largura = 0.03 + 0.97 * u;
      const d = v / largura;
      const perfil = Math.exp(-d * d * 2.4);
      const queda = Math.pow(1 - u, 1.35) * 0.85 + 0.15 * (1 - u);
      const raios = 0.78 + 0.22 * Math.sin(d * 19 + Math.sin(d * 6.3) * 2.1) * Math.sin(d * 7.7 + 1.3);
      const nucleo = Math.exp(-u * 18) * 0.6; // o feixe é muito mais denso logo na saída
      return [236, 246, 240, Math.min(1, (queda * raios + nucleo) * perfil)];
    });
    // risco de brilho alongado (flare anamórfico, pulsos das faixas de LED)
    const risco = (r: number, g: number, b: number) =>
      textura(256, 32, (u, v) => {
        const x = (u - 0.5) * 2;
        return [r, g, b, Math.exp(-x * x * 5) * Math.exp(-v * v * 9)];
      });
    const riscoBranco = risco(225, 240, 255);
    const riscoVerde = risco(0, 230, 95);

    // o = refletor de origem (y < 0: no teto, fora do quadro); busca = onde mira enquanto
    // procura; mira = pequeno desvio em volta do jogador para os feixes não se sobreporem
    const holofotes = [
      { o: [0.54, 0.32], busca: [0.5, 0.66], fase: 0.0, mira: [-0.03, 0.05] },
      { o: [0.59, 0.32], busca: [0.63, 0.74], fase: 1.3, mira: [0.025, -0.03] },
      { o: [0.87, 0.23], busca: [0.86, 0.68], fase: 2.6, mira: [0.02, 0.06] },
      { o: [0.98, 0.14], busca: [0.95, 0.6], fase: 3.9, mira: [-0.015, -0.05] },
      { o: [0.76, -0.06], busca: [0.8, 0.78], fase: 5.2, mira: [0, 0.01] },
    ].map((h) => ({
      ...h,
      // poeira suspensa: só aparece onde a luz do feixe passa (u = ao longo, v = na largura)
      poeira: Array.from({ length: 34 }, () => ({
        u: 0.08 + Math.random() * 0.9,
        v: (Math.random() * 2 - 1) * 0.8,
        k: 1 + Math.floor(Math.random() * 4),
        fase: Math.random() * TAU,
        r: 0.6 + Math.random() * 1.2,
      })),
    }));

    // luzes da torcida: só na arquibancada à direita do texto e fora da silhueta do jogador.
    // k inteiro = quantas piscadas por ciclo, para o loop fechar sem salto
    const luzes: Array<{ x: number; y: number; r: number; fase: number; k: number; verde: boolean }> = [];
    while (luzes.length < 320) {
      const x = 0.36 + Math.random() * 0.64;
      const y = 0.34 + Math.random() * 0.28;
      if (x > 0.59 && x < 0.81) continue;
      luzes.push({ x, y, r: 1 + Math.random() * 1.4, fase: Math.random() * TAU, k: 6 + Math.floor(Math.random() * 12), verde: Math.random() < 0.7 });
    }

    // faixas de LED da foto (trechos retos) e o atraso do pulso em cada uma
    const faixas: Array<[[number, number], [number, number], number]> = [
      [[0.36, 0.47], [0.6, 0.468], 0],
      [[0.8, 0.44], [1.0, 0.405], 0.3],
      [[0.36, 0.556], [0.64, 0.553], 0.55],
      [[0.8, 0.522], [1.0, 0.49], 0.8],
    ];

    // converte um ponto da foto para o canvas, lendo o background em uso (segue as media queries)
    const mapa = () => {
      const r = img.getBoundingClientRect();
      const c = cv.getBoundingClientRect();
      const w = img.offsetWidth;
      const h = img.offsetHeight;
      const cs = getComputedStyle(img);
      const iw = cs.backgroundSize.startsWith('cover') ? Math.max(w, h * PROPORCAO) : (parseFloat(cs.backgroundSize) / 100) * w;
      const ih = iw / PROPORCAO;
      const [px, py] = cs.backgroundPosition.split(' ').map((v) => parseFloat(v) / 100);
      const ox = (w - iw) * px;
      const oy = (h - ih) * py;
      const s = r.width / w; // escala da aproximação da câmera
      return {
        escala: iw * s,
        p: (fx: number, fy: number): [number, number] => [r.left - c.left + (ox + fx * iw) * s, r.top - c.top + (oy + fy * ih) * s],
      };
    };

    // desenha uma textura esticada entre dois pontos (a origem fica em `o`)
    const esticar = (ctx: CanvasRenderingContext2D, tex: HTMLCanvasElement, o: [number, number], e: [number, number], meia: number, a: number) => {
      const dx = e[0] - o[0];
      const dy = e[1] - o[1];
      const len = Math.hypot(dx, dy) || 1;
      ctx.save();
      ctx.translate(o[0], o[1]);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.drawImage(tex, 0, -meia, len, meia * 2);
      ctx.restore();
    };

    const brilho = (ctx: CanvasRenderingContext2D, x: number, y: number, raio: number, cor: string, a: number, achatar = 1) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, achatar);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, raio);
      g.addColorStop(0, `rgba(${cor},${a.toFixed(3)})`);
      g.addColorStop(0.35, `rgba(${cor},${(a * 0.45).toFixed(3)})`);
      g.addColorStop(1, `rgba(${cor},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-raio, -raio, raio * 2, raio * 2);
      ctx.restore();
    };

    this.animarCanvas(
      cv,
      (ctx, W, H, _dt, tempo) => {
        const t = tempo % CICLO;
        const volta = (TAU * t) / CICLO; // senos com múltiplos inteiros de `volta` fecham o loop
        const { escala, p } = mapa();
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';

        // intensidade geral: escuro → acende (2,6–5 s) → apaga devagar até o fim do ciclo
        const luz = 0.22 + 0.78 * ss(2.6, 5, t) * (1 - ss(9.6, 12, t));
        let convergencia = 0;

        holofotes.forEach((h, i) => {
          // cada holofote encontra o jogador um pouco depois do anterior e volta antes do fim
          const c = ss(4.2 + i * 0.45, 6.2 + i * 0.45, t) * (1 - ss(8.8 + i * 0.25, 11 + i * 0.25, t));
          convergencia += c / holofotes.length;
          const bx = h.busca[0] + 0.07 * Math.sin(volta * 2 + h.fase);
          const by = h.busca[1] + 0.035 * Math.cos(volta + h.fase * 1.7);
          const mx = JOGADOR[0] + h.mira[0] + 0.004 * Math.sin(volta * 6 + h.fase);
          const my = JOGADOR[1] + h.mira[1] + 0.004 * Math.cos(volta * 5 + h.fase);
          const fx = bx + (mx - bx) * c;
          const fy = by + (my - by) * c;
          const o = p(h.o[0], h.o[1]);
          const e = p(fx, fy);
          // oscilação leve de intensidade, como lâmpada de descarga (múltiplos de `volta`)
          const osc = 0.9 + 0.06 * Math.sin(volta * 17 + h.fase * 3) + 0.04 * Math.sin(volta * 29 + h.fase);
          const a = luz * osc;
          const meia = escala * (0.055 - 0.02 * c); // meia largura do cone na ponta

          // espalhamento largo na névoa + feixe principal
          esticar(ctx, cone, o, e, meia * 2.1, 0.16 * a);
          esticar(ctx, cone, o, e, meia, 0.5 * a);

          // poeira suspensa dentro do feixe
          const dx = e[0] - o[0];
          const dy = e[1] - o[1];
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          for (const q of h.poeira) {
            const u = (q.u + t / CICLO) % 1; // sobe o feixe devagar, uma volta por ciclo
            const v = q.v + 0.08 * Math.sin(volta * q.k + q.fase);
            const larg = meia * (0.03 + 0.97 * u);
            const x = o[0] + dx * u + nx * v * larg;
            const y = o[1] + dy * u + ny * v * larg;
            const alfa = 0.55 * a * Math.exp(-v * v * 2.4) * (1 - u * 0.6) * (0.4 + 0.6 * Math.abs(Math.sin(volta * q.k * 2 + q.fase)));
            if (alfa < 0.02) continue;
            ctx.fillStyle = `rgba(240,250,244,${alfa.toFixed(3)})`;
            ctx.fillRect(x, y, q.r, q.r);
          }

          // mancha de luz: elíptica no gramado enquanto procura; some quando chega no jogador
          if (fy > 0.58) brilho(ctx, e[0], e[1], meia * 1.5, '226,244,232', 0.16 * a * (1 - c), 0.3);

          // refletor aceso: núcleo, halo e o risco horizontal da lente
          brilho(ctx, o[0], o[1], escala * 0.045, '220,238,230', 0.22 * a);
          brilho(ctx, o[0], o[1], escala * 0.009, '255,255,255', 0.95 * a);
          ctx.save();
          ctx.translate(o[0], o[1]);
          ctx.globalAlpha = Math.min(1, 0.5 * a * (0.6 + 0.4 * c));
          ctx.drawImage(riscoBranco, -escala * 0.12, -escala * 0.004, escala * 0.24, escala * 0.008);
          ctx.restore();
        });

        // névoa iluminada onde os feixes se cruzam no jogador (sem estourar a silhueta)
        const alvo = p(JOGADOR[0], JOGADOR[1]);
        brilho(ctx, alvo[0], alvo[1], escala * 0.14, '205,240,220', 0.08 * convergencia);

        // torcida: cintila mais no clímax, com uma onda verde atravessando a arquibancada
        const energia = 0.45 + 0.55 * convergencia;
        for (const l of luzes) {
          const onda = 0.55 + 0.45 * Math.sin(l.x * 9 - volta * 3);
          const pisca = Math.max(0, Math.sin(l.fase + volta * l.k));
          const a = 0.9 * pisca * pisca * energia * onda;
          if (a < 0.02) continue;
          const [x, y] = p(l.x, l.y);
          ctx.fillStyle = l.verde ? `rgba(0,230,95,${a.toFixed(3)})` : `rgba(232,242,237,${(a * 0.8).toFixed(3)})`;
          ctx.fillRect(x, y, l.r, l.r);
        }

        // faixas de LED: um pulso de brilho difuso percorre cada faixa duas vezes por ciclo
        for (const [ini, fim, atraso] of faixas) {
          const u = ((t / CICLO) * 2 + atraso) % 1;
          const a0 = p(ini[0], ini[1]);
          const a1 = p(fim[0], fim[1]);
          const cx = a0[0] + (a1[0] - a0[0]) * u;
          const cy = a0[1] + (a1[1] - a0[1]) * u;
          const meio = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) * 0.22;
          const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
          const de: [number, number] = [cx - Math.cos(ang) * meio, cy - Math.sin(ang) * meio];
          const ate: [number, number] = [cx + Math.cos(ang) * meio, cy + Math.sin(ang) * meio];
          esticar(ctx, riscoVerde, de, ate, escala * 0.016, 0.35 * energia);
          esticar(ctx, riscoVerde, de, ate, escala * 0.004, 0.9 * energia);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      },
      // sem animação (reduced motion): um quadro parado no clímax, holofotes no jogador
      { dprMax: 1.5, parado: 7.5 }
    );
  }

  // --- vídeos dos cards: tocam só visíveis na tela ----------------------------------------------
  // No celular e com prefers-reduced-motion fica só a capa (preload="none": nada é baixado).
  private videosDosCards(): void {
    const videos = Array.from(this.host.querySelectorAll<HTMLVideoElement>('video[data-card-video]'));
    if (!videos.length || this.reduced || window.matchMedia('(max-width: 680px)').matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) {
            v.muted = true; // autoplay só é liberado sem som
            v.preload = 'auto';
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    videos.forEach((v) => io.observe(v));
    this.cleanupFns.push(() => io.disconnect());
  }

  // --- card Ligas: câmera voando pelo globo ---------------------------------------------------
  // Mundo inteiro → aproxima em cada país (pino + selo da liga) → voa ao próximo afastando um
  // pouco no meio do caminho → volta ao mundo e recomeça. Só a transform da foto muda.
  private globoLigas(): void {
    const caixa = this.host.querySelector<HTMLElement>('[data-globo-ligas]');
    const cena = caixa?.querySelector<HTMLElement>('.fn-globo-cena');
    if (!caixa || !cena) return;

    type Camera = { x: number; y: number; s: number };
    // visão de mundo um pouco afastada: o globo inteiro cabe acima do texto do card
    const MUNDO: Camera = { x: 0.5, y: 0.44, s: 0.92 };
    const ZOOM = 3.4;
    const FICA_MUNDO = 2;
    const FICA = 2.6;
    const VOO = 1.8;
    const cameras: Array<Camera & { parada: number }> = [
      { ...MUNDO, parada: -1 },
      ...this.paradasLigas.map((p, i) => ({ x: p.x, y: p.y, s: ZOOM, parada: i })),
    ];
    // linha do tempo: [fica na câmera i] [voa de i para i+1] ... e a última volta ao mundo
    const trechos: Array<{ de: number; para: number; dur: number; voo: boolean }> = [];
    cameras.forEach((c, i) => {
      trechos.push({ de: i, para: i, dur: c.parada < 0 ? FICA_MUNDO : FICA, voo: false });
      trechos.push({ de: i, para: (i + 1) % cameras.length, dur: VOO, voo: true });
    });
    const total = trechos.reduce((t, s) => t + s.dur, 0);
    const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let S = 0;
    let W = 0;
    let H = 0;
    const medir = () => {
      W = caixa.clientWidth;
      H = caixa.clientHeight;
      S = Math.max(W, H); // a foto do globo é quadrada e cobre o card
      cena.style.width = `${S}px`;
      cena.style.height = `${S}px`;
    };
    medir();
    const aplicar = (c: Camera) => {
      // o ponto da câmera fica no alto do card (36%), acima do texto
      const tx = W * 0.5 - c.x * S * c.s;
      const ty = H * 0.36 - c.y * S * c.s;
      cena.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${c.s.toFixed(4)})`;
    };

    if (this.reduced) {
      aplicar(MUNDO);
      return;
    }

    let paradaAtual = -2;
    const quadro = (tempo: number) => {
      let t = tempo % total;
      let k = 0;
      while (t > trechos[k].dur) t -= trechos[k++].dur;
      const tr = trechos[k];
      const a = cameras[tr.de];
      const b = cameras[tr.para];
      let parada = -1;
      if (!tr.voo) {
        aplicar(a);
        parada = a.parada;
      } else {
        const e = suave(t / tr.dur);
        // zoom interpolado em escala logarítmica; entre dois países a câmera se afasta no meio
        let s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * e);
        if (a.parada >= 0 && b.parada >= 0) s *= 1 - 0.45 * Math.sin(Math.PI * (t / tr.dur));
        aplicar({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, s });
      }
      if (parada !== paradaAtual) {
        paradaAtual = parada;
        if (parada >= 0) this.ligaAtual.set(this.paradasLigas[parada]);
        caixa.classList.toggle('is-parado', parada >= 0);
      }
    };

    let raf: number | null = null;
    let ultimo = 0;
    let tempo = 0;
    const tick = (agora: number) => {
      raf = requestAnimationFrame(tick);
      tempo += ultimo ? Math.min(0.1, (agora - ultimo) / 1000) : 0;
      ultimo = agora;
      quadro(tempo);
    };
    const ligar = (on: boolean) => {
      if (on && raf == null && !document.hidden) {
        ultimo = 0;
        raf = requestAnimationFrame(tick);
      } else if (!on && raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };
    aplicar(MUNDO);
    let visivel = false;
    const io = new IntersectionObserver((e) => ligar((visivel = e[0].isIntersecting)), { threshold: 0 });
    io.observe(caixa);
    const ro = new ResizeObserver(() => {
      medir();
      quadro(tempo);
    });
    ro.observe(caixa);
    const aba = () => ligar(visivel && !document.hidden);
    document.addEventListener('visibilitychange', aba);
    this.cleanupFns.push(() => {
      ligar(false);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', aba);
    });
  }

  // --- parallax: [data-parallax="velocidade"] se desloca em relação ao próprio bloco -----------
  private parallax(): void {
    if (this.reduced) return;
    const camadas = Array.from(this.host.querySelectorAll<HTMLElement>('[data-parallax]'));
    const heroFade = this.host.querySelector<HTMLElement>('[data-hero-fade]');
    let pendente = false;
    const aplicar = () => {
      pendente = false;
      const vh = window.innerHeight;
      for (const c of camadas) {
        const bloco = c.parentElement!.getBoundingClientRect();
        if (bloco.bottom < -200 || bloco.top > vh + 200) continue;
        const v = parseFloat(c.dataset['parallax'] || '0');
        // folga da camada (ela é maior que o bloco): nunca desloca além disso, senão aparece o fundo
        const folga = (c.offsetHeight - bloco.height) / 2;
        // no topo da página conta a rolagem; nos demais, a distância do centro da tela
        const bruto = c.hasAttribute('data-parallax-topo')
          ? -Math.min(0, bloco.top) * v
          : (bloco.top + bloco.height / 2 - vh / 2) * -v;
        const desloc = Math.max(-folga, Math.min(folga, bruto));
        c.style.transform = `translate3d(0, ${desloc.toFixed(1)}px, 0)`;
      }
      // o conteúdo do hero some aos poucos ao rolar
      if (heroFade) heroFade.style.opacity = String(Math.max(0, 1 - window.scrollY / 620));
    };
    const onScroll = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(aplicar);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    this.cleanupFns.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });
    aplicar();
  }

  // --- seções entram ao aparecer na tela ------------------------------------------------------
  private reveals(): void {
    if (this.reduced) return;
    const els = this.host.querySelectorAll<HTMLElement>('[data-reveal]');
    els.forEach((el) => {
      el.classList.add('fn-reveal');
      // terminada a entrada, tira as classes para o transform do hover voltar a valer
      el.addEventListener('animationend', (ev) => {
        if (ev.target === el) el.classList.remove('fn-reveal', 'is-in');
      });
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // is-visto fica para sempre: dispara animações internas uma vez só (radar)
          (e.target as HTMLElement).classList.add('is-in', 'is-visto');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    this.cleanupFns.push(() => io.disconnect());
  }
}
