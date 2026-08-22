export const MAPA_POSICOES: { [sigla: string]: string } = {
  GK: 'Goleiro',
  CB: 'Zagueiro',
  LB: 'Lateral Esquerdo',
  RB: 'Lateral Direito',
  LWB: 'Ala Esquerdo',
  RWB: 'Ala Direito',
  CDM: 'Volante',
  CM: 'Meio-Campo',
  CAM: 'Meia-Atacante',
  LM: 'Meia Esquerda',
  RM: 'Meia Direita',
  LW: 'Ponta Esquerda',
  RW: 'Ponta Direita',
  CF: 'Segundo Atacante',
  ST: 'Atacante',
  LF: 'Ponta Esquerda',
  RF: 'Ponta Direita'
};

export function traduzirPosicao(sigla: string | undefined | null): string {
  if (!sigla) return '—';
  return MAPA_POSICOES[sigla.trim()] || sigla;
}

export function traduzirPeDominante(pe: string | undefined | null): string {
  if (!pe) return '—';
  const mapa: { [key: string]: string } = {
    'Left': 'Esquerdo',
    'Right': 'Direito'
  };
  return mapa[pe.trim()] || pe;
}
