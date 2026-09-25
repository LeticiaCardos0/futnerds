/**
 * Gera a máscara de país de um mapa de liga (public/geo/<nome>-mascara.json).
 *
 *   node scripts/gerar-mascara-pais.js italia
 *
 * A máscara é UM polígono: um retângulo grande em volta do país, com o país
 * recortado como buraco. O mapa escurece o retângulo, e o satélite aparece
 * limpo só dentro do país.
 *
 * Fonte: Natural Earth, coordenadas arredondadas a 4 casas — a mesma origem
 * das máscaras feitas antes deste script:
 *   - país inteiro (Espanha, Alemanha, Itália, França): admin 0 em 1:50m;
 *   - parte do Reino Unido (Inglaterra, Inglaterra + Gales): map subunits em
 *     1:10m, simplificado. O 1:50m desenha a costa britânica grossa demais.
 *
 * Mais de uma subunidade (Inglaterra + Gales, para a EFL) vira um recorte
 * só: as arestas que as duas compartilham — a fronteira entre elas — são
 * removidas antes de simplificar, senão sobraria uma linha no meio do país.
 *
 * Critério das ilhas: fica o anel externo de cada polígono com área acima de
 * AREA_MIN e dentro de `regiao`. Isso mantém Sicília, Sardenha, Córsega e
 * Anglesey e descarta ilhotas (Elba, Oléron) e territórios ultramarinos.
 * Buracos do próprio país (San Marino e Vaticano, dentro da Itália) não
 * entram: nesta escala não se nota.
 */
const fs = require('fs');
const path = require('path');

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const FONTES = {
  paises50: { url: NE + 'ne_50m_admin_0_countries.geojson', campo: 'ADM0_A3' },
  subunidades10: { url: NE + 'ne_10m_admin_0_map_subunits.geojson', campo: 'SU_A3' },
};

/** Em graus². Alemanha: fica Rügen (0.16), sai Fehmarn (0.02). */
const AREA_MIN = 0.05;

