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
  /** Posta pelo LigaMapaService nas cidades de `cidadesVizinhas`. */
  vizinha?: boolean;
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

  /**
   * JSON com cidadesSemTime e cidadesVizinhas (scripts/gerar-cidades-
   * referencia.js). Quando presente, substitui as duas listas desta config —
   * é o caso das ligas com config gerada por configGerada().
   */
  cidadesUrl?: string;

  /**
   * Cidades dos países vizinhos que aparecem em volta do país, só como
   * referência geográfica. Mesmo estilo das cidades sem time; entram depois
   * delas e perdem as disputas de espaço (ver LigaMapaService.cruzar).
   * Coordenadas conferidas no OpenStreetMap.
   */
  cidadesVizinhas: CidadeSemTime[];
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

  // Irlanda, Escócia, País de Gales, norte da França, Bélgica e Holanda.
  cidadesVizinhas: [
  { nome: 'Dublin', lat: 53.3498, lng: -6.2603, rank: 1 },
  { nome: 'Belfast', lat: 54.5973, lng: -5.9301, rank: 1 },
  { nome: 'Glasgow', lat: 55.8642, lng: -4.2518, rank: 1 },
  { nome: 'Edimburgo', lat: 55.9533, lng: -3.1883, rank: 1 },
  { nome: 'Cardiff', lat: 51.4816, lng: -3.1791, rank: 1 },
  { nome: 'Swansea', lat: 51.6214, lng: -3.9436, rank: 1 },
  { nome: 'Paris', lat: 48.8566, lng: 2.3522, rank: 1 },
  { nome: 'Lille', lat: 50.6292, lng: 3.0573, rank: 1 },
  { nome: 'Calais', lat: 50.9513, lng: 1.8587, rank: 1 },
  { nome: 'Le Havre', lat: 49.4944, lng: 0.1079, rank: 1 },
  { nome: 'Bruxelas', lat: 50.8503, lng: 4.3517, rank: 1 },
  { nome: 'Antuérpia', lat: 51.2194, lng: 4.4025, rank: 1 },
  { nome: 'Amsterdã', lat: 52.3676, lng: 4.9041, rank: 1 },
  { nome: 'Roterdã', lat: 51.9244, lng: 4.4777, rank: 1 },
  { nome: 'Douglas', lat: 54.1523, lng: -4.4861, rank: 2 },
  { nome: 'Wrexham', lat: 53.0466, lng: -2.9925, rank: 2 },
  { nome: 'Newport', lat: 51.5842, lng: -2.9977, rank: 2 },
  { nome: 'Boulogne-sur-Mer', lat: 50.7264, lng: 1.6147, rank: 2 },
  { nome: 'Dunquerque', lat: 51.0343, lng: 2.3768, rank: 2 },
  { nome: 'Rouen', lat: 49.4432, lng: 1.0999, rank: 2 },
  { nome: 'Caen', lat: 49.1829, lng: -0.3707, rank: 2 },
  { nome: 'Cherbourg', lat: 49.6337, lng: -1.6222, rank: 2 },
  { nome: 'Amiens', lat: 49.8941, lng: 2.2958, rank: 2 },
  { nome: 'Bruges', lat: 51.2093, lng: 3.2247, rank: 2 },
  { nome: 'Gante', lat: 51.0543, lng: 3.7174, rank: 2 },
  { nome: 'Haia', lat: 52.0705, lng: 4.3007, rank: 2 },
  { nome: 'Utrecht', lat: 52.0907, lng: 5.1214, rank: 2 },
  { nome: 'Eindhoven', lat: 51.4416, lng: 5.4697, rank: 2 },
  ],
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

  // Portugal, sul da França, Andorra, Gibraltar e o norte da África.
  cidadesVizinhas: [
  { nome: 'Lisboa', lat: 38.7223, lng: -9.1393, rank: 1 },
  { nome: 'Porto', lat: 41.1579, lng: -8.6291, rank: 1 },
  { nome: 'Bordeaux', lat: 44.8378, lng: -0.5792, rank: 1 },
  { nome: 'Toulouse', lat: 43.6047, lng: 1.4442, rank: 1 },
  { nome: 'Marselha', lat: 43.2965, lng: 5.3698, rank: 1 },
  { nome: 'Tânger', lat: 35.7595, lng: -5.8340, rank: 1 },
  { nome: 'Orã', lat: 35.6971, lng: -0.6308, rank: 1 },
  { nome: 'Argel', lat: 36.7538, lng: 3.0588, rank: 1 },
  { nome: 'Braga', lat: 41.5454, lng: -8.4265, rank: 2 },
  { nome: 'Coimbra', lat: 40.2033, lng: -8.4103, rank: 2 },
  { nome: 'Faro', lat: 37.0194, lng: -7.9304, rank: 2 },
  { nome: 'Montpellier', lat: 43.6108, lng: 3.8767, rank: 2 },
  { nome: 'Perpignan', lat: 42.6887, lng: 2.8948, rank: 2 },
  { nome: 'Bayonne', lat: 43.4929, lng: -1.4748, rank: 2 },
  { nome: 'Andorra la Vella', lat: 42.5063, lng: 1.5218, rank: 2 },
  { nome: 'Gibraltar', lat: 36.1408, lng: -5.3536, rank: 2 },
  { nome: 'Tetuão', lat: 35.5889, lng: -5.3626, rank: 2 },
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

  // Os nove vizinhos: Holanda, Bélgica, Luxemburgo, França, Suíça, Áustria,
  // Tchéquia, Polônia e Dinamarca.
  cidadesVizinhas: [
  { nome: 'Amsterdã', lat: 52.3676, lng: 4.9041, rank: 1 },
  { nome: 'Roterdã', lat: 51.9244, lng: 4.4777, rank: 1 },
  { nome: 'Bruxelas', lat: 50.8503, lng: 4.3517, rank: 1 },
  { nome: 'Luxemburgo', lat: 49.6116, lng: 6.1319, rank: 1 },
  { nome: 'Paris', lat: 48.8566, lng: 2.3522, rank: 1 },
  { nome: 'Estrasburgo', lat: 48.5734, lng: 7.7521, rank: 1 },
  { nome: 'Zurique', lat: 47.3769, lng: 8.5417, rank: 1 },
  { nome: 'Berna', lat: 46.9480, lng: 7.4474, rank: 1 },
  { nome: 'Viena', lat: 48.2082, lng: 16.3738, rank: 1 },
  { nome: 'Praga', lat: 50.0755, lng: 14.4378, rank: 1 },
  { nome: 'Varsóvia', lat: 52.2297, lng: 21.0122, rank: 1 },
  { nome: 'Szczecin', lat: 53.4285, lng: 14.5528, rank: 1 },
  { nome: 'Copenhague', lat: 55.6761, lng: 12.5683, rank: 1 },
  { nome: 'Groningen', lat: 53.2194, lng: 6.5665, rank: 2 },
  { nome: 'Enschede', lat: 52.2215, lng: 6.8937, rank: 2 },
  { nome: 'Arnhem', lat: 51.9851, lng: 5.8987, rank: 2 },
  { nome: 'Utrecht', lat: 52.0907, lng: 5.1214, rank: 2 },
  { nome: 'Eindhoven', lat: 51.4416, lng: 5.4697, rank: 2 },
  { nome: 'Maastricht', lat: 50.8514, lng: 5.6910, rank: 2 },
  { nome: 'Antuérpia', lat: 51.2194, lng: 4.4025, rank: 2 },
  { nome: 'Liège', lat: 50.6326, lng: 5.5797, rank: 2 },
  { nome: 'Metz', lat: 49.1193, lng: 6.1757, rank: 2 },
  { nome: 'Nancy', lat: 48.6921, lng: 6.1844, rank: 2 },
  { nome: 'Mulhouse', lat: 47.7508, lng: 7.3359, rank: 2 },
  { nome: 'Basileia', lat: 47.5596, lng: 7.5886, rank: 2 },
  { nome: 'Salzburgo', lat: 47.8095, lng: 13.0550, rank: 2 },
  { nome: 'Innsbruck', lat: 47.2692, lng: 11.4041, rank: 2 },
  { nome: 'Linz', lat: 48.3069, lng: 14.2858, rank: 2 },
  { nome: 'Bratislava', lat: 48.1486, lng: 17.1077, rank: 2 },
  { nome: 'Pilsen', lat: 49.7384, lng: 13.3736, rank: 2 },
  { nome: 'Brno', lat: 49.1951, lng: 16.6068, rank: 2 },
  { nome: 'Poznań', lat: 52.4064, lng: 16.9252, rank: 2 },
  { nome: 'Wrocław', lat: 51.1079, lng: 17.0385, rank: 2 },
  ],
};

