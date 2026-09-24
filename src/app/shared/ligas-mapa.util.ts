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
};

/** Id de rota do mapa da liga, ou null se ela ainda não tem mapa. */
export function rotaMapaDaLiga(nomeLiga: string): string | null {
  return ROTA_MAPA_POR_LIGA[nomeLiga] ?? null;
}

/** Aquele :ligaId corresponde a alguma liga com mapa? */
export function ligaTemMapa(ligaId: string): boolean {
  return Object.values(ROTA_MAPA_POR_LIGA).includes(ligaId);
}