const MASCARAS = {
  italia: {
    fonte: 'paises50',
    codigos: ['ITA'],
    regiao: { w: 5, s: 35, e: 20, n: 48 },
  },
  franca: {
    fonte: 'paises50',
    codigos: ['FRA'],
    // França metropolitana + Córsega. Fora: Guiana, Antilhas, Reunião, Mayotte.
    regiao: { w: -6, s: 41, e: 10, n: 52 },
  },
  // Championship, League One e League Two: clubes galeses (Cardiff, Swansea,
  // Wrexham, Newport) jogam no sistema inglês. A Premier League segue com a
  // máscara só da Inglaterra.
  'inglaterra-gales': {
    fonte: 'subunidades10',
    codigos: ['ENG', 'WLS'],
    regiao: { w: -7, s: 49.5, e: 2.5, n: 56 },
    // Em graus. Com 0.008 o contorno da Inglaterra fica com ~600 pontos, a
    // mesma densidade de inglaterra-mascara.json.
    simplificar: 0.008,
    devemEncostar: true,
  },
  escocia: {
    fonte: 'subunidades10',
    codigos: ['SCT'],
    // Continente, Hébridas e Órcadas. As Shetland ficam fora do enquadramento.
    regiao: { w: -8, s: 54.5, e: -0.5, n: 59.5 },
    simplificar: 0.008,
  },
  portugal: {
    fonte: 'paises50',
    codigos: ['PRT'],
    // Continente, Madeira (Marítimo) e Açores (Santa Clara).
    regiao: { w: -32, s: 30, e: -6, n: 43 },
    // As ilhas são pequenas: com o mínimo padrão sumiriam justamente as dos
    // clubes. 0.01 mantém São Miguel e Madeira e ainda descarta ilhotas.
    areaMin: 0.01,
  },
  belgica: {
    fonte: 'paises50',
    codigos: ['BEL'],
    regiao: { w: 2, s: 49, e: 7, n: 52 },
  },
  // LaLiga 2: a Espanha com as Canárias (Las Palmas, Tenerife). A primeira
  // divisão segue com espanha-mascara.json, só o continente e as Baleares.
  'espanha-canarias': {
    fonte: 'paises50',
    codigos: ['ESP'],
    regiao: { w: -18.5, s: 27.5, e: 4.5, n: 44 },
  },
  'arabia-saudita': {
    fonte: 'paises50',
    codigos: ['SAU'],
    regiao: { w: 34, s: 16, e: 56, n: 33 },
  },
  brasil: {
    fonte: 'paises50',
    codigos: ['BRA'],
    regiao: { w: -75, s: -35, e: -33, n: 6 },
    // Mantém as ilhas de Florianópolis e de São Luís, que são capitais.
    areaMin: 0.01,
    // O país é tão grande que, no zoom mínimo, a tela mostra ~90° de
    // longitude: com a folga padrão a borda do retângulo aparecia.
    margem: { lng: 70, lat: 25 },
  },
  // --- ligas com config gerada (configGerada em config-liga.ts) -----------
  'eua-canada': {
    fonte: 'paises50',
    codigos: ['USA', 'CAN'],
    // MLS: EUA contíguos + Canadá. Alasca e Havaí saem pela região.
    regiao: { w: -170, s: 15, e: -50, n: 84 },
    // 0.05° (~5 km) é invisível na escala do continente.
    simplificar: 0.05,
    // Centenas de ilhas do Ártico canadense, que o mapa da MLS nunca mostra
    // (o limite para em 55° N), deixavam o arquivo com 140 kB.
    areaMin: 1,
    devemEncostar: true,
  },
  argentina: { fonte: 'paises50', codigos: ['ARG'], regiao: { w: -75, s: -56, e: -53, n: -21 } },
  turquia: { fonte: 'paises50', codigos: ['TUR'], regiao: { w: 25, s: 35, e: 45.5, n: 42.5 } },
  // Só a parte europeia: o Caribe holandês sai pela região.
  holanda: { fonte: 'paises50', codigos: ['NLD'], regiao: { w: 3, s: 50.5, e: 7.5, n: 54 } },
  mexico: { fonte: 'paises50', codigos: ['MEX'], regiao: { w: -119, s: 14, e: -86, n: 33 } },
  polonia: { fonte: 'paises50', codigos: ['POL'], regiao: { w: 14, s: 48.8, e: 24.5, n: 55 } },
  // Sem Svalbard.
  noruega: { fonte: 'paises50', codigos: ['NOR'], regiao: { w: 4, s: 57, e: 32, n: 72 } },
  china: { fonte: 'paises50', codigos: ['CHN'], regiao: { w: 73, s: 17, e: 135, n: 54 } },
  suecia: { fonte: 'paises50', codigos: ['SWE'], regiao: { w: 10.5, s: 55, e: 24.5, n: 69.5 } },
  romenia: { fonte: 'paises50', codigos: ['ROU'], regiao: { w: 20, s: 43.5, e: 30, n: 48.5 } },
  // Com Bornholm (fica na máscara, fora do enquadramento).
  dinamarca: { fonte: 'paises50', codigos: ['DNK'], regiao: { w: 7.5, s: 54, e: 15.5, n: 58 } },
  // Com Liechtenstein: o FC Vaduz joga o sistema suíço.
  suica: { fonte: 'paises50', codigos: ['CHE', 'LIE'], regiao: { w: 5.8, s: 45.7, e: 10.6, n: 48 }, devemEncostar: true },
  austria: { fonte: 'paises50', codigos: ['AUT'], regiao: { w: 9.4, s: 46.3, e: 17.3, n: 49.1 } },
  'coreia-do-sul': { fonte: 'paises50', codigos: ['KOR'], regiao: { w: 124, s: 32.5, e: 131, n: 39 } },
  // A-League: Auckland e Wellington jogam na liga australiana.
  'australia-nz': { fonte: 'paises50', codigos: ['AUS', 'NZL'], regiao: { w: 110, s: -48, e: 179.9, n: -9 } },
  india: { fonte: 'paises50', codigos: ['IND'], regiao: { w: 68, s: 6, e: 98, n: 36 } },
  // League of Ireland: o Derry City fica na Irlanda do Norte.
  irlanda: {
    fonte: 'subunidades10',
    codigos: ['IRL', 'NIR'],
    regiao: { w: -11, s: 51, e: -5, n: 55.5 },
    simplificar: 0.008,
    devemEncostar: true,
  },
  grecia: { fonte: 'paises50', codigos: ['GRC'], regiao: { w: 19, s: 34.5, e: 30, n: 42 } },
  tchequia: { fonte: 'paises50', codigos: ['CZE'], regiao: { w: 12, s: 48.5, e: 19, n: 51.2 } },
  ucrania: { fonte: 'paises50', codigos: ['UKR'], regiao: { w: 22, s: 44, e: 40.5, n: 52.5 } },
  croacia: { fonte: 'paises50', codigos: ['HRV'], regiao: { w: 13, s: 42, e: 19.6, n: 46.7 } },
  // A ilha inteira: o Natural Earth separa o norte (CYN) do resto (CYP).
  chipre: { fonte: 'paises50', codigos: ['CYP', 'CYN'], regiao: { w: 32, s: 34.4, e: 34.7, n: 35.8 }, devemEncostar: true },
  emirados: { fonte: 'paises50', codigos: ['ARE'], regiao: { w: 51, s: 22.5, e: 56.5, n: 26.5 } },
  hungria: { fonte: 'paises50', codigos: ['HUN'], regiao: { w: 16, s: 45.6, e: 23, n: 48.7 } },
  // Sem San Andrés, no Caribe.
  colombia: { fonte: 'paises50', codigos: ['COL'], regiao: { w: -80, s: -5, e: -66, n: 13 } },
  bulgaria: { fonte: 'paises50', codigos: ['BGR'], regiao: { w: 22, s: 41, e: 29, n: 44.3 } },
  // Com o exclave de Naquichevão.
  azerbaijao: { fonte: 'paises50', codigos: ['AZE'], regiao: { w: 44.5, s: 38.3, e: 51, n: 42 } },
  tailandia: { fonte: 'paises50', codigos: ['THA'], regiao: { w: 97, s: 5.5, e: 106, n: 21 } },
  finlandia: { fonte: 'paises50', codigos: ['FIN'], regiao: { w: 20, s: 59.5, e: 32, n: 70.2 } },
};

