import { Jogador } from "../pages/jogadores/jogadores";

function media(...valores: Array<number | undefined>): number | null {
  const validos = valores.filter((v): v is number => typeof v === 'number' && !isNaN(v));
  if (!validos.length) return null;
  return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
}

export function calcularPAC(j: Jogador): number | null {
  return media(j.aceleracao, j.velocidadeSprint) ?? j.velocidade ?? null;
}
export function calcularSHO(j: Jogador): number | null {
  return media(j.finalizacaoDetalhada, j.potenciaChute, j.precisaoFalta, j.penaltis, j.voleio) ?? j.finalizacao ?? null;
}
export function calcularPAS(j: Jogador): number | null {
  return media(j.passeCurto, j.passeLongo, j.visao, j.curva) ?? j.passe ?? null;
}
export function calcularDRI(j: Jogador): number | null {
  return media(j.dribleDetalhado, j.controleDeBola, j.agilidade, j.equilibrio, j.reacoes) ?? j.drible ?? null;
}
export function calcularDEF(j: Jogador): number | null {
  return media(j.marcacao, j.desarmeEmPe, j.desarmeDeslizante, j.interceptacao);
}
export function calcularPHY(j: Jogador): number | null {
  return media(j.forca, j.folego, j.impulsao, j.agressao);
}

export function obterEstrelas(valor: number | undefined): string | null {
  if (!valor || valor < 1) return null;
  return '★'.repeat(Math.min(5, Math.round(valor)));
}

export function obterCorpo(j: Jogador): string {
  const partes: string[] = [];
  if (j.alturaCm) partes.push(`${j.alturaCm}cm`);
  if (j.pesoKg) partes.push(`${j.pesoKg}kg`);
  return partes.length ? partes.join(' | ') : '—';
}

export function obterClasseTier(overall: number): string {
  if (overall >= 90) return 'player-card--dourado';
  if (overall >= 80) return 'player-card--verde';
  if (overall >= 75) return 'player-card--azul';
  return 'player-card--cinza';
}

export function obterClasseStatPill(valor: number | null): string {
  if (valor === null) return 'stat-pill--vazio';
  if (valor >= 80) return 'stat-pill--verde';
  if (valor >= 70) return 'stat-pill--amarelo';
  if (valor >= 60) return 'stat-pill--laranja';
  return 'stat-pill--vermelho';
}

function normalizarPe(valor: string | undefined | null): string {
  return (valor ?? '').toString().trim().toLowerCase();
}
export function ehPeEsquerdo(j: Jogador): boolean {
  const v = normalizarPe(j.peDominante);
  return v === 'esquerdo' || v === 'left' || v === 'l' || v === 'e';
}
export function ehPeDireito(j: Jogador): boolean {
  const v = normalizarPe(j.peDominante);
  return v === 'direito' || v === 'right' || v === 'r' || v === 'd';
}

export function traduzirPe(j: Jogador): string {
  if (ehPeEsquerdo(j)) return 'Esquerdo';
  if (ehPeDireito(j)) return 'Direito';
  return j.peDominante || '—';
}

