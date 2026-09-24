/**
 * Configuração de país por liga para o mapa (/ligas/:ligaId).
 *
 * Os valores de enquadramento e de limite vêm da demo de referência
 * (docs/referencias/futnerds-mapa-satelite.html), que é a fonte do
 * comportamento visual.
 */

/** Cidade exibida no mapa sem clube da liga (rótulo em Source Serif 4 itálico). */
export interface CidadeSemTime {
  nome: string;
  lat: number;
  lng: number;
  /** 1 aparece desde o enquadramento inicial; 2 só com mais zoom. */
  rank: 1 | 2;
}

export interface ConfigPaisLiga {
  /** Casa com o :ligaId da rota e com ROTA_MAPA_POR_LIGA. */
  ligaId: string;
  /** Nome EXATO da liga na base — vai em GET /api/times?liga=... */
  ligaNomeBase: string;
  paisNome: string;
  /** Código de bandeira no padrão flagcdn. */
  paisCodigo: string;

  enquadramento: {
    bounds: [[number, number], [number, number]];
    padding: { top: number; bottom: number; left: number; right: number };
  };

  /**
   * Retângulo que a parte VISÍVEL do mapa nunca ultrapassa.
   *
   * Não é `maxBounds` de propósito: em tela larga o maxBounds força um zoom
   * alto e corta o país. A correção é feita à mão no `moveend` com easeTo
   * (nunca no `move`, senão o MapLibre cancela o zoom do scroll).
   */
  limite: { w: number; s: number; e: number; n: number };

  /**
   * Zoom máximo. O MÍNIMO não fica aqui: é calculado com cameraForBounds a
   * partir do enquadramento (menos 0.25) e recalculado no resize, porque
   * depende do tamanho da tela e do padding dos painéis.
   */
  maxZoom: number;

  mascaraUrl: string;
  /** JSON de localização dos clubes desta liga. */
  clubesUrl: string;

  cidadesSemTime: CidadeSemTime[];
}

/** A partir deste zoom aparecem as cidades de rank 2. */
export const RANK2_ZOOM = 7;

/**
 * Geometria do waypoint, em px no tamanho cheio.
 *
 * DEVE bater com .ml-wpm / .ml-head em src/styles/mapa-liga.css. O TypeScript
 * usa estes valores para a linha fina, o ponto do estadio e a caixa de colisao;
 * o CSS desenha. Mudar de um lado so desalinha os dois.
 */
export const WP_LARGURA = 46;
export const WP_ALTURA = 58;

/** Distancia minima entre waypoints na tela, em px (ver declutter). */
export const MIN_GAP = WP_LARGURA;

/**
 * Escala dos waypoints e corpo dos nomes de cidade variam com o zoom: no zoom
 * minimo tudo encolhe, para caber a Inglaterra inteira sem empilhar; a partir
 * de ZOOM_ESCALA_CHEIA volta ao tamanho normal.
 */
export const ZOOM_ESCALA_CHEIA = 8;

/**
 * Zoom minimo ao selecionar um clube.
 *
 * Em 9 a area util mostra ~215 km de largura: da para ver a cidade do clube e
 * as vizinhas, mantendo a nocao de onde ele fica no pais. Em 10.5 (o valor
 * anterior) sobravam ~76 km e a referencia geografica se perdia.
 */
export const ZOOM_AO_SELECIONAR = 9;
export const ESCALA_WP_MIN = 0.8;
export const TAM_CIDADE_MIN = 15; // px no zoom minimo
export const TAM_CIDADE_MAX = 19; // px a partir de ZOOM_ESCALA_CHEIA (igual ao CSS)

/** Cidades sem time que ganham um corpo um pouco maior. */
export const BIG_TOWNS = ['Leeds', 'Sheffield', 'Bristol', 'Leicester'];

/** Verde do FutNerds, usado quando o clube nao tem cor no JSON. */
export const COR_PADRAO = '#00D639';
export const COR_TEXTO_PADRAO = '#0B7F35';

