import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AtlasGlobe, PaisAtlas } from '../../shared/atlas-globe/atlas-globe';

interface Liga {
  nome: string;
  pais: string;
  jogadores: string;
  escudo: string;
}

interface Atributo {
  nome: string;
  valor: number;
}

interface Desafio {
  num: string;
  titulo: string;
  icone: string;
  desc: string;
  slotC: string;
  foto: string;
  delay: number;
  img: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, AtlasGlobe],
  templateUrl: './home.html',
  // Tres arquivos por causa do budget anyComponentStyle; a ordem importa.
  styleUrls: ['./home.scss', './home-2.scss', './home-3.scss'],
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private readonly imgBase = '/home';

  readonly heroVideoSrc = `${this.imgBase}/hero-stadium.mp4`;

  private readonly ligasBase = `${this.imgBase}/ligas`;

  readonly ligas: Liga[] = [
    { nome: 'Premier League', pais: 'Inglaterra', jogadores: '1.240', escudo: `/ligas/Premier League.png` },
    { nome: 'LaLiga', pais: 'Espanha', jogadores: '1.180', escudo: `/ligas/laliga-foto-home.png` },
    { nome: 'Bundesliga', pais: 'Alemanha', jogadores: '980', escudo: `/ligas/Bundesliga-home.png` },
    { nome: 'Serie A', pais: 'Itália', jogadores: '1.060', escudo: `/ligas/Serie-A-home.png` },
    { nome: 'Ligue 1', pais: 'França', jogadores: '910', escudo: `/ligas/Ligue-1-Logo-home.png` },
    { nome: 'Brasileirão', pais: 'Brasil', jogadores: '1.320', escudo: `/ligas/Brasileirao.png` },
    { nome: 'Liga Argentina', pais: 'Argentina', jogadores: '870', escudo: `/ligas/Liga Profesional de Fútbol.png` },
    { nome: 'MLS', pais: 'Estados Unidos', jogadores: '640', escudo: `/ligas/mls-home.png` },
  ];

  readonly atributos: Atributo[] = [
    { nome: 'Drible', valor: 89 },
    { nome: 'Velocidade', valor: 86 },
    { nome: 'Finalização', valor: 73 },
    { nome: 'Passe', valor: 87 },
    { nome: 'Físico', valor: 55 },
    { nome: 'Defesa', valor: 22 },
  ];

readonly desafios: Desafio[] = [
  {
    num: '01',
    titulo: 'Reconstrução',
    icone: 'construction',
    desc: 'Assuma um gigante em crise e devolva o clube ao topo em cinco temporadas.',
    slotC: 'c-des-1',
    foto: 'Túnel do estádio',
    delay: 0,
    img: `${this.imgBase}/asset-reconstrucao.png`,
  },
  {
    num: '02',
    titulo: 'Road to Glory',
    icone: 'trending_up',
    desc: 'Comece na quarta divisão e suba até a Champions League.',
    slotC: 'c-des-2',
    foto: 'Campo de várzea',
    delay: 90,
    img: `${this.imgBase}/asset-road-to-glory.png`,
  },
  {
    num: '03',
    titulo: 'Jovens Talentos',
    icone: 'auto_awesome',
    desc: 'Só contrate sub-21. A base decide todos os títulos.',
    slotC: 'c-des-3',
    foto: 'Categoria de base',
    delay: 180,
    img: `${this.imgBase}/asset-jovens-talentos.png`,
  },
  {
    num: '04',
    titulo: 'Desafio',
    icone: 'local_fire_department',
    desc: 'Restrições semanais criadas e votadas pela comunidade.',
    slotC: 'c-des-4',
    foto: 'Silhuetas no vestiário',
    delay: 270,
    img: `${this.imgBase}/asset-desafio.png`,
  },
];
 
readonly imgBentoJogadores = `${this.imgBase}/bento-jogadores.png`;
readonly imgBentoTimes = `${this.imgBase}/asset-times.png`;
 
