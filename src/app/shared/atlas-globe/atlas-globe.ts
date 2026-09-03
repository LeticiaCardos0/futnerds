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
const NEON = 0x53f59a;

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

    scene.add(new THREE.AmbientLight(0xdfe9e4, 0.62));
    const key = new THREE.DirectionalLight(0xfff8ec, 1.35);
    key.position.set(-2.2, 1.2, 2.6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe3d8, 0.55);
    fill.position.set(2.4, 0.6, 1.6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(NEON, 0.34);
    rim.position.set(2.8, -0.6, -2.4);
    scene.add(rim);

    const geo = new THREE.SphereGeometry(R, 96, 96);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x3d4f46,
      emissive: 0x0a1410,
      specular: 0x243a31,
      shininess: 6,
    });
    const earth = new THREE.Mesh(geo, mat);
    root.add(earth);

    const loader = new THREE.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    loader.load(TEX_DAY, (tex) => {
      if ((tex as any).colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      mat.map = tex;
      mat.color = new THREE.Color(0xdcece4);
      mat.needsUpdate = true;
    });
    loader.load(TEX_NIGHT, (tex) => {
      if ((tex as any).colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = aniso;
      mat.emissiveMap = tex;
      mat.emissive = new THREE.Color(0x6f8f7c);
      mat.emissiveIntensity = 0.34;
      mat.needsUpdate = true;
    });
    loader.load(TEX_BUMP, (tex) => {
      mat.bumpMap = tex;
      mat.bumpScale = 0.012;
      mat.needsUpdate = true;
    });

    const grat = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(R * 1.002, 36, 18)),
      new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: 0.035 })
    );
    root.add(grat);

    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.045, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(NEON) } },
        vertexShader:
          'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 uColor; varying vec3 vN; void main(){ float i = pow(1.0 - abs(dot(vN, vec3(0.0,0.0,1.0))), 5.0); gl_FragColor = vec4(uColor, clamp(i,0.0,1.0) * 0.34); }',
      })
    );
    root.add(atmo);

    const routeGroup = new THREE.Group();
    root.add(routeGroup);
    const byId: Record<string, PaisAtlas> = Object.fromEntries(PAISES_ATLAS.map((c) => [c.id, c]));
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
      const line = new THREE.Line(
        g,
        new THREE.LineDashedMaterial({ color: NEON, transparent: true, opacity: 0.3, dashSize: 0.028, gapSize: 0.026 })
      );
      line.computeLineDistances();
      line.userData['speed'] = 0.12 + (i % 5) * 0.03;
      routeGroup.add(line);
    });
    this.routeGroup = routeGroup;

    const ringGeo = new THREE.RingGeometry(0.009, 0.03, 32);
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
      'position:absolute;pointer-events:none;opacity:0;transform:translate(-50%,-140%);transition:opacity .2s;padding:5px 9px;border:1px solid rgba(83,245,154,.45);background:rgba(3,9,6,.88);backdrop-filter:blur(6px);font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a9f7cd;white-space:nowrap;z-index:3';
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
        this.idleTimeout = setTimeout(() => {
          this.interacting = false;
        }, 2200);
        const z = this.camera.position.length() + e.deltaY * 0.0014;
        this.camera.position.setLength(Math.max(this.minDist, Math.min(this.maxDist, z)));
      },
      { passive: false }
    );
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
    const outerR = R * 1.045; // raio incluindo o halo da atmosfera
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
    const dt = Math.min(0.05, this.clock.getDelta());

    if (!this.reduced) {
      const idleSpin = this.interacting ? 0 : 0.0011;
      this.root.rotation.y += this.vel.x;
      this.vel.x += (idleSpin - this.vel.x) * 0.035;
      this.dust.rotation.y -= 0.0003;
    }

    this.markers.forEach((m) => {
      const sel = this.selected?.id === m.data.id;
      const hov = this.hover?.id === m.data.id;
      const p = (Math.sin(t * 1.8 + m.phase) + 1) / 2;
      const s = 1 + p * 0.7 + (sel ? 0.75 : 0) + (hov ? 0.5 : 0);
      m.halo.scale.setScalar(s);
      (m.halo.material as THREE.MeshBasicMaterial).opacity = 0.55 - p * 0.3 + (sel || hov ? 0.35 : 0);
      m.dot.scale.setScalar(1 + (sel ? 0.6 : hov ? 0.35 : 0));
      (m.dot.material as THREE.MeshBasicMaterial).color.set(sel ? 0x53f59a : 0xd8ffe9);
      (m.beam.material as THREE.MeshBasicMaterial).opacity = sel ? 0.8 : hov ? 0.6 : 0.28;
      m.beam.scale.y = sel ? 1.7 : 1;
    });

    this.routeGroup.children.forEach((l) => {
      const line = l as THREE.Line;
      const mat = line.material as THREE.LineDashedMaterial & { dashOffset?: number };
      mat.dashOffset = (mat.dashOffset || 0) - line.userData['speed'] * dt;
      mat.opacity = 0.28 + 0.18 * Math.sin(t * 1.1 + line.userData['speed'] * 10);
    });

    this.renderer.render(this.scene, this.camera);
  }
}
