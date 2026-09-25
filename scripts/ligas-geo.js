/**
 * Ligas com mapa, para os scripts de dados geográficos:
 *   gerar-localizacao-clubes.js   clubes (public/data/geo/<liga>.clubes.json)
 *   gerar-cidades-referencia.js   cidades (public/data/geo/<liga>.cidades.json)
 *
 * Espelha src/app/shared/mapa-liga/config-liga.ts. Duplicado de propósito:
 * os scripts são Node puro e não compilam TypeScript.
 *
 * Campos:
 *   ligaNomeBase  nome EXATO da liga na base (GET /api/times?liga=...)
 *   pais          Q-id do país no Wikidata, ou lista quando a liga tem clube
 *                 de outro país (MLS com o Canadá, A-League com a Nova Zelândia)
 *   limite        caixa que o clube precisa respeitar para entrar no JSON
 *   bounds        (ligas novas) o enquadramento do TypeScript; o limite sai
 *                 dele por limiteDe(), com a MESMA regra do config-liga.ts
 *   incompleta    a base só tem alguns clubes da liga (sem licença no EA FC).
 *                 Só informativo: o mapa tem cidades de referência como as outras
 *   capitaisEstaduais  capitais de estado entram no rank 1 (as do Brasil são
 *                 referência para qualquer leitor, mesmo as menores)
 */

/**
 * Mesma regra de limiteDoEnquadramento() em config-liga.ts: 25% da largura e
 * da altura para cada lado.
 */
function limiteDe(bounds) {
  const [[w, s], [e, n]] = bounds;
  const fx = (e - w) * 0.25;
  const fy = (n - s) * 0.25;
  const r = (v) => Math.round(v * 100) / 100;
  return { w: r(w - fx), s: r(s - fy), e: r(e + fx), n: r(n + fy) };
}

const INGLATERRA = { w: -5.8, s: 49.85, e: 1.85, n: 55.85 };

// --- ligas com config escrita à mão em config-liga.ts ----------------------
const MANUAIS = {
  'premier-league': { ligaNomeBase: 'Premier League', pais: 'Q145', limite: INGLATERRA },
  'la-liga': {
    ligaNomeBase: 'LALIGA EA SPORTS',
    pais: 'Q29',
    // Espanha continental: nenhum clube da primeira divisão fica em ilha.
    limite: { w: -9.8, s: 35.7, e: 3.7, n: 44.1 },
  },
  bundesliga: { ligaNomeBase: 'Bundesliga', pais: 'Q183', limite: { w: 5.6, s: 47.1, e: 15.3, n: 55.1 } },
  'serie-a': {
    ligaNomeBase: 'Serie A Enilive',
    pais: 'Q38',
    // Inclui Sardenha e Sicília.
    limite: { w: 6.5, s: 36.5, e: 18.6, n: 47.1 },
  },
  'ligue-1': {
    ligaNomeBase: "Ligue 1 McDonald's",
    pais: 'Q142',
    // Metropolitana + Córsega.
    limite: { w: -5.2, s: 41.3, e: 9.6, n: 51.1 },
  },
  // EFL: Inglaterra e Gales (clubes galeses jogam no sistema inglês).
  championship: { ligaNomeBase: 'EFL Championship', pais: 'Q145', limite: INGLATERRA },
  'league-one': { ligaNomeBase: 'EFL League One', pais: 'Q145', limite: INGLATERRA },
  'league-two': { ligaNomeBase: 'EFL League Two', pais: 'Q145', limite: INGLATERRA },
  'liga-portugal': {
    ligaNomeBase: 'Liga Portugal',
    pais: 'Q45',
    // Inclui Açores (Santa Clara) e Madeira (Marítimo).
    limite: { w: -31.5, s: 32.3, e: -6.0, n: 42.2 },
  },
  'pro-league': { ligaNomeBase: '1A Pro League', pais: 'Q31', limite: { w: 2.3, s: 49.3, e: 6.6, n: 51.7 } },
  'laliga-2': {
    ligaNomeBase: 'LALIGA HYPERMOTION',
    pais: 'Q29',
    // Inclui Canárias e Ceuta. O FC Andorra (em Andorra) vai por pin.
    limite: { w: -18.3, s: 27.5, e: 4.5, n: 44.1 },
  },
  'saudi-pro-league': { ligaNomeBase: 'ROSHN Saudi League', pais: 'Q851', limite: { w: 34.0, s: 16.0, e: 56.0, n: 32.5 } },
  'scottish-premiership': {
    ligaNomeBase: 'Scottish Premiership',
    pais: 'Q145', // Reino Unido: é o P17 dos clubes escoceses
    limite: { w: -7.8, s: 54.5, e: -0.6, n: 59.4 },
  },
  brasileirao: { ligaNomeBase: 'Liga do Brasil', pais: 'Q155', limite: { w: -76, s: -35, e: -33, n: 6 }, incompleta: true, capitaisEstaduais: true },
};