export const CONFIG_INGLATERRA: ConfigPaisLiga = {
  ligaId: 'premier-league',
  ligaNomeBase: 'Premier League',
  paisNome: 'Inglaterra',
  paisCodigo: 'gb-eng',

  enquadramento: {
    bounds: [
      [-5.9, 49.9],
      [1.8, 55.85],
    ],
    /*
     * Reserva a área dos painéis flutuantes (ver src/styles/mapa-liga.css):
     *   esquerdo  left: 28px + 312px de largura + 20 de respiro = 360
     *   direito   right: 28px + 372px de largura + 20 de respiro = 420
     * Mexer na largura de um painel exige mexer aqui — senão o país é
     * enquadrado por baixo dele.
     *
     * Sem faixa inferior nesta etapa, então bottom fica modesto. O
     * paddingEfetivo() do componente encolhe tudo proporcionalmente em janela
     * estreita, onde 780px de padding horizontal não caberiam.
     */
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -5.8, s: 49.85, e: 1.85, n: 55.85 },
  maxZoom: 19,

  mascaraUrl: '/geo/inglaterra-mascara.json',
  clubesUrl: '/data/geo/premier-league.clubes.json',

  // Copiadas da demo (TOWNS). Cidades COM clube da liga não entram aqui —
  // elas vêm da lista `cidades` do JSON de localização.
  cidadesSemTime: [
  { nome: 'Leeds', lat: 53.8008, lng: -1.5491, rank: 1 },
  { nome: 'Sheffield', lat: 53.3811, lng: -1.4701, rank: 1 },
  { nome: 'Bristol', lat: 51.4545, lng: -2.5879, rank: 1 },
  { nome: 'Leicester', lat: 52.6369, lng: -1.1398, rank: 1 },
  { nome: 'Southampton', lat: 50.9097, lng: -1.4044, rank: 1 },
  { nome: 'Plymouth', lat: 50.3755, lng: -4.1427, rank: 1 },
  { nome: 'Norwich', lat: 52.6309, lng: 1.2974, rank: 1 },
  { nome: 'Hull', lat: 53.7676, lng: -0.3274, rank: 1 },
  { nome: 'York', lat: 53.9600, lng: -1.0873, rank: 1 },
  { nome: 'Cambridge', lat: 52.2053, lng: 0.1218, rank: 1 },
  { nome: 'Oxford', lat: 51.7520, lng: -1.2577, rank: 1 },
  { nome: 'Coventry', lat: 52.4068, lng: -1.5197, rank: 1 },
  { nome: 'Stoke-on-Trent', lat: 53.0027, lng: -2.1794, rank: 1 },
  { nome: 'Sunderland', lat: 54.9069, lng: -1.3838, rank: 1 },
  { nome: 'Middlesbrough', lat: 54.5742, lng: -1.2350, rank: 1 },
  { nome: 'Carlisle', lat: 54.8925, lng: -2.9329, rank: 1 },
  { nome: 'Exeter', lat: 50.7184, lng: -3.5339, rank: 1 },
  { nome: 'Portsmouth', lat: 50.8198, lng: -1.0880, rank: 1 },
  { nome: 'Ipswich', lat: 52.0567, lng: 1.1482, rank: 1 },
  { nome: 'Derby', lat: 52.9225, lng: -1.4746, rank: 2 },
  { nome: 'Wolverhampton', lat: 52.5862, lng: -2.1288, rank: 2 },
  { nome: 'Bradford', lat: 53.7960, lng: -1.7594, rank: 2 },
  { nome: 'Preston', lat: 53.7632, lng: -2.7031, rank: 2 },
  { nome: 'Blackpool', lat: 53.8175, lng: -3.0357, rank: 2 },
  { nome: 'Reading', lat: 51.4543, lng: -0.9781, rank: 2 },
  { nome: 'Milton Keynes', lat: 52.0406, lng: -0.7594, rank: 2 },
  { nome: 'Northampton', lat: 52.2405, lng: -0.9027, rank: 2 },
  { nome: 'Peterborough', lat: 52.5695, lng: -0.2405, rank: 2 },
  { nome: 'Lincoln', lat: 53.2307, lng: -0.5406, rank: 2 },
  { nome: 'Gloucester', lat: 51.8642, lng: -2.2382, rank: 2 },
  { nome: 'Bath', lat: 51.3811, lng: -2.3590, rank: 2 },
  { nome: 'Canterbury', lat: 51.2802, lng: 1.0789, rank: 2 },
  { nome: 'Dover', lat: 51.1279, lng: 1.3134, rank: 2 },
  { nome: 'Swindon', lat: 51.5558, lng: -1.7797, rank: 2 },
  { nome: 'Luton', lat: 51.8787, lng: -0.4200, rank: 2 },
  { nome: 'Chester', lat: 53.1934, lng: -2.8931, rank: 2 },
  { nome: 'Lancaster', lat: 54.0466, lng: -2.8007, rank: 2 },
  { nome: 'Truro', lat: 50.2632, lng: -5.0510, rank: 2 },  ],
};

