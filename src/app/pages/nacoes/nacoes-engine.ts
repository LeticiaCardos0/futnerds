import * as THREE from 'three';
import { GeoCountry, GEO_COUNTRIES } from './nacoes-geo-data';
import { obterCaminhoLogoLiga, obterNomeCanonicoLiga } from '../../shared/ligas.util';
import { API_URL } from '../../shared/api.util';
import { FOTOS_PAIS } from './nacoes-fotos';
import { ISO2_POR_NOME_API, SUBNACAO_POR_NOME_API, continentePais, nomePaisPt } from './nacoes-paises';

/**
 * Constrói e inicia o globo 3D interativo dentro do elemento #globo-canvas
 * já presente no DOM (deve ser chamado apenas depois que o template Angular
 * terminou de renderizar — ou seja, a partir de ngAfterViewInit).
 *
 * Retorna uma função de limpeza que deve ser chamada em ngOnDestroy.
 */
export function inicializarGlobo(navegar: (rota: string, params: any) => void): () => void {
/* ============================================================================
   FUTNERDS · TELA "NAÇÕES" — GLOBO 3D INTERATIVO
   ----------------------------------------------------------------------------
   Protótipo isolado, ainda não integrado ao projeto Angular principal.
   Renderização 3D real via Three.js (build global/UMD, sem ES Modules — isso
   garante que o arquivo funcione tanto abrindo direto no navegador quanto
   servido por um servidor local, sem tropeçar em bloqueios de CORS de módulo).

   Estrutura deste arquivo:
     1. Tipos e interfaces
     2. Dados mockados de ligas por país (8 países de exemplo)
     3. Dados geográficos reais dos países (Natural Earth, domínio público)
     4. Utilitários geográficos (lat/lon <-> esfera, point-in-polygon, earcut)
     5. Cena Three.js (esfera, atmosfera, estrelas, contornos dos países)
     6. Controles de câmera (arrastar, zoom, inércia — implementação própria)
     7. Interação (hover/clique com raycasting + tooltip + painel lateral)
     8. Loop de renderização
   ============================================================================ */

// ----------------------------------------------------------------------------
// 1. TIPOS
// ----------------------------------------------------------------------------

interface Liga {
  nome: string;
  clubes: number;
  cor: string;
}

/**
 * Uma seleção nacional dentro do polígono do globo (normalmente 1 por país;
 * "gb" tem até 4 — Inglaterra, Escócia, País de Gales, Irlanda do Norte).
 * Só é criada uma entrada por nome de API que realmente tenha liga própria
 * cadastrada — evita criar seção vazia pra casos como "Holland" (nacionalidade
 * de jogador que cai no mesmo polígono de "Netherlands" mas não é uma seleção
 * de futebol separada).
 */
interface SubNacao {
  nomeApi: string;
  nome: string;
  bandeira: string;
  ligas: Liga[];
  clubes: number;
  jogadores: number | null;
}

interface PaisMock {
  nome: string;             // nome de exibição em português
  nomeApi: string;          // nome no banco (usado nos filtros da página de times)
  iso2: string;
  continente: string;
  ligas: Liga[];
  clubes: number;
  jogadores: number | null; // null enquanto o backend não enviar a contagem
  /** Presente só quando o polígono representa mais de uma seleção de futebol. */
  subnacoes?: SubNacao[];
}



interface CountryRuntime {
  data: GeoCountry;
  bbox: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
  outlineLines: any[]; // THREE.LineLoop[]
  ringsFlat: [number, number][][]; // anéis externos (para point-in-polygon e preenchimento)
}

// ----------------------------------------------------------------------------
// 2. DADOS DE LIGAS POR PAÍS — carregados em tempo real do backend (futdb)
// ----------------------------------------------------------------------------
// Populado dinamicamente por carregarDadosReais() a partir de
// GET /api/nacoes/resumo. Países sem ligas mapeadas no backend continuam
// navegáveis/realçáveis no globo, mas mostram o estado "sem dados ainda"
// (já tratado pelas funções mostrarTooltip/preencherPainel mais abaixo).

let DADOS_MOCK: Record<string, PaisMock> = {};

/** Paleta cíclica usada para colorir os cards de liga (a API não retorna cor). */
const PALETA_LIGAS = ['#00E676', '#5EFFA2', '#3ED598', '#2BB673', '#1F9C5F', '#17824C'];

function normalizarNomePais(nome: string): string {
  return nome.trim().toLowerCase();
}

/**
 * Nomes de exibição mais amigáveis (apelidos populares) para ligas cujo nome
 * oficial retornado pela API não é o mais reconhecível pelo usuário final.
 */
const NOME_EXIBICAO_LIGA: { [nomeCanonico: string]: string } = {
  'Brasileirao': 'Brasileirão',
  'Libertadores': 'CONMEBOL Libertadores',
  'Sudamericana': 'CONMEBOL Sudamericana',
};

/**
 * Ordem de "fama" das ligas, usada para ordenar tooltip e painel lateral
 * pelas competições mais conhecidas primeiro. "Pro League" e "Super League"
 * existem em mais de um país no banco (Bélgica/Arábia Saudita,
 * Suíça/Grécia/China) mas chegam com o MESMO nome de string nesta API de
 * país (o DTO não distingue por id) — as posições abaixo são uma
 * aproximação razoável, já que não dá pra diferenciar pelo nome sozinho.
 */
const ORDEM_FAMA_LIGA: { [nomeOriginal: string]: number } = {
  'Premier League': 1,
  'La Liga': 2,
  'Serie A': 3,
  'Bundesliga': 4,
  'Ligue 1': 5,
  'Brasileirao': 6,
  'Primeira Liga': 7,
  'Eredivisie': 8,
  'Süper Lig': 9,
  'Liga Profesional de Fútbol': 10,
  'Pro League': 11,
  'Major League Soccer': 12,
  'Championship': 13,
  'Super League': 15,
  'Primera Division': 16,
  'Serie B': 17,
  'La Liga 2': 18,
  '2. Bundesliga': 19,
  'Ligue 2': 20,
  'League One': 21,
  'Categoría Primera A': 22,
  'Ekstraklasa': 23,
  'K League 1': 26,
  'A-League Men': 27,
  'League Two': 28,
  'Eliteserien': 29,
  'Allsvenskan': 30,
  'Superliga': 31,
  'Hrvatska nogometna liga': 32,
  'První liga': 33,
  'Nemzeti Bajnokság I': 34,
  'Liga I': 35,
  '1. Division': 36,
  'Veikkausliiga': 37,
  'Premier Division': 38,
  'Premyer Liqa': 39,
  'División de Fútbol Profesional': 40,
  'División Profesional': 41,
  'Liga 1': 42,
  '3. Liga': 43,
};

// Os nomes do FC 27 ("LALIGA EA SPORTS", "Liga do Brasil"...) são convertidos
// para o nome canônico de ligas.util antes de ordenar/exibir.
function obterNomeExibicaoLiga(nomeOriginal: string): string {
  const canonico = obterNomeCanonicoLiga(nomeOriginal);
  return NOME_EXIBICAO_LIGA[canonico] || canonico.replace(/ - .+$/, '');
}

function ordenarLigasPorFama<T extends { nome: string }>(ligas: T[]): T[] {
  const fama = (liga: T) => ORDEM_FAMA_LIGA[obterNomeCanonicoLiga(liga.nome).replace(/ - .+$/, '')] ?? 999;
  return [...ligas].sort((a, b) => fama(a) - fama(b));
}

interface LigaResumoApi {
  nome: string;
  quantidadeClubes: number;
}
interface PaisResumoApi {
  nome: string;
  quantidadeLigas: number;
  quantidadeClubes: number;
  quantidadeJogadores?: number;
  ligas: LigaResumoApi[];
}


/**
 * Busca o resumo de nações/ligas/clubes no backend (futdb) e popula DADOS_MOCK,
 * casando cada país retornado pela API com o país correspondente em
 * GEO_COUNTRIES/paisesRuntime através do nome (normalizado, case-insensitive).
 */
async function carregarDadosReais(): Promise<void> {
  try {
    const resposta = await fetch(`${API_URL}/nacoes/resumo`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const paises: PaisResumoApi[] = await resposta.json();

    const novoMock: Record<string, PaisMock> = {};
    const clubesPorNomeApi: Record<string, Record<string, number>> = {};

    paises.forEach((paisApi) => {
      const iso2 =
        ISO2_POR_NOME_API[paisApi.nome] ??
        paisesRuntime.find((p) => normalizarNomePais(p.data.name) === normalizarNomePais(paisApi.nome))?.data.iso2;
      if (!iso2) return; // país da API sem correspondência geográfica conhecida

      const ligas = paisApi.ligas.map((liga) => ({ nome: liga.nome, clubes: liga.quantidadeClubes, cor: '' }));
      const jogadores = typeof paisApi.quantidadeJogadores === 'number' ? paisApi.quantidadeJogadores : null;
      const existente = novoMock[iso2];
      if (existente) {
        // mais de um país da API no mesmo polígono (ex.: Inglaterra + Escócia) —
        // os totais continuam somados (usados no hover/destaque), mas cada um
        // com liga própria também vira uma subnação, listada à parte no painel.
        existente.ligas.push(...ligas);
        existente.clubes += paisApi.quantidadeClubes;
        existente.jogadores = existente.jogadores !== null && jogadores !== null ? existente.jogadores + jogadores : existente.jogadores ?? jogadores;
        if (ligas.length > 0) {
          (existente.subnacoes ??= []).push({
            nomeApi: paisApi.nome,
            nome: SUBNACAO_POR_NOME_API[paisApi.nome]?.nome ?? paisApi.nome,
            bandeira: SUBNACAO_POR_NOME_API[paisApi.nome]?.bandeira ?? iso2,
            ligas,
            clubes: paisApi.quantidadeClubes,
            jogadores,
          });
        }
      } else {
        novoMock[iso2] = {
          nome: nomePaisPt(iso2, paisApi.nome),
          nomeApi: paisApi.nome,
          iso2,
          continente: continentePais(iso2),
          ligas,
          clubes: paisApi.quantidadeClubes,
          jogadores,
          subnacoes:
            ligas.length > 0
              ? [
                  {
                    nomeApi: paisApi.nome,
                    nome: SUBNACAO_POR_NOME_API[paisApi.nome]?.nome ?? paisApi.nome,
                    bandeira: SUBNACAO_POR_NOME_API[paisApi.nome]?.bandeira ?? iso2,
                    ligas,
                    clubes: paisApi.quantidadeClubes,
                    jogadores,
                  },
                ]
              : undefined,
        };
      }
      (clubesPorNomeApi[iso2] ??= {})[paisApi.nome] = paisApi.quantidadeClubes;
    });

    Object.values(novoMock).forEach((pais) => {
      // filtro da página de times usa o país da API com mais clubes
      const porNome = clubesPorNomeApi[pais.iso2];
      pais.nomeApi = Object.keys(porNome).sort((a, b) => porNome[b] - porNome[a])[0];
      pais.ligas = ordenarLigasPorFama(pais.ligas).map((liga, i) => ({ ...liga, cor: PALETA_LIGAS[i % PALETA_LIGAS.length] }));
      // Só vale a pena mostrar o painel dividido por seleção quando há mais de
      // uma com liga própria (é o caso do "gb": Inglaterra + Escócia). Com uma
      // só, undefined mantém o card único de sempre, sem seção duplicada.
      if (pais.subnacoes && pais.subnacoes.length > 1) {
        pais.subnacoes.forEach((sub) => {
          sub.ligas = ordenarLigasPorFama(sub.ligas).map((liga, i) => ({ ...liga, cor: PALETA_LIGAS[i % PALETA_LIGAS.length] }));
        });
        pais.subnacoes.sort((a, b) => b.clubes - a.clubes);
      } else {
        pais.subnacoes = undefined;
      }
    });

    DADOS_MOCK = novoMock;
    console.log('FutNerds · Dados reais carregados:', Object.keys(DADOS_MOCK).length, 'países com ligas.');
  } catch (erro) {
    console.warn(`FutNerds · Não foi possível carregar dados do backend (futdb rodando em ${API_URL}?). Globo funcionará sem dados de liga.`, erro);
  }
}


// ----------------------------------------------------------------------------
// 4. UTILITÁRIOS GEOGRÁFICOS
// ----------------------------------------------------------------------------

const RAIO_GLOBO = 5;

// --- Cores por estado (normal / hover / selecionado) -----------------------
// O verde do FutNerds é usado só nos estados interativos — o globo em
// repouso permanece neutro (cinza-azulado).
const COR_BORDA_NORMAL = 0x5c7880;      // cinza-azulado discreto ~ rgba(120,160,170,0.25)
const COR_BORDA_HOVER = 0x19d45a;       // verde principal
const COR_BORDA_SELECIONADO = 0x7dffb0; // verde claro (contorno neon do selecionado)
const OPACIDADE_BORDA_NORMAL = 0.32;
const OPACIDADE_BORDA_HOVER = 0.95;
const OPACIDADE_BORDA_SELECIONADO = 1.0;

/** Converte latitude/longitude para um ponto 3D na superfície da esfera. */
function latLonParaVetor3(lat: number, lon: number, raio: number = RAIO_GLOBO): any {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -raio * Math.sin(phi) * Math.cos(theta);
  const z = raio * Math.sin(phi) * Math.sin(theta);
  const y = raio * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/** Converte um ponto 3D na superfície da esfera de volta para latitude/longitude. */
function vetor3ParaLatLon(v: any): { lat: number; lon: number } {
  const raio = v.length();
  const phi = Math.acos(THREE.MathUtils.clamp(v.y / raio, -1, 1));
  const theta = Math.atan2(v.z, -v.x);
  const lat = 90 - (phi * 180) / Math.PI;
  let lon = (theta * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/** Teste ponto-em-polígono (algoritmo ray-casting clássico). */
function pontoDentroDoAnel(lon: number, lat: number, anel: [number, number][]): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    const intersecta =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

/** Calcula a caixa delimitadora (bbox) de todos os anéis externos de um país. */
function calcularBBox(aneis: [number, number][][]): [number, number, number, number] {
  let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
  for (const anel of aneis) {
    for (const [lon, lat] of anel) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

/** Extrai os anéis externos (ignora buracos/ilhas internas) de uma geometria GeoJSON. */
function extrairAneisExternos(geom: GeoCountry['geometry']): [number, number][][] {
  if (geom.type === 'Polygon') {
    const coords = geom.coordinates as number[][][];
    return [coords[0].map(([lon, lat]) => [lon, lat] as [number, number])];
  } else {
    const coords = geom.coordinates as number[][][][];
    return coords.map((poly) => poly[0].map(([lon, lat]) => [lon, lat] as [number, number]));
  }
}

/**
 * Máscara de terra (branco = terra, preto = oceano) desenhada a partir dos
 * contornos reais dos países. O shader do globo usa essa máscara para tratar
 * terra e oceano com cores diferentes sobre a textura de satélite da NASA.
 */
function criarMascaraTerra(): any {
  const largura = 2048, altura = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, largura, altura);
  ctx.filter = 'blur(1.5px)'; // borda suave entre terra e oceano
  GEO_COUNTRIES.forEach((pais) => {
    if (!pais.geometry || pais.iso2 === 'aq') return;
    extrairAneisExternos(pais.geometry).forEach((anel) => {
      if (anel.length < 3) return;
      ctx.beginPath();
      anel.forEach(([lon, lat], i) => {
        const x = (lon + 180) / 360 * largura;
        const y = (90 - lat) / 180 * altura;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill('evenodd');
    });
  });
  return new THREE.CanvasTexture(canvas);
}

/**
 * Triangulação "ear clipping" — usada para o preenchimento visual do país
 * em destaque (hover/seleção). Retorna uma lista de trios de coordenadas
 * [lon, lat] já prontos para virar vértices de triângulos no Three.js.
 * Simplificado o suficiente para os polígonos da resolução 110m usada aqui.
 */
function triangularPoligono(anel: [number, number][]): [number, number][] {
  const pontos = anel.slice(0, -1); // remove o ponto de fechamento duplicado
  if (pontos.length < 3) return [];

  const areaSinal = (a: [number, number], b: [number, number], c: [number, number]): number =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

  const pontoDentroTriangulo = (
    p: [number, number], a: [number, number], b: [number, number], c: [number, number]
  ): boolean => {
    const s1 = areaSinal(a, b, p);
    const s2 = areaSinal(b, c, p);
    const s3 = areaSinal(c, a, p);
    const temNeg = s1 < 0 || s2 < 0 || s3 < 0;
    const temPos = s1 > 0 || s2 > 0 || s3 > 0;
    return !(temNeg && temPos);
  };

  // Garante orientação anti-horária (CCW); se a área total for negativa, inverte.
  let areaTotal = 0;
  for (let i = 0; i < pontos.length; i++) {
    const [x1, y1] = pontos[i];
    const [x2, y2] = pontos[(i + 1) % pontos.length];
    areaTotal += x1 * y2 - x2 * y1;
  }
  const anelOrdenado = areaTotal < 0 ? pontos.slice().reverse() : pontos.slice();

  let restantes = anelOrdenado.map((_, i) => i);
  const resultado: [number, number][] = [];
  let guarda = 0;

  while (restantes.length > 3 && guarda < 3000) {
    guarda++;
    let orelhaEncontrada = false;
    for (let i = 0; i < restantes.length; i++) {
      const iPrev = restantes[(i - 1 + restantes.length) % restantes.length];
      const iCur = restantes[i];
      const iNext = restantes[(i + 1) % restantes.length];
      const a = anelOrdenado[iPrev], b = anelOrdenado[iCur], c = anelOrdenado[iNext];
      if (areaSinal(a, b, c) <= 0) continue;

      let valido = true;
      for (const iTeste of restantes) {
        if (iTeste === iPrev || iTeste === iCur || iTeste === iNext) continue;
        if (pontoDentroTriangulo(anelOrdenado[iTeste], a, b, c)) { valido = false; break; }
      }
      if (valido) {
        resultado.push(a, b, c);
        restantes.splice(i, 1);
        orelhaEncontrada = true;
        break;
      }
    }
    if (!orelhaEncontrada) break; // polígono complexo demais — desiste graciosamente
  }
  if (restantes.length === 3) {
    resultado.push(anelOrdenado[restantes[0]], anelOrdenado[restantes[1]], anelOrdenado[restantes[2]]);
  }
  return resultado;
}

// ----------------------------------------------------------------------------
// 5. CENA THREE.JS
// ----------------------------------------------------------------------------

const canvasContainer = document.getElementById('globo-canvas') as HTMLElement;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  canvasContainer.clientWidth / canvasContainer.clientHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
canvasContainer.appendChild(renderer.domElement);

// --- Iluminação ---------------------------------------------------------
// Tons neutros/azulados — o verde do FutNerds fica reservado para hover,
// seleção e marcadores, não para "banhar" o planeta inteiro de verde.
const luzAmbiente = new THREE.AmbientLight(0x142a24, 2.15);
scene.add(luzAmbiente);

const luzPrincipal = new THREE.DirectionalLight(0xcfe4ea, 1.1);
luzPrincipal.position.set(6, 4, 8);
scene.add(luzPrincipal);

const luzPreenchimento = new THREE.PointLight(0x24463f, 0.65, 40);
luzPreenchimento.position.set(-8, -3, -6);
scene.add(luzPreenchimento);

// --- Esfera do globo -------------------------------------------------------
// Textura de satélite da NASA (Blue Marble + luzes noturnas, domínio público)
// estilizada no shader: terra escura puxada para o verde, oceano azul-petróleo,
// luzes das cidades em verde e brilho verde na borda do planeta. A luz acompanha
// a câmera (espaço de visão), então o lado voltado para o usuário está sempre iluminado.
const carregadorTextura = new THREE.TextureLoader();
const anisotropia = renderer.capabilities.getMaxAnisotropy();
function carregarTextura(caminho: string): any {
  const textura = carregadorTextura.load(caminho);
  textura.anisotropy = anisotropia;
  return textura;
}
const texturaDia = carregarTextura('nacoes/terra-dia.jpg');
const texturaNoite = carregarTextura('nacoes/terra-noite.jpg');
const mascaraTerra = criarMascaraTerra();

const geometriaOceano = new THREE.SphereGeometry(RAIO_GLOBO, 128, 128);
const materialOceano = new THREE.ShaderMaterial({
  uniforms: {
    mapaDia: { value: texturaDia },
    mapaNoite: { value: texturaNoite },
    mascara: { value: mascaraTerra },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormalVisao;
    void main() {
      vUv = uv;
      vNormalVisao = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D mapaDia;
    uniform sampler2D mapaNoite;
    uniform sampler2D mascara;
    varying vec2 vUv;
    varying vec3 vNormalVisao;
    void main() {
      vec3 dia = texture2D(mapaDia, vUv).rgb;
      float terra = texture2D(mascara, vUv).r;
      float lum = dot(dia, vec3(0.299, 0.587, 0.114));

      vec3 corTerra = mix(dia, vec3(lum) * vec3(0.62, 0.95, 0.68), 0.45) * 0.66;
      vec3 corOceano = vec3(0.010, 0.045, 0.060) + dia * vec3(0.04, 0.10, 0.12);
      vec3 cor = mix(corOceano, corTerra, terra);

      vec3 n = normalize(vNormalVisao);
      float difusa = 0.42 + 0.78 * max(dot(n, normalize(vec3(-0.35, 0.35, 1.0))), 0.0);
      cor *= difusa;

      float noite = texture2D(mapaNoite, vUv).r;
      cor += vec3(0.10, 0.95, 0.50) * pow(noite, 2.2) * 0.30 * terra;

      float fresnel = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
      cor += vec3(0.05, 0.85, 0.55) * fresnel * 0.55;

      gl_FragColor = vec4(cor, 1.0);
    }
  `,
});
const esferaOceano = new THREE.Mesh(geometriaOceano, materialOceano);
scene.add(esferaOceano);

// --- Grid discreto (linhas de latitude/longitude) --------------------------
const grupoGrid = new THREE.Group();
const materialGrid = new THREE.LineBasicMaterial({ color: 0x2f6a58, transparent: true, opacity: 0.22 });
for (let lat = -60; lat <= 60; lat += 30) {
  const pontos: any[] = [];
  for (let lon = -180; lon <= 180; lon += 4) pontos.push(latLonParaVetor3(lat, lon, RAIO_GLOBO * 1.001));
  grupoGrid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pontos), materialGrid));
}
for (let lon = -150; lon <= 180; lon += 30) {
  const pontos: any[] = [];
  for (let lat = -90; lat <= 90; lat += 4) pontos.push(latLonParaVetor3(lat, lon, RAIO_GLOBO * 1.001));
  grupoGrid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pontos), materialGrid));
}
scene.add(grupoGrid);

// --- Atmosfera (brilho de borda / Fresnel) ---------------------------------
const shaderAtmosferaVertex = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const shaderAtmosferaFragment = `
  varying vec3 vNormal;
  void main() {
    float intensidade = pow(0.74 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
    vec3 corAtmosfera = vec3(0.08, 0.95, 0.55); // halo verde FutNerds
    gl_FragColor = vec4(corAtmosfera, 1.0) * intensidade * 0.9;
  }
`;
const atmosfera = new THREE.Mesh(
  new THREE.SphereGeometry(RAIO_GLOBO * 1.14, 64, 64),
  new THREE.ShaderMaterial({
    vertexShader: shaderAtmosferaVertex,
    fragmentShader: shaderAtmosferaFragment,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  })
);
scene.add(atmosfera);

// --- Estrelas de fundo -------------------------------------------------
function criarEstrelas(): void {
  const quantidade = 2200;
  const posicoes = new Float32Array(quantidade * 3);
  for (let i = 0; i < quantidade; i++) {
    const raio = 60 + Math.random() * 140;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    posicoes[i * 3] = raio * Math.sin(phi) * Math.cos(theta);
    posicoes[i * 3 + 1] = raio * Math.sin(phi) * Math.sin(theta);
    posicoes[i * 3 + 2] = raio * Math.cos(phi);
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
  const material = new THREE.PointsMaterial({
    color: 0xbfffe0,
    size: 0.35,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
  });
  scene.add(new THREE.Points(geometria, material));
}
criarEstrelas();

// --- Contornos dos países ---------------------------------------------
const paisesRuntime: CountryRuntime[] = [];
const grupoContornos = new THREE.Group();

function construirContornoPais(pais: GeoCountry): CountryRuntime {
  const aneisExternos = extrairAneisExternos(pais.geometry);
  const linhas: any[] = [];

  aneisExternos.forEach((anel) => {
    const pontos3D = anel.map(([lon, lat]) => latLonParaVetor3(lat, lon, RAIO_GLOBO * 1.002));
    const geometriaLinha = new THREE.BufferGeometry().setFromPoints(pontos3D);
    const materialLinha = new THREE.LineBasicMaterial({
      color: COR_BORDA_NORMAL,
      transparent: true,
      opacity: OPACIDADE_BORDA_NORMAL,
    });
    const linha = new THREE.LineLoop(geometriaLinha, materialLinha);
    grupoContornos.add(linha);
    linhas.push(linha);
  });

  return {
    data: pais,
    bbox: calcularBBox(aneisExternos),
    outlineLines: linhas,
    ringsFlat: aneisExternos,
  };
}

GEO_COUNTRIES.forEach((pais) => {
  if (!pais.geometry) return;
  paisesRuntime.push(construirContornoPais(pais));
});
scene.add(grupoContornos);

// --- Malha de preenchimento reaproveitável (hover/seleção) -----------------
let malhaDestaque: any = null;
function construirMalhaDestaque(pais: CountryRuntime, cor: number): any {
  const posicoes: number[] = [];
  pais.ringsFlat.forEach((anel) => {
    const triangulos = triangularPoligono(anel);
    for (const [lon, lat] of triangulos) {
      const v = latLonParaVetor3(lat, lon, RAIO_GLOBO * 1.003);
      posicoes.push(v.x, v.y, v.z);
    }
  });
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geometria.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: cor,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending, // sólido por cima da textura — evita o efeito "manchado" que o modo aditivo causava ao somar brilho com o ruído do terreno
    depthWrite: false,
  });
  return new THREE.Mesh(geometria, material);
}

// ----------------------------------------------------------------------------
// 5b. MARCADORES DOS PRINCIPAIS PAÍSES DO FUTEBOL MUNDIAL
// ----------------------------------------------------------------------------
// Pequenos pontos luminosos pulsantes, fixos nas coordenadas geográficas reais
// de cada país. Como o globo (a malha) NÃO gira — é a câmera que orbita ao
// redor dele — basta posicionar cada marcador uma única vez em coordenadas
// 3D fixas; o teste de profundidade padrão do WebGL já cuida de escondê-lo
// quando o país estiver do lado oculto do planeta.

interface Marcador {
  iso2: string;
  lat: number;
  lon: number;
  ehBrasil?: boolean;
  /**
   * nomeApi (nacao.nome no banco) de uma seleção específica dentro de um
   * polígono compartilhado por mais de um país do futebol (ex.: "gb" reúne
   * Inglaterra e Escócia). Quando presente, este pino tem hover/clique
   * próprios: tooltip e painel mostram só os dados dessa seleção — nunca a
   * soma com as outras que dividem o mesmo território.
   */
  subnacaoNomeApi?: string;
}

const PAISES_COM_MARCADOR: Marcador[] = [
  { iso2: 'br', lat: -14.235, lon: -51.925, ehBrasil: true },
  { iso2: 'ar', lat: -38.416, lon: -63.616 },
  { iso2: 'uy', lat: -32.523, lon: -55.766 },
  { iso2: 'cl', lat: -35.675, lon: -71.543 },
  { iso2: 'co', lat: 4.571, lon: -74.297 },
  { iso2: 'mx', lat: 23.635, lon: -102.553 },
  { iso2: 'us', lat: 39.5, lon: -98.35 },
  { iso2: 'es', lat: 40.463, lon: -3.749 },
  { iso2: 'pt', lat: 39.399, lon: -8.224 },
  { iso2: 'fr', lat: 46.227, lon: 2.213 },
  { iso2: 'de', lat: 51.165, lon: 10.451 },
  { iso2: 'it', lat: 41.871, lon: 12.567 },
  { iso2: 'gb', lat: 52.355, lon: -1.174, subnacaoNomeApi: 'England' },
  { iso2: 'gb', lat: 56.491, lon: -4.202, subnacaoNomeApi: 'Scotland' }, // pino próprio perto de Edimburgo/Glasgow
  { iso2: 'nl', lat: 52.132, lon: 5.291 },
  { iso2: 'be', lat: 50.503, lon: 4.469 },
  { iso2: 'tr', lat: 38.963, lon: 35.243 },
  { iso2: 'sa', lat: 23.885, lon: 45.079 },
  { iso2: 'jp', lat: 36.204, lon: 138.252 },
  { iso2: 'kr', lat: 35.907, lon: 127.766 },
  { iso2: 'pl', lat: 52.07, lon: 19.48 },
  { iso2: 'se', lat: 60.13, lon: 15.0 },
  { iso2: 'no', lat: 61.0, lon: 8.5 },
  { iso2: 'dk', lat: 56.0, lon: 9.5 },
  { iso2: 'cn', lat: 35.0, lon: 104.0 },
  { iso2: 'ch', lat: 46.8, lon: 8.2 },
  { iso2: 'au', lat: -25.3, lon: 133.8 },
  { iso2: 'in', lat: 22.0, lon: 79.0 },
  { iso2: 'ie', lat: 53.4, lon: -8.0 },
  { iso2: 'at', lat: 47.5, lon: 14.5 },
  { iso2: 'gr', lat: 39.0, lon: 22.0 },
  { iso2: 'cz', lat: 49.8, lon: 15.5 },
  { iso2: 'ua', lat: 49.0, lon: 31.4 },
  { iso2: 'hr', lat: 45.1, lon: 15.2 },
];

interface MarcadorRuntime {
  iso2: string;
  pais: CountryRuntime | null;
  grupo: any;             // THREE.Group — posição fixa na superfície
  nucleo: any;             // THREE.Mesh — bolinha central
  glow: any;               // THREE.Sprite — halo pulsante
  anelSelecao: any;        // THREE.Mesh — anel, visível só quando selecionado
  faseAnimacao: number;    // deslocamento de fase (evita pulsar tudo junto)
  ehBrasil: boolean;
  direcaoNormal: any;      // THREE.Vector3 — normal da superfície (p/ profundidade)
  subnacaoNomeApi?: string; // ver Marcador.subnacaoNomeApi
}

const marcadoresRuntime: MarcadorRuntime[] = [];
const grupoMarcadores = new THREE.Group();

/** Textura radial simples (canvas) usada como sprite de glow do marcador. */
function criarTexturaGlow(): any {
  const tamanho = 128;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d')!;
  const gradiente = ctx.createRadialGradient(
    tamanho / 2, tamanho / 2, 0,
    tamanho / 2, tamanho / 2, tamanho / 2
  );
  gradiente.addColorStop(0, 'rgba(0,230,118,0.9)');
  gradiente.addColorStop(0.4, 'rgba(0,230,118,0.35)');
  gradiente.addColorStop(1, 'rgba(0,230,118,0)');
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, tamanho, tamanho);
  return new THREE.CanvasTexture(canvas);
}
const texturaGlow = criarTexturaGlow();

function construirMarcador(def: Marcador, indice: number): MarcadorRuntime {
  const paisAssociado = paisesRuntime.find((p) => p.data.iso2 === def.iso2) || null;
  const posicaoSuperficie = latLonParaVetor3(def.lat, def.lon, RAIO_GLOBO * 1.006);
  const normal = posicaoSuperficie.clone().normalize();

  const grupo = new THREE.Group();
  grupo.position.copy(posicaoSuperficie);

  const raioBase = def.ehBrasil ? 0.052 : 0.038;

  // núcleo (bolinha central)
  const nucleo = new THREE.Mesh(
    new THREE.SphereGeometry(raioBase, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00e676, transparent: true })
  );
  grupo.add(nucleo);

  // glow (sprite radial, sempre de frente para a câmera)
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texturaGlow,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const escalaGlow = def.ehBrasil ? 0.34 : 0.24;
  glow.scale.set(escalaGlow, escalaGlow, 1);
  grupo.add(glow);

  // anel de seleção (só aparece quando o país estiver selecionado)
  const anelSelecao = new THREE.Mesh(
    new THREE.RingGeometry(raioBase * 1.8, raioBase * 2.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0x5effa2,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  anelSelecao.lookAt(normal.clone().multiplyScalar(RAIO_GLOBO * 2));
  grupo.add(anelSelecao);

  grupoMarcadores.add(grupo);

  return {
    iso2: def.iso2,
    pais: paisAssociado,
    grupo,
    nucleo,
    glow,
    anelSelecao,
    faseAnimacao: indice * 0.55,
    ehBrasil: !!def.ehBrasil,
    direcaoNormal: normal,
    subnacaoNomeApi: def.subnacaoNomeApi,
  };
}

PAISES_COM_MARCADOR.forEach((def, i) => marcadoresRuntime.push(construirMarcador(def, i)));
scene.add(grupoMarcadores);


// ----------------------------------------------------------------------------
// 6. CONTROLES DE CÂMERA — arrastar, zoom e inércia (implementação própria)
// ----------------------------------------------------------------------------
// Feito manualmente (em vez do addon OrbitControls) para manter o protótipo
// como scripts clássicos (sem ES Modules), evitando bloqueios de CORS ao abrir
// o arquivo diretamente pelo navegador.

const RAIO_MAX = 22;

// Distância mínima de câmera é calculada dinamicamente (ver
// calcularRaioMinimoZoom) para que o globo NUNCA seja cortado pelas bordas
// da área disponível, em vez de um valor fixo arbitrário.
const MARGEM_SEGURANCA_PX = 16; // respiro entre a borda do globo e a borda do container

/**
 * Calcula a menor distância de câmera que ainda mantém o globo (a esfera
 * de terreno) 100% dentro da área disponível — usada no enquadramento
 * inicial e no reset (o zoom do usuário pode passar disso), com uma margem
 * de segurança. Considera o tamanho real do
 * container (que já exclui o painel lateral, pois ambos são colunas irmãs
 * do grid `.palco`), a largura/altura da tela e o FOV vertical e horizontal
 * da câmera. Recalculada sempre que o layout muda.
 */
function calcularRaioMinimoZoom(): number {
  const raioVisual = RAIO_GLOBO; // esfera de terreno (a atmosfera é um halo aditivo suave, não conta como "corte")
  const largura = canvasContainer.clientWidth;
  const altura = canvasContainer.clientHeight;
  if (!largura || !altura) return raioVisual * 1.6;

  const fovVerticalRad = THREE.MathUtils.degToRad(camera.fov);
  const aspecto = largura / altura;
  const fovHorizontalRad = 2 * Math.atan(Math.tan(fovVerticalRad / 2) * aspecto);

  // margem de segurança em px convertida para ângulo, proporcional a cada eixo
  const margemVertical = (MARGEM_SEGURANCA_PX / altura) * fovVerticalRad;
  const margemHorizontal = (MARGEM_SEGURANCA_PX / largura) * fovHorizontalRad;

  // usa o eixo mais restritivo (vertical ou horizontal) — garante que o
  // globo caiba nos dois ao mesmo tempo, qualquer que seja o aspect ratio
  const meioFovDisponivel = Math.max(
    0.05,
    Math.min(fovVerticalRad / 2 - margemVertical, fovHorizontalRad / 2 - margemHorizontal)
  );

  // esfera de raio `raioVisual` a distância d ocupa meio-ângulo asin(R/d);
  // isolando d: d = R / sin(meioFovDisponivel)
  return raioVisual / Math.sin(meioFovDisponivel);
}

// Distância em que o globo inteiro cabe na tela: usada só para o
// enquadramento inicial e o reset. O zoom do usuário pode ir além disso.
let RAIO_AJUSTE = calcularRaioMinimoZoom();
// Zoom máximo: câmera bem próxima da superfície do globo.
const RAIO_MIN = RAIO_GLOBO * 1.15;
let raioCamera = THREE.MathUtils.clamp(12, RAIO_AJUSTE, Math.max(RAIO_MAX, RAIO_AJUSTE));
let raioAlvo = raioCamera;

let theta = 0.6;       // ângulo horizontal (longitude da câmera)
let phi = 1.35;        // ângulo vertical (latitude da câmera)
let thetaAlvo = theta;
let phiAlvo = phi;

let arrastando = false;
let mouseAnteriorX = 0;
let mouseAnteriorY = 0;
let velocidadeTheta = 0;
let velocidadePhi = 0;

const AMORTECIMENTO = 0.08;       // suavidade da câmera "chegando" no alvo
const FATOR_INERCIA = 0.94;       // decaimento da velocidade após soltar o arraste
const SENSIBILIDADE = 0.0045;
const DISTANCIA_REFERENCIA = 11; // distância da câmera em que a sensibilidade é 100%

/**
 * Fator proporcional à altura da câmera sobre a superfície: com zoom alto o
 * globo gira mais devagar e a roda do mouse aproxima em passos menores.
 */
function fatorZoom(): number {
  return THREE.MathUtils.clamp((raioCamera - RAIO_GLOBO) / (DISTANCIA_REFERENCIA - RAIO_GLOBO), 0.08, 2);
}

function limitarZoom(raio: number): number {
  return THREE.MathUtils.clamp(raio, RAIO_MIN, Math.max(RAIO_MAX, RAIO_AJUSTE));
}

function atualizarCamera(): void {
  if (!arrastando) {
    thetaAlvo += velocidadeTheta;
    phiAlvo += velocidadePhi;
    velocidadeTheta *= FATOR_INERCIA;
    velocidadePhi *= FATOR_INERCIA;
  }
  phiAlvo = THREE.MathUtils.clamp(phiAlvo, 0.35, Math.PI - 0.35);

  theta += (thetaAlvo - theta) * AMORTECIMENTO;
  phi += (phiAlvo - phi) * AMORTECIMENTO;
  raioCamera += (raioAlvo - raioCamera) * AMORTECIMENTO;

  camera.position.set(
    raioCamera * Math.sin(phi) * Math.cos(theta),
    raioCamera * Math.cos(phi),
    raioCamera * Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(0, 0, 0);
}

canvasContainer.addEventListener('pointerdown', (e: PointerEvent) => {
  arrastando = true;
  mouseAnteriorX = e.clientX;
  mouseAnteriorY = e.clientY;
  velocidadeTheta = 0;
  velocidadePhi = 0;
  canvasContainer.classList.add('arrastando');
});

function aoPointerMoveGlobal(e: PointerEvent): void {
  atualizarMousePicking(e);
  if (!arrastando) return;
  const dx = e.clientX - mouseAnteriorX;
  const dy = e.clientY - mouseAnteriorY;
  // eixo X invertido (o globo gira no sentido oposto ao mouse na horizontal);
  // eixo Y acompanha o mouse (arrastar para baixo puxa o globo para baixo)
  const sensibilidade = SENSIBILIDADE * fatorZoom();
  thetaAlvo += dx * sensibilidade;
  phiAlvo -= dy * sensibilidade;
  velocidadeTheta = dx * sensibilidade * 0.5;
  velocidadePhi = -dy * sensibilidade * 0.5;
  mouseAnteriorX = e.clientX;
  mouseAnteriorY = e.clientY;
}
window.addEventListener('pointermove', aoPointerMoveGlobal);

function aoPointerUpGlobal(): void {
  arrastando = false;
  canvasContainer.classList.remove('arrastando');
}
window.addEventListener('pointerup', aoPointerUpGlobal);

canvasContainer.addEventListener(
  'wheel',
  (e: WheelEvent) => {
    e.preventDefault();
    raioAlvo = limitarZoom(raioAlvo + e.deltaY * 0.012 * fatorZoom());
  },
  { passive: false }
);

// Suporte básico a pinça (touch) para zoom em mobile/tablet
let distanciaPinchAnterior: number | null = null;
canvasContainer.addEventListener('touchmove', (e: TouchEvent) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    if (distanciaPinchAnterior !== null) {
      raioAlvo = limitarZoom(raioAlvo - (distancia - distanciaPinchAnterior) * 0.02 * fatorZoom());
    }
    distanciaPinchAnterior = distancia;
  }
});
canvasContainer.addEventListener('touchend', () => { distanciaPinchAnterior = null; });

// --- Botões de controle (zoom in / zoom out / reset) -----------------------
// --- Orientação inicial: globo abre já de frente para o Brasil -------------
const anguloBrasil = anguloCameraParaLatLon(-12, -52);
theta = thetaAlvo = anguloBrasil.theta;
phi = phiAlvo = anguloBrasil.phi;
raioCamera = raioAlvo = THREE.MathUtils.clamp(11, RAIO_AJUSTE, Math.max(RAIO_MAX, RAIO_AJUSTE));

const THETA_INICIAL = theta;
const PHI_INICIAL = phi;
const RAIO_INICIAL = raioCamera;

document.getElementById('zoom-in')?.addEventListener('click', () => {
  raioAlvo = limitarZoom(raioAlvo - 1.6 * fatorZoom());
});
document.getElementById('zoom-out')?.addEventListener('click', () => {
  raioAlvo = limitarZoom(raioAlvo + 1.6 * fatorZoom());
});
document.getElementById('zoom-reset')?.addEventListener('click', () => {
  thetaAlvo = THETA_INICIAL;
  phiAlvo = PHI_INICIAL;
  raioAlvo = RAIO_INICIAL;
  velocidadeTheta = 0;
  velocidadePhi = 0;
});

/**
 * Calcula os ângulos de câmera (theta/phi) necessários para que um ponto de
 * lat/lon fique de frente para o observador — usado para abrir a tela já
 * apontando para o país selecionado por padrão (Brasil).
 */
function anguloCameraParaLatLon(lat: number, lon: number): { theta: number; phi: number } {
  const direcao = latLonParaVetor3(lat, lon, 1).normalize();
  const phiCalc = Math.acos(THREE.MathUtils.clamp(direcao.y, -1, 1));
  const thetaCalc = Math.atan2(direcao.z, direcao.x);
  return { theta: thetaCalc, phi: phiCalc };
}

// ----------------------------------------------------------------------------
// 7. INTERAÇÃO — hover, clique, tooltip e painel lateral
// ----------------------------------------------------------------------------

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(-10, -10); // fora da tela inicialmente
const tooltipEl = document.getElementById('tooltip') as HTMLElement;
const painelEl = document.getElementById('painel') as HTMLElement;
const bottomSheetOverlay = document.getElementById('bottom-sheet-overlay') as HTMLElement;

let paisSobreMouse: CountryRuntime | null = null;
let paisSelecionado: CountryRuntime | null = null;
// nomeApi da subnação em foco (ex.: "Scotland"), quando o hover/seleção veio
// do PINO de uma seleção específica dentro de um polígono compartilhado
// (Reino Unido). null = área genérica do país (mostra a visão combinada).
let subnacaoSobreMouse: string | null = null;
let subnacaoSelecionada: string | null = null;
let opacidadeDestaqueAtual = 0;

function atualizarMousePicking(e: PointerEvent): void {
  const rect = canvasContainer.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ultimaPosicaoMouseTela = { x: e.clientX, y: e.clientY };
}

let ultimaPosicaoMouseTela = { x: 0, y: 0 };

/** Converte código ISO2 em emoji de bandeira (regional indicator symbols). */
function bandeiraEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🌐';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function encontrarPaisSobPonto(lat: number, lon: number): CountryRuntime | null {
  for (const pais of paisesRuntime) {
    const [minLon, minLat, maxLon, maxLat] = pais.bbox;
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
    for (const anel of pais.ringsFlat) {
      if (pontoDentroDoAnel(lon, lat, anel)) return pais;
    }
  }
  return null;
}

function detectarHover(): void {
  raycaster.setFromCamera(mouseNDC, camera);

  // Prioridade 1: o cursor está sobre a bolinha de um marcador?
  const nucleosMarcadores = marcadoresRuntime.map((m) => m.nucleo);
  const acertoMarcador = raycaster.intersectObjects(nucleosMarcadores, false);
  if (acertoMarcador.length > 0) {
    const marcador = marcadoresRuntime.find((m) => m.nucleo === acertoMarcador[0].object);
    if (marcador && marcador.pais) {
      definirPaisHover(marcador.pais, marcador.subnacaoNomeApi ?? null);
      return;
    }
  }

  // Prioridade 2: teste geográfico normal contra a superfície do globo
  const intersecoes = raycaster.intersectObject(esferaOceano);
  if (intersecoes.length === 0) {
    definirPaisHover(null);
    return;
  }
  const ponto = intersecoes[0].point;
  const { lat, lon } = vetor3ParaLatLon(ponto);
  const pais = encontrarPaisSobPonto(lat, lon);
  definirPaisHover(pais);
}

function definirPaisHover(pais: CountryRuntime | null, subnacaoNomeApi: string | null = null): void {
  if (pais === paisSobreMouse && subnacaoNomeApi === subnacaoSobreMouse) return;

  // restaura o brilho do contorno do país anterior (se não for o selecionado)
  if (paisSobreMouse && paisSobreMouse !== paisSelecionado) {
    paisSobreMouse.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_NORMAL;
      l.material.color.set(COR_BORDA_NORMAL);
    });
  }

  paisSobreMouse = pais;
  subnacaoSobreMouse = subnacaoNomeApi;

  if (pais) {
    pais.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_HOVER;
      l.material.color.set(COR_BORDA_HOVER);
    });
    canvasContainer.style.cursor = 'pointer';
  } else {
    canvasContainer.style.cursor = 'grab';
  }

  atualizarMalhaDestaque();
}

function atualizarMalhaDestaque(): void {
  const alvo = paisSobreMouse || paisSelecionado;
  if (malhaDestaque) {
    scene.remove(malhaDestaque);
    malhaDestaque.geometry.dispose();
    malhaDestaque.material.dispose();
    malhaDestaque = null;
  }
  if (alvo) {
    const cor = COR_BORDA_HOVER; // preenchimento sempre no verde da marca; o contorno diferencia o selecionado
    malhaDestaque = construirMalhaDestaque(alvo, cor);
    scene.add(malhaDestaque);
    opacidadeDestaqueAtual = 0;
  }
}

// --- Formatação e dados auxiliares ----------------------------------------
function formatarQuantidade(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)} mil`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} mil`;
  return String(n);
}
function plural(n: number, singular: string, pluralTexto: string): string {
  return n === 1 ? singular : pluralTexto;
}
/** O polígono "gb" representa a Inglaterra no futebol — usa a bandeira inglesa. */
function codigoBandeira(iso2: string): string {
  return iso2 === 'gb' ? 'gb-eng' : iso2;
}
function nomeExibicaoPais(pais: CountryRuntime): string {
  return DADOS_MOCK[pais.data.iso2]?.nome ?? nomePaisPt(pais.data.iso2, pais.data.name);
}
/**
 * Ponto de referência do país (ou de uma subnação específica, quando
 * informada): o marcador correspondente, se houver, senão o centro da bbox.
 */
function centroPais(pais: CountryRuntime, subnacaoNomeApi: string | null = null): { lat: number; lon: number } {
  const marcador =
    (subnacaoNomeApi && PAISES_COM_MARCADOR.find((m) => m.iso2 === pais.data.iso2 && m.subnacaoNomeApi === subnacaoNomeApi)) ||
    PAISES_COM_MARCADOR.find((m) => m.iso2 === pais.data.iso2);
  if (marcador) return { lat: marcador.lat, lon: marcador.lon };
  const [minLon, minLat, maxLon, maxLat] = pais.bbox;
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
}

// --- Card flutuante do país -------------------------------------------------
// Segue o mouse enquanto um país está sob o cursor; sem hover, fica preso ao
// país selecionado (projetado na tela a cada frame) e some se ele girar para trás.
let paisNoTooltip: CountryRuntime | null = null;
let subnacaoNoTooltip: string | null = null;

/** Busca os dados de uma subnação específica (ex.: "Scotland") dentro do país. */
function obterSubnacao(iso2: string, nomeApi: string | null): SubNacao | null {
  if (!nomeApi) return null;
  return DADOS_MOCK[iso2]?.subnacoes?.find((s) => s.nomeApi === nomeApi) ?? null;
}

function renderizarTooltip(pais: CountryRuntime, subnacaoNomeApi: string | null): void {
  const mock = DADOS_MOCK[pais.data.iso2];
  const sub = obterSubnacao(pais.data.iso2, subnacaoNomeApi);
  const clubes = sub ? sub.clubes : mock?.clubes ?? 0;
  const jogadores = sub ? sub.jogadores : mock?.jogadores ?? null;
  // O backend também manda países sem liga nenhuma, desde que tenham jogadores;
  // nesses casos a linha de clubes sai fora em vez de mostrar "0 clubes".
  const linhasMock = mock
    ? [
        clubes > 0
          ? `<p class="tooltip-linha"><i class="pi pi-shield"></i>${clubes} ${plural(clubes, 'clube', 'clubes')}</p>`
          : '',
        jogadores
          ? `<p class="tooltip-linha"><i class="pi pi-user"></i>${formatarQuantidade(jogadores)} ${plural(jogadores, 'jogador', 'jogadores')}</p>`
          : '',
      ].filter(Boolean)
    : [];
  const linhas = linhasMock.length > 0
    ? linhasMock.join('')
    : '<p class="tooltip-linha tooltip-vazio">Sem clubes cadastrados</p>';
  // Pino de uma subnação específica (ex.: pino da Escócia): nome e bandeira só
  // dela. Sem pino específico e com mais de uma seleção no ponto (ex.: hover
  // genérico no Reino Unido), o nome deixa isso explícito ("Inglaterra + Escócia").
  const nomeExibido = sub ? sub.nome : mock?.subnacoes ? mock.subnacoes.map((s) => s.nome).join(' + ') : nomeExibicaoPais(pais);
  const bandeira = sub ? sub.bandeira : codigoBandeira(pais.data.iso2);
  tooltipEl.innerHTML = `
    <img class="tooltip-bandeira" src="https://flagcdn.com/w80/${bandeira}.png" alt="" onerror="this.style.visibility='hidden'" />
    <div class="tooltip-info">
      <p class="tooltip-nome">${nomeExibido}</p>
      ${linhas}
    </div>
    <i class="pi pi-chevron-right tooltip-seta"></i>
  `;
}

function atualizarTooltip(): void {
  const alvo = paisSobreMouse || paisSelecionado;
  const subnacaoAlvo = paisSobreMouse ? subnacaoSobreMouse : subnacaoSelecionada;
  if (!alvo) {
    tooltipEl.classList.remove('visivel');
    paisNoTooltip = null;
    subnacaoNoTooltip = null;
    return;
  }
  if (alvo !== paisNoTooltip || subnacaoAlvo !== subnacaoNoTooltip) {
    renderizarTooltip(alvo, subnacaoAlvo);
    paisNoTooltip = alvo;
    subnacaoNoTooltip = subnacaoAlvo;
  }

  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  let x: number;
  let y: number;
  if (paisSobreMouse) {
    x = ultimaPosicaoMouseTela.x + 18;
    y = ultimaPosicaoMouseTela.y + 18;
    if (x + tw > window.innerWidth - 16) x = ultimaPosicaoMouseTela.x - tw - 18;
    if (y + th > window.innerHeight - 16) y = ultimaPosicaoMouseTela.y - th - 18;
  } else {
    const centro = centroPais(alvo, subnacaoAlvo);
    const ponto = latLonParaVetor3(centro.lat, centro.lon);
    const deFrente = ponto.clone().normalize().dot(camera.position.clone().normalize()) > 0.2;
    if (!deFrente) {
      tooltipEl.classList.remove('visivel');
      return;
    }
    const ndc = ponto.clone().project(camera);
    const rect = canvasContainer.getBoundingClientRect();
    x = rect.left + ((ndc.x + 1) / 2) * rect.width + 34;
    y = rect.top + ((1 - ndc.y) / 2) * rect.height - th - 60;
    x = THREE.MathUtils.clamp(x, rect.left + 8, rect.right - tw - 8);
    y = THREE.MathUtils.clamp(y, rect.top + 8, rect.bottom - th - 8);
  }
  tooltipEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  tooltipEl.classList.add('visivel');
}

canvasContainer.addEventListener('click', () => {
  if (!paisSobreMouse) return;
  selecionarPais(paisSobreMouse, subnacaoSobreMouse);
});

function selecionarPais(pais: CountryRuntime, subnacaoNomeApi: string | null = null): void {
  if (paisSelecionado) {
    paisSelecionado.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_NORMAL;
      l.material.color.set(COR_BORDA_NORMAL);
    });
  }
  paisSelecionado = pais;
  subnacaoSelecionada = subnacaoNomeApi;
  pais.outlineLines.forEach((l) => {
    l.material.opacity = OPACIDADE_BORDA_SELECIONADO;
    l.material.color.set(COR_BORDA_SELECIONADO);
  });
  atualizarMalhaDestaque();
  atualizarMarcadorSelecionado(pais.data.iso2, subnacaoNomeApi);
  atualizarDestaqueAtivo(pais.data.iso2);
  preencherPainel(pais, subnacaoNomeApi);
  painelEl.classList.add('painel-ativo');
  document.body.classList.add('sheet-aberto');
}

/**
 * Liga o anel de destaque só do pino exatamente selecionado (mesmo iso2 E
 * mesma subnação) — evita acender os dois pinos (Inglaterra e Escócia) juntos
 * quando só um deles foi clicado.
 */
function atualizarMarcadorSelecionado(iso2Selecionado: string, subnacaoNomeApi: string | null): void {
  marcadoresRuntime.forEach((m) => {
    m.anelSelecao.userData.selecionado = m.iso2 === iso2Selecionado && (m.subnacaoNomeApi ?? null) === subnacaoNomeApi;
  });
}

/** Gira a câmera até o país (pelo caminho mais curto). */
function voarParaPais(pais: CountryRuntime): void {
  const centro = centroPais(pais);
  const angulo = anguloCameraParaLatLon(centro.lat, centro.lon);
  const diferenca = angulo.theta - thetaAlvo;
  thetaAlvo += Math.atan2(Math.sin(diferenca), Math.cos(diferenca));
  phiAlvo = angulo.phi;
  velocidadeTheta = 0;
  velocidadePhi = 0;
}

// --- Painel lateral ---------------------------------------------------------
function preencherPainel(pais: CountryRuntime, subnacaoNomeApi: string | null = null): void {
  const iso2 = pais.data.iso2;
  const mock = DADOS_MOCK[iso2];
  // Veio do pino de uma seleção específica (ex.: pino da Escócia)? O painel
  // então mostra só essa seleção — nunca a soma com as outras do mesmo
  // território. Sem pino específico, cai na visão combinada de sempre.
  const sub = obterSubnacao(iso2, subnacaoNomeApi);
  const nome = sub ? sub.nome : nomeExibicaoPais(pais);
  const bandeira = sub ? sub.bandeira : codigoBandeira(iso2);
  const continente = mock?.continente ?? continentePais(iso2);
  const ligas = sub ? sub.ligas : mock ? mock.ligas : [];
  const clubes = sub ? sub.clubes : mock ? mock.clubes : 0;
  const jogadores = sub ? sub.jogadores : mock ? mock.jogadores : null;
  const foto = FOTOS_PAIS[iso2];

  const estatistica = (icone: string, valor: string, rotulo: string) => `
    <div class="painel-stat">
      <span class="painel-stat-icone"><i class="${icone}"></i></span>
      <div><strong>${valor}</strong><span>${rotulo}</span></div>
    </div>`;

  painelEl.innerHTML = `
    <button class="painel-fechar" id="painel-fechar" aria-label="Fechar">✕</button>

    <header class="painel-cabecalho${foto ? ' painel-cabecalho--foto' : ''}"
      ${foto ? `style="--painel-foto: url('nacoes/fotos/${iso2}.jpg')"` : ''}>
      <img class="painel-bandeira" src="https://flagcdn.com/w160/${bandeira}.png" alt="${nome}" onerror="this.style.visibility='hidden'" />
      <div class="painel-titulo">
        <h2 class="painel-nome">${nome}</h2>
        ${continente ? `<p class="painel-continente">${continente}</p>` : ''}
      </div>
      ${foto ? `<a class="painel-credito" href="${foto.fonte}" target="_blank" rel="noopener">Foto: ${foto.autor} · ${foto.licenca}</a>` : ''}
    </header>

    <div class="painel-stats">
      ${estatistica('pi pi-shield', String(clubes), plural(clubes, 'Clube', 'Clubes'))}
      ${estatistica('pi pi-user', jogadores !== null ? formatarQuantidade(jogadores) : '—', 'Jogadores')}
      ${estatistica('pi pi-trophy', String(ligas.length), plural(ligas.length, 'Liga', 'Ligas'))}
    </div>

    ${
      !sub && mock?.subnacoes
        ? // Visão combinada (sem pino específico) de um polígono com mais de uma
          // seleção (ex.: Reino Unido = Inglaterra + Escócia): cada uma vira sua
          // própria seção, com bandeira, nome e ligas — nunca misturadas, pra
          // Scottish Premiership jamais aparecer como liga inglesa.
          `<p class="painel-secao">Ligas por seleção</p>` +
          mock.subnacoes.map((s) => renderizarBlocoLigas(s.ligas, s.bandeira, s.nome)).join('')
        : `<p class="painel-secao">${plural(ligas.length, 'Liga do país', 'Ligas do país')}</p>` +
          renderizarBlocoLigas(ligas)
    }
  `;

  document.getElementById('painel-fechar')?.addEventListener('click', fecharPainel);
  painelEl.querySelectorAll('.liga-card').forEach((card) => {
    card.addEventListener('click', () => {
      const nomeLiga = card.getAttribute('data-liga') || '';
      const paisCodigo = card.getAttribute('data-pais-codigo') || (sub ? sub.bandeira : iso2);
      navegar('/times', { liga: nomeLiga, ligaExibicao: obterNomeExibicaoLiga(nomeLiga), paisCodigo });
    });
  });
}

/** Uma lista de liga-cards, opcionalmente com um mini-cabeçalho de subnação acima. */
function renderizarBlocoLigas(ligas: Liga[], bandeiraSubnacao?: string, nomeSubnacao?: string): string {
  const cabecalho =
    bandeiraSubnacao && nomeSubnacao
      ? `<div class="painel-subnacao">
           <img class="painel-subnacao-bandeira" src="https://flagcdn.com/w40/${bandeiraSubnacao}.png" alt="" onerror="this.style.visibility='hidden'" />
           <span class="painel-subnacao-nome">${nomeSubnacao}</span>
         </div>`
      : '';
  const corpo =
    ligas.length > 0
      ? ligas
          .map(
            (liga) => `
        <button class="liga-card" data-liga="${liga.nome}" data-pais-codigo="${bandeiraSubnacao ?? ''}">
          <span class="liga-icone">
            <img src="${obterCaminhoLogoLiga(liga.nome)}" alt=""
              onerror="this.parentElement.classList.add('liga-icone--vazio'); this.remove();" />
          </span>
          <span class="liga-nome">${obterNomeExibicaoLiga(liga.nome)}</span>
          <span class="liga-clubes">${liga.clubes} ${plural(liga.clubes, 'clube', 'clubes')}</span>
          <i class="pi pi-chevron-right liga-seta"></i>
        </button>`
          )
          .join('')
      : '<p class="painel-vazio">Nenhuma liga cadastrada ainda para este país.</p>';
  return `${cabecalho}<div class="painel-ligas">${corpo}</div>`;
}

function fecharPainel(): void {
  // No desktop o painel é fixo e sempre mostra o último país selecionado —
  // o X aqui só fecha a gaveta (bottom sheet) no mobile.
  document.body.classList.remove('sheet-aberto');
}

bottomSheetOverlay?.addEventListener('click', fecharPainel);

// --- Países em destaque (carrossel abaixo do globo) -------------------------
const listaDestaquesEl = document.getElementById('destaques-lista') as HTMLElement | null;
const QUANTIDADE_DESTAQUES = 12;

function montarDestaques(): void {
  if (!listaDestaquesEl) return;
  // Brasil sempre primeiro; os demais pelos que têm mais clubes no banco
  const destaques = Object.values(DADOS_MOCK)
    .sort((a, b) => (a.iso2 === 'br' ? -1 : b.iso2 === 'br' ? 1 : b.clubes - a.clubes))
    .slice(0, QUANTIDADE_DESTAQUES);

  listaDestaquesEl.innerHTML = destaques
    .map(
      (pais) => `
    <button class="destaque-card" data-iso2="${pais.iso2}">
      <img class="destaque-bandeira" src="https://flagcdn.com/w80/${codigoBandeira(pais.iso2)}.png" alt="" onerror="this.style.visibility='hidden'" />
      <span class="destaque-nome">${pais.nome}</span>
      <span class="destaque-clubes"><i class="pi pi-shield"></i>${pais.clubes} ${plural(pais.clubes, 'clube', 'clubes')}</span>
      <i class="pi pi-chevron-right destaque-seta"></i>
    </button>`
    )
    .join('');

  listaDestaquesEl.querySelectorAll<HTMLElement>('.destaque-card').forEach((card) => {
    card.addEventListener('click', () => {
      const pais = paisesRuntime.find((p) => p.data.iso2 === card.dataset['iso2']);
      if (!pais) return;
      selecionarPais(pais);
      voarParaPais(pais);
    });
  });
  if (paisSelecionado) atualizarDestaqueAtivo(paisSelecionado.data.iso2);
}

function atualizarDestaqueAtivo(iso2: string): void {
  listaDestaquesEl?.querySelectorAll<HTMLElement>('.destaque-card').forEach((card) => {
    card.classList.toggle('destaque-card--ativo', card.dataset['iso2'] === iso2);
  });
}

document.getElementById('destaques-anterior')?.addEventListener('click', () => {
  listaDestaquesEl?.scrollBy({ left: -listaDestaquesEl.clientWidth * 0.8, behavior: 'smooth' });
});
document.getElementById('destaques-proximo')?.addEventListener('click', () => {
  listaDestaquesEl?.scrollBy({ left: listaDestaquesEl.clientWidth * 0.8, behavior: 'smooth' });
});

// ----------------------------------------------------------------------------
// 8. LOOP DE RENDERIZAÇÃO
// ----------------------------------------------------------------------------

let tempoAnterior = performance.now();
let tempoTotal = 0;
let globoAtivo = true; // controlado por destruirGlobo() — impede loop órfão ao trocar de rota

function animar(agora: number): void {
  if (!globoAtivo) return; // não agenda o próximo frame: o loop para de vez
  requestAnimationFrame(animar);
  const delta = Math.min((agora - tempoAnterior) / 1000, 0.1);
  tempoAnterior = agora;
  tempoTotal += delta;

  atualizarCamera();
  detectarHover();
  atualizarMarcadores();

  // fade suave de opacidade da malha de destaque (hover/seleção)
  if (malhaDestaque) {
    const opacidadeAlvo = paisSelecionado === (paisSobreMouse || paisSelecionado) ? 0.62 : 0.42;
    opacidadeDestaqueAtual += (opacidadeAlvo - opacidadeDestaqueAtual) * Math.min(delta * 8, 1);
    malhaDestaque.material.opacity = opacidadeDestaqueAtual;
  }

  // rotação ambiente muito sutil quando o usuário não está interagindo
  grupoGrid.rotation.y += delta * 0.01;

  atualizarTooltip();

  renderer.render(scene, camera);
}
requestAnimationFrame(animar);

/**
 * Anima a pulsação de cada marcador (com fase própria, para não pulsarem
 * todos juntos) e aplica um leve esmaecimento nos que estão perto da borda
 * visível do planeta, dando sensação de profundidade.
 */
function atualizarMarcadores(): void {
  const direcaoCamera = camera.position.clone().normalize();

  marcadoresRuntime.forEach((m) => {
    // pulsação suave (mais lenta quando selecionado, per spec item 18)
    const velocidadePulso = m.anelSelecao.userData.selecionado ? 1.1 : 1.6;
    const pulso = 0.5 + 0.5 * Math.sin(tempoTotal * velocidadePulso + m.faseAnimacao);
    const escalaNucleo = 0.88 + pulso * 0.28;
    m.nucleo.scale.setScalar(escalaNucleo);

    const escalaGlowBase = m.ehBrasil ? 1.0 : 0.85;
    m.glow.scale.setScalar((m.ehBrasil ? 0.34 : 0.24) * (escalaGlowBase + pulso * 0.35));
    m.glow.material.opacity = 0.5 + pulso * 0.4;

    // fator de profundidade: 1 = de frente para a câmera, ~0 = na borda do globo
    const fatorFrente = THREE.MathUtils.clamp(m.direcaoNormal.dot(direcaoCamera), -1, 1);
    const intensidadeProfundidade = THREE.MathUtils.smoothstep
      ? THREE.MathUtils.smoothstep(fatorFrente, 0.05, 0.55)
      : Math.max(0, Math.min(1, (fatorFrente - 0.05) / 0.5));

    m.nucleo.material.opacity = 0.35 + intensidadeProfundidade * 0.65;
    m.glow.material.opacity *= 0.3 + intensidadeProfundidade * 0.7;
    m.grupo.visible = fatorFrente > -0.08; // some quando totalmente do lado oculto

    // anel de seleção (fade in/out conforme o país selecionado muda)
    const opacidadeAnelAlvo = m.anelSelecao.userData.selecionado ? 0.85 : 0;
    m.anelSelecao.material.opacity += (opacidadeAnelAlvo - m.anelSelecao.material.opacity) * 0.12;
    const escalaAnel = 1 + pulso * 0.12;
    m.anelSelecao.scale.setScalar(m.anelSelecao.userData.selecionado ? escalaAnel : 1);
  });
}

// --- Responsividade ------------------------------------------------------
function aoRedimensionar(): void {
  const largura = canvasContainer.clientWidth;
  const altura = canvasContainer.clientHeight;
  camera.aspect = largura / altura;
  camera.updateProjectionMatrix();
  renderer.setSize(largura, altura);

  // recalcula o enquadramento do globo inteiro para o novo tamanho de tela
  RAIO_AJUSTE = calcularRaioMinimoZoom();
  raioAlvo = limitarZoom(raioAlvo);
  raioCamera = limitarZoom(raioCamera);
}
window.addEventListener('resize', aoRedimensionar);

// --- Estado inicial: carrega dados reais, então seleciona o Brasil ---------
carregarDadosReais().finally(() => {
  if (!globoAtivo) return; // usuário saiu da página antes da resposta chegar
  montarDestaques();
  const paisBrasilInicial = paisesRuntime.find((p) => p.data.iso2 === 'br');
  if (paisBrasilInicial) {
    selecionarPais(paisBrasilInicial);
  }
});

console.log('FutNerds · Globo de Nações carregado —', GEO_COUNTRIES.length, 'países disponíveis.');

// ----------------------------------------------------------------------------
// 9. LIMPEZA — chamada pelo ngOnDestroy do componente Angular
// ----------------------------------------------------------------------------
// Essencial numa SPA: sem isso, ao navegar para outra página o loop de
// renderização, os listeners em `window` e o contexto WebGL continuariam
// vivos "por baixo dos panos", vazando memória e (se o usuário voltar à
// tela) empilhando uma segunda cena por cima da primeira.
function destruirGlobo(): void {
  globoAtivo = false; // faz animar() parar de se reagendar no próximo frame

  window.removeEventListener('pointermove', aoPointerMoveGlobal);
  window.removeEventListener('pointerup', aoPointerUpGlobal);
  window.removeEventListener('resize', aoRedimensionar);

  renderer.dispose();
  geometriaOceano.dispose();
  materialOceano.dispose();

  // libera as texturas/canvas gerados em memória
  texturaDia.dispose();
  texturaNoite.dispose();
  mascaraTerra.dispose();
  texturaGlow.dispose();

  // remove o <canvas> do WebGL do DOM (o próprio Angular remove o restante
  // da árvore do componente, mas o canvas do renderer não é filho do Angular
  // — foi inserido via appendChild manual, então precisa ser removido à mão)
  if (renderer.domElement.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement);
  }
}

  return destruirGlobo;
}

function obterNomeExibicao(liga: any, Liga: any) {
  throw new Error('Function not implemented.');
}
