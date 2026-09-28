/* ============================================================================
   Holofotes sobre a foto do estádio (fundo do topo do detalhe do time).
   ----------------------------------------------------------------------------
   Versão enxuta do palco da home: feixes de luz saindo dos refletores do teto,
   com poeira suspensa, brilho na lente e uma oscilação leve de intensidade. A
   foto fica parada; só os feixes varrem o gramado, bem devagar. Os refletores
   são dados em coordenadas da FOTO (fração da largura/altura) e convertidos
   para a tela a cada quadro, lendo o background-size/position em uso.
   ============================================================================ */

export interface ConfigHolofotes {
  proporcao: number; // largura / altura da foto original
  refletores: [number, number][]; // origem de cada feixe, na foto
  alvo: [number, number]; // centro do gramado, para onde os feixes apontam
}

const CICLO = 16; // segundos para os feixes irem e voltarem
const TAU = Math.PI * 2;

/** Liga os holofotes no canvas e devolve a função que desliga tudo. */
export function ligarHolofotes(cv: HTMLCanvasElement, foto: HTMLElement, cfg: ConfigHolofotes): () => void {
  const ctx = cv.getContext('2d');
  const caixa = cv.parentElement;
  if (!ctx || !caixa) return () => {};
  const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);

  // ---- texturas pré-desenhadas uma vez (esticadas/giradas a cada quadro) ----
  const textura = (w: number, h: number, pixel: (u: number, v: number) => number, cor: [number, number, number]) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    const d = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        d.data[i] = cor[0];
        d.data[i + 1] = cor[1];
        d.data[i + 2] = cor[2];
        d.data[i + 3] = pixel(x / (w - 1), (y / (h - 1)) * 2 - 1) * 255;
      }
    }
    g.putImageData(d, 0, 0);
    return c;
  };
  // cone: origem à esquerda (u = 0), abre para a direita, com raios internos
  const cone = textura(512, 256, (u, v) => {
    const d = v / (0.03 + 0.97 * u);
    const perfil = Math.exp(-d * d * 2.4);
    const queda = Math.pow(1 - u, 1.35) * 0.85 + 0.15 * (1 - u);
    const raios = 0.78 + 0.22 * Math.sin(d * 19 + Math.sin(d * 6.3) * 2.1) * Math.sin(d * 7.7 + 1.3);
    return Math.min(1, (queda * raios + Math.exp(-u * 18) * 0.6) * perfil);
  }, [236, 246, 240]);
  // risco horizontal da lente (flare)
  const risco = textura(256, 32, (u, v) => {
    const x = (u - 0.5) * 2;
    return Math.exp(-x * x * 5) * Math.exp(-v * v * 9);
  }, [225, 240, 255]);

  const { refletores, alvo } = cfg;
  const holofotes = refletores.map((o, i) => ({
    o,
    fase: (i / refletores.length) * TAU + Math.random() * 0.6,
    // cada feixe mira um ponto diferente do gramado, espalhados em volta do alvo
    mira: [alvo[0] + (o[0] - alvo[0]) * 0.35, alvo[1] + ((i % 3) - 1) * 0.05] as [number, number],
    poeira: Array.from({ length: 26 }, () => ({
      u: 0.08 + Math.random() * 0.9,
      v: (Math.random() * 2 - 1) * 0.8,
      k: 1 + Math.floor(Math.random() * 4),
      fase: Math.random() * TAU,
      r: 0.6 + Math.random() * 1.2,
    })),
  }));

  let W = 0;
  let H = 0;
  const medir = () => {
    W = caixa.clientWidth;
    H = caixa.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // ponto da foto -> canvas (a foto cobre a caixa com background-size: cover)
  const mapa = () => {
    const w = foto.offsetWidth;
    const h = foto.offsetHeight;
    const iw = Math.max(w, h * cfg.proporcao);
    const ih = iw / cfg.proporcao;
    const [px, py] = getComputedStyle(foto).backgroundPosition.split(' ').map((v) => parseFloat(v) / 100);
    const ox = (w - iw) * (isNaN(px) ? 0.5 : px) + foto.offsetLeft;
    const oy = (h - ih) * (isNaN(py) ? 0.5 : py) + foto.offsetTop;
    return { escala: iw, p: (fx: number, fy: number): [number, number] => [ox + fx * iw, oy + fy * ih] };
  };

  const esticar = (tex: HTMLCanvasElement, o: [number, number], e: [number, number], meia: number, a: number) => {
    const dx = e[0] - o[0];
    const dy = e[1] - o[1];
    ctx.save();
    ctx.translate(o[0], o[1]);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(tex, 0, -meia, Math.hypot(dx, dy) || 1, meia * 2);
    ctx.restore();
  };

  const brilho = (x: number, y: number, raio: number, cor: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, `rgba(${cor},${a.toFixed(3)})`);
    g.addColorStop(0.35, `rgba(${cor},${(a * 0.45).toFixed(3)})`);
    g.addColorStop(1, `rgba(${cor},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
  };

  const desenhar = (tempo: number) => {
    const t = tempo % CICLO;
    const volta = (TAU * t) / CICLO; // senos com múltiplos inteiros de `volta` fecham o loop
    const { escala, p } = mapa();
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (const h of holofotes) {
      // varredura lenta em volta do ponto de mira
      const fx = h.mira[0] + 0.09 * Math.sin(volta + h.fase);
      const fy = h.mira[1] + 0.04 * Math.cos(volta * 2 + h.fase * 1.7);
      const o = p(h.o[0], h.o[1]);
      const e = p(fx, fy);
      // oscilação leve de intensidade, como lâmpada de descarga
      const a = 0.9 + 0.06 * Math.sin(volta * 17 + h.fase * 3) + 0.04 * Math.sin(volta * 29 + h.fase);
      const meia = escala * 0.05;

      esticar(cone, o, e, meia * 2.1, 0.12 * a);
      esticar(cone, o, e, meia, 0.36 * a);

      // poeira suspensa dentro do feixe
      const dx = e[0] - o[0];
      const dy = e[1] - o[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      for (const q of h.poeira) {
        const u = (q.u + t / CICLO) % 1;
        const v = q.v + 0.08 * Math.sin(volta * q.k + q.fase);
        const larg = meia * (0.03 + 0.97 * u);
        const alfa = 0.5 * a * Math.exp(-v * v * 2.4) * (1 - u * 0.6) * (0.4 + 0.6 * Math.abs(Math.sin(volta * q.k * 2 + q.fase)));
        if (alfa < 0.02) continue;
        ctx.fillStyle = `rgba(240,250,244,${alfa.toFixed(3)})`;
        ctx.fillRect(o[0] + dx * u + nx * v * larg, o[1] + dy * u + ny * v * larg, q.r, q.r);
      }

      // refletor aceso: halo, núcleo e o risco da lente
      brilho(o[0], o[1], escala * 0.04, '220,238,230', 0.2 * a);
      brilho(o[0], o[1], escala * 0.008, '255,255,255', 0.9 * a);
      ctx.globalAlpha = 0.45 * a;
      ctx.drawImage(risco, o[0] - escala * 0.1, o[1] - escala * 0.0035, escala * 0.2, escala * 0.007);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  medir();
  const ro = new ResizeObserver(() => {
    medir();
    if (parado) desenhar(CICLO * 0.25);
  });
  ro.observe(caixa);

  // reduced motion: um quadro parado, sem animação
  if (parado) {
    desenhar(CICLO * 0.25);
    return () => ro.disconnect();
  }

  let raf: number | null = null;
  let ultimo = 0;
  let tempo = 0;
  const tick = (agora: number) => {
    raf = requestAnimationFrame(tick);
    tempo += ultimo ? Math.min(0.1, (agora - ultimo) / 1000) : 0;
    ultimo = agora;
    desenhar(tempo);
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
  // pausa fora da tela e com a aba oculta
  let visivel = false;
  const io = new IntersectionObserver((e) => ligar((visivel = e[0].isIntersecting)), { threshold: 0 });
  io.observe(caixa);
  const aba = () => ligar(visivel && !document.hidden);
  document.addEventListener('visibilitychange', aba);

  return () => {
    ligar(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', aba);
  };
}