// ainda falta o arquivo físico — troque o nome abaixo assim que adicionar
// a imagem em public/home/, ou me diga qual imagem existente usar por ora
readonly imgWonderkid = `${this.imgBase}/card-lamine.webp`;
readonly imgWonderkidsCard = `${this.imgBase}/asset-wonderkids.png`;
readonly imgComparadorCard = `${this.imgBase}/asset-comparador.png`;
readonly imgScoutingCard = `${this.imgBase}/asset-scouting.png`;

  // dados da nação selecionada no Atlas — inicia com o primeiro país do globo (Brasil)
  paisSelecionado: PaisAtlas = {
    id: 'br',
    nome: 'Brasil',
    lat: -14.2,
    lon: -51.9,
    ligas: 7,
    jogadores: 1320,
    top: 'Brasileirão Série A',
  };

  private reduced = false;
  private heroRaf: number | null = null;
  private readonly cleanupFns: Array<() => void> = [];

  constructor(private readonly el: ElementRef<HTMLElement>, private readonly router: Router) {}

  // navega pra Times com o mesmo filtro por liga que a tela de Ligas já usa (LigasComponent.verTimes)
  irParaTimes(liga: Liga): void {
    this.router.navigate(['/times'], {
      queryParams: { liga: liga.nome, ligaExibicao: liga.nome },
    });
  }

  ngAfterViewInit(): void {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.splitTitle();
    this.reveals();
    this.parallax();
    this.magnets();
    this.tilt();
    this.shrinkHeader();
    this.heroCanvas();
    this.stars();
    this.setupHeroVideo();

    if (this.reduced) {
      this.host.querySelectorAll<HTMLElement>('[data-marquee]').forEach((m) => (m.style.animation = 'none'));
    }
  }

  ngOnDestroy(): void {
    if (this.heroRaf) cancelAnimationFrame(this.heroRaf);
    this.cleanupFns.forEach((fn) => fn());
  }

  onCountrySelect(pais: PaisAtlas): void {
    this.paisSelecionado = pais;
  }

  private get host(): HTMLElement {
    return this.el.nativeElement;
  }

  // --- título "FUTNERDS" letra a letra -------------------------------------------------
  private splitTitle(): void {
    const el = this.host.querySelector<HTMLElement>('[data-split]');
    if (!el || el.dataset['splitDone']) return;
    el.dataset['splitDone'] = '1';
    const text = el.textContent?.trim() ?? '';
    el.textContent = '';
    el.style.display = 'flex';
    el.style.justifyContent = 'center';
    const spans = [...text].map((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      const from = this.reduced ? 'none' : 'translateY(46px) rotateX(-55deg)';
      s.style.cssText =
        'display:inline-block;opacity:0;transform:' +
        from +
        ';transition:opacity .7s cubic-bezier(.2,.8,.2,1),transform .7s cubic-bezier(.2,.8,.2,1);transition-delay:' +
        (this.reduced ? 0 : 140 + i * 55) +
        'ms';
      el.appendChild(s);
      return s;
    });
    const show = () => spans.forEach((s) => { s.style.opacity = '1'; s.style.transform = 'none'; });
    requestAnimationFrame(() => requestAnimationFrame(show));
    setTimeout(show, 1200);
  }

  // --- reveal on scroll + contadores + barras -------------------------------------------
  private reveals(): void {
    const els = this.host.querySelectorAll<HTMLElement>('[data-reveal]');
    els.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = this.reduced ? 'none' : 'translateY(30px) scale(.985)';
      el.style.transition = 'opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)';
      el.style.transitionDelay = (el.dataset['delay'] || '0') + 'ms';
      el.style.willChange = 'opacity,transform';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.style.opacity = '1';
          el.style.transform = 'none';
          this.staggerChildren(el);
          this.animateNumbers(el);
          this.animateBars(el);
          io.unobserve(el);
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    this.cleanupFns.push(() => io.disconnect());
  }

  private staggerChildren(scope: HTMLElement): void {
    const kids = scope.querySelectorAll<HTMLElement>('[data-stagger]');
    kids.forEach((k, i) => {
      k.style.opacity = '0';
      k.style.transform = this.reduced ? 'none' : 'translateX(-14px)';
      k.style.transition = 'opacity .55s ease,transform .55s cubic-bezier(.2,.8,.2,1)';
      k.style.transitionDelay = i * 60 + 'ms';
      requestAnimationFrame(() => {
        k.style.opacity = '1';
        k.style.transform = 'none';
      });
    });
  }

  private animateBars(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLElement>('[data-bar]').forEach((b) => {
      const v = parseFloat(b.dataset['bar'] || '0') || 0;
      requestAnimationFrame(() => {
        b.style.width = Math.min(100, v) + '%';
      });
    });
  }

  private animateNumbers(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
      const target = parseInt(n.dataset['count'] || '0', 10);
      const k = n.dataset['format'] === 'k';
      const dur = 1500;
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const v = target * e;
        n.textContent = k ? (v / 1000).toFixed(1).replace('.', ',') + 'k' : Math.round(v).toLocaleString('pt-BR');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // --- parallax de scroll (usa window; ajuste para o container certo se sua Home
  //     ficar dentro de um wrapper com overflow próprio) -------------------------------
  private parallax(): void {
    if (this.reduced) return;
    const layers = Array.from(this.host.querySelectorAll<HTMLElement>('[data-parallax]'));
    const inners = Array.from(this.host.querySelectorAll<HTMLElement>('[data-parallax-in]'));
    if (!layers.length && !inners.length) return;

    let ticking = false;
    const apply = () => {
      const y = window.scrollY;
      layers.forEach((l) => {
        const s = parseFloat(l.dataset['parallax'] || '0') || 0;
        l.style.transform = 'translate3d(0,' + (y * s).toFixed(1) + 'px,0)';
      });
      const vh = window.innerHeight;
      inners.forEach((l) => {
        const s = parseFloat(l.dataset['parallaxIn'] || '0') || 0;
        const r = l.getBoundingClientRect();
        const rel = (r.top + r.height / 2 - vh / 2) / vh;
        l.style.setProperty('--py', (rel * vh * s).toFixed(1) + 'px');
        const zoomed = l.dataset['zoomOn'] === '1';
        l.style.transform = 'translate3d(0,' + (rel * vh * s).toFixed(1) + 'px,0)' + (zoomed ? ' scale(1.08)' : '');
      });
      const heroFade = this.host.querySelector<HTMLElement>('[data-hero-fade]');
      if (heroFade) heroFade.style.opacity = String(Math.max(0, 1 - y / 700));
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', onScroll));
    apply();
  }

  // --- botões "magnéticos" ---------------------------------------------------------------
  private magnets(): void {
    if (this.reduced) return;
    this.host.querySelectorAll<HTMLElement>('[data-magnet]').forEach((el) => {
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = 'translate(' + (dx * 9).toFixed(2) + 'px,' + (dy * 6 - 3).toFixed(2) + 'px)';
      };
      const onLeave = () => (el.style.transform = 'translate(0,0)');
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  // --- tilt 3D nos cards do bento ---------------------------------------------------------
  private tilt(): void {
    if (this.reduced) return;
    this.host.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1),border-color .35s';
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transition = 'transform .12s linear,border-color .35s';
        el.style.transform = 'perspective(900px) rotateY(' + (dx * 3.2).toFixed(2) + 'deg) rotateX(' + (-dy * 3.2).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1),border-color .35s';
        el.style.transform = 'none';
      });
    });
  }

  // --- header que encolhe ao rolar --------------------------------------------------------
  private shrinkHeader(): void {
    const h = this.host.querySelector<HTMLElement>('[data-shrink-header]');
    if (!h) return;
    const onScroll = () => {
      const on = window.scrollY > 90;
      h.style.height = on ? '58px' : '70px';
      h.style.background = on ? 'rgba(3,9,6,.86)' : 'rgba(3,9,6,.5)';
      h.style.borderBottomColor = on ? 'rgba(83,245,154,.22)' : 'rgba(255,255,255,.05)';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener('scroll', onScroll));
  }

  // --- partículas / grid de campo no hero (canvas 2D) -------------------------------------
  private heroCanvas(): void {
    const cv = this.host.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const hero = cv.parentElement as HTMLElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0;
    let H = 0;
    const resize = () => {
      W = hero.clientWidth;
      H = hero.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hero);
    this.cleanupFns.push(() => ro.disconnect());

    const parts = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.5,
      s: Math.random() * 0.00016 + 0.00004,
      d: Math.random() * 6.28,
      o: Math.random() * 0.5 + 0.15,
    }));
    const streams = Array.from({ length: 14 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.8,
      len: Math.random() * 0.14 + 0.05,
      v: Math.random() * 0.0022 + 0.0008,
      w: Math.random() > 0.5 ? 1 : 0.6,
    }));
    const rings = [
      { x: 0.5, y: 0.56, r: 0.1, sp: 0.055, off: 0 },
      { x: 0.5, y: 0.56, r: 0.1, sp: 0.055, off: 2.1 },
    ];

    let t = 0;
    let vis = true;
    const io = new IntersectionObserver(
      (e) => {
        vis = e[0].isIntersecting;
        if (vis) {
          if (!this.heroRaf) draw();
        } else if (this.heroRaf) {
          cancelAnimationFrame(this.heroRaf);
          this.heroRaf = null;
        }
      },
      { threshold: 0 }
    );
    io.observe(hero);
    this.cleanupFns.push(() => io.disconnect());

    const draw = () => {
      this.heroRaf = requestAnimationFrame(draw);
      if (!vis || !W) return;
      t += this.reduced ? 0.0015 : 0.006;
      ctx.clearRect(0, 0, W, H);

      const hz = H * 0.6;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 22; i++) {
        const p = i / 22;
        const x0 = W * (0.5 + (p - 0.5) * 0.32);
        const x1 = W * (0.5 + (p - 0.5) * 3.6);
        const g = ctx.createLinearGradient(x0, hz, x1, H);
        g.addColorStop(0, 'rgba(83,245,154,0)');
        g.addColorStop(1, 'rgba(83,245,154,0.16)');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x0, hz);
        ctx.lineTo(x1, H);
        ctx.stroke();
      }
      for (let i = 0; i < 14; i++) {
        const k = i / 14 + ((t * 0.06) % (1 / 14));
        const e = Math.pow(k, 2.4);
        const y = hz + (H - hz) * e;
        const a = 0.05 + e * 0.16;
        ctx.strokeStyle = 'rgba(83,245,154,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      const hg = ctx.createLinearGradient(0, hz - 90, 0, hz + 40);
      hg.addColorStop(0, 'rgba(83,245,154,0)');
      hg.addColorStop(0.7, 'rgba(83,245,154,0.09)');
      hg.addColorStop(1, 'rgba(83,245,154,0)');
      ctx.fillStyle = hg;
      ctx.fillRect(0, hz - 90, W, 130);

      rings.forEach((r) => {
        const ph = ((t * r.sp) + r.off) % 2.4;
        const rad = (r.r + ph * 0.34) * W;
        const a = Math.max(0, 0.22 - ph * 0.1);
        ctx.strokeStyle = 'rgba(83,245,154,' + a.toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(W * r.x, H * r.y, rad, rad * 0.24, 0, 0, 6.283);
        ctx.stroke();
      });

      streams.forEach((s) => {
        s.y += s.v * (this.reduced ? 0.2 : 1);
        if (s.y > 1.2) {
          s.y = -0.2;
          s.x = Math.random();
        }
        const x = s.x * W;
        const y0 = s.y * H;
        const y1 = (s.y + s.len) * H;
        const g = ctx.createLinearGradient(x, y0, x, y1);
        g.addColorStop(0, 'rgba(83,245,154,0)');
        g.addColorStop(0.5, 'rgba(140,255,200,' + 0.3 * s.w + ')');
        g.addColorStop(1, 'rgba(83,245,154,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = s.w;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
      });

      parts.forEach((p) => {
        p.d += 0.01;
        p.y -= p.s * (this.reduced ? 0.15 : 1) * 60;
        if (p.y < -0.05) p.y = 1.05;
        const x = p.x * W + Math.sin(p.d) * 8;
        const y = p.y * H;
        const a = p.o * (0.6 + 0.4 * Math.sin(p.d * 1.6));
        ctx.fillStyle = 'rgba(180,255,215,' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, 6.283);
        ctx.fill();
        if (p.r > 1.6) {
          ctx.fillStyle = 'rgba(83,245,154,' + (a * 0.14).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(x, y, p.r * 5, 0, 6.283);
          ctx.fill();
        }
      });

      const sy = (((t * 0.06) % 1.4) - 0.2) * H;
      const sg = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
      sg.addColorStop(0, 'rgba(83,245,154,0)');
      sg.addColorStop(0.5, 'rgba(83,245,154,0.045)');
      sg.addColorStop(1, 'rgba(83,245,154,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sy - 60, W, 120);
    };
    draw();
  }

  // --- campo de estrelas no fundo do Atlas -------------------------------------------------
  private stars(): void {
    this.host.querySelectorAll<HTMLElement>('[data-stars]').forEach((host) => {
      if (host.childElementCount) return;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 130; i++) {
        const s = document.createElement('span');
        const r = Math.random();
        s.style.cssText =
          'position:absolute;left:' +
          (Math.random() * 100).toFixed(2) +
          '%;top:' +
          (Math.random() * 100).toFixed(2) +
          '%;width:' +
          (r > 0.9 ? 2 : 1) +
          'px;height:' +
          (r > 0.9 ? 2 : 1) +
          'px;border-radius:50%;background:' +
          (r > 0.85 ? '#a9f7cd' : '#e8f2ec') +
          ';opacity:' +
          (0.1 + r * 0.5).toFixed(2) +
          ';animation:fnTwinkle ' +
          (3 + Math.random() * 5).toFixed(1) +
          's ease-in-out ' +
          (Math.random() * 4).toFixed(1) +
          's infinite';
        frag.appendChild(s);
      }
      host.appendChild(frag);
    });
  }

  // --- vídeo do hero: autoplay silencioso + pausa fora da viewport -----------------------
  private setupHeroVideo(): void {
    this.host.querySelectorAll<HTMLVideoElement>('[data-hero-video]').forEach((v) => {
      v.muted = true;
      v.defaultMuted = true;
      v.loop = true;
      v.playsInline = true;

      if (this.reduced) {
        v.pause();
        v.removeAttribute('autoplay');
        return;
      }

      const play = () => v.play().catch(() => {});
      play();
      const io = new IntersectionObserver(
        (e) => {
          if (e[0].isIntersecting) play();
          else v.pause();
        },
        { threshold: 0 }
      );
      io.observe(v);
      this.cleanupFns.push(() => io.disconnect());
    });
  }
}
