/**
 * Gera o JSON de localizacao dos clubes de uma liga.
 *
 *   node scripts/gerar-localizacao-clubes.js premier-league
 *
 * Quem esta na liga vem da BASE (fonte da verdade). Cidade, estadio e
 * coordenadas vem do Wikidata, com sobrescritas em scripts/geo-correcoes/.
 *
 * O script NUNCA inventa coordenada. Casamento duvidoso, estadio ambiguo ou
 * coordenada fora do `limite` da liga viram linha no relatorio, nao no JSON.
 */
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:8081/api';
const SPARQL = 'https://query.wikidata.org/sparql';
// A Wikimedia exige User-Agent descritivo; generico leva 429 na hora.
const UA = 'FutNerds-LocalizacaoClubes/1.0 (projeto academico)';

// Definicoes das ligas (nome na base, pais, limite): scripts/ligas-geo.js.
const { LIGAS, paisesDe } = require('./ligas-geo');

/**
 * Abreviacoes que a base usa e o Wikidata nao. Servem SO para diagnosticar:
 * um clube que so casa por aqui vai para o relatorio, nunca para o JSON, para
 * o humano decidir com um pin em geo-correcoes.
 */
const EXPANSOES = [
  [/M'gladbach/gi, 'Borussia Monchengladbach'],
  [/\bUtd\b/gi, 'United'],
  [/\bNott[^\s]*m\b/gi, 'Nottingham'],
  [/\bMan\b/gi, 'Manchester'],
];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function sparql(query, tentativa) {
  tentativa = tentativa || 1;
  const r = await fetch(SPARQL + '?format=json&query=' + encodeURIComponent(query), {
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
  });
  if (r.status === 429 || r.status === 503 || r.status === 502 || r.status === 500) {
    if (tentativa > 4) throw new Error('Wikidata indisponivel (HTTP ' + r.status + ') apos 4 tentativas');
    const s = 15 * tentativa;
    console.log('  Wikidata respondeu ' + r.status + '; aguardando ' + s + 's (' + tentativa + '/4)...');
    await espera(s * 1000);
    return sparql(query, tentativa + 1);
  }
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.json()).results.bindings;
}

/**
 * Clubes do pais, com CADA declaracao de estadio (rank + data de termino).
 *
 * Rotulo de estadio aceita "en" OU "mul": o Wikidata vem migrando rotulos
 * para o idioma "mul" (multilingue), e estadio que so tem "mul" sumia da
 * consulta — foi o caso do Brick Community Stadium, do Wigan.
 */
function queryClubes(paises) {
  return [
    'SELECT ?club ?clubLabel ?venue ?venueLabel ?coord ?rank ?end ?cityLabel ?venueImg',
    '       (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts)',
    'WHERE {',
    '  VALUES ?pais { ' + paises.join(' ') + ' }',
    '  ?club wdt:P31/wdt:P279* wd:Q476028 ; wdt:P17 ?pais ; rdfs:label ?clubLabel .',
    '  FILTER(lang(?clubLabel) = "en")',
    '  ?club p:P115 ?st .',
    '  ?st ps:P115 ?venue ; wikibase:rank ?rank .',
    '  FILTER(?rank != wikibase:DeprecatedRank)',
    '  OPTIONAL { ?st pq:P582 ?end }',
    '  ?venue wdt:P625 ?coord ; rdfs:label ?venueLabel .',
    '  FILTER(lang(?venueLabel) IN ("en", "mul"))',
    '  OPTIONAL { ?venue wdt:P18 ?venueImg }',
    '  OPTIONAL { ?club wdt:P159 ?city . ?city rdfs:label ?cityLabel . FILTER(lang(?cityLabel) = "en") }',
    '  OPTIONAL { ?club skos:altLabel ?alt . FILTER(lang(?alt) = "en") }',
    '}',
    'GROUP BY ?club ?clubLabel ?venue ?venueLabel ?coord ?rank ?end ?cityLabel ?venueImg',
  ].join('\n');
}

