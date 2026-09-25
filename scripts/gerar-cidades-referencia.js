/**
 * Gera as cidades de referência de um mapa de liga:
 * public/data/geo/<liga>.cidades.json.
 *
 *   node scripts/gerar-cidades-referencia.js eredivisie
 *
 * São os nomes em serifa itálica que aparecem sem pino: as maiores cidades SEM
 * clube na liga (cidadesSemTime) e as dos países em volta (cidadesVizinhas),
 * só como referência geográfica.
 *
 * As ligas com config escrita à mão (Premier League, LaLiga...) trazem essas
 * listas no próprio config-liga.ts. Este script existe para as outras dezenas.
 *
 * Fonte: Natural Earth Populated Places 1:10m (~7 mil cidades com população e
 * país), a mesma base das máscaras. Do Wikidata vem só o nome em português das
 * cidades escolhidas. Uma consulta de cidades direto no Wikidata (por caixa ou
 * por país) estourava o tempo do serviço em países médios e grandes.
 *
 * O Natural Earth só tem as cidades grandes: na Holanda, quase todas já têm
 * clube, e de perto o mapa ficava vazio. O DETALHE (rank 3) completa com o
 * GeoNames cities15000 (~34 mil cidades com 15 mil habitantes ou mais), com o
 * nome do próprio GeoNames — são cidades pequenas, cujo nome em português é o
 * local, e o Wikidata daria formas como "Leida".
 *
 * Liga INCOMPLETA (só os clubes licenciados no EA FC) também tem: sem ele, o
 * mapa do Brasil mostrava só Salvador.
 *
 * Critérios:
 *   - do país: dentro do `limite` da liga; vizinhas: no limite com mais
 *     FOLGA_VIZINHAS, porque dá para arrastar até meia tela além dele;
 *   - maior população primeiro;
 *   - periferia sai: cidade perto de outra maior já escolhida (raioPeriferia);
 *   - cidade com clube na liga sai (ela já aparece em caixa alta);
 *   - nome em pt-br do Wikidata, depois pt, depois o nome do Natural Earth;
 *   - rank 1 aparece desde a vista inicial, 2 e 3 com zoom. As vizinhas são
 *     ordenadas por `peso`: população, em dobro para capital, e caindo com a
 *     distância até o limite — Luxemburgo e Porto antes de uma cidade maior e
 *     mais longe;
 *   - nomes que o Wikidata só tem na grafia de Portugal (Ruão, Orleães,
 *     Bordéus) passam pelo NOMES_PT_BR em nomes-pt-br.json;
 *   - `grande` (capital ou metrópole) ganha corpo maior no mapa.
 *
 * As ligas com config escrita à mão também têm este arquivo: lá ele só
 * complementa as listas curadas (ver complementar em liga-mapa.service.ts).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LIGAS } = require('./ligas-geo');
const NOMES_PT_BR = require('./nomes-pt-br.json');

const zlib = require('zlib');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const GEONAMES = 'https://download.geonames.org/export/dump/cities15000.zip';
const LUGARES = NE + 'ne_10m_populated_places.geojson';
const PAISES = NE + 'ne_50m_admin_0_countries.geojson';
const SPARQL = 'https://query.wikidata.org/sparql';
const UA = 'FutNerds-LocalizacaoClubes/1.0 (projeto academico)';

const MAX_DO_PAIS = 90;
const MAX_VIZINHAS = 70;
/** Quantas ficam em cada rank: [rank 1, rank 1 + rank 2]; o resto é rank 3. */
const RANKS_DO_PAIS = [15, 45];
const RANKS_VIZINHAS = [12, 35];
/**
 * Folga do limite para as vizinhas: fração da largura/altura dele, até um
 * teto em graus. Sem o teto, o limite da China (90° de largura) trazia Kinshasa.
 */
const FOLGA_VIZINHAS = 0.35;
const FOLGA_MAX_GRAUS = 6;
/** Detalhe do GeoNames: população mínima e quantas entram, só em rank 3. */
const DETALHE_POP_DO_PAIS = 30000;
const DETALHE_POP_VIZINHAS = 75000;
const DETALHE_MAX_DO_PAIS = 60;
const DETALHE_MAX_VIZINHAS = 40;
/**
 * Distância mínima entre uma cidade do detalhe e qualquer outra já no mapa. As
 * coordenadas do GeoNames são do centro, então não precisa do RAIO_CLUBE; e o
 * raioPeriferia de uma cidade de 1 milhão engoliria Haarlem (18 km de
 * Amsterdã). Só as metrópoles de 3 milhões+ mantêm o raio de periferia.
 */
const RAIO_DETALHE = 10; // km

