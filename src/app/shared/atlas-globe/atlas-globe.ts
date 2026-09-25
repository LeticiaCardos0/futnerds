import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';

export interface PaisAtlas {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  ligas: number;
  jogadores: number;
  top: string;
}

const TEX_DAY = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg';
const TEX_NIGHT = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-night.jpg';
const TEX_BUMP = 'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png';

// TODO(Leticia): substituir por dados reais vindos da API (contagem de ligas/jogadores por país)
export const PAISES_ATLAS: PaisAtlas[] = [
  { id: 'br', nome: 'Brasil', lat: -14.2, lon: -51.9, ligas: 7, jogadores: 1320, top: 'Brasileirão Série A' },
  { id: 'en', nome: 'Inglaterra', lat: 52.4, lon: -1.5, ligas: 6, jogadores: 1240, top: 'Premier League' },
  { id: 'es', nome: 'Espanha', lat: 40.2, lon: -3.7, ligas: 4, jogadores: 1180, top: 'LaLiga' },
  { id: 'ar', nome: 'Argentina', lat: -38.4, lon: -63.6, ligas: 3, jogadores: 870, top: 'Liga Profesional' },
  { id: 'de', nome: 'Alemanha', lat: 51.2, lon: 10.4, ligas: 5, jogadores: 980, top: 'Bundesliga' },
  { id: 'fr', nome: 'França', lat: 46.6, lon: 2.2, ligas: 4, jogadores: 910, top: 'Ligue 1' },
  { id: 'it', nome: 'Itália', lat: 41.9, lon: 12.6, ligas: 5, jogadores: 1060, top: 'Serie A' },
  { id: 'us', nome: 'Estados Unidos', lat: 39.8, lon: -98.6, ligas: 2, jogadores: 640, top: 'MLS' },
  { id: 'pt', nome: 'Portugal', lat: 39.4, lon: -8.2, ligas: 3, jogadores: 520, top: 'Liga Portugal' },
  { id: 'nl', nome: 'Países Baixos', lat: 52.1, lon: 5.3, ligas: 2, jogadores: 480, top: 'Eredivisie' },
  { id: 'jp', nome: 'Japão', lat: 36.2, lon: 138.3, ligas: 3, jogadores: 410, top: 'J1 League' },
  { id: 'sa', nome: 'Arábia Saudita', lat: 23.9, lon: 45.1, ligas: 2, jogadores: 300, top: 'Saudi Pro League' },
  { id: 'mx', nome: 'México', lat: 23.6, lon: -102.5, ligas: 2, jogadores: 430, top: 'Liga MX' },
  { id: 'tr', nome: 'Turquia', lat: 39.0, lon: 35.2, ligas: 2, jogadores: 390, top: 'Süper Lig' },
  { id: 'eg', nome: 'Egito', lat: 26.8, lon: 30.8, ligas: 1, jogadores: 210, top: 'Egyptian Premier' },
  { id: 'au', nome: 'Austrália', lat: -25.3, lon: 133.8, ligas: 1, jogadores: 180, top: 'A-League' },
];

const ROTAS: [string, string][] = [
  ['br', 'pt'], ['br', 'us'], ['ar', 'it'], ['us', 'jp'], ['jp', 'sa'],
  ['sa', 'eg'], ['eg', 'fr'], ['fr', 'en'], ['en', 'nl'], ['nl', 'de'],
  ['de', 'tr'], ['tr', 'sa'], ['es', 'mx'], ['mx', 'us'], ['pt', 'es'],
  ['it', 'de'], ['ar', 'br'], ['au', 'jp'],
];

const R = 1;
const NEON = 0x8be86a;

function toVec(lat: number, lon: number, r = R): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

interface Marcador {
  data: PaisAtlas;
  group: THREE.Group;
  halo: THREE.Mesh;
  dot: THREE.Mesh;
  hit: THREE.Mesh;
  beam: THREE.Mesh;
  phase: number;
}

/**
 * Globo 3D interativo do Atlas (cobertura de ligas/países).
 * Se o projeto já tem um globo próprio (nacoes-engine.ts com shader Fresnel),
 * prefira reaproveitá-lo — este componente é uma conversão fiel do protótipo
 * do design (globe.js) para caso você queira usá-lo como está.
 */