// --- ligas com config gerada por configGerada() em config-liga.ts ----------
const GERADAS = {
  mls: {
    ligaNomeBase: 'MLS',
    pais: ['Q30', 'Q16'], // EUA e Canadá (Toronto, Vancouver, Montréal)
    bounds: [[-127.5, 24.5], [-67.0, 50.5]],
  },
  'liga-argentina': {
    ligaNomeBase: 'LPF',
    pais: 'Q414',
    // Do norte até o Rio Negro: nenhum clube da liga fica na Patagônia, e ela
    // inteira no enquadramento deixaria Buenos Aires minúscula.
    bounds: [[-72.5, -41.5], [-53.6, -21.8]],
  },
  'serie-b': { ligaNomeBase: 'Serie BKT', pais: 'Q38', bounds: [[6.6, 36.6], [18.6, 47.1]] },
  '2-bundesliga': { ligaNomeBase: 'Bundesliga 2', pais: 'Q183', bounds: [[5.6, 47.1], [15.3, 55.1]] },
  '3-liga': { ligaNomeBase: '3. Liga', pais: 'Q183', bounds: [[5.6, 47.1], [15.3, 55.1]] },
  'ligue-2': { ligaNomeBase: 'Ligue 2 BKT', pais: 'Q142', bounds: [[-4.9, 41.3], [9.6, 51.1]] },
  // rotuloPt: false — o "pt" do Wikidata tem grafias arcaicas para estas cidades.
  // As vizinhas (Europa, Oriente Médio) ficam em português: Milão, Atenas.
  'super-lig': { rotuloPt: false, rotuloPtVizinhas: true, ligaNomeBase: 'Trendyol Süper Lig', pais: 'Q43', bounds: [[25.6, 35.8], [44.8, 42.1]] },
  eredivisie: { ligaNomeBase: 'Eredivisie', pais: 'Q55', bounds: [[3.3, 50.75], [7.25, 53.6]] },
  'liga-mx': { ligaNomeBase: 'Liga BBVA MX', pais: 'Q96', bounds: [[-117.2, 14.5], [-86.7, 32.8]] },
  ekstraklasa: { ligaNomeBase: 'Ekstraklasa', pais: 'Q36', bounds: [[14.1, 49.0], [24.2, 54.9]] },
  eliteserien: { ligaNomeBase: 'Eliteserien', pais: 'Q20', bounds: [[4.5, 57.9], [31.2, 71.2]] },
  // rotuloPt: false — o "pt" do Wikidata tem grafias arcaicas para estas cidades.
  'superliga-china': { rotuloPt: false, ligaNomeBase: 'CSL', pais: 'Q148', bounds: [[73.5, 18.1], [134.8, 53.6]] },
  allsvenskan: { ligaNomeBase: 'Allsvenskan', pais: 'Q34', bounds: [[11.0, 55.3], [24.2, 69.1]] },
  // A base cadastrou as duas com o país trocado: "SUPERLIGA" aparece como
  // Dinamarca, mas os clubes são romenos; "Metropolitan Division" aparece como
  // Estados Unidos, mas os clubes são dinamarqueses. O mapa segue os clubes.
  'superliga-romenia': { ligaNomeBase: 'SUPERLIGA', pais: 'Q218', bounds: [[20.2, 43.6], [29.7, 48.3]] },
  'superliga-dinamarca': {
    ligaNomeBase: 'Metropolitan Division',
    pais: 'Q35',
    // Sem Bornholm, que fica 150 km a leste e nao tem clube na liga.
    bounds: [[8.0, 54.5], [12.7, 57.8]],
  },
  // Com Liechtenstein: o FC Vaduz joga o sistema suíço.
  'super-league-suica': { ligaNomeBase: 'Brack Super League', pais: ['Q39', 'Q347'], bounds: [[5.9, 45.8], [10.5, 47.85]] },
  'bundesliga-austria': { ligaNomeBase: 'Ö. Bundesliga', pais: 'Q40', bounds: [[9.5, 46.35], [17.2, 49.05]] },
  // rotuloPt: false — o "pt" do Wikidata tem grafias arcaicas para estas cidades.
  'k-league': { rotuloPt: false, ligaNomeBase: 'K League 1', pais: 'Q884', bounds: [[125.0, 33.1], [129.6, 38.65]] },
  // rotuloPt: false — o "pt" do Wikidata tem grafias arcaicas para estas cidades.
  'a-league': { rotuloPt: false,
    ligaNomeBase: 'Isuzu UTE A League',
    pais: ['Q408', 'Q664'], // Austrália e Nova Zelândia (Auckland, Wellington)
    bounds: [[112.9, -47.3], [178.6, -10.6]],
  },
  // rotuloPt: false — o "pt" do Wikidata tem grafias arcaicas para estas cidades.
  isl: { rotuloPt: false, ligaNomeBase: 'ISL', pais: 'Q668', bounds: [[68.1, 6.7], [97.4, 35.5]] },
  'league-of-ireland': {
    ligaNomeBase: "SSE Airtricity Men's Premier Division",
    pais: ['Q27', 'Q145'], // Irlanda e Reino Unido (o Derry City, da Irlanda do Norte)
    paisReferencia: 'Q27', // cidades "do país": só a Irlanda, não Glasgow
    bounds: [[-10.7, 51.4], [-5.4, 55.45]],
  },
  // Incompletas: a base só tem os clubes licenciados no EA FC.
  'liga-grecia': { ligaNomeBase: 'Hellas Liga', pais: 'Q41', bounds: [[19.3, 34.8], [29.7, 41.8]], incompleta: true },
  'liga-tchequia': { ligaNomeBase: 'Česká Liga', pais: 'Q213', bounds: [[12.1, 48.55], [18.9, 51.06]], incompleta: true },
  'liga-ucrania': { ligaNomeBase: 'Ukrayina Liha', pais: 'Q212', bounds: [[22.1, 44.3], [40.2, 52.4]], incompleta: true },
  'liga-croacia': { ligaNomeBase: 'Liga Hrvatska', pais: 'Q224', bounds: [[13.4, 42.4], [19.5, 46.6]], incompleta: true },
  'liga-chipre': { ligaNomeBase: 'Liga Cyprus', pais: 'Q229', bounds: [[32.2, 34.5], [34.65, 35.75]], incompleta: true },
  'liga-emirados': { ligaNomeBase: 'United Emirates League', pais: 'Q878', bounds: [[51.5, 22.6], [56.4, 26.1]], incompleta: true },
  'liga-hungria': { ligaNomeBase: 'Magyar Liga', pais: 'Q28', bounds: [[16.1, 45.7], [22.9, 48.6]], incompleta: true },
  'liga-colombia': { ligaNomeBase: 'Liga Colombia', pais: 'Q739', bounds: [[-79.1, -4.3], [-66.8, 12.5]], incompleta: true },
  'liga-bulgaria': { ligaNomeBase: 'Liga Bulgaria', pais: 'Q219', bounds: [[22.3, 41.2], [28.7, 44.25]], incompleta: true },
  'liga-azerbaijao': { ligaNomeBase: 'Liga Azerbaijan', pais: 'Q227', bounds: [[44.7, 38.4], [50.4, 41.95]], incompleta: true },
  'liga-tailandia': { ligaNomeBase: 'Thailand League', pais: 'Q869', bounds: [[97.3, 5.6], [105.7, 20.5]], incompleta: true },
  'liga-finlandia': { ligaNomeBase: 'Finnliiga', pais: 'Q33', bounds: [[20.5, 59.8], [31.6, 70.1]], incompleta: true },
};

for (const cfg of Object.values(GERADAS)) {
  cfg.limite = limiteDe(cfg.bounds);
  // Rótulo da cidade em português do Brasil quando o Wikidata tem, para bater
  // com as cidades de referência ("Munique", não "Munich"). As ligas manuais
  // ficam de fora: os nomes delas já foram revisados um a um.
  cfg.nomesPtBr = true;
}

const LIGAS = { ...MANUAIS, ...GERADAS };

/** "Q30" | ["Q30","Q16"] -> ["wd:Q30", "wd:Q16"] */
function paisesDe(cfg) {
  return [].concat(cfg.pais).map((q) => 'wd:' + q);
}

module.exports = { LIGAS, paisesDe, limiteDe };