/** Metrópole: população a partir da qual o nome ganha corpo maior. */
const POP_GRANDE = 2e6;
/**
 * Periferia: raio em volta de uma cidade maior já escolhida. Cresce com ela —
 * 12 km bastam em volta de Haia, mas Cranbourne (Melbourne) e Manukau
 * (Auckland) ficam a 30 km do centro e ainda são a mesma mancha urbana.
 */
const raioPeriferia = (pop) => (pop >= 3e6 ? 35 : pop >= 1e6 ? 22 : 12); // km
/**
 * Cidade com clube: o ponto do Natural Earth fica a até ~10 km do centro que
 * o Wikidata dá (Los Angeles, Calcutá), daí um raio maior que o de periferia.
 */
const RAIO_CLUBE = 20; // km

/** Baixa uma vez e guarda na pasta temporária: os arquivos têm ~20 MB. */
async function baixar(url) {
  const cache = path.join(os.tmpdir(), 'futnerds-' + path.basename(url));
  if (!fs.existsSync(cache)) {
    console.log('Baixando ' + path.basename(url) + '...');
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
    fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(cache, 'utf8'));
}

/** O cities15000 vem num .zip de um arquivo só: lê o diretório central e infla. */
async function baixarGeonames() {
  const cache = path.join(os.tmpdir(), 'futnerds-cities15000.txt');
  if (!fs.existsSync(cache)) {
    console.log('Baixando cities15000.zip...');
    const r = await fetch(GEONAMES);
    if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + GEONAMES);
    const b = Buffer.from(await r.arrayBuffer());
    let fim = b.length - 22;
    while (b.readUInt32LE(fim) !== 0x06054b50) fim--;
    const central = b.readUInt32LE(fim + 16);
    const tamanho = b.readUInt32LE(central + 20);
    const local = b.readUInt32LE(central + 42);
    const inicio = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    fs.writeFileSync(cache, zlib.inflateRawSync(b.subarray(inicio, inicio + tamanho)));
  }
  return fs
    .readFileSync(cache, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((linha) => {
      const c = linha.split('\t');
      return { nomeNe: c[1], lat: +c[4], lng: +c[5], iso2: c[8], pop: +c[14] || 0 };
    });
}

async function sparql(query) {
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    const r = await fetch(SPARQL + '?format=json&query=' + encodeURIComponent(query), {
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
    });
    if (r.ok) return (await r.json()).results.bindings;
    console.log('  Wikidata respondeu ' + r.status + '; nova tentativa em ' + 10 * tentativa + 's...');
    await new Promise((ok) => setTimeout(ok, 10000 * tentativa));
  }
  throw new Error('Wikidata indisponível');
}

/**
 * Grafia usada no Brasil, quando a do Wikidata/Natural Earth/GeoNames é outra.
 * null: não é cidade (ver nomes-pt-br.json) e sai do mapa.
 */
function emPtBr(nome, qid) {
  if (NOMES_PT_BR.porQid[qid]) return NOMES_PT_BR.porQid[qid];
  if (nome in NOMES_PT_BR.nomes) return NOMES_PT_BR.nomes[nome];
  return nome.replace(/ \([^)]*\)$/, ''); // "Alexandria (Romênia)"
}

function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