/** Entidades especificas por Q-id (pins de geo-correcoes). */
function queryEntidades(qids) {
  return [
    'SELECT ?e ?eLabel ?coord ?venue ?venueLabel ?vcoord ?rank ?end ?cityLabel ?eImg ?venueImg WHERE {',
    '  VALUES ?e { ' + qids.map((q) => 'wd:' + q).join(' ') + ' }',
    '  ?e rdfs:label ?eLabel . FILTER(lang(?eLabel) IN ("en", "mul"))',
    '  OPTIONAL { ?e wdt:P625 ?coord }',
    '  OPTIONAL { ?e wdt:P18 ?eImg }',
    '  OPTIONAL {',
    '    ?e p:P115 ?st . ?st ps:P115 ?venue ; wikibase:rank ?rank .',
    '    FILTER(?rank != wikibase:DeprecatedRank)',
    '    OPTIONAL { ?st pq:P582 ?end }',
    '    ?venue wdt:P625 ?vcoord ; rdfs:label ?venueLabel . FILTER(lang(?venueLabel) IN ("en", "mul"))',
    '    OPTIONAL { ?venue wdt:P18 ?venueImg }',
    '  }',
    '  OPTIONAL { ?e wdt:P159 ?c . ?c rdfs:label ?cityLabel . FILTER(lang(?cityLabel) = "en") }',
    '}',
  ].join('\n');
}

/**
 * Centro das cidades pelo nome de rotulo (en ou pt).
 *
 * Restringe a assentamentos humanos (P31/P279* Q486972), senao o nome casa
 * tambem com distrito, paroquia civil e municipio homonimos — "Liverpool"
 * sozinho devolve 6 entidades. Aceita altLabel porque varios nomes de uso
 * corrente sao apelido: "Hull" e altLabel de "Kingston upon Hull".
 * A populacao (P1082) entra para desempatar homonimos.
 */
function queryCidades(nomes, paises) {
  const vals = nomes.flatMap((n) => ['"' + n + '"@en', '"' + n + '"@pt']);
  return [
    'SELECT ?nome ?city ?coord ?pop WHERE {',
    '  VALUES ?nome { ' + vals.join(' ') + ' }',
    // Comunas francesas e varios municipios (Poznan, Nimega) nao sao
    // "assentamento humano" no Wikidata, so municipio ou cidade.
    '  VALUES ?tipo { wd:Q486972 wd:Q15284 wd:Q515 }',
    '  VALUES ?pais { ' + paises.join(' ') + ' }',
    '  ?city rdfs:label|skos:altLabel ?nome ;',
    '        wdt:P31/wdt:P279* ?tipo ;',
    '        wdt:P17 ?pais ;',
    '        wdt:P625 ?coord .',
    '  OPTIONAL { ?city wdt:P1082 ?pop }',
    '}',
  ].join('\n');
}

/**
 * P18 devolve a URL do arquivo no Commons. Special:FilePath com `width` entrega
 * uma miniatura, em vez do original — que costuma ter varios MB.
 */
function urlImagem(u, largura) {
  if (!u) return null;
  return u.replace(/^http:/, 'https:') + '?width=' + (largura || 800);
}

/** "Point(-0.108611 51.554944)" -> { lat, lng } */
function parseCoord(wkt) {
  const m = /Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(wkt || '');
  return m ? { lng: +m[1], lat: +m[2] } : null;
}