export const CONFIG_ITALIA: ConfigPaisLiga = {
  ligaId: 'serie-a',
  ligaNomeBase: 'Serie A Enilive',
  paisNome: 'Itália',
  paisCodigo: 'it',

  enquadramento: {
    /*
     * Continente, Sicília e Sardenha: o Cagliari joga na Sardenha, e clubes
     * sicilianos (Palermo, Catania) sobem e descem. Lampedusa fica de fora —
     * sozinha ela empurraria o enquadramento para o sul.
     */
    bounds: [
      [6.6, 36.6],
      [18.6, 47.1],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: 6.4, s: 36.4, e: 18.8, n: 47.2 },
  maxZoom: 19,

  mascaraUrl: '/geo/italia-mascara.json',
  clubesUrl: '/data/geo/serie-a.clubes.json',

  /*
   * Comuni italianos com mais de 90 mil habitantes que NAO tem clube nesta
   * liga, do Wikidata (rank 1 a partir de 150 mil). Nomes em italiano, como
   * na Espanha e na Alemanha; Giugliano ficou de fora por ser periferia de
   * Napoles.
   */
  cidadesSemTime: [
  { nome: 'Palermo', lat: 38.1157, lng: 13.3613, rank: 1 },
  { nome: 'Bari', lat: 41.1253, lng: 16.8667, rank: 1 },
  { nome: 'Catania', lat: 37.5027, lng: 15.0873, rank: 1 },
  { nome: 'Verona', lat: 45.4386, lng: 10.9928, rank: 1 },
  { nome: 'Messina', lat: 38.1936, lng: 15.5542, rank: 1 },
  { nome: 'Padova', lat: 45.4078, lng: 11.8733, rank: 1 },
  { nome: 'Trieste', lat: 45.6503, lng: 13.7703, rank: 1 },
  { nome: 'Brescia', lat: 45.5389, lng: 10.2203, rank: 1 },
  { nome: 'Prato', lat: 43.8808, lng: 11.0966, rank: 1 },
  { nome: 'Taranto', lat: 40.4711, lng: 17.2431, rank: 1 },
  { nome: 'Modena', lat: 44.6458, lng: 10.9257, rank: 1 },
  { nome: 'Reggio Calabria', lat: 38.1144, lng: 15.6500, rank: 1 },
  { nome: 'Perugia', lat: 43.1119, lng: 12.3885, rank: 1 },
  { nome: 'Ravenna', lat: 44.4161, lng: 12.2017, rank: 1 },
  { nome: 'Livorno', lat: 43.5500, lng: 10.3167, rank: 1 },
  { nome: 'Rimini', lat: 44.0594, lng: 12.5683, rank: 2 },
  { nome: 'Foggia', lat: 41.4585, lng: 15.5519, rank: 2 },
  { nome: 'Ferrara', lat: 44.8392, lng: 11.6175, rank: 2 },
  { nome: 'Latina', lat: 41.4672, lng: 12.9036, rank: 2 },
  { nome: 'Salerno', lat: 40.6806, lng: 14.7594, rank: 2 },
  { nome: 'Sassari', lat: 40.7267, lng: 8.5592, rank: 2 },
  { nome: 'Trento', lat: 46.0667, lng: 11.1167, rank: 2 },
  { nome: 'Pescara', lat: 42.4643, lng: 14.2142, rank: 2 },
  { nome: 'Forlì', lat: 44.2228, lng: 12.0414, rank: 2 },
  { nome: 'Siracusa', lat: 37.0692, lng: 15.2875, rank: 2 },
  { nome: 'Vicenza', lat: 45.5500, lng: 11.5500, rank: 2 },
  { nome: 'Terni', lat: 42.5608, lng: 12.6468, rank: 2 },
  { nome: 'Bolzano', lat: 46.4981, lng: 11.3548, rank: 2 },
  { nome: 'Piacenza', lat: 45.0500, lng: 9.7000, rank: 2 },
  { nome: 'Novara', lat: 45.4500, lng: 8.6200, rank: 2 },
  { nome: 'Ancona', lat: 43.6167, lng: 13.5167, rank: 2 },
  { nome: 'Andria', lat: 41.2317, lng: 16.3083, rank: 2 },
  { nome: 'Arezzo', lat: 43.4631, lng: 11.8781, rank: 2 },
  { nome: 'Cesena', lat: 44.1333, lng: 12.2333, rank: 2 },
  { nome: 'Pesaro', lat: 43.9102, lng: 12.9133, rank: 2 },
  { nome: 'Barletta', lat: 41.3167, lng: 16.2833, rank: 2 },
  { nome: 'La Spezia', lat: 44.1080, lng: 9.8289, rank: 2 },
  { nome: 'Alessandria', lat: 44.9133, lng: 8.6200, rank: 2 },
  ],

  // Sudeste da França e Córsega, Suíça, Áustria, Eslovênia, Croácia, os
  // Bálcãs do outro lado do Adriático, Malta e Tunísia.
  cidadesVizinhas: [
  { nome: 'Nice', lat: 43.7102, lng: 7.2620, rank: 1 },
  { nome: 'Lyon', lat: 45.7640, lng: 4.8357, rank: 1 },
  { nome: 'Ajaccio', lat: 41.9192, lng: 8.7386, rank: 1 },
  { nome: 'Genebra', lat: 46.2044, lng: 6.1432, rank: 1 },
  { nome: 'Zurique', lat: 47.3769, lng: 8.5417, rank: 1 },
  { nome: 'Innsbruck', lat: 47.2692, lng: 11.4041, rank: 1 },
  { nome: 'Liubliana', lat: 46.0569, lng: 14.5058, rank: 1 },
  { nome: 'Zagreb', lat: 45.8150, lng: 15.9819, rank: 1 },
  { nome: 'Split', lat: 43.5081, lng: 16.4402, rank: 1 },
  { nome: 'Sarajevo', lat: 43.8563, lng: 18.4131, rank: 1 },
  { nome: 'Tirana', lat: 41.3275, lng: 19.8187, rank: 1 },
  { nome: 'Valletta', lat: 35.8989, lng: 14.5146, rank: 1 },
  { nome: 'Túnis', lat: 36.8065, lng: 10.1815, rank: 1 },
  { nome: 'Grenoble', lat: 45.1885, lng: 5.7245, rank: 2 },
  { nome: 'Bastia', lat: 42.6977, lng: 9.4508, rank: 2 },
  { nome: 'Mônaco', lat: 43.7384, lng: 7.4246, rank: 2 },
  { nome: 'Lugano', lat: 46.0037, lng: 8.9511, rank: 2 },
  { nome: 'Klagenfurt', lat: 46.6247, lng: 14.3053, rank: 2 },
  { nome: 'Graz', lat: 47.0707, lng: 15.4395, rank: 2 },
  { nome: 'Rijeka', lat: 45.3271, lng: 14.4422, rank: 2 },
  { nome: 'San Marino', lat: 43.9424, lng: 12.4578, rank: 2 },
  { nome: 'Dubrovnik', lat: 42.6507, lng: 18.0944, rank: 2 },
  { nome: 'Podgorica', lat: 42.4304, lng: 19.2594, rank: 2 },
  { nome: 'Durrës', lat: 41.3246, lng: 19.4565, rank: 2 },
  { nome: 'Bizerta', lat: 37.2744, lng: 9.8739, rank: 2 },
  ],
};

export const CONFIG_FRANCA: ConfigPaisLiga = {
  ligaId: 'ligue-1',
  ligaNomeBase: "Ligue 1 McDonald's",
  paisNome: 'França',
  paisCodigo: 'fr',

  enquadramento: {
    // França metropolitana + Córsega. Os territórios ultramarinos ficam fora
    // da máscara e dos bounds.
    bounds: [
      [-4.9, 41.3],
      [9.6, 51.1],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -5.2, s: 41.2, e: 9.7, n: 51.2 },
  maxZoom: 19,

  mascaraUrl: '/geo/franca-mascara.json',
  clubesUrl: '/data/geo/ligue-1.clubes.json',

  /*
   * Comunas francesas com mais de 90 mil habitantes que NAO tem clube nesta
   * liga, do Wikidata (rank 1 a partir de 150 mil). Fora da lista: as comunas
   * da periferia de Paris, Lyon e Lille (Villeurbanne, Saint-Denis, Roubaix...)
   * e as ultramarinas. Ajaccio e Bastia entram abaixo do corte para a Córsega
   * nao ficar vazia.
   */
  cidadesSemTime: [
  { nome: 'Nantes', lat: 47.2172, lng: -1.5539, rank: 1 },
  { nome: 'Montpellier', lat: 43.6109, lng: 3.8772, rank: 1 },
  { nome: 'Bordeaux', lat: 44.8378, lng: -0.5794, rank: 1 },
  { nome: 'Toulon', lat: 43.1250, lng: 5.9306, rank: 1 },
  { nome: 'Reims', lat: 49.2653, lng: 4.0286, rank: 1 },
  { nome: 'Saint-Étienne', lat: 45.4339, lng: 4.3897, rank: 1 },
  { nome: 'Dijon', lat: 47.3231, lng: 5.0419, rank: 1 },
  { nome: 'Grenoble', lat: 45.1869, lng: 5.7264, rank: 1 },
  { nome: 'Nîmes', lat: 43.8383, lng: 4.3597, rank: 1 },
  { nome: 'Aix-en-Provence', lat: 43.5278, lng: 5.4456, rank: 2 },
  { nome: 'Clermont-Ferrand', lat: 45.7797, lng: 3.0869, rank: 2 },
  { nome: 'Tours', lat: 47.3928, lng: 0.6883, rank: 2 },
  { nome: 'Amiens', lat: 49.8919, lng: 2.2978, rank: 2 },
  { nome: 'Annecy', lat: 45.8992, lng: 6.1294, rank: 2 },
  { nome: 'Limoges', lat: 45.8344, lng: 1.2617, rank: 2 },
  { nome: 'Metz', lat: 49.1197, lng: 6.1769, rank: 2 },
  { nome: 'Perpignan', lat: 42.6975, lng: 2.8947, rank: 2 },
  { nome: 'Besançon', lat: 47.2422, lng: 6.0214, rank: 2 },
  { nome: 'Rouen', lat: 49.4431, lng: 1.1025, rank: 2 },
  { nome: 'Orléans', lat: 47.9022, lng: 1.9042, rank: 2 },
  { nome: 'Caen', lat: 49.1814, lng: -0.3636, rank: 2 },
  { nome: 'Mulhouse', lat: 47.7486, lng: 7.3392, rank: 2 },
  { nome: 'Nancy', lat: 48.6928, lng: 6.1836, rank: 2 },
  { nome: 'Avignon', lat: 43.9486, lng: 4.8083, rank: 2 },
  { nome: 'Ajaccio', lat: 41.9192, lng: 8.7386, rank: 2 },
  { nome: 'Bastia', lat: 42.6977, lng: 9.4508, rank: 2 },
  ],

  // Sul da Inglaterra, Bélgica, Luxemburgo, oeste da Alemanha, Suíça, noroeste
  // da Itália e norte da Espanha, com Andorra.
  cidadesVizinhas: [
  { nome: 'Londres', lat: 51.5074, lng: -0.1278, rank: 1 },
  { nome: 'Bruxelas', lat: 50.8503, lng: 4.3517, rank: 1 },
  { nome: 'Luxemburgo', lat: 49.6116, lng: 6.1319, rank: 1 },
  { nome: 'Genebra', lat: 46.2044, lng: 6.1432, rank: 1 },
  { nome: 'Basileia', lat: 47.5596, lng: 7.5886, rank: 1 },
  { nome: 'Turim', lat: 45.0703, lng: 7.6869, rank: 1 },
  { nome: 'Barcelona', lat: 41.3874, lng: 2.1686, rank: 1 },
  { nome: 'Bilbao', lat: 43.2630, lng: -2.9350, rank: 1 },
  { nome: 'Milão', lat: 45.4642, lng: 9.1900, rank: 2 },
  { nome: 'Gênova', lat: 44.4056, lng: 8.9463, rank: 2 },
  { nome: 'Lausanne', lat: 46.5197, lng: 6.6323, rank: 2 },
  { nome: 'Zurique', lat: 47.3769, lng: 8.5417, rank: 2 },
  { nome: 'Freiburg', lat: 47.9990, lng: 7.8421, rank: 2 },
  { nome: 'Karlsruhe', lat: 49.0069, lng: 8.4037, rank: 2 },
  { nome: 'Saarbrücken', lat: 49.2402, lng: 6.9969, rank: 2 },
  { nome: 'Colônia', lat: 50.9375, lng: 6.9603, rank: 2 },
  { nome: 'Liège', lat: 50.6326, lng: 5.5797, rank: 2 },
  { nome: 'Gante', lat: 51.0543, lng: 3.7174, rank: 2 },
  { nome: 'Southampton', lat: 50.9097, lng: -1.4044, rank: 2 },
  { nome: 'Plymouth', lat: 50.3755, lng: -4.1427, rank: 2 },
  { nome: 'Saint Helier', lat: 49.1868, lng: -2.1071, rank: 2 },
  { nome: 'San Sebastián', lat: 43.3183, lng: -1.9812, rank: 2 },
  { nome: 'Zaragoza', lat: 41.6500, lng: -0.8833, rank: 2 },
  { nome: 'Girona', lat: 41.9794, lng: 2.8214, rank: 2 },
  { nome: 'Andorra la Vella', lat: 42.5063, lng: 1.5218, rank: 2 },
  ],
};

/*
 * EFL (Championship, League One, League Two).
 *
 * Mesmo enquadramento da Premier League, mas com máscara Inglaterra + Gales:
 * Cardiff, Swansea, Wrexham e Newport jogam no sistema inglês, e com a máscara
 * só da Inglaterra ficariam na área escurecida, como se estivessem fora da liga.
 */

/** Gales, que nas divisões da EFL é parte do "país" e não vizinho. */
const CIDADES_GALES = ['Cardiff', 'Swansea', 'Newport', 'Wrexham'];

/**
 * As cidades da Premier League com clube. Na Premier elas vêm do JSON de
 * clubes; nas divisões de baixo quase nenhuma tem time, mas continuam sendo a
 * referência para achar o resto. O LigaMapaService tira as que tiverem clube
 * na liga (por nome e distância), então Londres não aparece duas vezes.
 */
const CIDADES_GRANDES_INGLATERRA: CidadeSemTime[] = [
  { nome: 'Londres', lat: 51.5072, lng: -0.1275, rank: 1 },
  { nome: 'Manchester', lat: 53.4794, lng: -2.2453, rank: 1 },
  { nome: 'Liverpool', lat: 53.4072, lng: -2.9917, rank: 1 },
  { nome: 'Birmingham', lat: 52.4800, lng: -1.9025, rank: 1 },
  { nome: 'Newcastle', lat: 54.9778, lng: -1.6133, rank: 1 },
  { nome: 'Nottingham', lat: 52.9550, lng: -1.1492, rank: 1 },
  { nome: 'Brighton', lat: 50.8208, lng: -0.1375, rank: 1 },
  { nome: 'Bournemouth', lat: 50.7200, lng: -1.8800, rank: 1 },
];

function configEfl(ligaId: string, ligaNomeBase: string): ConfigPaisLiga {
  const gales = CONFIG_INGLATERRA.cidadesVizinhas.filter((c) => CIDADES_GALES.includes(c.nome));
  return {
    ...CONFIG_INGLATERRA,
    ligaId,
    ligaNomeBase,
    mascaraUrl: '/geo/inglaterra-gales-mascara.json',
    clubesUrl: `/data/geo/${ligaId}.clubes.json`,
    cidadesSemTime: [
      ...CIDADES_GRANDES_INGLATERRA,
      ...CONFIG_INGLATERRA.cidadesSemTime,
      ...gales,
    ],
    cidadesVizinhas: CONFIG_INGLATERRA.cidadesVizinhas.filter(
      (c) => !CIDADES_GALES.includes(c.nome),
    ),
  };
}

export const CONFIG_CHAMPIONSHIP = configEfl('championship', 'EFL Championship');
export const CONFIG_LEAGUE_ONE = configEfl('league-one', 'EFL League One');
export const CONFIG_LEAGUE_TWO = configEfl('league-two', 'EFL League Two');

/*
 * Ligas com clube em ilha distante (Portugal, LaLiga 2).
 *
 * O enquadramento fica no continente — com os Açores ou as Canárias dentro
 * dele, o continente viraria um ponto. As ilhas entram na máscara e no
 * `limite`, e clicar no clube do painel leva a câmera até lá (voarPara).
 *
 * O limite precisa CONTER a vista inicial inteira. Se ele fosse só um pouco
 * maior que o continente, calcularCorrecao prenderia a borda da tela nele e
 * empurraria o país para trás do painel direito. Daí a folga larga.
 */

export const CONFIG_PORTUGAL: ConfigPaisLiga = {
  ligaId: 'liga-portugal',
  ligaNomeBase: 'Liga Portugal',
  paisNome: 'Portugal',
  paisCodigo: 'pt',

  enquadramento: {
    // Continente. Madeira (Marítimo) e Açores (Santa Clara) ficam fora.
    bounds: [
      [-9.6, 36.9],
      [-6.1, 42.2],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -32, s: 30, e: 3, n: 46 },
  maxZoom: 19,

  mascaraUrl: '/geo/portugal-mascara.json',
  clubesUrl: '/data/geo/liga-portugal.clubes.json',

  /*
   * Municípios portugueses com mais de 50 mil habitantes que NÃO têm clube
   * nesta liga, do Wikidata (rank 1 a partir de 75 mil). Fora da lista: a
   * periferia de Lisboa e do Porto (Sintra, Gaia, Almada, Matosinhos...).
   * Bragança, Guarda, Beja, Portalegre e Angra entram abaixo do corte para o
   * interior e os Açores não ficarem vazios.
   */
  cidadesSemTime: [
  { nome: 'Coimbra', lat: 40.2111, lng: -8.4289, rank: 1 },
  { nome: 'Leiria', lat: 39.7431, lng: -8.8069, rank: 1 },
  { nome: 'Setúbal', lat: 38.5243, lng: -8.8926, rank: 1 },
  { nome: 'Aveiro', lat: 40.6389, lng: -8.6553, rank: 1 },
  { nome: 'Viana do Castelo', lat: 41.7000, lng: -8.8333, rank: 1 },
  { nome: 'Faro', lat: 37.0161, lng: -7.9350, rank: 1 },
  { nome: 'Évora', lat: 38.5725, lng: -7.9072, rank: 1 },
  { nome: 'Santarém', lat: 39.2392, lng: -8.6869, rank: 2 },
  { nome: 'Castelo Branco', lat: 39.8228, lng: -7.4931, rank: 2 },
  { nome: 'Vila Real', lat: 41.2953, lng: -7.7461, rank: 2 },
  { nome: 'Covilhã', lat: 40.2833, lng: -7.5000, rank: 2 },
  { nome: 'Figueira da Foz', lat: 40.1509, lng: -8.8618, rank: 2 },
  { nome: 'Portimão', lat: 37.1333, lng: -8.5333, rank: 2 },
  { nome: 'Póvoa de Varzim', lat: 41.3916, lng: -8.7571, rank: 2 },
  { nome: 'Caldas da Rainha', lat: 39.4069, lng: -9.1363, rank: 2 },
  { nome: 'Bragança', lat: 41.8058, lng: -6.7572, rank: 2 },
  { nome: 'Guarda', lat: 40.5373, lng: -7.2676, rank: 2 },
  { nome: 'Beja', lat: 38.0151, lng: -7.8632, rank: 2 },
  { nome: 'Portalegre', lat: 39.2967, lng: -7.4285, rank: 2 },
  { nome: 'Angra do Heroísmo', lat: 38.6552, lng: -27.2186, rank: 2 },
  ],

  // Galiza, Castela e Leão, Extremadura e Andaluzia ocidental.
  cidadesVizinhas: [
  { nome: 'Vigo', lat: 42.2358, lng: -8.7267, rank: 1 },
  { nome: 'Badajoz', lat: 38.8779, lng: -6.9706, rank: 1 },
  { nome: 'Sevilha', lat: 37.3886, lng: -5.9950, rank: 1 },
  { nome: 'Madri', lat: 40.4169, lng: -3.7033, rank: 1 },
  { nome: 'Salamanca', lat: 40.9650, lng: -5.6642, rank: 1 },
  { nome: 'Huelva', lat: 37.2614, lng: -6.9447, rank: 2 },
  { nome: 'Ourense', lat: 42.3358, lng: -7.8639, rank: 2 },
  { nome: 'Santiago de Compostela', lat: 42.8782, lng: -8.5448, rank: 2 },
  { nome: 'Cáceres', lat: 39.4753, lng: -6.3724, rank: 2 },
  { nome: 'Mérida', lat: 38.9161, lng: -6.3437, rank: 2 },
  { nome: 'Zamora', lat: 41.5035, lng: -5.7446, rank: 2 },
  ],
};

export const CONFIG_BELGICA: ConfigPaisLiga = {
  ligaId: 'pro-league',
  ligaNomeBase: '1A Pro League',
  paisNome: 'Bélgica',
  paisCodigo: 'be',

  enquadramento: {
    bounds: [
      [2.5, 49.45],
      [6.45, 51.55],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: 2.3, s: 49.3, e: 6.6, n: 51.7 },
  maxZoom: 19,

  mascaraUrl: '/geo/belgica-mascara.json',
  clubesUrl: '/data/geo/pro-league.clubes.json',

  /*
   * Municípios belgas com mais de 55 mil habitantes que NÃO têm clube nesta
   * liga, do Wikidata (rank 1 a partir de 80 mil). Fora: as comunas da região
   * de Bruxelas e Seraing, colada em Liège. Arlon e Bastogne entram abaixo do
   * corte para as Ardenas não ficarem vazias.
   */
  cidadesSemTime: [
  { nome: 'Namur', lat: 50.4667, lng: 4.8667, rank: 1 },
  { nome: 'Mons', lat: 50.4547, lng: 3.9525, rank: 1 },
  { nome: 'Hasselt', lat: 50.9305, lng: 5.3385, rank: 1 },
  { nome: 'Aalst', lat: 50.9383, lng: 4.0392, rank: 1 },
  { nome: 'Sint-Niklaas', lat: 51.1644, lng: 4.1392, rank: 1 },
  { nome: 'Ostende', lat: 51.2258, lng: 2.9194, rank: 2 },
  { nome: 'Tournai', lat: 50.6056, lng: 3.3881, rank: 2 },
  { nome: 'Roeselare', lat: 50.9447, lng: 3.1233, rank: 2 },
  { nome: 'Mouscron', lat: 50.7444, lng: 3.2156, rank: 2 },
  { nome: 'Verviers', lat: 50.5833, lng: 5.8500, rank: 2 },
  { nome: 'Arlon', lat: 49.6833, lng: 5.8167, rank: 2 },
  { nome: 'Bastogne', lat: 50.0000, lng: 5.7167, rank: 2 },
  ],

  // Norte da França, sul da Holanda, Aachen e Luxemburgo.
  cidadesVizinhas: [
  { nome: 'Lille', lat: 50.6292, lng: 3.0573, rank: 1 },
  { nome: 'Maastricht', lat: 50.8514, lng: 5.6910, rank: 1 },
  { nome: 'Eindhoven', lat: 51.4416, lng: 5.4697, rank: 1 },
  { nome: 'Aachen', lat: 50.7762, lng: 6.0838, rank: 1 },
  { nome: 'Luxemburgo', lat: 49.6116, lng: 6.1319, rank: 1 },
  { nome: 'Breda', lat: 51.5719, lng: 4.7683, rank: 2 },
  { nome: 'Tilburg', lat: 51.5555, lng: 5.0913, rank: 2 },
  { nome: 'Middelburg', lat: 51.4988, lng: 3.6136, rank: 2 },
  { nome: 'Dunquerque', lat: 51.0343, lng: 2.3768, rank: 2 },
  { nome: 'Valenciennes', lat: 50.3570, lng: 3.5235, rank: 2 },
  { nome: 'Charleville-Mézières', lat: 49.7719, lng: 4.7161, rank: 2 },
  ],
};

/** As cidades com clube na primeira divisão, com o nome de exibição dela. */
const CIDADES_LALIGA: CidadeSemTime[] = [
  { nome: 'A Corunha', lat: 43.3739, lng: -8.4000, rank: 1 },
  { nome: 'Barcelona', lat: 41.3825, lng: 2.1769, rank: 1 },
  { nome: 'Bilbao', lat: 43.2604, lng: -2.9334, rank: 1 },
  { nome: 'Elche', lat: 38.2654, lng: -0.6989, rank: 1 },
  { nome: 'Getafe', lat: 40.3040, lng: -3.7294, rank: 1 },
  { nome: 'Madri', lat: 40.4169, lng: -3.7033, rank: 1 },
  { nome: 'Málaga', lat: 36.7167, lng: -4.4167, rank: 1 },
  { nome: 'Pamplona', lat: 42.8128, lng: -1.6443, rank: 1 },
  { nome: 'Santander', lat: 43.4647, lng: -3.8044, rank: 1 },
  { nome: 'Sevilha', lat: 37.3886, lng: -5.9950, rank: 1 },
  { nome: 'Valência', lat: 39.4700, lng: -0.3764, rank: 1 },
  { nome: 'Villarreal', lat: 39.9378, lng: -0.1014, rank: 1 },
  { nome: 'Vitoria-Gasteiz', lat: 42.8467, lng: -2.6731, rank: 1 },
];

/** Grafias locais da lista da Espanha que já estão em CIDADES_LALIGA. */
const DUPLICADAS_ESPANHA = ['Madrid', 'Sevilla', 'Vitoria'];

export const CONFIG_LALIGA_2: ConfigPaisLiga = {
  ...CONFIG_ESPANHA,
  ligaId: 'laliga-2',
  ligaNomeBase: 'LALIGA HYPERMOTION',

  // Enquadramento da primeira divisão (continente); as Canárias (Las Palmas,
  // Tenerife) ficam na máscara e no limite.
  limite: { w: -19.5, s: 26, e: 14, n: 47 },

  mascaraUrl: '/geo/espanha-canarias-mascara.json',
  clubesUrl: '/data/geo/laliga-2.clubes.json',

  cidadesSemTime: [
    ...CIDADES_LALIGA,
    ...CONFIG_ESPANHA.cidadesSemTime.filter((c) => !DUPLICADAS_ESPANHA.includes(c.nome)),
  ],
};

export const CONFIG_ARABIA_SAUDITA: ConfigPaisLiga = {
  ligaId: 'saudi-pro-league',
  ligaNomeBase: 'ROSHN Saudi League',
  paisNome: 'Arábia Saudita',
  paisCodigo: 'sa',

  enquadramento: {
    // O país inteiro: de Neom/Tabuk (noroeste) a Abha e Jizan (sudoeste).
    bounds: [
      [34.5, 16.3],
      [55.7, 32.2],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: 34, s: 16, e: 56, n: 32.5 },
  maxZoom: 19,

  mascaraUrl: '/geo/arabia-saudita-mascara.json',
  clubesUrl: '/data/geo/saudi-pro-league.clubes.json',

  /*
   * Cidades sauditas com mais de 90 mil habitantes que NÃO têm clube nesta
   * liga, do Wikidata (rank 1 a partir de 250 mil). Meca entra à mão: no
   * Wikidata ela não é classificada como cidade (Q515) e ficava de fora.
   */
  cidadesSemTime: [
  { nome: 'Meca', lat: 21.4225, lng: 39.8262, rank: 1 },
  { nome: 'Medina', lat: 24.4700, lng: 39.6100, rank: 1 },
  { nome: 'Taif', lat: 21.2667, lng: 40.4167, rank: 1 },
  { nome: 'Khamis Mushait', lat: 18.3000, lng: 42.7333, rank: 1 },
  { nome: 'Hafar Al-Batin', lat: 28.4342, lng: 45.9636, rank: 1 },
  { nome: 'Jubail', lat: 27.0000, lng: 49.6667, rank: 1 },
  { nome: "Ha'il", lat: 27.5167, lng: 41.6833, rank: 1 },
  { nome: 'Yanbu', lat: 24.0894, lng: 38.0619, rank: 1 },
  { nome: 'Najran', lat: 17.4917, lng: 44.1322, rank: 1 },
  { nome: 'Al-Kharj', lat: 24.1483, lng: 47.3050, rank: 1 },
  { nome: 'Unaizah', lat: 26.0840, lng: 43.9940, rank: 2 },
  { nome: 'Arar', lat: 30.9833, lng: 41.0167, rank: 2 },
  { nome: 'Sakakah', lat: 29.9697, lng: 40.2000, rank: 2 },
  { nome: 'Dhahran', lat: 26.2667, lng: 50.1500, rank: 2 },
  { nome: 'Jizan', lat: 16.8892, lng: 42.5611, rank: 2 },
  { nome: 'Qatif', lat: 26.5752, lng: 49.9969, rank: 2 },
  { nome: 'Qurayyat', lat: 31.3318, lng: 37.3428, rank: 2 },
  { nome: 'Al Bahah', lat: 20.0129, lng: 41.4677, rank: 2 },
  ],

  // Jordânia, Iraque, Kuwait, Golfo (Bahrein, Catar, Emirados) e o outro lado
  // do Mar Vermelho.
  cidadesVizinhas: [
  { nome: 'Amã', lat: 31.9454, lng: 35.9284, rank: 1 },
  { nome: 'Kuwait', lat: 29.3759, lng: 47.9774, rank: 1 },
  { nome: 'Manama', lat: 26.2285, lng: 50.5860, rank: 1 },
  { nome: 'Doha', lat: 25.2854, lng: 51.5310, rank: 1 },
  { nome: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, rank: 1 },
  { nome: 'Dubai', lat: 25.2048, lng: 55.2708, rank: 1 },
  { nome: 'Basra', lat: 30.5085, lng: 47.7804, rank: 1 },
  { nome: 'Port Sudan', lat: 19.6158, lng: 37.2164, rank: 1 },
  { nome: 'Aqaba', lat: 29.5321, lng: 35.0063, rank: 2 },
  { nome: 'Sharm el-Sheikh', lat: 27.9158, lng: 34.3300, rank: 2 },
  { nome: 'Al Ain', lat: 24.2075, lng: 55.7447, rank: 2 },
  ],
};

export const CONFIG_ESCOCIA: ConfigPaisLiga = {
  ligaId: 'scottish-premiership',
  ligaNomeBase: 'Scottish Premiership',
  paisNome: 'Escócia',
  paisCodigo: 'gb-sct',

  enquadramento: {
    // Continente, Hébridas e Órcadas. As Shetland ficam fora.
    bounds: [
      [-7.6, 54.6],
      [-1.7, 58.7],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -7.8, s: 54.5, e: -0.6, n: 59.4 },
  maxZoom: 19,

  mascaraUrl: '/geo/escocia-mascara.json',
  clubesUrl: '/data/geo/scottish-premiership.clubes.json',

  /*
   * Não há corte por população aqui: a Escócia tem poucas cidades grandes, e
   * as Highlands e as ilhas ficariam vazias. A lista mistura as maiores
   * cidades sem clube na liga com as referências de cada região (Fort William,
   * Oban, Stornoway, Kirkwall...). Coordenadas do Wikidata.
   */
  cidadesSemTime: [
  { nome: 'Inverness', lat: 57.4839, lng: -4.2258, rank: 1 },
  { nome: 'Stirling', lat: 56.1166, lng: -3.9369, rank: 1 },
  { nome: 'Ayr', lat: 55.4639, lng: -4.6278, rank: 1 },
  { nome: 'Dumfries', lat: 55.0667, lng: -3.6167, rank: 1 },
  { nome: 'Dunfermline', lat: 56.0714, lng: -3.4617, rank: 1 },
  { nome: 'Kirkcaldy', lat: 56.1107, lng: -3.1674, rank: 1 },
  { nome: 'Livingston', lat: 55.8834, lng: -3.5157, rank: 1 },
  { nome: 'Elgin', lat: 57.6464, lng: -3.3153, rank: 1 },
  { nome: 'Fort William', lat: 56.8169, lng: -5.1097, rank: 1 },
  { nome: 'Oban', lat: 56.4097, lng: -5.4725, rank: 1 },
  { nome: 'Stornoway', lat: 58.2090, lng: -6.3870, rank: 1 },
  { nome: 'Kirkwall', lat: 58.9811, lng: -2.9600, rank: 1 },
  { nome: 'Wick', lat: 58.4432, lng: -3.0917, rank: 1 },
  { nome: 'Stranraer', lat: 54.9014, lng: -5.0350, rank: 1 },
  { nome: 'Hamilton', lat: 55.7770, lng: -4.0390, rank: 2 },
  { nome: 'East Kilbride', lat: 55.7667, lng: -4.1833, rank: 2 },
  { nome: 'Cumbernauld', lat: 55.9400, lng: -3.9800, rank: 2 },
  { nome: 'Greenock', lat: 55.9500, lng: -4.7667, rank: 2 },
  { nome: 'Irvine', lat: 55.6194, lng: -4.6611, rank: 2 },
  { nome: 'St Andrews', lat: 56.3389, lng: -2.7989, rank: 2 },
  { nome: 'Arbroath', lat: 56.5614, lng: -2.5857, rank: 2 },
  { nome: 'Montrose', lat: 56.7080, lng: -2.4670, rank: 2 },
  { nome: 'Fraserburgh', lat: 57.6930, lng: -2.0050, rank: 2 },
  { nome: 'Peterhead', lat: 57.5091, lng: -1.7832, rank: 2 },
  { nome: 'Thurso', lat: 58.5961, lng: -3.5211, rank: 2 },
  { nome: 'Portree', lat: 57.4131, lng: -6.1936, rank: 2 },
  { nome: 'Ullapool', lat: 57.8973, lng: -5.1614, rank: 2 },
  { nome: 'Aviemore', lat: 57.1940, lng: -3.8230, rank: 2 },
  { nome: 'Pitlochry', lat: 56.7033, lng: -3.7332, rank: 2 },
  { nome: 'Galashiels', lat: 55.6206, lng: -2.8189, rank: 2 },
  { nome: 'Hawick', lat: 55.4247, lng: -2.7844, rank: 2 },
  { nome: 'Campbeltown', lat: 55.4233, lng: -5.6061, rank: 2 },
  ],

  // Irlanda do Norte e o norte da Inglaterra.
  cidadesVizinhas: [
  { nome: 'Belfast', lat: 54.5973, lng: -5.9301, rank: 1 },
  { nome: 'Derry', lat: 54.9966, lng: -7.3086, rank: 1 },
  { nome: 'Newcastle', lat: 54.9783, lng: -1.6178, rank: 1 },
  { nome: 'Carlisle', lat: 54.8925, lng: -2.9329, rank: 1 },
  { nome: 'Sunderland', lat: 54.9069, lng: -1.3838, rank: 2 },
  { nome: 'Middlesbrough', lat: 54.5742, lng: -1.2350, rank: 2 },
  { nome: 'Coleraine', lat: 55.1325, lng: -6.6646, rank: 2 },
  ],
};

export const CONFIG_BRASIL: ConfigPaisLiga = {
  ligaId: 'brasileirao',
  ligaNomeBase: 'Liga do Brasil',
  paisNome: 'Brasil',
  paisCodigo: 'br',

  enquadramento: {
    bounds: [
      [-74.0, -33.8],
      [-34.8, 5.3],
    ],
    padding: { top: 60, bottom: 60, left: 360, right: 420 },
  },

  limite: { w: -76, s: -35, e: -33, n: 6 },
  maxZoom: 19,

  mascaraUrl: '/geo/brasil-mascara.json',
  clubesUrl: '/data/geo/brasileirao.clubes.json',

  /*
   * Liga INCOMPLETA: sem licença do Brasileirão, o EA FC só tem o Bahia. Com a
   * lista de cidades de sempre, o mapa pareceria o de uma liga inteira com um
   * clube só; então ele mostra apenas a cidade do clube licenciado, que vem do
   * JSON de clubes. Nenhuma cidade sem time, nenhuma vizinha.
   */
  cidadesSemTime: [],
  cidadesVizinhas: [],
};


/*
 * Ligas com config GERADA.
 *
 * As ligas acima têm config escrita à mão. Para as outras, a config sai do
 * enquadramento e da máscara, e as cidades de referência vêm de um JSON gerado
 * a partir do Wikidata (scripts/gerar-cidades-referencia.js), em vez de listas
 * aqui. Os mesmos bounds estão em scripts/ligas-geo.js — mudar um exige mudar
 * o outro.
 */

/**
 * Limite = enquadramento com 25% de folga para cada lado.
 *
 * Folga larga de propósito (as configs manuais usam ~0,2°): calcularCorrecao
 * prende a tela dentro do limite quando ela cabe nele, e o limite dentro da
 * tela quando não cabe. Com 25%, a vista inicial cai sempre num dos dois
 * casos sem ser empurrada — em tela larga a tela é maior que o limite; em tela
 * estreita, menor. Com uma folga intermediária o país podia ir parar atrás do
 * painel direito.
 */
export function limiteDoEnquadramento(bounds: [[number, number], [number, number]]) {
  const [[w, s], [e, n]] = bounds;
  const fx = (e - w) * 0.25;
  const fy = (n - s) * 0.25;
  const r = (v: number) => Math.round(v * 100) / 100;
  return { w: r(w - fx), s: r(s - fy), e: r(e + fx), n: r(n + fy) };
}

interface DefinicaoLiga {
  ligaId: string;
  ligaNomeBase: string;
  paisNome: string;
  paisCodigo: string;
  /** Nome do arquivo em public/geo/, sem o sufixo -mascara.json. */
  mascara: string;
  bounds: [[number, number], [number, number]];
  /**
   * A base só tem os clubes licenciados no EA FC. O mapa mostra apenas a
   * cidade deles, sem cidades de referência: com a lista de sempre, pareceria
   * o mapa de uma liga inteira com dois ou três clubes.
   */
  incompleta?: boolean;
}

function configGerada(d: DefinicaoLiga): ConfigPaisLiga {
  return {
    ligaId: d.ligaId,
    ligaNomeBase: d.ligaNomeBase,
    paisNome: d.paisNome,
    paisCodigo: d.paisCodigo,
    enquadramento: {
      bounds: d.bounds,
      padding: { top: 60, bottom: 60, left: 360, right: 420 },
    },
    limite: limiteDoEnquadramento(d.bounds),
    maxZoom: 19,
    mascaraUrl: `/geo/${d.mascara}-mascara.json`,
    clubesUrl: `/data/geo/${d.ligaId}.clubes.json`,
    cidadesUrl: d.incompleta ? undefined : `/data/geo/${d.ligaId}.cidades.json`,
    cidadesSemTime: [],
    cidadesVizinhas: [],
  };
}

const LIGAS_GERADAS: ConfigPaisLiga[] = [
  // EUA e Canadá: Toronto, Vancouver e Montréal jogam a MLS.
  configGerada({ ligaId: 'mls', ligaNomeBase: 'MLS', paisNome: 'Estados Unidos', paisCodigo: 'us', mascara: 'eua-canada', bounds: [[-127.5, 24.5], [-67.0, 50.5]] }),
  // Até o Rio Negro: nenhum clube fica na Patagônia, e ela inteira deixaria Buenos Aires minúscula.
  configGerada({ ligaId: 'liga-argentina', ligaNomeBase: 'LPF', paisNome: 'Argentina', paisCodigo: 'ar', mascara: 'argentina', bounds: [[-72.5, -41.5], [-53.6, -21.8]] }),
  configGerada({ ligaId: 'serie-b', ligaNomeBase: 'Serie BKT', paisNome: 'Itália', paisCodigo: 'it', mascara: 'italia', bounds: [[6.6, 36.6], [18.6, 47.1]] }),
  configGerada({ ligaId: '2-bundesliga', ligaNomeBase: 'Bundesliga 2', paisNome: 'Alemanha', paisCodigo: 'de', mascara: 'alemanha', bounds: [[5.6, 47.1], [15.3, 55.1]] }),
  configGerada({ ligaId: '3-liga', ligaNomeBase: '3. Liga', paisNome: 'Alemanha', paisCodigo: 'de', mascara: 'alemanha', bounds: [[5.6, 47.1], [15.3, 55.1]] }),
  configGerada({ ligaId: 'ligue-2', ligaNomeBase: 'Ligue 2 BKT', paisNome: 'França', paisCodigo: 'fr', mascara: 'franca', bounds: [[-4.9, 41.3], [9.6, 51.1]] }),
  configGerada({ ligaId: 'super-lig', ligaNomeBase: 'Trendyol Süper Lig', paisNome: 'Turquia', paisCodigo: 'tr', mascara: 'turquia', bounds: [[25.6, 35.8], [44.8, 42.1]] }),
  configGerada({ ligaId: 'eredivisie', ligaNomeBase: 'Eredivisie', paisNome: 'Holanda', paisCodigo: 'nl', mascara: 'holanda', bounds: [[3.3, 50.75], [7.25, 53.6]] }),
  configGerada({ ligaId: 'liga-mx', ligaNomeBase: 'Liga BBVA MX', paisNome: 'México', paisCodigo: 'mx', mascara: 'mexico', bounds: [[-117.2, 14.5], [-86.7, 32.8]] }),
  configGerada({ ligaId: 'ekstraklasa', ligaNomeBase: 'Ekstraklasa', paisNome: 'Polônia', paisCodigo: 'pl', mascara: 'polonia', bounds: [[14.1, 49], [24.2, 54.9]] }),
  configGerada({ ligaId: 'eliteserien', ligaNomeBase: 'Eliteserien', paisNome: 'Noruega', paisCodigo: 'no', mascara: 'noruega', bounds: [[4.5, 57.9], [31.2, 71.2]] }),
  configGerada({ ligaId: 'superliga-china', ligaNomeBase: 'CSL', paisNome: 'China', paisCodigo: 'cn', mascara: 'china', bounds: [[73.5, 18.1], [134.8, 53.6]] }),
  configGerada({ ligaId: 'allsvenskan', ligaNomeBase: 'Allsvenskan', paisNome: 'Suécia', paisCodigo: 'se', mascara: 'suecia', bounds: [[11, 55.3], [24.2, 69.1]] }),
  // Na base esta liga está cadastrada como da Dinamarca, mas os clubes são romenos.
  configGerada({ ligaId: 'superliga-romenia', ligaNomeBase: 'SUPERLIGA', paisNome: 'Romênia', paisCodigo: 'ro', mascara: 'romenia', bounds: [[20.2, 43.6], [29.7, 48.3]] }),
  // Na base esta liga está cadastrada como dos Estados Unidos, mas os clubes são dinamarqueses. Bornholm fica na máscara, fora do enquadramento.
  configGerada({ ligaId: 'superliga-dinamarca', ligaNomeBase: 'Metropolitan Division', paisNome: 'Dinamarca', paisCodigo: 'dk', mascara: 'dinamarca', bounds: [[8, 54.5], [12.7, 57.8]] }),
  configGerada({ ligaId: 'super-league-suica', ligaNomeBase: 'Brack Super League', paisNome: 'Suíça', paisCodigo: 'ch', mascara: 'suica', bounds: [[5.9, 45.8], [10.5, 47.85]] }),
  configGerada({ ligaId: 'bundesliga-austria', ligaNomeBase: 'Ö. Bundesliga', paisNome: 'Áustria', paisCodigo: 'at', mascara: 'austria', bounds: [[9.5, 46.35], [17.2, 49.05]] }),
  configGerada({ ligaId: 'k-league', ligaNomeBase: 'K League 1', paisNome: 'Coreia do Sul', paisCodigo: 'kr', mascara: 'coreia-do-sul', bounds: [[125, 33.1], [129.6, 38.65]] }),
  // Austrália e Nova Zelândia: Auckland e Wellington jogam a A-League.
  configGerada({ ligaId: 'a-league', ligaNomeBase: 'Isuzu UTE A League', paisNome: 'Austrália', paisCodigo: 'au', mascara: 'australia-nz', bounds: [[112.9, -47.3], [178.6, -10.6]] }),
  configGerada({ ligaId: 'isl', ligaNomeBase: 'ISL', paisNome: 'Índia', paisCodigo: 'in', mascara: 'india', bounds: [[68.1, 6.7], [97.4, 35.5]] }),
  // Com a Irlanda do Norte: o Derry City joga a liga irlandesa.
  configGerada({ ligaId: 'league-of-ireland', ligaNomeBase: "SSE Airtricity Men's Premier Division", paisNome: 'Irlanda', paisCodigo: 'ie', mascara: 'irlanda', bounds: [[-10.7, 51.4], [-5.4, 55.45]] }),
  configGerada({ ligaId: 'liga-grecia', ligaNomeBase: 'Hellas Liga', paisNome: 'Grécia', paisCodigo: 'gr', mascara: 'grecia', bounds: [[19.3, 34.8], [29.7, 41.8]], incompleta: true }),
  configGerada({ ligaId: 'liga-tchequia', ligaNomeBase: 'Česká Liga', paisNome: 'Tchéquia', paisCodigo: 'cz', mascara: 'tchequia', bounds: [[12.1, 48.55], [18.9, 51.06]], incompleta: true }),
  configGerada({ ligaId: 'liga-ucrania', ligaNomeBase: 'Ukrayina Liha', paisNome: 'Ucrânia', paisCodigo: 'ua', mascara: 'ucrania', bounds: [[22.1, 44.3], [40.2, 52.4]], incompleta: true }),
  configGerada({ ligaId: 'liga-croacia', ligaNomeBase: 'Liga Hrvatska', paisNome: 'Croácia', paisCodigo: 'hr', mascara: 'croacia', bounds: [[13.4, 42.4], [19.5, 46.6]], incompleta: true }),
  configGerada({ ligaId: 'liga-chipre', ligaNomeBase: 'Liga Cyprus', paisNome: 'Chipre', paisCodigo: 'cy', mascara: 'chipre', bounds: [[32.2, 34.5], [34.65, 35.75]], incompleta: true }),
  configGerada({ ligaId: 'liga-emirados', ligaNomeBase: 'United Emirates League', paisNome: 'Emirados Árabes Unidos', paisCodigo: 'ae', mascara: 'emirados', bounds: [[51.5, 22.6], [56.4, 26.1]], incompleta: true }),
  configGerada({ ligaId: 'liga-hungria', ligaNomeBase: 'Magyar Liga', paisNome: 'Hungria', paisCodigo: 'hu', mascara: 'hungria', bounds: [[16.1, 45.7], [22.9, 48.6]], incompleta: true }),
  configGerada({ ligaId: 'liga-colombia', ligaNomeBase: 'Liga Colombia', paisNome: 'Colômbia', paisCodigo: 'co', mascara: 'colombia', bounds: [[-79.1, -4.3], [-66.8, 12.5]], incompleta: true }),
  configGerada({ ligaId: 'liga-bulgaria', ligaNomeBase: 'Liga Bulgaria', paisNome: 'Bulgária', paisCodigo: 'bg', mascara: 'bulgaria', bounds: [[22.3, 41.2], [28.7, 44.25]], incompleta: true }),
  configGerada({ ligaId: 'liga-azerbaijao', ligaNomeBase: 'Liga Azerbaijan', paisNome: 'Azerbaijão', paisCodigo: 'az', mascara: 'azerbaijao', bounds: [[44.7, 38.4], [50.4, 41.95]], incompleta: true }),
  configGerada({ ligaId: 'liga-tailandia', ligaNomeBase: 'Thailand League', paisNome: 'Tailândia', paisCodigo: 'th', mascara: 'tailandia', bounds: [[97.3, 5.6], [105.7, 20.5]], incompleta: true }),
  configGerada({ ligaId: 'liga-finlandia', ligaNomeBase: 'Finnliiga', paisNome: 'Finlândia', paisCodigo: 'fi', mascara: 'finlandia', bounds: [[20.5, 59.8], [31.6, 70.1]], incompleta: true }),
];

export const CONFIG_POR_LIGA: Record<string, ConfigPaisLiga> = {
  [CONFIG_INGLATERRA.ligaId]: CONFIG_INGLATERRA,
  [CONFIG_ESPANHA.ligaId]: CONFIG_ESPANHA,
  [CONFIG_ALEMANHA.ligaId]: CONFIG_ALEMANHA,
  [CONFIG_ITALIA.ligaId]: CONFIG_ITALIA,
  [CONFIG_FRANCA.ligaId]: CONFIG_FRANCA,
  [CONFIG_CHAMPIONSHIP.ligaId]: CONFIG_CHAMPIONSHIP,
  [CONFIG_LEAGUE_ONE.ligaId]: CONFIG_LEAGUE_ONE,
  [CONFIG_LEAGUE_TWO.ligaId]: CONFIG_LEAGUE_TWO,
  [CONFIG_PORTUGAL.ligaId]: CONFIG_PORTUGAL,
  [CONFIG_BELGICA.ligaId]: CONFIG_BELGICA,
  [CONFIG_LALIGA_2.ligaId]: CONFIG_LALIGA_2,
  [CONFIG_ARABIA_SAUDITA.ligaId]: CONFIG_ARABIA_SAUDITA,
  [CONFIG_ESCOCIA.ligaId]: CONFIG_ESCOCIA,
  [CONFIG_BRASIL.ligaId]: CONFIG_BRASIL,
  ...Object.fromEntries(LIGAS_GERADAS.map((c) => [c.ligaId, c])),
};

export function configDaLiga(ligaId: string): ConfigPaisLiga | null {
  return CONFIG_POR_LIGA[ligaId] ?? null;
}