export const CONFIG_ESPANHA: ConfigPaisLiga = {
  ligaId: 'la-liga',
  ligaNomeBase: 'LALIGA EA SPORTS',
  paisNome: 'Espanha',
  paisCodigo: 'es',

  enquadramento: {
    /*
     * Espanha CONTINENTAL. Nesta temporada nenhum clube da base fica em ilha,
     * e incluir as Canarias empurraria o enquadramento 1.000 km para sudoeste,
     * deixando o continente minusculo. As Baleares seguem recortadas na
     * mascara (sao Espanha), so nao entram nos bounds.
     */
    bounds: [
      [-9.6, 35.8],
      [3.5, 44.0],
    ],
    // Mesma logica da Inglaterra: reserva a largura dos paineis flutuantes.
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -9.8, s: 35.7, e: 3.7, n: 44.1 },
  maxZoom: 19,

  mascaraUrl: '/geo/espanha-mascara.json',
  clubesUrl: '/data/geo/la-liga.clubes.json',

  /*
   * Municipios espanhois com mais de 80 mil habitantes que NAO tem clube nesta
   * liga, gerados a partir do Wikidata (rank 1 a partir de 150 mil). Ao
   * contrario da Inglaterra, onde a lista veio da demo, aqui nao havia
   * referencia pronta.
   */
  cidadesSemTime: [
  { nome: 'Albacete', lat: 38.9956, lng: -1.8558, rank: 1 },
  { nome: 'Alcalá de Henares', lat: 40.4818, lng: -3.3643, rank: 1 },
  { nome: 'Alcobendas', lat: 40.5333, lng: -3.6333, rank: 2 },
  { nome: 'Alcorcón', lat: 40.3493, lng: -3.8284, rank: 1 },
  { nome: 'Algeciras', lat: 36.1275, lng: -5.4539, rank: 2 },
  { nome: 'Alicante', lat: 38.3453, lng: -0.4831, rank: 1 },
  { nome: 'Almería', lat: 36.8417, lng: -2.4639, rank: 1 },
  { nome: 'Badajoz', lat: 38.8779, lng: -6.9706, rank: 1 },
  { nome: 'Baracaldo', lat: 43.2972, lng: -2.9917, rank: 2 },
  { nome: 'Burgos', lat: 42.3408, lng: -3.6997, rank: 1 },
  { nome: 'Cádiz', lat: 36.5350, lng: -6.2975, rank: 2 },
  { nome: 'Cartagena', lat: 37.6019, lng: -0.9842, rank: 1 },
  { nome: 'Castellón de la Plana', lat: 39.9860, lng: -0.0374, rank: 1 },
  { nome: 'Córdoba', lat: 37.8900, lng: -4.7800, rank: 1 },
  { nome: 'Dos Hermanas', lat: 37.2836, lng: -5.9222, rank: 2 },
  { nome: 'Fuenlabrada', lat: 40.2833, lng: -3.8000, rank: 1 },
  { nome: 'Granada', lat: 37.1750, lng: -3.6000, rank: 1 },
  { nome: 'Huelva', lat: 37.2500, lng: -6.9500, rank: 2 },
  { nome: 'Jaén', lat: 37.7697, lng: -3.7889, rank: 2 },
  { nome: 'Jerez de la Frontera', lat: 36.7000, lng: -6.1167, rank: 1 },
  { nome: 'Las Rozas de Madrid', lat: 40.4917, lng: -3.8733, rank: 2 },
  { nome: 'Leganés', lat: 40.3282, lng: -3.7654, rank: 1 },
  { nome: 'León', lat: 42.5989, lng: -5.5669, rank: 2 },
  { nome: 'Logroño', lat: 42.4700, lng: -2.4456, rank: 1 },
  { nome: 'Lorca', lat: 37.6833, lng: -1.7000, rank: 2 },
  { nome: 'Madrid', lat: 40.4169, lng: -3.7033, rank: 1 },
  { nome: 'Marbella', lat: 36.5114, lng: -4.8834, rank: 1 },
  { nome: 'Móstoles', lat: 40.3333, lng: -3.8667, rank: 1 },
  { nome: 'Murcia', lat: 37.9833, lng: -1.1303, rank: 1 },
  { nome: 'Palma de Mallorca', lat: 39.5667, lng: 2.6497, rank: 1 },
  { nome: 'Parla', lat: 40.2372, lng: -3.7742, rank: 2 },
  { nome: 'Rivas-Vaciamadrid', lat: 40.3394, lng: -3.5181, rank: 2 },
  { nome: 'Roquetas de Mar', lat: 36.7814, lng: -2.6147, rank: 2 },
  { nome: 'Salamanca', lat: 40.9650, lng: -5.6642, rank: 2 },
  { nome: 'Sevilla', lat: 37.3886, lng: -5.9950, rank: 1 },
  { nome: 'Torrejón de Ardoz', lat: 40.4500, lng: -3.4831, rank: 2 },
  { nome: 'Torrevieja', lat: 37.9778, lng: -0.6833, rank: 2 },
  { nome: 'Valladolid', lat: 41.6520, lng: -4.7286, rank: 1 },
  { nome: 'Vitoria', lat: 42.8467, lng: -2.6731, rank: 1 },
  { nome: 'Zaragoza', lat: 41.6500, lng: -0.8833, rank: 1 },
  ],
};