(async () => {
  const ligaId = process.argv[2];
  const cfg = LIGAS[ligaId];
  if (!cfg) {
    console.error('Liga desconhecida: ' + ligaId);
    process.exit(1);
  }
  const l = cfg.limite;
  const fx = Math.min(FOLGA_MAX_GRAUS, (l.e - l.w) * FOLGA_VIZINHAS);
  const fy = Math.min(FOLGA_MAX_GRAUS, (l.n - l.s) * FOLGA_VIZINHAS);
  const lv = { w: l.w - fx, e: l.e + fx, s: Math.max(-85, l.s - fy), n: Math.min(85, l.n + fy) };
  const dentro = (c, b) => c.lng >= b.w && c.lng <= b.e && c.lat >= b.s && c.lat <= b.n;

  // País da liga: Q-id do Wikidata -> código do Natural Earth (ADM0_A3).
  const paises = await baixar(PAISES);
  // paisReferencia: quando a liga tem clube de fora mas as cidades "do país"
  // devem ser só as de um (Irlanda: o Derry City traz o Reino Unido inteiro).
  const qids = [].concat(cfg.paisReferencia || cfg.pais);
  const casa = new Set(
    paises.features.filter((f) => qids.includes(f.properties.WIKIDATAID)).map((f) => f.properties.ADM0_A3),
  );
  if (casa.size !== qids.length) throw new Error('País sem correspondência no Natural Earth: ' + qids.join(', '));
  const casaIso2 = new Set(
    paises.features.filter((f) => qids.includes(f.properties.WIKIDATAID)).map((f) => f.properties.ISO_A2_EH),
  );

  // rotuloPt: false vale para as cidades do país e, sem rotuloPtVizinhas,
  // também para as vizinhas. Capital sempre usa o português.
  const usaPt = (capital, pais) =>
    capital || cfg.rotuloPt !== false || (cfg.rotuloPtVizinhas === true && !casa.has(pais));

  // Entrada sem Wikidata que repete o nome de outra do mesmo país é cópia
  // errada: o Natural Earth tem uma segunda Vila Velha, no Amapá, com a
  // população da verdadeira (ao lado de Vitória).
  const brutos = (await baixar(LUGARES)).features;
  const comQid = new Set(
    brutos.filter((f) => f.properties.WIKIDATAID).map((f) => f.properties.ADM0_A3 + '|' + f.properties.NAME),
  );
  const lugares = brutos
    .filter((f) => f.properties.WIKIDATAID || !comQid.has(f.properties.ADM0_A3 + '|' + f.properties.NAME))
    .map((f) => ({
      qid: f.properties.WIKIDATAID,
      capital: f.properties.ADM0CAP === 1,
      // Guaíra (PR), 36 mil habitantes, vem marcada como capital no Natural Earth.
      capitalEstadual: f.properties.FEATURECLA === 'Admin-1 capital' && f.properties.POP_MAX >= 1e5,
      nomeNe: (usaPt(f.properties.ADM0CAP === 1, f.properties.ADM0_A3) ? f.properties.NAME_PT : null) || f.properties.NAME,
      lat: f.properties.LATITUDE,
      lng: f.properties.LONGITUDE,
      pop: f.properties.POP_MAX || 0,
      pais: f.properties.ADM0_A3,
    }))
    .filter((c) => dentro(c, lv))
    .sort((a, b) => b.pop - a.pop);

  // Cidades com clube, para não repetir o nome em serifa ao lado da caixa alta.
  const caminhoClubes = path.join(__dirname, '..', 'public', 'data', 'geo', ligaId + '.clubes.json');
  const comClube = fs.existsSync(caminhoClubes) ? JSON.parse(fs.readFileSync(caminhoClubes, 'utf8')).cidades : [];
  if (!comClube.length) console.log('  Aviso: sem ' + path.basename(caminhoClubes) + '; cidades com clube não serão filtradas.');

  const aceitas = [];
  const doPais = [];
  const vizinhas = [];
  for (const c of lugares) {
    if (comClube.some((k) => distanciaKm(k, c) < RAIO_CLUBE)) {
      aceitas.push(c); // ocupa o lugar: a periferia dela também sai
      continue;
    }
    if (aceitas.some((a) => distanciaKm(a, c) < raioPeriferia(a.pop))) continue;
    if (aceitas.some((a) => a.nomeNe === c.nomeNe)) continue; // entrada duplicada no Natural Earth
    if (casa.has(c.pais)) {
      if (!dentro(c, l)) continue;
      aceitas.push(c);
      doPais.push(c);
    } else {
      aceitas.push(c);
      vizinhas.push(c);
    }
  }
  // Peso: população, em dobro para capital, dividida pela distância até o
  // limite (medida em décimos do lado dele). Dentro do limite a distância é 0.
  const escala = Math.max(l.e - l.w, l.n - l.s) / 10;
  const peso = (c) => {
    const dx = Math.max(0, l.w - c.lng, c.lng - l.e) * Math.cos((c.lat * Math.PI) / 180);
    const dy = Math.max(0, l.s - c.lat, c.lat - l.n);
    return (c.pop * (c.capital ? 2 : 1)) / (1 + Math.hypot(dx, dy) / escala) ** 2;
  };
  vizinhas.sort((a, b) => peso(b) - peso(a));
  vizinhas.splice(MAX_VIZINHAS);

  // capitaisEstaduais: capitais (a do país e as de estado) na frente, todas
  // no rank 1, e depois as maiores. O corte vem só depois, para Palmas e Boa
  // Vista (235 mil) não ficarem atrás de cidades maiores do interior.
  const prioritaria = (c) => cfg.capitaisEstaduais === true && (c.capital || c.capitalEstadual);
  doPais.sort((a, b) => prioritaria(b) - prioritaria(a) || b.pop - a.pop);
  doPais.splice(MAX_DO_PAIS);
  const nPrioritarias = doPais.filter(prioritaria).length;
  const ranksDoPais = nPrioritarias
    ? [nPrioritarias + RANKS_DO_PAIS[0] / 2, nPrioritarias + RANKS_DO_PAIS[1]]
    : RANKS_DO_PAIS;

  // Detalhe do GeoNames: longe das cidades com clube e de toda cidade do
  // Natural Earth aceita acima — inclusive as que o corte tirou, senão o
  // detalhe traria o subúrbio de uma metrópole que nem aparece.
  const noMapa = comClube.concat(aceitas);
  const detalhePais = [];
  const detalheVizinhas = [];
  for (const c of (await baixarGeonames()).sort((a, b) => b.pop - a.pop)) {
    const doPaisDaLiga = casaIso2.has(c.iso2);
    if (c.pop < (doPaisDaLiga ? DETALHE_POP_DO_PAIS : DETALHE_POP_VIZINHAS)) continue;
    if (!dentro(c, doPaisDaLiga ? l : lv)) continue;
    // Metrópole (3 milhões+) mantém o raio de periferia inteiro: sem isso
    // entravam Lanús e Quilmes (Buenos Aires), Guarulhos, e bairros que o
    // GeoNames lista como cidade (Jardim Ângela, Barra da Tijuca).
    const raio = (k) => (k.pop >= 3e6 ? raioPeriferia(k.pop) : RAIO_DETALHE);
    if (noMapa.some((k) => k.nomeNe === c.nomeNe || distanciaKm(k, c) < raio(k))) continue;
    noMapa.push(c);
    (doPaisDaLiga ? detalhePais : detalheVizinhas).push(c);
  }
  detalheVizinhas.sort((a, b) => peso(b) - peso(a));
  doPais.push(...detalhePais.slice(0, DETALHE_MAX_DO_PAIS).map((c) => ({ ...c, detalhe: true })));
  vizinhas.push(...detalheVizinhas.slice(0, DETALHE_MAX_VIZINHAS).map((c) => ({ ...c, detalhe: true })));

  // Nome em português do Brasil, quando o Wikidata tem.
  // rotuloPt: false nas ligas em que o português do Wikidata é arcaico — e o
  // "pt-br" de lá costuma só copiar o de Portugal (Cacramanemaraxe, Xiam,
  // Fucheu, Bombaim). Nelas fica o nome do Natural Earth (Xi'an, Mumbai),
  // menos nas capitais, cuja grafia em português é consagrada (Tóquio, Seul).
  const escolhidas = doPais
    .concat(vizinhas)
    .filter((c) => c.qid && usaPt(c.capital, c.pais));
  const nomes = new Map();
  if (escolhidas.length) {
    const rows = await sparql(
      [
        'SELECT ?c ?ptbr ?pt WHERE {',
        '  VALUES ?c { ' + escolhidas.map((c) => 'wd:' + c.qid).join(' ') + ' }',
        '  OPTIONAL { ?c rdfs:label ?ptbr . FILTER(lang(?ptbr) = "pt-br") }',
        '  OPTIONAL { ?c rdfs:label ?pt . FILTER(lang(?pt) = "pt") }',
        '}',
      ].join('\n'),
    );
    for (const b of rows) {
      const nome = (b.ptbr || b.pt || {}).value;
      if (nome) nomes.set(b.c.value.split('/').pop(), nome);
    }
  }

  const saida = (lista, [ate1, ate2]) =>
    lista.map((c, i) => ({
      nome: emPtBr(nomes.get(c.qid) || c.nomeNe, c.qid),
      lat: +c.lat.toFixed(4),
      lng: +c.lng.toFixed(4),
      rank: c.detalhe ? 3 : i < ate1 ? 1 : i < ate2 ? 2 : 3,
      ...(!c.detalhe && (c.capital || c.pop >= POP_GRANDE) ? { grande: true } : {}),
    })).filter((c) => c.nome);

  const arquivo = {
    ligaId,
    _gerado: 'scripts/gerar-cidades-referencia.js em ' + new Date().toISOString().slice(0, 10),
    cidadesSemTime: saida(doPais, ranksDoPais),
    cidadesVizinhas: saida(vizinhas, RANKS_VIZINHAS),
  };
  const destino = path.join(__dirname, '..', 'public', 'data', 'geo', ligaId + '.cidades.json');
  fs.writeFileSync(destino, JSON.stringify(arquivo, null, 2) + '\n');

  console.log(lugares.length + ' cidades no limite; ' + doPais.length + ' do país, ' + vizinhas.length + ' vizinhas.');
  console.log('  país    : ' + arquivo.cidadesSemTime.map((c) => c.nome).join(', '));
  console.log('  vizinhas: ' + arquivo.cidadesVizinhas.map((c) => c.nome).join(', '));
  console.log(path.relative(path.join(__dirname, '..'), destino));
})();
