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
 * Liga INCOMPLETA (só os clubes licenciados no EA FC) não tem este arquivo: o
 * mapa dela mostra apenas a cidade de cada clube.
 *
 * Critérios:
 *   - dentro do `limite` da liga; maior população primeiro;
 *   - periferia sai: cidade perto de outra maior já escolhida (raioPeriferia);
 *   - cidade com clube na liga sai (ela já aparece em caixa alta);
 *   - nome em pt-br do Wikidata, depois pt, depois o nome do Natural Earth.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LIGAS } = require('./ligas-geo');

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const LUGARES = NE + 'ne_10m_populated_places.geojson';
const PAISES = NE + 'ne_50m_admin_0_countries.geojson';
const SPARQL = 'https://query.wikidata.org/sparql';
const UA = 'FutNerds-LocalizacaoClubes/1.0 (projeto academico)';

const MAX_DO_PAIS = 45;
const RANK1_DO_PAIS = 15;
const MAX_VIZINHAS = 25;
const RANK1_VIZINHAS = 8;
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
  if (cfg.incompleta) {
    console.error(ligaId + ' é incompleta: o mapa mostra só as cidades dos clubes, sem referência.');
    process.exit(1);
  }
  const l = cfg.limite;

  // País da liga: Q-id do Wikidata -> código do Natural Earth (ADM0_A3).
  const paises = await baixar(PAISES);
  // paisReferencia: quando a liga tem clube de fora mas as cidades "do país"
  // devem ser só as de um (Irlanda: o Derry City traz o Reino Unido inteiro).
  const qids = [].concat(cfg.paisReferencia || cfg.pais);
  const casa = new Set(
    paises.features.filter((f) => qids.includes(f.properties.WIKIDATAID)).map((f) => f.properties.ADM0_A3),
  );
  if (casa.size !== qids.length) throw new Error('País sem correspondência no Natural Earth: ' + qids.join(', '));

  const lugares = (await baixar(LUGARES)).features
    .map((f) => ({
      qid: f.properties.WIKIDATAID,
      capital: f.properties.ADM0CAP === 1,
      nomeNe: (cfg.rotuloPt === false && f.properties.ADM0CAP !== 1 ? null : f.properties.NAME_PT) || f.properties.NAME,
      lat: f.properties.LATITUDE,
      lng: f.properties.LONGITUDE,
      pop: f.properties.POP_MAX || 0,
      pais: f.properties.ADM0_A3,
    }))
    .filter((c) => c.lng >= l.w && c.lng <= l.e && c.lat >= l.s && c.lat <= l.n)
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
    aceitas.push(c);
    if (casa.has(c.pais)) {
      if (doPais.length < MAX_DO_PAIS) doPais.push(c);
    } else if (vizinhas.length < MAX_VIZINHAS) vizinhas.push(c);
  }

  // Nome em português do Brasil, quando o Wikidata tem.
  // rotuloPt: false nas ligas em que o português do Wikidata é arcaico — e o
  // "pt-br" de lá costuma só copiar o de Portugal (Cacramanemaraxe, Xiam,
  // Fucheu, Bombaim). Nelas fica o nome do Natural Earth (Xi'an, Mumbai),
  // menos nas capitais, cuja grafia em português é consagrada (Tóquio, Seul).
  const escolhidas = doPais
    .concat(vizinhas)
    .filter((c) => c.qid && (cfg.rotuloPt !== false || c.capital));
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

  const saida = (lista, rank1) =>
    lista.map((c, i) => ({
      nome: nomes.get(c.qid) || c.nomeNe,
      lat: +c.lat.toFixed(4),
      lng: +c.lng.toFixed(4),
      rank: i < rank1 ? 1 : 2,
    }));

  const arquivo = {
    ligaId,
    _gerado: 'scripts/gerar-cidades-referencia.js em ' + new Date().toISOString().slice(0, 10),
    cidadesSemTime: saida(doPais, RANK1_DO_PAIS),
    cidadesVizinhas: saida(vizinhas, RANK1_VIZINHAS),
  };
  const destino = path.join(__dirname, '..', 'public', 'data', 'geo', ligaId + '.cidades.json');
  fs.writeFileSync(destino, JSON.stringify(arquivo, null, 2) + '\n');

  console.log(lugares.length + ' cidades no limite; ' + doPais.length + ' do país, ' + vizinhas.length + ' vizinhas.');
  console.log('  país    : ' + arquivo.cidadesSemTime.map((c) => c.nome).join(', '));
  console.log('  vizinhas: ' + arquivo.cidadesVizinhas.map((c) => c.nome).join(', '));
  console.log(path.relative(path.join(__dirname, '..'), destino));
})();