const arred = (v) => Math.round(v * 1e4) / 1e4;
const chave = (p) => p[0] + ',' + p[1];

/** Área assinada (shoelace), em graus². Negativa = sentido horário. */
function area(anel) {
  let a = 0;
  for (let i = 0; i < anel.length - 1; i++) {
    a += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1];
  }
  return a / 2;
}

const dentro = (anel, r) =>
  anel.every(([x, y]) => x >= r.w && x <= r.e && y >= r.s && y <= r.n);

/**
 * Junta anéis que dividem arestas. Todos são postos no mesmo sentido; aí uma
 * aresta compartilhada aparece uma vez em cada direção, e as duas saem. O que
 * sobra é encadeado de volta em anéis fechados. Anel que não encosta em
 * nenhum outro volta igual.
 */
function unir(aneis) {
  const orientados = aneis.map((a) => (area(a) > 0 ? a.slice().reverse() : a));
  const arestas = [];
  for (const anel of orientados) {
    for (let i = 0; i < anel.length - 1; i++) arestas.push([anel[i], anel[i + 1]]);
  }
  const existentes = new Set(arestas.map(([a, b]) => chave(a) + '>' + chave(b)));
  const restantes = arestas.filter(([a, b]) => !existentes.has(chave(b) + '>' + chave(a)));
  const removidas = arestas.length - restantes.length;

  const saindo = new Map();
  for (const e of restantes) {
    const k = chave(e[0]);
    if (!saindo.has(k)) saindo.set(k, []);
    saindo.get(k).push(e);
  }
  const usadas = new Set();
  const resultado = [];
  for (const inicio of restantes) {
    if (usadas.has(inicio)) continue;
    const anel = [inicio[0]];
    let e = inicio;
    while (e && !usadas.has(e)) {
      usadas.add(e);
      anel.push(e[1]);
      e = (saindo.get(chave(e[1])) || []).find((x) => !usadas.has(x));
    }
    if (anel.length >= 4 && chave(anel[0]) === chave(anel[anel.length - 1])) resultado.push(anel);
  }
  return { aneis: resultado, removidas };
}

/** Douglas-Peucker num anel fechado; o primeiro ponto é sempre mantido. */
function simplificar(anel, tol) {
  const pts = anel.slice(0, -1);
  const manter = new Uint8Array(pts.length);
  manter[0] = manter[pts.length - 1] = 1;
  const pilha = [[0, pts.length - 1]];
  while (pilha.length) {
    const [a, b] = pilha.pop();
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = Math.hypot(dx, dy) || 1e-12;
    let maior = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L;
      if (d > maior) { maior = d; idx = i; }
    }
    if (maior > tol) {
      manter[idx] = 1;
      pilha.push([a, idx], [idx, b]);
    }
  }
  const s = pts.filter((_, i) => manter[i]);
  s.push(s[0]);
  return s;
}