/** Normalizacao "crua": so minuscula, sem acento e sem pontuacao. */
const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Normalizacao sem sufixo de clube. Pode colidir — so vale se for unica. */
const normSemSufixo = (s) =>
  norm(s)
    .replace(/\b(fc|afc|football club)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const dentro = (c, l) => c.lng >= l.w && c.lng <= l.e && c.lat >= l.s && c.lat <= l.n;

/** Distancia aproximada em km (haversine). */
function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Um centro de cidade longe demais de todos os estadios dela e quase sempre
 * homonimo errado — foi o caso de "Newcastle", que casou com uma vila no Pais
 * de Gales a 280 km do St James' Park.
 */
const MAX_KM_CIDADE_ESTADIO = 60;

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Escolhe entre varias declaracoes de estadio do mesmo clube:
 * rank preferido primeiro; senao, as que nao tem data de termino (P582).
 * Devolve { escolhido } ou { ambiguo: [...] } para o relatorio.
 */
function escolherEstadio(declaracoes) {
  const preferidas = declaracoes.filter((d) => d.rank.endsWith('PreferredRank'));
  const candidatas = preferidas.length ? preferidas : declaracoes.filter((d) => !d.end);
  const unicas = [];
  for (const c of candidatas) if (!unicas.some((u) => u.venue === c.venue)) unicas.push(c);
  if (unicas.length === 1) return { escolhido: unicas[0] };
  if (unicas.length === 0) return { ambiguo: [], motivo: 'todas as declaracoes de estadio tem data de termino' };
  return { ambiguo: unicas, motivo: unicas.length + ' estadios sem desempate: ' + unicas.map((u) => u.venueLabel).join(', ') };
}

(async () => {
  const ligaId = process.argv[2];
  const cfg = LIGAS[ligaId];
  if (!cfg) {
    console.error('Liga desconhecida: ' + ligaId + '. Conhecidas: ' + Object.keys(LIGAS).join(', '));
    process.exit(1);
  }

  // --- correcoes manuais -------------------------------------------------
  const caminhoCorr = path.join(__dirname, 'geo-correcoes', ligaId + '.json');
  let correcoes = {};
  if (fs.existsSync(caminhoCorr)) {
    correcoes = JSON.parse(fs.readFileSync(caminhoCorr, 'utf8')).clubes || {};
    console.log('Correcoes manuais: ' + Object.keys(correcoes).length + ' clube(s) em ' + path.relative(path.join(__dirname, '..'), caminhoCorr));
  } else {
    console.log('Sem arquivo de correcoes (' + path.relative(path.join(__dirname, '..'), caminhoCorr) + ').');
  }

  // --- base --------------------------------------------------------------
  console.log('Lendo clubes da base: ' + cfg.ligaNomeBase);
  const resp = await (await fetch(API + '/times?liga=' + encodeURIComponent(cfg.ligaNomeBase) + '&size=200')).json();
  const clubes = resp.times || [];
  console.log(clubes.length + ' clubes na base.');

  // --- Wikidata: todos os clubes do pais ---------------------------------
  console.log('Consultando o Wikidata...');
  const linhas = await sparql(queryClubes(paisesDe(cfg)));

  // agrupa declaracoes por clube
  const porQid = new Map();
  for (const b of linhas) {
    const qid = b.club.value.split('/').pop();
    if (!porQid.has(qid)) {
      porQid.set(qid, {
        qid,
        label: b.clubLabel.value,
        cidadeP159: b.cityLabel ? b.cityLabel.value : null,
        alts: b.alts && b.alts.value ? b.alts.value.split('|') : [],
        decls: [],
      });
    }
    porQid.get(qid).decls.push({
      venue: b.venue.value,
      venueLabel: b.venueLabel.value,
      coord: parseCoord(b.coord.value),
      rank: b.rank.value,
      end: b.end ? b.end.value : null,
      img: b.venueImg ? b.venueImg.value : null,
    });
  }
  console.log(porQid.size + ' clubes no Wikidata com estadio e coordenada.');

  // indices de nome
  const exato = new Map();          // nome cru -> [qid]
  const semSufixo = new Map();      // nome sem sufixo -> [qid]
  for (const c of porQid.values()) {
    for (const nome of [c.label].concat(c.alts)) {
      const a = norm(nome);
      if (a) exato.set(a, (exato.get(a) || new Set()).add(c.qid));
      const b = normSemSufixo(nome);
      if (b) semSufixo.set(b, (semSufixo.get(b) || new Set()).add(c.qid));
    }
  }

  // --- pins de geo-correcoes --------------------------------------------
  const pins = [];
  for (const nomeBase of Object.keys(correcoes)) {
    const c = correcoes[nomeBase];
    if (c.clubeWikidata) pins.push(c.clubeWikidata);
    if (c.estadioWikidata) pins.push(c.estadioWikidata);
  }
  const entidadesPin = new Map();
  if (pins.length) {
    const rows = await sparql(queryEntidades([...new Set(pins)]));
    for (const b of rows) {
      const qid = b.e.value.split('/').pop();
      if (!entidadesPin.has(qid)) {
        entidadesPin.set(qid, {
          qid,
          label: b.eLabel.value,
          coord: parseCoord(b.coord && b.coord.value),
          img: b.eImg ? b.eImg.value : null,
          cidadeP159: b.cityLabel ? b.cityLabel.value : null,
          decls: [],
        });
      }
      if (b.venue) {
        entidadesPin.get(qid).decls.push({
          venue: b.venue.value,
          venueLabel: b.venueLabel.value,
          coord: parseCoord(b.vcoord.value),
          rank: b.rank.value,
          end: b.end ? b.end.value : null,
          img: b.venueImg ? b.venueImg.value : null,
        });
      }
    }
  }

  // --- casamento ---------------------------------------------------------
  const achados = [];
  const revisar = [];

  for (const time of clubes) {
    const corr = correcoes[time.nome] || {};
    let ent = null;
    let comoCasou = 'exato';

    if (corr.clubeWikidata) {
      ent = entidadesPin.get(corr.clubeWikidata) || porQid.get(corr.clubeWikidata);
      comoCasou = 'pin ' + corr.clubeWikidata;
      if (!ent) { revisar.push({ nome: time.nome, motivo: 'pin ' + corr.clubeWikidata + ' nao encontrado no Wikidata' }); continue; }
    } else {
      const porExato = exato.get(norm(time.nome));
      if (porExato && porExato.size === 1) {
        ent = porQid.get([...porExato][0]);
      } else if (porExato && porExato.size > 1) {
        revisar.push({ nome: time.nome, motivo: 'nome exato casa com ' + porExato.size + ' clubes — use clubeWikidata' });
        continue;
      } else {
        const porSufixo = semSufixo.get(normSemSufixo(time.nome));
        if (porSufixo && porSufixo.size === 1) {
          ent = porQid.get([...porSufixo][0]);
          comoCasou = 'sem sufixo';
        } else if (porSufixo && porSufixo.size > 1) {
          const nomes = [...porSufixo].map((q) => porQid.get(q).label).join(', ');
          revisar.push({ nome: time.nome, motivo: 'sem sufixo casa com ' + porSufixo.size + ' clubes (' + nomes + ') — use clubeWikidata' });
          continue;
        } else {
          // so diagnostico: expansao nunca entra no JSON
          let sugestao = null;
          for (const par of EXPANSOES) {
            const exp = time.nome.replace(par[0], par[1]);
            if (exp === time.nome) continue;
            const alvo = exato.get(norm(exp)) || semSufixo.get(normSemSufixo(exp));
            if (alvo && alvo.size === 1) { sugestao = porQid.get([...alvo][0]); break; }
          }
          revisar.push({
            nome: time.nome,
            motivo: sugestao
              ? 'so casa por expansao de abreviacao -> "' + sugestao.label + '" (' + sugestao.qid + '). Confirme com clubeWikidata.'
              : 'sem correspondencia no Wikidata',
          });
          continue;
        }
      }
    }

    // --- estadio ---------------------------------------------------------
    let estadioLabel;
    let coord;
    let imagem = null;
    if (corr.semEstadio) {
      // Clube sem estadio conhecido (nem no Wikidata, nem numa fonte que de
      // para confirmar). O pino vai para o centro da cidade, resolvido mais
      // abaixo, e o painel mostra "—" em vez de um estadio inventado.
      estadioLabel = '—';
      coord = null;
    } else if (corr.estadioWikidata) {
      const ev = entidadesPin.get(corr.estadioWikidata);
      if (!ev || !ev.coord) { revisar.push({ nome: time.nome, motivo: 'estadioWikidata ' + corr.estadioWikidata + ' sem coordenada' }); continue; }
      estadioLabel = ev.label;
      coord = ev.coord;
      imagem = ev.img;
    } else {
      const esc = escolherEstadio(ent.decls);
      if (!esc.escolhido) { revisar.push({ nome: time.nome, motivo: esc.motivo + ' — use estadioWikidata' }); continue; }
      estadioLabel = esc.escolhido.venueLabel;
      coord = esc.escolhido.coord;
      imagem = esc.escolhido.img;
    }

    if (corr.lat != null && corr.lng != null) coord = { lat: corr.lat, lng: corr.lng };
    if (!corr.semEstadio && (!coord || !dentro(coord, cfg.limite))) {
      revisar.push({ nome: time.nome, motivo: 'coordenada fora do limite da liga: ' + (coord ? coord.lat + ',' + coord.lng : 'ausente') });
      continue;
    }

    const cidade = corr.cidade || ent.cidadeP159;
    if (!cidade) { revisar.push({ nome: time.nome, motivo: 'sem cidade (nem P159 nem correcao)' }); continue; }

    achados.push({
      base: time,
      qid: ent.qid,
      label: ent.label,
      estadio: corr.estadio || estadioLabel,
      imagemEstadio: corr.imagemEstadio || urlImagem(imagem, 800),
      lat: coord ? +coord.lat.toFixed(4) : null,
      lng: coord ? +coord.lng.toFixed(4) : null,
      cidade,
      comoCasou: corr.semEstadio ? comoCasou + ', sem estadio' : comoCasou,
    });
  }

  // --- centro das cidades ------------------------------------------------
  const nomesCidade = [...new Set(achados.map((a) => a.cidade))];
  const cidadesResolvidas = new Map();
  const cidadesProblema = [];

  // Pins de cidade: o rotulo do mapa continua sendo `cidade`, mas o centro vem
  // desta entidade. Resolve homonimo sem trocar o nome exibido.
  const pinsCidade = new Map(); // nome de rotulo -> Q-id
  for (const nomeBase of Object.keys(correcoes)) {
    const c = correcoes[nomeBase];
    if (c.cidadeWikidata && c.cidade) pinsCidade.set(c.cidade, c.cidadeWikidata);
  }
  if (pinsCidade.size) {
    const rows = await sparql(queryEntidades([...new Set(pinsCidade.values())]));
    const coordPorQid = new Map();
    for (const b of rows) {
      const qid = b.e.value.split('/').pop();
      const c = parseCoord(b.coord && b.coord.value);
      if (c) coordPorQid.set(qid, c);
    }
    for (const [nome, qid] of pinsCidade) {
      const c = coordPorQid.get(qid);
      if (!c) { cidadesProblema.push({ nome, motivo: 'cidadeWikidata ' + qid + ' sem coordenada' }); continue; }
      cidadesResolvidas.set(nome, { nome, lat: +c.lat.toFixed(4), lng: +c.lng.toFixed(4), _wikidata: qid });
    }
  }

  const aResolver = nomesCidade.filter((n) => !cidadesResolvidas.has(n));
  if (aResolver.length) {
    const rows = await sparql(queryCidades(aResolver, paisesDe(cfg)));
    const cands = new Map();
    for (const b of rows) {
      const c = parseCoord(b.coord.value);
      if (!c || !dentro(c, cfg.limite)) continue;
      const nome = b.nome.value;
      const qid = b.city.value.split('/').pop();
      if (!cands.has(nome)) cands.set(nome, new Map());
      const pop = b.pop ? +b.pop.value : 0;
      const anterior = cands.get(nome).get(qid);
      if (!anterior || pop > anterior.pop) cands.get(nome).set(qid, { qid, coord: c, pop });
    }
    for (const nome of aResolver) {
      const m = cands.get(nome);
      if (!m || m.size === 0) { cidadesProblema.push({ nome, motivo: 'centro nao encontrado no Wikidata' }); continue; }
      // Homonimos (Newcastle upon Tyne x Newcastle-under-Lyme): fica o mais
      // populoso, que e o que alguem quer dizer ao falar so "Newcastle".
      const ordenados = [...m.values()].sort((a, b) => b.pop - a.pop);
      if (ordenados.length > 1 && ordenados[0].pop === 0) {
        cidadesProblema.push({ nome, motivo: ordenados.length + ' entidades homonimas e nenhuma com populacao para desempatar' });
        continue;
      }
      const c = ordenados[0].coord;
      cidadesResolvidas.set(nome, {
        nome,
        lat: +c.lat.toFixed(4),
        lng: +c.lng.toFixed(4),
        _wikidata: ordenados[0].qid,
        _homonimos: ordenados.length > 1 ? ordenados.length : undefined,
      });
    }
  }

  // Sanidade: o centro precisa estar perto de pelo menos um estadio da cidade.
  for (const [nome, centro] of [...cidadesResolvidas]) {
    const estadios = achados.filter((a) => a.cidade === nome && a.lat != null);
    if (!estadios.length) continue;
    const maisProximo = Math.min(...estadios.map((e) => distanciaKm(centro, e)));
    if (maisProximo > MAX_KM_CIDADE_ESTADIO) {
      cidadesResolvidas.delete(nome);
      cidadesProblema.push({
        nome,
        motivo:
          'centro a ' + Math.round(maisProximo) + ' km do estadio mais proximo (' +
          centro.lat + ',' + centro.lng + ') — provavel homonimo; use cidadeWikidata',
      });
    }
  }

  // Rotulo em portugues do Brasil (ligas com nomesPtBr). Cidade nomeada numa
  // correcao manual fica como esta: foi escolhida por alguem.
  if (cfg.nomesPtBr && cidadesResolvidas.size) {
    const manuais = new Set(Object.values(correcoes).map((c) => c.cidade).filter(Boolean));
    const alvo = [...cidadesResolvidas.values()].filter((c) => !manuais.has(c.nome) && c._wikidata);
    if (alvo.length) {
      const rows = await sparql([
        'SELECT ?c ?ptbr ?pt WHERE {',
        '  VALUES ?c { ' + alvo.map((c) => 'wd:' + c._wikidata).join(' ') + ' }',
        '  OPTIONAL { ?c rdfs:label ?ptbr . FILTER(lang(?ptbr) = "pt-br") }',
        '  OPTIONAL { ?c rdfs:label ?pt . FILTER(lang(?pt) = "pt") }',
        '}',
      ].join('\n'));
      const rotulo = new Map();
      for (const b of rows) {
        const nome = (b.ptbr || b.pt || {}).value;
        if (nome) rotulo.set(b.c.value.split('/').pop(), nome);
      }
      for (const c of alvo) {
        const novo = rotulo.get(c._wikidata);
        if (!novo || novo === c.nome) continue;
        cidadesResolvidas.delete(c.nome);
        cidadesResolvidas.set(novo, { ...c, nome: novo });
        for (const a of achados) if (a.cidade === c.nome) a.cidade = novo;
      }
    }
  }

  // clube cuja cidade nao resolveu nao entra no JSON
  const finais = [];
  for (const a of achados) {
    if (!cidadesResolvidas.has(a.cidade)) {
      revisar.push({ nome: a.base.nome, motivo: 'cidade "' + a.cidade + '" sem centro resolvido' });
      continue;
    }
    if (a.lat == null) {
      const centro = cidadesResolvidas.get(a.cidade);
      a.lat = centro.lat;
      a.lng = centro.lng;
    }
    finais.push(a);
  }

  // --- saida -------------------------------------------------------------
  const cidades = [...cidadesResolvidas.values()]
    .filter((c) => finais.some((f) => f.cidade === c.nome))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const saida = {
    ligaId: ligaId,
    _gerado: 'scripts/gerar-localizacao-clubes.js em ' + new Date().toISOString().slice(0, 10),
    cidades,
    clubes: finais
      .map((a) => ({
        slug: slug(a.label.replace(/ F\.?C\.?$/, '').replace(/ A\.?F\.?C\.?$/, '')),
        nomesBase: [a.base.nome],
        cidade: a.cidade,
        estadio: a.estadio,
        imagemEstadio: a.imagemEstadio || undefined,
        lat: a.lat,
        lng: a.lng,
        _wikidata: a.qid,
        _wikidataLabel: a.label,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  };

  const destino = path.join(__dirname, '..', 'public', 'data', 'geo', ligaId + '.clubes.rascunho.json');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(saida, null, 2) + '\n');

  // --- relatorio ---------------------------------------------------------
  console.log('\n' + '='.repeat(74));
  console.log('RELATORIO - ' + ligaId);
  console.log('='.repeat(74));
  console.log('clubes na base   : ' + clubes.length);
  console.log('no JSON          : ' + finais.length);
  console.log('cidades          : ' + cidades.length);
  console.log('rascunho         : ' + path.relative(path.join(__dirname, '..'), destino));

  const semFoto = finais.filter((f) => !f.imagemEstadio).map((f) => f.base.nome);
  if (semFoto.length) {
    console.log(String.fromCharCode(10) + 'SEM FOTO DE ESTADIO (' + semFoto.length + ') - o painel usa so o degrade:');
    console.log('  ' + semFoto.join(', '));
  }

  const semEstadio = finais.filter((f) => f.comoCasou.endsWith('sem estadio')).map((f) => f.base.nome);
  if (semEstadio.length) {
    console.log(String.fromCharCode(10) + 'SEM ESTADIO (' + semEstadio.length + ') - pino no centro da cidade, painel mostra "—":');
    console.log('  ' + semEstadio.join(', '));
  }
  const porPin = finais.filter((f) => f.comoCasou.startsWith('pin'));
  const porSufixo = finais.filter((f) => f.comoCasou === 'sem sufixo');
  if (porPin.length) console.log('\ncasados por pin manual (' + porPin.length + '): ' + porPin.map((f) => f.base.nome).join(', '));
  if (porSufixo.length) console.log('casados sem sufixo, unicos (' + porSufixo.length + '): ' + porSufixo.map((f) => f.base.nome).join(', '));

  if (cidadesProblema.length) {
    console.log('\nCIDADES SEM CENTRO (' + cidadesProblema.length + '):');
    for (const c of cidadesProblema) console.log('  ' + c.nome.padEnd(22) + c.motivo);
  }
  if (revisar.length) {
    console.log('\nPARA REVISAR (' + revisar.length + ') - FORA do JSON:');
    for (const r of revisar) console.log('  ' + r.nome.padEnd(20) + r.motivo);
  } else {
    console.log('\nRELATORIO LIMPO: todos os clubes da base entraram no JSON.');
  }
})();
