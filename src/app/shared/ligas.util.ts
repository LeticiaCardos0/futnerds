const MAPA_ESPECIAL_LIGA: { [id: number]: string } = {
  7: 'Brasileirao',
};

const MAPA_COM_PAIS_LIGA: { [id: number]: string } = {
  4: 'Pro League - Belgica',
  2013: 'Pro League - Arabia Saudita',
  2012: 'Super League - China',
  63: 'Super League - Suica',
  80: 'Bundesliga - Austria',
};

export function obterCaminhoLogoLiga(nomeLiga: string, id?: number | null): string {
  if (id != null) {
    const nomeArquivo = MAPA_ESPECIAL_LIGA[id] || MAPA_COM_PAIS_LIGA[id] || nomeLiga;
    return `/ligas/${nomeArquivo}.png`;
  }

  const mapaEspecialPorNome: { [nome: string]: string } = { 'Série A': 'Brasileirao' };
  const nomeArquivo = mapaEspecialPorNome[nomeLiga] || nomeLiga;
  return `/ligas/${nomeArquivo}.png`;
}