const NACIONALIDADES_PT: Record<string, string> = {
  'France': 'França', 'Brazil': 'Brasil', 'Argentina': 'Argentina', 'Spain': 'Espanha',
  'Portugal': 'Portugal', 'Germany': 'Alemanha', 'England': 'Inglaterra', 'Italy': 'Itália',
  'Netherlands': 'Países Baixos', 'Belgium': 'Bélgica', 'Croatia': 'Croácia', 'Uruguay': 'Uruguai',
  'Colombia': 'Colômbia', 'Mexico': 'México', 'United States': 'Estados Unidos', 'Japan': 'Japão',
  'South Korea': 'Coreia do Sul', 'Morocco': 'Marrocos', 'Senegal': 'Senegal', 'Nigeria': 'Nigéria',
  'Egypt': 'Egito', 'Ghana': 'Gana', 'Poland': 'Polônia', 'Ukraine': 'Ucrânia', 'Serbia': 'Sérvia',
  'Switzerland': 'Suíça', 'Austria': 'Áustria', 'Denmark': 'Dinamarca', 'Sweden': 'Suécia',
  'Norway': 'Noruega', 'Wales': 'País de Gales', 'Scotland': 'Escócia', 'Ireland': 'Irlanda',
  'Turkey': 'Turquia', 'Russia': 'Rússia', 'Chile': 'Chile', 'Peru': 'Peru', 'Ecuador': 'Equador',
  'Paraguay': 'Paraguai', 'Venezuela': 'Venezuela', 'Costa Rica': 'Costa Rica', 'Canada': 'Canadá',
  'Australia': 'Austrália', 'Saudi Arabia': 'Arábia Saudita', 'Qatar': 'Catar', 'Iran': 'Irã',
  'Algeria': 'Argélia', 'Tunisia': 'Tunísia', 'Cameroon': 'Camarões', 'Ivory Coast': 'Costa do Marfim',
  'Mali': 'Mali', 'DR Congo': 'Congo (RD)', 'South Africa': 'África do Sul', 'China PR': 'China',
  'Finland': 'Finlândia', 'Iceland': 'Islândia', 'Slovakia': 'Eslováquia', 'Slovenia': 'Eslovênia',
  'Romania': 'Romênia', 'Hungary': 'Hungria', 'Czech Republic': 'Tchéquia', 'Greece': 'Grécia',
  'Bosnia and Herzegovina': 'Bósnia e Herzegovina', 'Albania': 'Albânia', 'North Macedonia': 'Macedônia do Norte',
  'Montenegro': 'Montenegro', 'Kosovo': 'Kosovo', 'Israel': 'Israel', 'Jamaica': 'Jamaica',
  'Panama': 'Panamá', 'Honduras': 'Honduras', 'New Zealand': 'Nova Zelândia',
};
export function traduzirNacionalidade(nacionalidade: string | undefined): string {
  if (!nacionalidade) return '—';
  return NACIONALIDADES_PT[nacionalidade] ?? nacionalidade;
}

export const LAYOUT_CAMPO: Record<string, { left: number; top: number }> = {
  GK: { left: 4, top: 50 },
  LB: { left: 20, top: 18 }, CB: { left: 12, top: 50 }, RB: { left: 20, top: 82 },
  LWB: { left: 28, top: 12 }, RWB: { left: 28, top: 88 },
  CDM: { left: 35, top: 50 },
  LM: { left: 50, top: 18 }, CM: { left: 50, top: 50 }, RM: { left: 50, top: 82 },
  CAM: { left: 65, top: 50 },
  LW: { left: 80, top: 18 }, ST: { left: 90, top: 50 }, CF: { left: 90, top: 50 }, RW: { left: 80, top: 82 },
};

export interface PlaystyleInfo {
  titulo: string;
  descricao: string;
  descricaoPlus: string;
  /** Nome-base exato do arquivo, sem extensão e sem o "+" — bate com os
   *  arquivos que você tem salvos (ex.: "Finesse Shot" -> Finesse Shot.png
   *  e Finesse Shot+.png). Preserva maiúsculas/espaços de propósito. */
  arquivo: string;
}

/** Gerado a partir da planilha que você mandou, com os nomes em inglês
 *  corrigidos a partir dos arquivos reais que você enviou (ex.: descobri
 *  que é "Aerial Fortress", não só "Aerial"; "Intercept", não "Interceptor").
 *  ATENÇÃO: seu lote de imagens enviado até agora só cobre até "Pinged
 *  Pass" em ordem alfabética — ainda faltam: Power Header, Power Shot,
 *  Press Proven, Quick Step, Rapid, Relentless, Rush Out, Slide Tackle,
 *  Technical, Tiki Taka, Trickster, Trivela, Whipped Pass. */
