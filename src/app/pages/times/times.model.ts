// Adicione estas interfaces em `pages/times/times.ts`, junto da interface
// `Time` que já existe (a usada na listagem/cards).
// `Time` (listagem) continua igual — estas aqui são só para a tela de detalhes.

export interface JogadorTime {
  id: number;
  foto: string;
  nome: string;
  overall: number;
  posicao: string;        // sigla, ex: 'GOL', 'ZAG', 'MEI', 'ATA' — usar traduzirPosicao() pra exibir
  numeroCamisa?: number;
  titular: boolean;       // define se entra no campo (titulares) ou na lista de reservas
  capitao?: boolean;
  posicoesAlternativas?: string; // string separada por vírgula, ex: "CM,CAM" — usado como fallback no encaixe da formação
}

export interface UniformeTime {
  tipo: 'Home' | 'Away' | 'Third'; // bate com strType da TheSportsDB (1st/2nd/3rd -> mapear no back)
  imagemUrl: string;
  temporada?: string;
}

export interface TituloTime {
  competicao: string;
  quantidade: number;
  ultimoAno?: number;
  icone?: string; // classe do FontAwesome, ex: 'fa-trophy' | 'fa-shield-halved'
}

export interface TimeDetalhes {
  id: number;
  nome: string;
  escudoUrl: string;
  ligaNome: string;
  paisNome: string;
  cidade?: string;
  estadio?: string;
  capacidadeEstadio?: number;
  fundacao?: number;
  resumoHistorico?: string;

  overallMedio: number;
  overallAtaque?: number;
  overallMeio?: number;
  overallDefesa?: number;
  idadeMedia: number;
  valorElenco: number;
  orcamento?: number;
  rivalNome?: string;
  prestigioInternacional?: number; // 0-10
  prestigioLocal?: number;         // 0-10
  melhorJogadorNome?: string;
  melhorJogadorOverall?: number;

  uniformes: UniformeTime[];
  elenco: JogadorTime[];
  titulos: TituloTime[];
}