(async () => {
  const nome = process.argv[2];
  const cfg = MASCARAS[nome];
  if (!cfg) {
    console.error('Máscara desconhecida: ' + nome + '. Conhecidas: ' + Object.keys(MASCARAS).join(', '));
    process.exit(1);
  }
  const fonte = FONTES[cfg.fonte];

  console.log('Baixando ' + fonte.url.split('/').pop() + '...');
  const ne = await (await fetch(fonte.url)).json();

  let externos = [];
  for (const codigo of cfg.codigos) {
    const f = ne.features.find((x) => x.properties[fonte.campo] === codigo);
    if (!f) throw new Error(codigo + ' não encontrado em ' + fonte.campo);
    const poligonos = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    externos.push(...poligonos.map((p) => p[0]));
  }

  if (cfg.codigos.length > 1) {
    const u = unir(externos);
    console.log('  ' + cfg.codigos.join(' + ') + ': ' + u.removidas / 2 + ' aresta(s) de fronteira removida(s)');
    // Sem aresta em comum é normal para países separados por mar (Austrália e
    // Nova Zelândia); só é erro quando as partes deveriam se encostar.
    if (u.removidas === 0 && cfg.devemEncostar) {
      throw new Error('nenhuma aresta em comum — as subunidades não se encostam na fonte');
    }
    externos = u.aneis;
  }

  const buracos = [];
  for (const externo of externos) {
    const a = Math.abs(area(externo));
    const ok = a >= (cfg.areaMin ?? AREA_MIN) && dentro(externo, cfg.regiao);
    console.log(
      '  ' + (ok ? 'mantém ' : 'descarta') + '  ' + String(externo.length).padStart(5) + ' pts  ' +
        a.toFixed(4) + ' grau²  em ' + externo[0].map((v) => v.toFixed(1)).join(','),
    );
    if (!ok) continue;
    const base = cfg.simplificar ? simplificar(externo, cfg.simplificar) : externo;
    // Remove pontos repetidos que o arredondamento cria.
    const anel = [];
    for (const [x, y] of base) {
      const pt = [arred(x), arred(y)];
      const ult = anel[anel.length - 1];
      if (!ult || ult[0] !== pt[0] || ult[1] !== pt[1]) anel.push(pt);
    }
    if (anel.length >= 4) buracos.push(anel);
  }

  // Retângulo externo: a caixa do país com folga larga, para o enquadramento
  // e o zoom mínimo nunca mostrarem a borda da máscara.
  const xs = buracos.flat().map((p) => p[0]);
  const ys = buracos.flat().map((p) => p[1]);
  // A folga cresce com o país: no zoom mínimo a tela mostra cerca do dobro da
  // largura dele, e com folga fixa a borda do retângulo aparecia na China.
  const larg = Math.max(...xs) - Math.min(...xs);
  const alt = Math.max(...ys) - Math.min(...ys);
  const margem = cfg.margem ?? { lng: Math.max(20, larg), lat: Math.max(12, alt * 0.6) };
  const w = Math.floor(Math.min(...xs) - margem.lng);
  const e = Math.ceil(Math.max(...xs) + margem.lng);
  const s = Math.floor(Math.min(...ys) - margem.lat);
  const n = Math.ceil(Math.max(...ys) + margem.lat);
  const retangulo = [[w, s], [e, s], [e, n], [w, n], [w, s]];

  const saida = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { nome: 'mascara-' + nome },
        geometry: { type: 'Polygon', coordinates: [retangulo, ...buracos] },
      },
    ],
  };

  const destino = path.join(__dirname, '..', 'public', 'geo', nome + '-mascara.json');
  fs.writeFileSync(destino, JSON.stringify(saida));
  console.log(
    '\n' + path.relative(path.join(__dirname, '..'), destino) + ': ' +
      buracos.map((b) => b.length).join(' + ') + ' pontos, ' +
      (fs.statSync(destino).size / 1024).toFixed(1) + ' kB',
  );
})();
