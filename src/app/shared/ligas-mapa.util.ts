// Ligas que já têm mapa próprio. Fonte única: o globo de Nações usa para decidir
// para onde mandar o clique no card, e a página do mapa usa para saber se aquele
// :ligaId existe. Sem isso, os dois lados divergiriam ao adicionar uma liga.
//
// Chave: nome da liga como vem da API (nacao.ligas[].nome).
// Valor: id usado na rota /ligas/:ligaId.
export const ROTA_MAPA_POR_LIGA: Record<string, string> = {
  'Premier League': 'premier-league',
  'LALIGA EA SPORTS': 'la-liga',
  'Bundesliga': 'bundesliga',
  'Serie A Enilive': 'serie-a',
  "Ligue 1 McDonald's": 'ligue-1',
  'EFL Championship': 'championship',
  'EFL League One': 'league-one',
  'EFL League Two': 'league-two',
  'Liga Portugal': 'liga-portugal',
  '1A Pro League': 'pro-league',
  'LALIGA HYPERMOTION': 'laliga-2',
  'ROSHN Saudi League': 'saudi-pro-league',
  'Scottish Premiership': 'scottish-premiership',
  'Liga do Brasil': 'brasileirao',
  'MLS': 'mls',
  'LPF': 'liga-argentina',
  'Serie BKT': 'serie-b',
  'Bundesliga 2': '2-bundesliga',
  '3. Liga': '3-liga',
  'Ligue 2 BKT': 'ligue-2',
  'Trendyol Süper Lig': 'super-lig',
  'Eredivisie': 'eredivisie',
  'Liga BBVA MX': 'liga-mx',
  'Ekstraklasa': 'ekstraklasa',
  'Eliteserien': 'eliteserien',
  'CSL': 'superliga-china',
  'Allsvenskan': 'allsvenskan',
  'SUPERLIGA': 'superliga-romenia',
  'Metropolitan Division': 'superliga-dinamarca',
  'Brack Super League': 'super-league-suica',
  'Ö. Bundesliga': 'bundesliga-austria',
  'K League 1': 'k-league',
  'Isuzu UTE A League': 'a-league',
  'ISL': 'isl',
  "SSE Airtricity Men's Premier Division": 'league-of-ireland',
  'Hellas Liga': 'liga-grecia',
  'Česká Liga': 'liga-tchequia',
  'Ukrayina Liha': 'liga-ucrania',
  'Liga Hrvatska': 'liga-croacia',
  'Liga Cyprus': 'liga-chipre',
  'United Emirates League': 'liga-emirados',
  'Magyar Liga': 'liga-hungria',
  'Liga Colombia': 'liga-colombia',
  'Liga Bulgaria': 'liga-bulgaria',
  'Liga Azerbaijan': 'liga-azerbaijao',
  'Thailand League': 'liga-tailandia',
  'Finnliiga': 'liga-finlandia',
};

/** Id de rota do mapa da liga, ou null se ela ainda não tem mapa. */
export function rotaMapaDaLiga(nomeLiga: string): string | null {
  return ROTA_MAPA_POR_LIGA[nomeLiga] ?? null;
}

/** Aquele :ligaId corresponde a alguma liga com mapa? */
export function ligaTemMapa(ligaId: string): boolean {
  return Object.values(ROTA_MAPA_POR_LIGA).includes(ligaId);
}