export const CONFIG_ALEMANHA: ConfigPaisLiga = {
  ligaId: 'bundesliga',
  ligaNomeBase: 'Bundesliga',
  paisNome: 'Alemanha',
  paisCodigo: 'de',

  enquadramento: {
    bounds: [
      [5.6, 47.1],
      [15.3, 55.1],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: 5.4, s: 47.0, e: 15.5, n: 55.2 },
  maxZoom: 19,

  mascaraUrl: '/geo/alemanha-mascara.json',
  clubesUrl: '/data/geo/bundesliga.clubes.json',

  /*
   * Municipios urbanos alemaes com mais de 90 mil habitantes, do Wikidata.
   * Aqui TODOS ficaram rank 1 — a Alemanha tem muitas cidades medias, e o corte
   * de 90 mil ja seleciona so as grandes.
   *
   * A lista vem com os nomes em alemao, e as cidades com clube usam o nome de
   * exibicao em portugues ("Berlim", "Munique"). Quem evita a duplicata e o
   * filtro por DISTANCIA no LigaMapaService, nao este arquivo.
   */
  cidadesSemTime: [
  { nome: 'Aachen', lat: 50.7762, lng: 6.0838, rank: 1 },
  { nome: 'Augsburg', lat: 48.3689, lng: 10.8978, rank: 1 },
  { nome: 'Berlin', lat: 52.5167, lng: 13.3833, rank: 1 },
  { nome: 'Bielefeld', lat: 52.0167, lng: 8.5333, rank: 1 },
  { nome: 'Bochum', lat: 51.4833, lng: 7.2167, rank: 1 },
  { nome: 'Bonn', lat: 50.7353, lng: 7.1022, rank: 1 },
  { nome: 'Braunschweig', lat: 52.2692, lng: 10.5211, rank: 1 },
  { nome: 'Chemnitz', lat: 50.8324, lng: 12.9189, rank: 1 },
  { nome: 'Dresden', lat: 51.0493, lng: 13.7381, rank: 1 },
  { nome: 'Duisburg', lat: 51.4322, lng: 6.7611, rank: 1 },
  { nome: 'Düsseldorf', lat: 51.2256, lng: 6.7767, rank: 1 },
  { nome: 'Erfurt', lat: 50.9781, lng: 11.0289, rank: 1 },
  { nome: 'Essen', lat: 51.4508, lng: 7.0131, rank: 1 },
  { nome: 'Frankfurt am Main', lat: 50.1106, lng: 8.6822, rank: 1 },
  { nome: 'Freiburg im Breisgau', lat: 47.9950, lng: 7.8500, rank: 1 },
  { nome: 'Hagen', lat: 51.3594, lng: 7.4750, rank: 1 },
  { nome: 'Halle (Saale)', lat: 51.4828, lng: 11.9697, rank: 1 },
  { nome: 'Hamburg', lat: 53.5500, lng: 10.0000, rank: 1 },
  { nome: 'Hamm', lat: 51.6814, lng: 7.8192, rank: 1 },
  { nome: 'Hannover', lat: 52.3744, lng: 9.7386, rank: 1 },
  { nome: 'Karlsruhe', lat: 49.0167, lng: 8.4000, rank: 1 },
  { nome: 'Kassel', lat: 51.3158, lng: 9.4979, rank: 1 },
  { nome: 'Kiel', lat: 54.3233, lng: 10.1394, rank: 1 },
  { nome: 'Köln', lat: 50.9422, lng: 6.9578, rank: 1 },
  { nome: 'Krefeld', lat: 51.3333, lng: 6.5667, rank: 1 },
  { nome: 'Lübeck', lat: 53.8697, lng: 10.6864, rank: 1 },
  { nome: 'Ludwigshafen am Rhein', lat: 49.4811, lng: 8.4353, rank: 1 },
  { nome: 'Magdeburg', lat: 52.1316, lng: 11.6400, rank: 1 },
  { nome: 'Mannheim', lat: 49.4878, lng: 8.4661, rank: 1 },
  { nome: 'Mülheim an der Ruhr', lat: 51.4275, lng: 6.8825, rank: 1 },
  { nome: 'München', lat: 48.1375, lng: 11.5750, rank: 1 },
  { nome: 'Münster', lat: 51.9625, lng: 7.6256, rank: 1 },
  { nome: 'Nürnberg', lat: 49.4539, lng: 11.0775, rank: 1 },
  { nome: 'Oberhausen', lat: 51.4699, lng: 6.8514, rank: 1 },
  { nome: 'Oldenburg', lat: 53.1439, lng: 8.2139, rank: 1 },
  { nome: 'Potsdam', lat: 52.4009, lng: 13.0591, rank: 1 },
  { nome: 'Rostock', lat: 54.0833, lng: 12.1333, rank: 1 },
  { nome: 'Saarbrücken', lat: 49.2333, lng: 7.0000, rank: 1 },
  { nome: 'Wiesbaden', lat: 50.0825, lng: 8.2400, rank: 1 },
  { nome: 'Wuppertal', lat: 51.2667, lng: 7.1833, rank: 1 },
  ],
};

export const CONFIG_POR_LIGA: Record<string, ConfigPaisLiga> = {
  [CONFIG_INGLATERRA.ligaId]: CONFIG_INGLATERRA,
  [CONFIG_ESPANHA.ligaId]: CONFIG_ESPANHA,
  [CONFIG_ALEMANHA.ligaId]: CONFIG_ALEMANHA,
};

export function configDaLiga(ligaId: string): ConfigPaisLiga | null {
  return CONFIG_POR_LIGA[ligaId] ?? null;
}
