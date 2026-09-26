// ATUALIZADO para FC 27: o dataset novo (mikedpad) não tem league_id numérico,
// só o nome da liga. Por isso o mapeamento agora é por NOME (chave = nome exato
// que vem da EA no CSV), não mais por ID. Isso também deixa de depender de IDs
// que vão mudar a cada reimport.

// Nome do arquivo de escudo quando é diferente do nome da liga
const MAPA_ESPECIAL_LIGA: { [nomeLiga: string]: string } = {
  'Liga do Brasil': 'Brasileirao',
  'LALIGA EA SPORTS': 'La Liga',
  'LALIGA HYPERMOTION': 'La Liga 2',
  'Liga Portugal': 'Primeira Liga',
  'Ligue 1 McDonald\'s': 'Ligue 1',
  'Ligue 2 BKT': 'Ligue 2',
  'Serie A Enilive': 'Serie A',
  'Serie BKT': 'Serie B',
  'Trendyol Süper Lig': 'Süper Lig',
  'SUPERLIGA': 'Superliga',
  'SSE Airtricity Men\'s Premier Division': 'Premier Division',
  'EFL Championship': 'Championship',
  'EFL League One': 'League One',
  'EFL League Two': 'League Two',
  'LPF': 'Liga Profesional de Fútbol',
  'Liga Hrvatska': 'Hrvatska nogometna liga',
  'Liga Azerbaijan': 'Premyer Liqa',
  'Liga Colombia': 'Categoría Primera A',
  'Finnliiga': 'Veikkausliiga',
  'Isuzu UTE A League': 'A-League Men',
  '1A Pro League': 'Pro League - Belgica',
  'ROSHN Saudi League': 'Pro League - Arabia Saudita',
  'CSL': 'Super League - China',
  'Brack Super League': 'Super League - Suica',
  'Ö. Bundesliga': 'Bundesliga - Austria',
  // Continentais — ajuste o nome do arquivo aqui se você salvou com outro nome
  'CONMEBOL Libertadores': 'Libertadores',
  'CONMEBOL Sudamericana': 'Sudamericana',
};

// Ligas para as quais SABIDAMENTE não há escudo salvo ainda (evita mesmo tentar
// buscar o arquivo e cair direto no fallback de troféu, sem 404 no console)
export const LIGAS_SEM_LOGO = new Set<string>([
  'Arkema PL',
  'Barclays WSL',
  'Bundesliga 2',
  'Calcio A Femminile',
  'Ceska Liga Žen',
  'GPFBL',
  'Hellas Liga',
  'ISL',
  'Iceland League',
  'Liga BBVA MX',
  'Liga Bulgaria',
  'Liga Cyprus',
  'Liga F Moeve',
  'Liga Portugal Feminino',
  'Magyar Liga',
  'Metropolitan Division',
  'MLS',
  'NWSL',
  'Nederland Vrouwen Liga',
  'Norge Kvinner Liga',
  'Schweizer Damen Liga',
  'Scottish Premiership',
  'Scottish Women\'s League',
  'Sverige Liga',
  'Thailand League',
  'Ukrayina Liha',
  'United Emirates League',
  'Česká Liga',
]);

export function temLogoLiga(nomeLiga: string): boolean {
  return !LIGAS_SEM_LOGO.has(nomeLiga);
}

/** Nome canônico da liga (o mesmo do arquivo de escudo), ex.: "LALIGA EA SPORTS" -> "La Liga". */
export function obterNomeCanonicoLiga(nomeLiga: string): string {
  return MAPA_ESPECIAL_LIGA[nomeLiga] || nomeLiga;
}

export function obterCaminhoLogoLiga(nomeLiga: string): string {
  const nomeArquivo = MAPA_ESPECIAL_LIGA[nomeLiga] || nomeLiga;
  return `/ligas/${nomeArquivo}.png`;
}