export const PLAYSTYLES_INFO: Record<string, PlaystyleInfo> = {
  'Finesse Shot': { titulo: 'Golpe de Precisão', descricao: 'Chutes de efeito executados com mais precisão.', descricaoPlus: 'Chutes de efeito e Trivela executados com ainda mais precisão.', arquivo: 'Finesse Shot' },
  'Chip Shot': { titulo: 'Chip Shot', descricao: 'Cavadas executadas com mais precisão.', descricaoPlus: 'Cavadas executadas com muito mais precisão e consistência.', arquivo: 'Chip Shot' },
  'Power Shot': { titulo: 'Tiro de Poder', descricao: 'Chutes de potência com mais força e precisão.', descricaoPlus: 'Chutes de potência com ainda mais força, precisão e velocidade de bola.', arquivo: 'Power Shot' },
  'Dead Ball': { titulo: 'Bola Morta', descricao: 'Cobranças de falta e pênalti com mais precisão.', descricaoPlus: 'Cobranças de falta e pênalti com muito mais precisão e variação de trajetória.', arquivo: 'Dead Ball' },
  'Power Header': { titulo: 'Cabeçalho de Precisão', descricao: 'Cabeceios com mais força e precisão.', descricaoPlus: 'Cabeceios com ainda mais força, precisão e alcance de salto.', arquivo: 'Power Header' },
  'Acrobatic': { titulo: 'Acrobático', descricao: 'Finalizações acrobáticas com mais qualidade.', descricaoPlus: 'Finalizações acrobáticas com muito mais qualidade e consistência.', arquivo: 'Acrobatic' },
  'Low Driven Shot': { titulo: 'Tiro Baixo e Potente', descricao: 'Chutes rasteiros fortes com mais precisão.', descricaoPlus: 'Chutes rasteiros fortes com ainda mais precisão e velocidade.', arquivo: 'Low Driven Shot' },
  'Trivela': { titulo: 'Revolucionário', descricao: 'Chutes de efeito e Trivela executados com mais qualidade.', descricaoPlus: 'Chutes de efeito e Trivela executados com muito mais qualidade e precisão.', arquivo: 'Trivela' },
  'Incisive Pass': { titulo: 'Passe Incisivo', descricao: 'Passes rasteiros com mais velocidade e precisão.', descricaoPlus: 'Passes rasteiros com ainda mais velocidade e precisão através de linhas defensivas.', arquivo: 'Incisive Pass' },
  'Pinged Pass': { titulo: 'Passe Pingado', descricao: 'Passes longos e curtos com mais velocidade.', descricaoPlus: 'Passes longos e curtos com ainda mais velocidade e precisão.', arquivo: 'Pinged Pass' },
  'Long Ball Pass': { titulo: 'Passe Longo', descricao: 'Lançamentos longos com mais precisão.', descricaoPlus: 'Lançamentos longos com muito mais precisão e altura controlada.', arquivo: 'Long Ball Pass' },
  'Tiki Taka': { titulo: 'Tiki Taka', descricao: 'Passes curtos consecutivos com mais qualidade de primeiro toque.', descricaoPlus: 'Passes curtos consecutivos com ainda mais qualidade e velocidade de troca.', arquivo: 'Tiki Taka' },
  'Whipped Pass': { titulo: 'Passe Chicoteado', descricao: 'Cruzamentos e passes curvados com mais precisão.', descricaoPlus: 'Cruzamentos e passes curvados com muito mais precisão e efeito.', arquivo: 'Whipped Pass' },
  'Inventive': { titulo: 'Inventivo', descricao: 'Passes criativos e inesperados com mais qualidade.', descricaoPlus: 'Passes criativos e inesperados com muito mais qualidade e visão.', arquivo: 'Inventive' },
  'Jockey': { titulo: 'Jóquei', descricao: 'Marcação em pé com melhor equilíbrio e reposicionamento.', descricaoPlus: 'Marcação em pé com muito melhor equilíbrio e reposicionamento.', arquivo: 'Jockey' },
  'Block': { titulo: 'Bloquear', descricao: 'Bloqueios de chute e passe mais eficientes.', descricaoPlus: 'Bloqueios de chute e passe muito mais eficientes.', arquivo: 'Block' },
  'Intercept': { titulo: 'Interceptar', descricao: 'Interceptações de passe mais consistentes.', descricaoPlus: 'Interceptações de passe muito mais consistentes e antecipadas.', arquivo: 'Intercept' },
  'Anticipate': { titulo: 'Antecipar', descricao: 'Antecipação de jogadas adversárias mais eficiente.', descricaoPlus: 'Antecipação de jogadas adversárias muito mais eficiente.', arquivo: 'Anticipate' },
  'Slide Tackle': { titulo: 'Polia Deslizante', descricao: 'Carrinhos com mais taxa de sucesso.', descricaoPlus: 'Carrinhos com taxa de sucesso ainda maior.', arquivo: 'Slide Tackle' },
  'Aerial Fortress': { titulo: 'Fortaleza Aérea', descricao: 'Duelos aéreos defensivos com mais força e salto.', descricaoPlus: 'Duelos aéreos defensivos com muito mais força e salto.', arquivo: 'Aerial Fortress' },
  'Technical': { titulo: 'Técnico', descricao: 'Controle de bola em espaços apertados mais consistente.', descricaoPlus: 'Controle de bola em espaços apertados muito mais consistente.', arquivo: 'Technical' },
  'Rapid': { titulo: 'Rápido', descricao: 'Velocidade de corrida com a bola mais alta.', descricaoPlus: 'Velocidade de corrida com a bola ainda mais alta.', arquivo: 'Rapid' },
  'First Touch': { titulo: 'Primeiro Toque', descricao: 'Domínio de bola mais consistente sob pressão.', descricaoPlus: 'Domínio de bola muito mais consistente sob pressão.', arquivo: 'First Touch' },
  'Trickster': { titulo: 'Trapaceiro', descricao: 'Dribles com mais qualidade de execução.', descricaoPlus: 'Dribles com muito mais qualidade de execução.', arquivo: 'Trickster' },
  'Press Proven': { titulo: 'Comprovado pela Pressão', descricao: 'Proteção de bola sob pressão mais eficaz.', descricaoPlus: 'Proteção de bola sob pressão muito mais eficaz.', arquivo: 'Press Proven' },
  'Quick Step': { titulo: 'Passo Rápido', descricao: 'Aceleração em corridas curtas mais alta.', descricaoPlus: 'Aceleração em corridas curtas ainda mais alta.', arquivo: 'Quick Step' },
  'Relentless': { titulo: 'Implacável', descricao: 'Recuperação de fôlego mais rápida.', descricaoPlus: 'Recuperação de fôlego muito mais rápida.', arquivo: 'Relentless' },
  'Long Throw': { titulo: 'Arremesso Longo', descricao: 'Arremessos laterais com mais alcance.', descricaoPlus: 'Arremessos laterais com muito mais alcance.', arquivo: 'Long Throw' },
  'Bruiser': { titulo: 'Bruiser', descricao: 'Disputas de força corpo a corpo mais eficazes.', descricaoPlus: 'Disputas de força corpo a corpo muito mais eficazes.', arquivo: 'Bruiser' },
  'Enforcer': { titulo: 'Executor', descricao: 'Mais força ao proteger a bola em dribles.', descricaoPlus: 'Muito mais força ao proteger a bola em dribles.', arquivo: 'Enforcer' },
  'Far Throw': { titulo: 'Arremesso de Longo Alcance', descricao: 'Goleiro lança a bola com mais distância.', descricaoPlus: 'Goleiro lança a bola com ainda mais distância.', arquivo: 'Far Throw' },
  'Footwork': { titulo: 'Trabalho de Pés', descricao: 'Goleiro mais ágil e seguro com os pés.', descricaoPlus: 'Goleiro muito mais ágil e seguro com os pés.', arquivo: 'Footwork' },
  'Cross Claimer': { titulo: 'Reclamante de Cruzamento', descricao: 'Goleiro sai mais para interceptar cruzamentos.', descricaoPlus: 'Goleiro sai com muito mais confiança para interceptar cruzamentos.', arquivo: 'Cross Claimer' },
  'Rush Out': { titulo: 'Saiam Correndo', descricao: 'Goleiro mais eficaz em situações de 1x1.', descricaoPlus: 'Goleiro muito mais eficaz em situações de 1x1.', arquivo: 'Rush Out' },
  'Far Reach': { titulo: 'Alcance Distante', descricao: 'Goleiro com mais alcance nas defesas.', descricaoPlus: 'Goleiro com alcance ainda maior nas defesas.', arquivo: 'Far Reach' },
  'Deflector': { titulo: 'Defletor', descricao: 'Goleiro espalma rebotes de forma mais segura.', descricaoPlus: 'Goleiro espalma rebotes de forma muito mais segura.', arquivo: 'Deflector' },
};

export function traduzirPlaystyle(nomeOriginal: string): string {
  return PLAYSTYLES_INFO[nomeOriginal]?.titulo ?? nomeOriginal;
}

export function descricaoPlaystyle(nomeOriginal: string, ehVersaoPlus: boolean): string | undefined {
  const info = PLAYSTYLES_INFO[nomeOriginal];
  if (!info) return undefined;
  return ehVersaoPlus ? info.descricaoPlus : info.descricao;
}

/** Monta o caminho exato do arquivo, batendo com os nomes reais que você
 *  enviou (ex.: "Finesse Shot.png" pra base, "Finesse Shot+.png" pra
 *  versão aprimorada — o "+" é parte do nome do arquivo, não um sufixo
 *  colado). Se o estilo não estiver no dicionário, tenta usar o próprio
 *  nome que veio da API como nome de arquivo (melhor esforço). */
export function imagemPlaystyle(nomeOriginal: string, ehVersaoPlus: boolean = false): string {
  const info = PLAYSTYLES_INFO[nomeOriginal];
  const base = info?.arquivo ?? nomeOriginal;
  const sufixo = ehVersaoPlus ? '+' : '';
  return `playstyles/${encodeURIComponent(base + sufixo)}.png`;
}
