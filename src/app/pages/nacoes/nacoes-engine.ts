import * as THREE from 'three';
import { GeoCountry, GEO_COUNTRIES } from './nacoes-geo-data';
import { obterCaminhoLogoLiga } from '../../shared/ligas.util';

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

interface PaisMock {
  nome: string;
  iso2: string;
  descricao: string;
  ligas: Liga[];
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
const NOME_EXIBICAO_LIGA: { [nomeOriginal: string]: string } = {
  'Série A': 'Brasileirão',
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
  'Série A': 6,
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

function obterNomeExibicaoLiga(nomeOriginal: string): string {
  return NOME_EXIBICAO_LIGA[nomeOriginal] || nomeOriginal;
}

function ordenarLigasPorFama<T extends { nome: string }>(ligas: T[]): T[] {
  return [...ligas].sort((a, b) => (ORDEM_FAMA_LIGA[a.nome] ?? 999) - (ORDEM_FAMA_LIGA[b.nome] ?? 999));
}

interface LigaResumoApi {
  nome: string;
  quantidadeClubes: number;
}
interface PaisResumoApi {
  nome: string;
  quantidadeLigas: number;
  quantidadeClubes: number;
  ligas: LigaResumoApi[];
}


/**
 * Busca o resumo de nações/ligas/clubes no backend (futdb) e popula DADOS_MOCK,
 * casando cada país retornado pela API com o país correspondente em
 * GEO_COUNTRIES/paisesRuntime através do nome (normalizado, case-insensitive).
 */
async function carregarDadosReais(): Promise<void> {
  try {
    const resposta = await fetch('http://localhost:8080/api/nacoes/resumo');
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const paises: PaisResumoApi[] = await resposta.json();

    const novoMock: Record<string, PaisMock> = {};

    paises.forEach((paisApi) => {
      const nomeNormalizado = normalizarNomePais(paisApi.nome);
      const correspondente = paisesRuntime.find(
        (p) => normalizarNomePais(p.data.name) === nomeNormalizado
      );
      if (!correspondente) return; // país da API sem correspondência geográfica conhecida

      novoMock[correspondente.data.iso2] = {
        nome: paisApi.nome,
        iso2: correspondente.data.iso2,
        descricao: `${paisApi.nome} conta com ${paisApi.quantidadeLigas} liga${paisApi.quantidadeLigas !== 1 ? 's' : ''} cadastrada${paisApi.quantidadeLigas !== 1 ? 's' : ''} e ${paisApi.quantidadeClubes} clube${paisApi.quantidadeClubes !== 1 ? 's' : ''} no total.`,
        ligas: paisApi.ligas.map((liga, i) => ({
          nome: liga.nome,
          clubes: liga.quantidadeClubes,
          cor: PALETA_LIGAS[i % PALETA_LIGAS.length],
        })),
      };
    });

    DADOS_MOCK = novoMock;
    console.log('FutNerds · Dados reais carregados:', Object.keys(DADOS_MOCK).length, 'países com ligas.');
  } catch (erro) {
    console.warn('FutNerds · Não foi possível carregar dados do backend (futdb rodando em localhost:8080?). Globo funcionará sem dados de liga.', erro);
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
const COR_BORDA_HOVER = 0x00e676;       // verde principal
const COR_BORDA_SELECIONADO = 0x5effa2; // verde claro
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
 * Ruído procedural (value-noise fractal, determinístico) usado para gerar a
 * variação natural de terreno dentro dos próprios países — nunca um bloco
 * sólido por país. `semente` isola diferentes camadas (bioma, elevação,
 * grão fino) para que não fiquem correlacionadas entre si.
 */
function hashRuido2D(x: number, y: number, semente: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + semente * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
function ruidoSuave2D(x: number, y: number, semente: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const suavizar = (t: number) => t * t * (3 - 2 * t);
  const a = hashRuido2D(xi, yi, semente);
  const b = hashRuido2D(xi + 1, yi, semente);
  const c = hashRuido2D(xi, yi + 1, semente);
  const d = hashRuido2D(xi + 1, yi + 1, semente);
  const u = suavizar(xf), v = suavizar(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function ruidoFractal2D(x: number, y: number, semente: number, oitavas: number = 4): number {
  let total = 0, amplitude = 1, freq = 1, ampMax = 0;
  for (let o = 0; o < oitavas; o++) {
    total += ruidoSuave2D(x * freq, y * freq, semente) * amplitude;
    ampMax += amplitude;
    amplitude *= 0.52;
    freq *= 2.05;
  }
  return total / ampMax; // 0..1
}

/** Paradas de cor do gradiente de bioma: 0 = equador (floresta) → 1 = polo (frio). */
const PARADAS_BIOMA: { t: number; cor: [number, number, number] }[] = [
  { t: 0.00, cor: [22, 64, 32] },   // floresta densa / amazônica — verde vivo, sem chegar a preto
  { t: 0.12, cor: [34, 96, 46] },   // floresta média — mais saturada
  { t: 0.22, cor: [58, 150, 68] },  // vegetação / verde médio — puxando para o verde FutNerds
  { t: 0.32, cor: [124, 148, 58] }, // verde oliva — mais vivo
  { t: 0.40, cor: [168, 156, 82] }, // amarelo queimado / transição para seco
  { t: 0.50, cor: [201, 176, 112] },// areia / deserto
  { t: 0.60, cor: [166, 142, 80] }, // ocre
  { t: 0.70, cor: [110, 128, 68] }, // oliva temperado
  { t: 0.82, cor: [64, 132, 66] },  // verde temperado — mais vivo e saturado
  { t: 0.92, cor: [104, 85, 58] },  // terroso / marrom
  { t: 1.00, cor: [104, 116, 106] },// frio / cinza-esverdeado, com mais luminosidade
];
function corBioma(t: number): [number, number, number] {
  const tc = Math.max(0, Math.min(1, t));
  for (let i = 0; i < PARADAS_BIOMA.length - 1; i++) {
    const a = PARADAS_BIOMA[i], b = PARADAS_BIOMA[i + 1];
    if (tc >= a.t && tc <= b.t) {
      const f = (tc - a.t) / (b.t - a.t || 1);
      return [
        a.cor[0] + (b.cor[0] - a.cor[0]) * f,
        a.cor[1] + (b.cor[1] - a.cor[1]) * f,
        a.cor[2] + (b.cor[2] - a.cor[2]) * f,
      ];
    }
  }
  return PARADAS_BIOMA[PARADAS_BIOMA.length - 1].cor;
}
const COR_MONTANHA: [number, number, number] = [132, 123, 108];

/**
 * Gera a textura equiretangular do globo: oceano azul-petróleo escuro com os
 * continentes em uma superfície terrestre procedural (bioma + elevação +
 * grão), recortada exatamente pelo contorno real dos países via máscara.
 * A variação existe DENTRO de cada país/continente (não é uma cor sólida
 * por país) e as transições entre tons são suaves, sem blocos vetoriais.
 * O verde neon fica reservado para marcadores, hover e seleção.
 */
function criarTexturaContinentes(): any {
  const largura = 2048, altura = 1024;

  // ---- 1) Máscara de terra: silhueta preenchida de todos os países ----------
  const canvasMascara = document.createElement('canvas');
  canvasMascara.width = largura;
  canvasMascara.height = altura;
  const ctxMascara = canvasMascara.getContext('2d')!;
  GEO_COUNTRIES.forEach((pais) => {
    if (!pais.geometry || pais.iso2 === 'aq') return;
    const aneis = extrairAneisExternos(pais.geometry);
    aneis.forEach((anel) => {
      if (anel.length < 3) return;
      ctxMascara.beginPath();
      anel.forEach(([lon, lat], i) => {
        const x = (lon + 180) / 360 * largura;
        const y = (90 - lat) / 180 * altura;
        if (i === 0) ctxMascara.moveTo(x, y);
        else ctxMascara.lineTo(x, y);
      });
      ctxMascara.closePath();
      ctxMascara.fillStyle = '#fff';
      ctxMascara.fill('evenodd');
    });
  });

  // ---- 2) Terreno procedural em baixa resolução (bioma + elevação + brilho) --
  // Gerado em grade reduzida e depois ampliado com suavização — dá transições
  // naturais sem exigir milhões de avaliações de ruído em resolução final.
  const semente = 42;
  const largGrade = 420, altGrade = 210;
  const canvasTerreno = document.createElement('canvas');
  canvasTerreno.width = largGrade;
  canvasTerreno.height = altGrade;
  const ctxTerreno = canvasTerreno.getContext('2d')!;
  const imgTerreno = ctxTerreno.createImageData(largGrade, altGrade);
  for (let gy = 0; gy < altGrade; gy++) {
    const lat = 90 - (gy / altGrade) * 180;
    const ny = gy / altGrade;
    for (let gx = 0; gx < largGrade; gx++) {
      const nx = gx / largGrade;

      const ruidoBioma = ruidoFractal2D(nx * 5.5, ny * 5.5, semente, 4);
      const ruidoElevacao = ruidoFractal2D(nx * 9.5 + 100, ny * 9.5 + 100, semente + 7, 3);
      const ruidoDetalhe = ruidoFractal2D(nx * 24 + 50, ny * 24 + 50, semente + 3, 2);

      // índice climático 0..1 (equador → polo), levemente "embaralhado" pelo
      // ruído para que as faixas de bioma não fiquem retas/artificiais.
      let indiceClimatico = Math.abs(lat) / 90 + (ruidoBioma - 0.5) * 0.4;
      indiceClimatico = Math.max(0, Math.min(1, indiceClimatico));

      let [r, g, b] = corBioma(indiceClimatico);

      // relevo: regiões de "elevação" alta puxam a cor para tons de montanha
      if (ruidoElevacao > 0.58) {
        const forca = Math.min(1, (ruidoElevacao - 0.58) / 0.32);
        r += (COR_MONTANHA[0] - r) * forca * 0.75;
        g += (COR_MONTANHA[1] - g) * forca * 0.75;
        b += (COR_MONTANHA[2] - b) * forca * 0.75;
      }

      // variação sutil de luminosidade — simula relevo/bump sem geometria 3D
      // (piso elevado para que as regiões de sombra não fiquem escuras demais)
      const brilho = 0.94 + ruidoDetalhe * 0.22;
      r *= brilho; g *= brilho; b *= brilho;

      const idx = (gy * largGrade + gx) * 4;
      imgTerreno.data[idx] = Math.max(0, Math.min(255, r));
      imgTerreno.data[idx + 1] = Math.max(0, Math.min(255, g));
      imgTerreno.data[idx + 2] = Math.max(0, Math.min(255, b));
      imgTerreno.data[idx + 3] = 255;
    }
  }
  ctxTerreno.putImageData(imgTerreno, 0, 0);

  // ---- 3) Amplia com suavização (evita blocos, dá transições naturais) ------
  const canvasTerra = document.createElement('canvas');
  canvasTerra.width = largura;
  canvasTerra.height = altura;
  const ctxTerra = canvasTerra.getContext('2d')!;
  ctxTerra.imageSmoothingEnabled = true;
  (ctxTerra as any).imageSmoothingQuality = 'high';
  ctxTerra.drawImage(canvasTerreno, 0, 0, largGrade, altGrade, 0, 0, largura, altura);

  // ---- 4) Grão fino adicional — mais uma "camada de ruído", em maior escala,
  // para dar sensação de textura de terreno sem criar manchas gigantes. -----
  const largGrao = 700, altGrao = 350;
  const canvasGrao = document.createElement('canvas');
  canvasGrao.width = largGrao;
  canvasGrao.height = altGrao;
  const ctxGrao = canvasGrao.getContext('2d')!;
  const imgGrao = ctxGrao.createImageData(largGrao, altGrao);
  for (let gy = 0; gy < altGrao; gy++) {
    for (let gx = 0; gx < largGrao; gx++) {
      const v = ruidoFractal2D((gx / largGrao) * 30, (gy / altGrao) * 30, semente + 21, 3);
      const cinza = 128 + (v - 0.5) * 90;
      const idx = (gy * largGrao + gx) * 4;
      imgGrao.data[idx] = cinza;
      imgGrao.data[idx + 1] = cinza;
      imgGrao.data[idx + 2] = cinza;
      imgGrao.data[idx + 3] = 255;
    }
  }
  ctxGrao.putImageData(imgGrao, 0, 0);
  ctxTerra.globalCompositeOperation = 'overlay';
  ctxTerra.imageSmoothingEnabled = true;
  ctxTerra.drawImage(canvasGrao, 0, 0, largGrao, altGrao, 0, 0, largura, altura);
  ctxTerra.globalCompositeOperation = 'source-over';

  // ---- 5) Recorta o terreno apenas para as áreas de terra (máscara real) ----
  ctxTerra.globalCompositeOperation = 'destination-in';
  ctxTerra.drawImage(canvasMascara, 0, 0);
  ctxTerra.globalCompositeOperation = 'source-over';

  // ---- 6) Compõe terreno sobre o oceano azul-petróleo ------------------------
  const canvasFinal = document.createElement('canvas');
  canvasFinal.width = largura;
  canvasFinal.height = altura;
  const ctxFinal = canvasFinal.getContext('2d')!;
  const gradOceano = ctxFinal.createLinearGradient(0, 0, 0, altura);
  gradOceano.addColorStop(0, '#0a2028');
  gradOceano.addColorStop(0.5, '#06141a');
  gradOceano.addColorStop(1, '#081b22');
  ctxFinal.fillStyle = gradOceano;
  ctxFinal.fillRect(0, 0, largura, altura);
  ctxFinal.drawImage(canvasTerra, 0, 0);

  const textura = new THREE.CanvasTexture(canvasFinal);
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  return textura;
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

// --- Esfera do oceano + continentes ----------------------------------------
// A textura carrega o oceano azul-petróleo e os continentes em tons naturais;
// o material usa cor branca para não retintar essas cores, e emissive/specular
// bem discretos para não "lavar" o mapa de azul como na versão anterior.
const texturaContinentes = criarTexturaContinentes();
const geometriaOceano = new THREE.SphereGeometry(RAIO_GLOBO, 96, 96);
const materialOceano = new THREE.MeshPhongMaterial({
  map: texturaContinentes,
  color: 0xffffff,
  emissive: 0x0d1712,
  emissiveIntensity: 0.24,
  shininess: 9,
  specular: 0x1a2429,
  transparent: false,
});
const esferaOceano = new THREE.Mesh(geometriaOceano, materialOceano);
scene.add(esferaOceano);

// --- Grid discreto (linhas de latitude/longitude) --------------------------
const grupoGrid = new THREE.Group();
const materialGrid = new THREE.LineBasicMaterial({ color: 0x2a4048, transparent: true, opacity: 0.25 });
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
    float intensidade = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
    vec3 corAtmosfera = vec3(0.35, 0.55, 0.58); // azul petróleo esbranquiçado, leve toque verde
    gl_FragColor = vec4(corAtmosfera, 1.0) * intensidade * 0.55;
  }
`;
const atmosfera = new THREE.Mesh(
  new THREE.SphereGeometry(RAIO_GLOBO * 1.18, 64, 64),
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
  { iso2: 'gb', lat: 52.355, lon: -1.174 },
  { iso2: 'nl', lat: 52.132, lon: 5.291 },
  { iso2: 'be', lat: 50.503, lon: 4.469 },
  { iso2: 'tr', lat: 38.963, lon: 35.243 },
  { iso2: 'sa', lat: 23.885, lon: 45.079 },
  { iso2: 'jp', lat: 36.204, lon: 138.252 },
  { iso2: 'kr', lat: 35.907, lon: 127.766 },
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
 * Calcula a menor distância de câmera (= maior zoom permitido) que ainda
 * mantém o globo (a esfera de terreno) 100% dentro da área disponível para
 * o globo, com uma margem de segurança. Considera o tamanho real do
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

let RAIO_MIN = calcularRaioMinimoZoom();
let raioCamera = THREE.MathUtils.clamp(12, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
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
  thetaAlvo -= dx * SENSIBILIDADE;
  phiAlvo -= dy * SENSIBILIDADE;
  velocidadeTheta = -dx * SENSIBILIDADE * 0.5;
  velocidadePhi = -dy * SENSIBILIDADE * 0.5;
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
    raioAlvo = THREE.MathUtils.clamp(raioAlvo + e.deltaY * 0.012, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
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
      raioAlvo = THREE.MathUtils.clamp(raioAlvo - (distancia - distanciaPinchAnterior) * 0.02, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
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
raioCamera = raioAlvo = THREE.MathUtils.clamp(11, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));

const THETA_INICIAL = theta;
const PHI_INICIAL = phi;
const RAIO_INICIAL = raioCamera;

document.getElementById('zoom-in')?.addEventListener('click', () => {
  raioAlvo = THREE.MathUtils.clamp(raioAlvo - 1.6, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
});
document.getElementById('zoom-out')?.addEventListener('click', () => {
  raioAlvo = THREE.MathUtils.clamp(raioAlvo + 1.6, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
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
      definirPaisHover(marcador.pais);
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

function definirPaisHover(pais: CountryRuntime | null): void {
  if (pais === paisSobreMouse) {
    posicionarTooltip();
    return;
  }

  // restaura o brilho do contorno do país anterior (se não for o selecionado)
  if (paisSobreMouse && paisSobreMouse !== paisSelecionado) {
    paisSobreMouse.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_NORMAL;
      l.material.color.set(COR_BORDA_NORMAL);
    });
  }

  paisSobreMouse = pais;

  if (pais) {
    pais.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_HOVER;
      l.material.color.set(COR_BORDA_HOVER);
    });
    mostrarTooltip(pais);
    canvasContainer.style.cursor = 'pointer';
  } else {
    esconderTooltip();
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
    const cor = paisSelecionado === alvo ? COR_BORDA_SELECIONADO : COR_BORDA_HOVER;
    malhaDestaque = construirMalhaDestaque(alvo, cor);
    scene.add(malhaDestaque);
    opacidadeDestaqueAtual = 0;
  }
}

function mostrarTooltip(pais: CountryRuntime): void {
  const mock = DADOS_MOCK[pais.data.iso2];
  const listaLigas = mock
    ? ordenarLigasPorFama(mock.ligas).slice(0, 3).map((l) => `<li>${obterNomeExibicaoLiga(l.nome)}</li>`).join('')
    : '<li class="tooltip-vazio">Nenhuma liga cadastrada ainda</li>';
  const rodape = mock
    ? `${mock.ligas.length} liga${mock.ligas.length !== 1 ? 's' : ''} disponível${mock.ligas.length !== 1 ? 'is' : ''}`
    : 'Sem dados cadastrados';

  tooltipEl.innerHTML = `
    <div class="tooltip-cabecalho">
      <img class="tooltip-bandeira" src="https://flagcdn.com/w40/${pais.data.iso2}.png" alt="${pais.data.name}" onerror="this.style.display='none'" />
      <span class="tooltip-nome">${mock ? mock.nome : pais.data.name}</span>
    </div>
    <p class="tooltip-rotulo">Principais ligas</p>
    <ul class="tooltip-lista">${listaLigas}</ul>
    <p class="tooltip-rodape">${rodape}</p>
  `;
  tooltipEl.classList.add('visivel');
  posicionarTooltip();
}

function esconderTooltip(): void {
  tooltipEl.classList.remove('visivel');
}

function posicionarTooltip(): void {
  if (!tooltipEl.classList.contains('visivel')) return;
  const offsetX = 18;
  const offsetY = 18;
  let x = ultimaPosicaoMouseTela.x + offsetX;
  let y = ultimaPosicaoMouseTela.y + offsetY;
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  if (x + tw > window.innerWidth - 16) x = ultimaPosicaoMouseTela.x - tw - offsetX;
  if (y + th > window.innerHeight - 16) y = ultimaPosicaoMouseTela.y - th - offsetY;
  tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
}

canvasContainer.addEventListener('click', () => {
  if (!paisSobreMouse) return;
  selecionarPais(paisSobreMouse);
});

function selecionarPais(pais: CountryRuntime): void {
  if (paisSelecionado) {
    paisSelecionado.outlineLines.forEach((l) => {
      l.material.opacity = OPACIDADE_BORDA_NORMAL;
      l.material.color.set(COR_BORDA_NORMAL);
    });
  }
  paisSelecionado = pais;
  pais.outlineLines.forEach((l) => {
    l.material.opacity = OPACIDADE_BORDA_SELECIONADO;
    l.material.color.set(COR_BORDA_SELECIONADO);
  });
  atualizarMalhaDestaque();
  atualizarMarcadorSelecionado(pais.data.iso2);
  preencherPainel(pais);
  painelEl.classList.add('painel-ativo');
  document.body.classList.add('sheet-aberto');
}

/** Liga o anel de destaque do marcador do país selecionado (e desliga os demais). */
function atualizarMarcadorSelecionado(iso2Selecionado: string): void {
  marcadoresRuntime.forEach((m) => {
    m.anelSelecao.userData.selecionado = m.iso2 === iso2Selecionado;
  });
}

function preencherPainel(pais: CountryRuntime): void {
  const mock = DADOS_MOCK[pais.data.iso2];
  const nome = mock ? mock.nome : pais.data.name;
  const descricao = mock
    ? mock.descricao
    : `Ainda não temos dados detalhados sobre as ligas de ${nome} nesta demonstração.`;
  const ligas = mock ? mock.ligas : [];
  const totalClubes = ligas.reduce((soma, l) => soma + l.clubes, 0);

  painelEl.innerHTML = `
    <button class="painel-fechar" id="painel-fechar" aria-label="Fechar">✕</button>

    <div class="painel-topo">
      <img class="painel-bandeira" src="https://flagcdn.com/w80/${pais.data.iso2}.png" alt="${nome}" onerror="this.style.display='none'" />
      <div>
        <p class="painel-eyebrow">País selecionado</p>
        <h2 class="painel-nome">${nome.toUpperCase()}</h2>
      </div>
    </div>
    <p class="painel-subtitulo">Explore as principais ligas do país</p>

    <div class="painel-stats-row">
      <div class="stat-pill">
        <span class="stat-numero">${ligas.length}</span>
        <span class="stat-rotulo">liga${ligas.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="stat-pill">
        <span class="stat-numero">${totalClubes}</span>
        <span class="stat-rotulo">clube${totalClubes !== 1 ? 's' : ''}</span>
      </div>
    </div>

    <p class="painel-descricao">${descricao}</p>

    <div class="painel-ligas">
      ${
        ligas.length > 0
          ? ordenarLigasPorFama(ligas)
              .map(
                (liga) => `
        <div class="liga-card" data-liga="${liga.nome}">
          <div class="liga-icone" style="background:white">
            <img
              src="${obterCaminhoLogoLiga(liga.nome)}"
              alt=""
              style="width:100%;height:100%;object-fit:contain;padding:4px"
              onerror="this.parentElement.style.background='${liga.cor}22'; this.parentElement.style.color='${liga.cor}'; this.parentElement.innerHTML='🏆';"
            />
          </div>
          <div class="liga-info">
            <p class="liga-nome">${obterNomeExibicaoLiga(liga.nome)}</p>
            <p class="liga-clubes">${liga.clubes} times</p>
          </div>
          <span class="liga-seta">›</span>
        </div>`
              )
              .join('')
          : '<p class="painel-vazio">Nenhuma liga cadastrada ainda para este país.</p>'
      }
    </div>

    ${
      ligas.length > 0
        ? `
    <div class="card-ver-times" id="botao-ver-times">
      <div class="card-ver-times-icone">🏟️</div>
      <div class="card-ver-times-texto">
        <p class="card-ver-times-titulo">Ver todos os times do ${nome}</p>
        <p class="card-ver-times-sub">Acessar página de times</p>
      </div>
      <span class="liga-seta">›</span>
    </div>`
        : ''
    }
  `;

  document.getElementById('painel-fechar')?.addEventListener('click', fecharPainel);
  document.getElementById('botao-ver-times')?.addEventListener('click', () => {
    navegar('/times', { pais: nome, paisCodigo: pais.data.iso2 });
  });
  painelEl.querySelectorAll('.liga-card').forEach((card) => {
    card.addEventListener('click', () => {
      const nomeLiga = card.getAttribute('data-liga') || '';
      navegar('/times', { liga: nomeLiga, ligaExibicao: obterNomeExibicaoLiga(nomeLiga), paisCodigo: pais.data.iso2 });
    });
  });
}

function fecharPainel(): void {
  // No desktop o painel é fixo (30% da tela) e sempre mostra o último país
  // selecionado — o X aqui só fecha a gaveta (bottom sheet) no mobile.
  document.body.classList.remove('sheet-aberto');
}

bottomSheetOverlay?.addEventListener('click', fecharPainel);

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
    const opacidadeAlvo = paisSelecionado === (paisSobreMouse || paisSelecionado) ? 0.32 : 0.24;
    opacidadeDestaqueAtual += (opacidadeAlvo - opacidadeDestaqueAtual) * Math.min(delta * 8, 1);
    malhaDestaque.material.opacity = opacidadeDestaqueAtual;
  }

  // rotação ambiente muito sutil quando o usuário não está interagindo
  grupoGrid.rotation.y += delta * 0.01;

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

  // recalcula o limite de zoom para o novo tamanho de tela/painel e, se o
  // zoom atual (ou o alvo) ultrapassar o novo limite, ajusta automaticamente
  // para que o globo nunca fique cortado após um redimensionamento.
  RAIO_MIN = calcularRaioMinimoZoom();
  raioAlvo = THREE.MathUtils.clamp(raioAlvo, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
  raioCamera = THREE.MathUtils.clamp(raioCamera, RAIO_MIN, Math.max(RAIO_MAX, RAIO_MIN));
}
window.addEventListener('resize', aoRedimensionar);

// --- Estado inicial: carrega dados reais, então seleciona o Brasil ---------
carregarDadosReais().finally(() => {
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
  if (materialOceano.map) materialOceano.map.dispose();
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