@Component({
  selector: 'app-atlas-globe',
  standalone: true,
  templateUrl: './atlas-globe.html',
  styleUrl: './atlas-globe.scss',
})
export class AtlasGlobe implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;
  @Output() countrySelect = new EventEmitter<PaisAtlas>();
  // o usuário arrastou/girou/deu zoom (a Home usa para pausar o tour automático)
  @Output() interagiu = new EventEmitter<void>();

  private reduced = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private root!: THREE.Group;
  private dust!: THREE.Points;
  private routeGroup!: THREE.Group;
  private markers: Marcador[] = [];
  private tooltip!: HTMLDivElement;

  private hover: PaisAtlas | null = null;
  private selected: PaisAtlas | null = null;
  private vel = { x: 0.0009, y: 0 };
  private interacting = false;

  private sw = 0;
  private sh = 0;
  private minDist = 2.35;
  private maxDist = 4.4;
  private visible = true;
  private clock = new THREE.Clock();
  private raf: number | null = null;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private idleTimeout: ReturnType<typeof setTimeout> | undefined;

  // parado num país depois de focar(): sem giro automático até o usuário mexer
  private fixo = false;
  // voo de câmera em andamento (rotação do globo + distância da câmera)
  private voo: { inicio: number; dur: number; x0: number; x1: number; y0: number; y1: number; d0: number; d1: number } | null = null;
  // "cometas" percorrendo as rotas: trecho visível da linha + ponto brilhante na frente
  private trilhas: Array<{ linha: THREE.Line; cabeca: THREE.Mesh; pts: THREE.Vector3[]; vel: number; fase: number }> = [];
  private ultimoT = 0;

  ngAfterViewInit(): void {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.build();
  }

  ngOnDestroy(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.io?.disconnect();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }

  private build(): void {
    const host = this.hostRef.nativeElement;
    const w = host.clientWidth || 600;
    const h = host.clientHeight || 440;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:none';
    host.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 0.35, 3.5);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    const root = new THREE.Group();
    root.rotation.x = 0.2;
    scene.add(root);
    this.root = root;

    scene.add(new THREE.AmbientLight(0xcfe9dc, 0.4));
    const key = new THREE.DirectionalLight(0xe9fff2, 0.95);
    key.position.set(-2.2, 1.2, 2.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(NEON, 0.6);
    rim.position.set(2.8, -0.6, -2.4);
    scene.add(rim);

    const geo = new THREE.SphereGeometry(R, 96, 96);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x0b1510,
      emissive: 0x000000,
      specular: 0x0f2a1c,
      shininess: 14,
    });
    const earth = new THREE.Mesh(geo, mat);
    root.add(earth);

    const loader = new THREE.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    // textura do dia bem escurecida e esverdeada: só o desenho dos continentes
    loader.load(TEX_DAY, (tex) => {
      if ((tex as any).colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      mat.map = tex;
      mat.color = new THREE.Color(0x1d3328);
      mat.needsUpdate = true;
    });
    // luzes das cidades (textura da noite) acesas em verde
    loader.load(TEX_NIGHT, (tex) => {
      if ((tex as any).colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      mat.emissiveMap = tex;
      mat.emissive = new THREE.Color(0x1dff7e);
      mat.emissiveIntensity = 1.7;
      mat.needsUpdate = true;
    });
    loader.load(TEX_BUMP, (tex) => {
      mat.bumpMap = tex;
      mat.bumpScale = 0.012;
      mat.needsUpdate = true;
    });

    const grat = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.002, 36, 18)),
      new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.05 })
    );
    root.add(grat);

    const fresnel = (lado: THREE.Side, potencia: number, forca: number, frente: boolean) =>
      new THREE.ShaderMaterial({
        transparent: true,
        side: lado,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(NEON) } },
        vertexShader:
          'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: frente
          ? `uniform vec3 uColor; varying vec3 vN; void main(){ float i = pow(1.0 - max(dot(vN, vec3(0.0,0.0,1.0)), 0.0), ${potencia.toFixed(1)}); gl_FragColor = vec4(uColor, i * ${forca.toFixed(2)}); }`
          : `uniform vec3 uColor; varying vec3 vN; void main(){ float i = pow(1.0 - abs(dot(vN, vec3(0.0,0.0,1.0))), ${potencia.toFixed(1)}); gl_FragColor = vec4(uColor, clamp(i,0.0,1.0) * ${forca.toFixed(2)}); }`,
      });
    // halo de atmosfera em volta e um brilho verde na borda da própria Terra
    root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 64, 64), fresnel(THREE.BackSide, 5, 0.45, false)));
    root.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 64, 64), fresnel(THREE.FrontSide, 5, 0.22, true)));

    const routeGroup = new THREE.Group();
    root.add(routeGroup);
    const byId: Record<string, PaisAtlas> = Object.fromEntries(PAISES_ATLAS.map((c) => [c.id, c]));
    const cabecaGeo = new THREE.SphereGeometry(0.0075, 10, 10);
    ROTAS.forEach(([a, b], i) => {
      if (!byId[a] || !byId[b]) return;
      const va = toVec(byId[a].lat, byId[a].lon);
      const vb = toVec(byId[b].lat, byId[b].lon);
      const lift = 1 + va.distanceTo(vb) * 0.13;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= 80; s++) {
        const t = s / 80;
        const v = va.clone().lerp(vb, t).normalize();
        const arc = Math.sin(Math.PI * t);
        pts.push(v.multiplyScalar(R * (1 + (lift - 1) * arc)));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      // rota inteira, bem sutil
      routeGroup.add(
        new THREE.Line(g, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }))
      );
      // cometa: só um trecho da mesma linha, mais forte, andando pela rota
      const linha = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({ color: 0x8dffc0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const cabeca = new THREE.Mesh(cabecaGeo, new THREE.MeshBasicMaterial({ color: 0xe8fff1, transparent: true, blending: THREE.AdditiveBlending }));
      routeGroup.add(linha, cabeca);
      this.trilhas.push({ linha, cabeca, pts, vel: 0.16 + (i % 5) * 0.035, fase: (i * 0.37) % 1 });
    });
    this.routeGroup = routeGroup;

    const ringGeo = new THREE.RingGeometry(0.008, 0.021, 32);
    const markerGroup = new THREE.Group();
    root.add(markerGroup);
    this.markers = PAISES_ATLAS.map((c) => {
      const pos = toVec(c.lat, c.lon, R * 1.004);
      const g = new THREE.Group();
      g.position.copy(pos);
      g.lookAt(pos.clone().multiplyScalar(2));

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.0095, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0xeafff3 })
      );
      g.add(dot);

      const halo = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
      );
      g.add(halo);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0022, 0.0022, 0.055, 6),
        new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.35 })
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = 0.028;
      g.add(beam);

      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData['country'] = c;
      g.add(hit);

      markerGroup.add(g);
      return { data: c, group: g, halo, dot, hit, beam, phase: Math.random() * Math.PI * 2 };
    });

    const count = 240;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(R * (1.2 + Math.random() * 0.9));
      arr.set([v.x, v.y, v.z], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: NEON, size: 0.008, transparent: true, opacity: 0.3, depthWrite: false })
    );
    root.add(this.dust);

    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText =
      'position:absolute;pointer-events:none;opacity:0;transform:translate(-50%,-140%);transition:opacity .2s;padding:5px 9px;border:1px solid rgba(139,232,106,.45);background:rgba(3,9,6,.88);backdrop-filter:blur(6px);font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#C8F5B5;white-space:nowrap;z-index:3';
    host.appendChild(this.tooltip);

    this.scene = scene;
    this.controls();
    this.applySize();
    this.observe();
    this.select(PAISES_ATLAS[0]);
    this.loop();
  }

  private controls(): void {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = false;
    let moved = false;
    let px = 0;
    let py = 0;

    const hitTest = (e: PointerEvent): PaisAtlas | null => {
      const r = el.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, this.camera);
      const hits = ray.intersectObjects(this.markers.map((m) => m.hit), false);
      return hits.length ? (hits[0].object.userData['country'] as PaisAtlas) : null;
    };

    el.addEventListener('pointerdown', (e) => {
      down = true;
      moved = false;
      px = e.clientX;
      py = e.clientY;
      this.interacting = true;
      this.voo = null;
      this.fixo = false;
      this.interagiu.emit();
      clearTimeout(this.idleTimeout);
      el.style.cursor = 'grabbing';
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (down) {
        const dx = e.clientX - px;
        const dy = e.clientY - py;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        px = e.clientX;
        py = e.clientY;
        this.root.rotation.y += dx * 0.005;
        this.root.rotation.x = Math.max(-0.9, Math.min(0.9, this.root.rotation.x + dy * 0.004));
        this.vel.x = dx * 0.0016;
        return;
      }
      const c = hitTest(e);
      this.hover = c;
      el.style.cursor = c ? 'pointer' : 'grab';
      const r = el.getBoundingClientRect();
      if (c) {
        this.tooltip.textContent = c.nome;
        this.tooltip.style.left = e.clientX - r.left + 'px';
        this.tooltip.style.top = e.clientY - r.top + 'px';
        this.tooltip.style.opacity = '1';
      } else {
        this.tooltip.style.opacity = '0';
      }
    });
    const up = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      el.style.cursor = 'grab';
      if (!moved) {
        const c = hitTest(e);
        if (c) this.select(c);
      }
      clearTimeout(this.idleTimeout);
      this.idleTimeout = setTimeout(() => {
        this.interacting = false;
      }, 2200);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', () => {
      down = false;
      this.tooltip.style.opacity = '0';
    });
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        clearTimeout(this.idleTimeout);
        this.interacting = true;
        this.voo = null;
        this.interagiu.emit();
        this.idleTimeout = setTimeout(() => {
          this.interacting = false;
        }, 2200);
        const z = this.camera.position.length() + e.deltaY * 0.0014;
        this.camera.position.setLength(Math.max(this.minDist, Math.min(this.maxDist, z)));
      },
      { passive: false }
    );
  }

  /**
   * Gira o globo até o país ficar de frente para a câmera e aproxima, afastando um pouco
   * no meio do caminho (voo). Destaca o marcador sem emitir countrySelect.
   */
  focar(id: string): void {
    const c = PAISES_ATLAS.find((p) => p.id === id);
    if (!c || !this.root || !this.camera) return;
    this.selected = c;
    const v = toVec(c.lat, c.lon);
    // rotação Euler XYZ (v' = Rx·Ry·v): Ry traz o país para o plano da câmera, Rx acerta a altura
    const y1 = Math.atan2(-v.x, v.z);
    const elevCamera = Math.atan2(this.camera.position.y, this.camera.position.z);
    const x1 = Math.max(-0.9, Math.min(0.9, Math.atan2(v.y, Math.hypot(v.x, v.z)) - elevCamera));
    // caminho mais curto no eixo Y
    const y0 = this.root.rotation.y;
    let dy = (y1 - y0) % (Math.PI * 2);
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    // pouco mais perto que o limite em que o globo inteiro (com o halo) cabe no quadro
    const d1 = this.minDist * 0.96;
    if (this.reduced) {
      this.root.rotation.set(x1, y0 + dy, 0);
      this.camera.position.setLength(d1);
      this.fixo = true;
      return;
    }
    this.voo = { inicio: this.ultimoT, dur: 1.9, x0: this.root.rotation.x, x1, y0, y1: y0 + dy, d0: this.camera.position.length(), d1 };
    this.vel.x = 0;
  }

  private select(c: PaisAtlas): void {
    this.selected = c;
    this.countrySelect.emit(c);
  }

  private applySize(w?: number, h?: number): boolean {
    if (!this.renderer) return false;
    const host = this.hostRef.nativeElement;
    const r = host.getBoundingClientRect();
    w = Math.round(w || r.width || host.clientWidth);
    h = Math.round(h || r.height || host.clientHeight);
    if (!w || !h) return false;
    if (this.sw === w && this.sh === h) return true;
    this.sw = w;
    this.sh = h;
    this.renderer.setSize(w, h, false);
    const cv = this.renderer.domElement;
    cv.style.width = '100%';
    cv.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updateZoomLimits();
    return true;
  }

  /**
   * Recalcula, a partir do FOV e do aspect ratio atuais do container, a
   * distância mínima de câmera na qual o globo (incluindo o halo da
   * atmosfera) ainda cabe inteiro na tela sem ser cortado pelas bordas.
   * Isso substitui o limite fixo antigo e trava o zoom-in exatamente no
   * ponto em que o globo preenche 100% da área visível.
   */
  private updateZoomLimits(): void {
    if (!this.camera) return;
    const outerR = R * 1.075; // raio incluindo o halo da atmosfera
    const margin = 1.03; // folga mínima para não "grudar" nas bordas
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const dv = outerR / Math.sin(vFov / 2);
    const dh = outerR / Math.sin(hFov / 2);
    this.minDist = Math.max(dv, dh) * margin;
    this.maxDist = Math.max(this.minDist + 0.5, 4.4);

    // se a câmera já estiver mais perto do que o novo mínimo (ex: após
    // redimensionar a janela), empurra ela de volta para dentro do limite
    const len = this.camera.position.length();
    if (len < this.minDist) this.camera.position.setLength(this.minDist);
    else if (len > this.maxDist) this.camera.position.setLength(this.maxDist);
  }

  private observe(): void {
    const host = this.hostRef.nativeElement;
    this.ro = new ResizeObserver((entries) => {
      const r = entries[0] && entries[0].contentRect;
      this.applySize(r?.width, r?.height);
    });
    this.ro.observe(host);

    this.io = new IntersectionObserver(
      (e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible) this.applySize();
      },
      { threshold: 0 }
    );
    this.io.observe(host);

    window.addEventListener('resize', () => this.applySize());
  }

  private loop(): void {
    if (this.raf) return;
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      this.frame();
    };
    tick();
  }

  private frame(): void {
    const host = this.hostRef.nativeElement;
    if (host.clientWidth !== this.sw || host.clientHeight !== this.sh) this.applySize();
    if (!this.visible) return;
    const t = this.clock.getElapsedTime();
    const dt = this.ultimoT ? Math.min(0.1, t - this.ultimoT) : 0;
    this.ultimoT = t;

    if (this.voo) {
      const v = this.voo;
      const p = Math.min(1, (t - v.inicio) / v.dur);
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.root.rotation.x = v.x0 + (v.x1 - v.x0) * e;
      this.root.rotation.y = v.y0 + (v.y1 - v.y0) * e;
      this.camera.position.setLength((v.d0 + (v.d1 - v.d0) * e) * (1 + 0.18 * Math.sin(Math.PI * p)));
      if (p >= 1) {
        this.voo = null;
        this.fixo = true;
      }
    } else if (!this.reduced && !this.fixo) {
      const idleSpin = this.interacting ? 0 : 0.0011;
      this.root.rotation.y += this.vel.x;
      this.vel.x += (idleSpin - this.vel.x) * 0.035;
    }
    if (!this.reduced) this.dust.rotation.y -= 0.0003;

    this.markers.forEach((m) => {
      const sel = this.selected?.id === m.data.id;
      const hov = this.hover?.id === m.data.id;
      const p = (Math.sin(t * 1.8 + m.phase) + 1) / 2;
      const s = 1 + p * 0.7 + (sel ? 0.75 : 0) + (hov ? 0.5 : 0);
      m.halo.scale.setScalar(s);
      (m.halo.material as THREE.MeshBasicMaterial).opacity = 0.55 - p * 0.3 + (sel || hov ? 0.35 : 0);
      m.dot.scale.setScalar(1 + (sel ? 0.6 : hov ? 0.35 : 0));
      (m.dot.material as THREE.MeshBasicMaterial).color.set(sel ? 0x8be86a : 0xe6fbdc);
      (m.beam.material as THREE.MeshBasicMaterial).opacity = sel ? 0.9 : hov ? 0.6 : 0.28;
      m.beam.scale.y = sel ? 2.4 : 1;
    });

    // cometas: um trecho de ~14 pontos anda pela rota e a cabeça brilha na frente
    const n = 81;
    const comprimento = 14;
    this.trilhas.forEach((tr) => {
      tr.fase = (tr.fase + tr.vel * (this.reduced ? 0 : dt)) % 1.25; // 0,25 de pausa entre passagens
      const frente = Math.floor(tr.fase * n);
      const inicio = Math.max(0, frente - comprimento);
      const visivel = frente < n;
      tr.linha.geometry.setDrawRange(inicio, visivel ? Math.max(0, Math.min(n, frente) - inicio) : 0);
      tr.cabeca.visible = visivel && frente > 0;
      if (tr.cabeca.visible) tr.cabeca.position.copy(tr.pts[Math.min(n - 1, frente)]);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
