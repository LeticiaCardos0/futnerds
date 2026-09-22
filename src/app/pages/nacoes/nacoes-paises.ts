// Metadados dos países do globo: correspondência entre os nomes que vêm do
// backend (padrão EA FC) e os códigos ISO2 do mapa (Natural Earth), nomes de
// exibição em português e continente.

/**
 * Nomes da API (nacao.nome no banco) que não batem com o nome do país no mapa.
 * England e Scotland caem os dois em "United Kingdom" (gb), que é um polígono
 * só no Natural Earth — as ligas dos dois são somadas no mesmo país.
 */
export const ISO2_POR_NOME_API: Record<string, string> = {
  'England': 'gb',
  'Scotland': 'gb',
  'Wales': 'gb',
  'Northern Ireland': 'gb',
  'United States': 'us',
  'Türkiye': 'tr',
  'Korea Republic': 'kr',
  'Republic of Ireland': 'ie',
  'Czechia': 'cz',
  'China PR': 'cn',
  // O banco tem "Holland" (jogadores) e "Netherlands" (clubes) como nações
  // separadas; os dois caem no mesmo polígono e são somados pelo globo.
  'Holland': 'nl',
  "Côte d'Ivoire": 'ci',       // no mapa: Ivory Coast
  'Congo DR': 'cd',            // no mapa: Democratic Republic of the Congo
  'Congo': 'cg',               // no mapa: Republic of the Congo
  'Gambia': 'gm',              // no mapa: The Gambia
  'Chinese Taipei': 'cn-tw',   // no mapa: Taiwan
  'Korea DPR': 'kp',           // no mapa: North Korea
};

/** Nomes em português que o Intl.DisplayNames não resolve como queremos. */
const NOME_PT_POR_ISO2: Record<string, string> = {
  gb: 'Inglaterra', // no futebol, o Reino Unido é representado pela Inglaterra
  'cn-tw': 'Taiwan',
  xk: 'Kosovo',
};

let nomesRegiao: Intl.DisplayNames | null = null;
try {
  nomesRegiao = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
} catch {
  nomesRegiao = null;
}

export function nomePaisPt(iso2: string, nomeReserva: string): string {
  if (NOME_PT_POR_ISO2[iso2]) return NOME_PT_POR_ISO2[iso2];
  if (nomesRegiao && /^[a-z]{2}$/.test(iso2)) {
    try {
      const nome = nomesRegiao.of(iso2.toUpperCase());
      if (nome && nome.toUpperCase() !== iso2.toUpperCase()) return nome;
    } catch {
      /* código fora do padrão ISO — usa o nome de reserva */
    }
  }
  return nomeReserva;
}

const PAISES_POR_CONTINENTE: Record<string, string> = {
  'América do Sul': 'ar bo br cl co ec fk gy pe py sr uy ve',
  'América do Norte': 'ca us mx gl',
  'América Central': 'bz cr gt hn ni pa sv',
  'Caribe': 'bs cu do ht jm pr tt',
  'Europa':
    'no se fi dk is ie gb pt es fr be nl lu de ch at it si hr ba rs me xk mk al gr bg ro md ua by pl cz sk hu lt lv ee ru cy tr',
  'Ásia':
    'kz uz tm tj kg af pk in bd bt np lk cn cn-tw mn kp kr jp ph vn la kh th mm my bn id tl ir iq sy lb il ps jo sa ye om ae qa kw az am ge',
  'África':
    'dz ma tn ly eg sd ss er et dj so ke ug rw bi tz mz mw zm zw bw na za ls sz mg ao cd cg ga gq cm cf td ne ng bj tg gh ci lr sl gn gw sn gm ml mr bf eh',
  'Oceania': 'au nz pg fj sb vu nc',
  'Antártida': 'aq tf',
};

const CONTINENTE_POR_ISO2: Record<string, string> = {};
Object.entries(PAISES_POR_CONTINENTE).forEach(([continente, codigos]) => {
  codigos.split(' ').forEach((iso2) => (CONTINENTE_POR_ISO2[iso2] = continente));
});

export function continentePais(iso2: string): string {
  return CONTINENTE_POR_ISO2[iso2] ?? '';
}
