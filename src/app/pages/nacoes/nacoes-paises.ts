// Metadados dos países do globo: correspondência entre os nomes que vêm do
// backend (padrão EA FC) e os códigos ISO2 do mapa (Natural Earth), nomes de
// exibição em português e continente.

/**
 * Nomes da API (nacao.nome no banco) que não batem com o nome do país no mapa.
 * England, Scotland, Wales e Northern Ireland caem todos em "United Kingdom"
 * (gb), que é um polígono só no Natural Earth. A divisa Inglaterra/Escócia é
 * desenhada por cima dele (ver FRONTEIRAS_INTERNAS), mas o polígono em si
 * continua indivisível. As ligas e contagens continuam sendo
 * somadas para fins de hover/destaque, mas o painel lateral (preencherPainel)
 * usa SUBNACAO_POR_NOME_API pra listar cada seleção com sua própria bandeira,
 * nome e ligas — a Scottish Premiership nunca deve aparecer como liga inglesa.
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

/**
 * Seleções nacionais que compartilham o polígono "gb" (Reino Unido) mas são
 * países distintos no futebol — cada uma com sua própria liga, bandeira e
 * seleção. Usado pelo painel lateral pra nunca misturar a Escócia dentro de
 * "Inglaterra". Códigos de bandeira conferem com o padrão flagcdn.com.
 */
export const SUBNACAO_POR_NOME_API: Record<string, { nome: string; bandeira: string }> = {
  England: { nome: 'Inglaterra', bandeira: 'gb-eng' },
  Scotland: { nome: 'Escócia', bandeira: 'gb-sct' },
  Wales: { nome: 'País de Gales', bandeira: 'gb-wls' },
  'Northern Ireland': { nome: 'Irlanda do Norte', bandeira: 'gb-nir' },
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

/**
 * Fronteiras internas desenhadas por cima de um polígono que reúne mais de uma
 * seleção de futebol. O Natural Earth 110m traz o Reino Unido como um polígono
 * só, então a divisa Inglaterra/Escócia não existe no mapa — sem ela, o globo
 * mostra a Grã-Bretanha como um bloco contínuo mesmo com os dados já separados
 * (ver SUBNACAO_POR_NOME_API).
 *
 * Cada traçado é uma polilinha aberta em [lon, lat], de costa a costa: as duas
 * pontas precisam cair exatamente sobre o contorno do polígono, senão sobra
 * ponta no mar ou a linha morre no meio da ilha.
 */
export const FRONTEIRAS_INTERNAS: Record<string, { entre: [string, string]; pontos: [number, number][] }[]> = {
  gb: [
    {
      entre: ['England', 'Scotland'],
      // Oeste → leste. O trecho até Gretna (-3.05, 54.99) corre pelo Solway
      // Firth, que o polígono de 110m preenche como terra; da Gretna em diante
      // acompanha a divisa terrestre real pelos Cheviots até Berwick-upon-Tweed
      // (-2.01, 55.80), que por sorte é um vértice do próprio contorno.
      pontos: [
        [-3.61, 54.61], [-3.44, 54.72], [-3.27, 54.84], [-3.10, 54.95],
        [-3.05, 54.99], [-2.95, 55.06], [-2.83, 55.12], [-2.69, 55.18],
        [-2.56, 55.24], [-2.45, 55.31], [-2.35, 55.40], [-2.28, 55.49],
        [-2.23, 55.58], [-2.16, 55.65], [-2.09, 55.71], [-2.01, 55.80],
      ],
    },
  ],
};

/**
 * Anéis que pertencem inteiros a uma seleção, sem precisar de divisa. O "gb"
 * traz a Irlanda do Norte como anel próprio (a ponta nordeste da ilha da
 * Irlanda); sem esta tabela ela cai na visão somada, porque nenhuma divisa
 * interna a atravessa.
 *
 * O anel é identificado por um ponto conhecido dentro dele, nunca por índice:
 * índice depende da ordem em que o Natural Earth serializou o polígono.
 */
export const SUBNACAO_POR_ANEL: Record<string, { nomeApi: string; pontoInterno: [number, number] }[]> = {
  gb: [{ nomeApi: 'Northern Ireland', pontoInterno: [-6.6, 54.6] }],
};
