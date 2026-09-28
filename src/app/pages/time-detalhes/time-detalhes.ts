import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TimeDetalhes, JogadorTime } from '../times/times.model';
import { TimeDetalhesService } from './time-detalhes.service';
import { urlImagemJogador } from '../../shared/api.util';
import { ConfigHolofotes, ligarHolofotes } from './holofotes-estadio';

/* Siglas exibidas nesta tela (as do design): o banco guarda as do FIFA. */
const SIGLA_PT: Record<string, string> = {
  GK: 'GL', CB: 'ZAG', LB: 'LE', RB: 'LD', LWB: 'LE', RWB: 'LD',
  CDM: 'VOL', CM: 'MC', CAM: 'MEI', LM: 'ME', RM: 'MD',
  LW: 'PE', RW: 'PD', ST: 'ATA', CF: 'ATA', LF: 'PE', RF: 'PD',
};

const GOLEIRO = ['GL'];
const DEFESA = ['ZAG', 'ZGE', 'ZGD', 'LD', 'LE'];
const ATAQUE = ['ATA', 'PE', 'PD'];

/** Cor da sigla por setor: goleiro, defesa, meio (padrão), ataque e reserva. */
function corPosicao(sigla: string): string {
  if (GOLEIRO.includes(sigla)) return 'oklch(0.72 0.16 45)';
  if (DEFESA.includes(sigla)) return 'oklch(0.8 0.14 75)';
  if (ATAQUE.includes(sigla)) return 'oklch(0.74 0.12 235)';
  if (sigla === 'SUB') return '#8a988e';
  return 'oklch(0.78 0.2 140)';
}

/** Fundo/texto do selo de nota: >=80 verde escuro, >=75 verde claro, abaixo amarelo. */
function corNota(v: number | null | undefined): { bg: string; fg: string } {
  if (v == null) return { bg: '#151d17', fg: '#8a988e' };
  if (v >= 80) return { bg: 'oklch(0.52 0.15 145)', fg: '#fff' };
  if (v >= 75) return { bg: 'oklch(0.7 0.18 135)', fg: '#061006' };
  return { bg: 'oklch(0.82 0.15 90)', fg: '#1a1400' };
}

/* Fundo do topo: nome do clube no banco -> foto do estádio (Wikimedia Commons) e o
   crédito que a licença pede. Só quem tem os refletores marcados na foto (hoje, o
   Real Madrid) ganha os holofotes; os outros ficam com a foto parada e o degradê. */
export interface FundoEstadio extends Partial<ConfigHolofotes> {
  foto: string;
  autor?: string;
  licenca?: string;
  pagina?: string;
}

let fundosEstadio: Promise<Record<string, FundoEstadio>> | null = null;
function carregarFundosEstadio(): Promise<Record<string, FundoEstadio>> {
  fundosEstadio ??= fetch('data/estadios.json')
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return fundosEstadio;
}

interface VagaFormacao {
  sigla: string;
  x: number;
  y: number;
  aceitas: string[]; // posições FIFA aceitas, em ordem de preferência
}

/* 3-4-2-1, com as coordenadas do design (x/y em % do campo quadrado). */
const FORMACAO: VagaFormacao[] = [
  { sigla: 'ATA', x: 50, y: 12, aceitas: ['ST', 'CF', 'LF', 'RF'] },
  { sigla: 'MEE', x: 30, y: 29, aceitas: ['CAM', 'LW', 'LF', 'CF', 'LM'] },
  { sigla: 'MED', x: 70, y: 29, aceitas: ['CAM', 'RW', 'RF', 'CF', 'RM'] },
  { sigla: 'ME', x: 13, y: 43, aceitas: ['LM', 'LW', 'LWB', 'LB'] },
  { sigla: 'MCE', x: 34, y: 55, aceitas: ['CM', 'CDM', 'CAM'] },
  { sigla: 'MCD', x: 66, y: 55, aceitas: ['CDM', 'CM'] },
  { sigla: 'MD', x: 87, y: 43, aceitas: ['RM', 'RW', 'RWB', 'RB'] },
  { sigla: 'ZGE', x: 22, y: 71, aceitas: ['CB', 'LB'] },
  { sigla: 'ZAG', x: 50, y: 71, aceitas: ['CB'] },
  { sigla: 'ZGD', x: 78, y: 71, aceitas: ['CB', 'RB'] },
  { sigla: 'GL', x: 50, y: 88, aceitas: ['GK'] },
];

/* Ordem de preenchimento: vagas mais "raras" primeiro, para não gastar um
   zagueiro numa lateral antes de fechar a zaga. */
const ORDEM_PREENCHIMENTO = ['GL', 'ZAG', 'ZGE', 'ZGD', 'ATA', 'MCD', 'MCE', 'ME', 'MD', 'MEE', 'MED'];

/* Ordem das linhas da tabela: de trás para a frente, como no design. */
const ORDEM_TABELA = ['GL', 'ZGD', 'ZAG', 'ZGE', 'MD', 'MCD', 'MCE', 'ME', 'MED', 'MEE', 'ATA'];

export interface JogadorCampo {
  vaga: VagaFormacao;
  jogador: JogadorTime | null;
  reservas: JogadorTime[];
  capitao: boolean;
}

export interface LinhaElenco {
  jogador: JogadorTime;
  vaga: string; // sigla da vaga no XI ou 'SUB'
  nacao: string;
  siglas: { t: string; c: string }[];
}

export type ChaveOrdem = 'nome' | 'idade' | 'geral' | 'potencial' | 'vaga' | 'salario' | 'valor' | 'estatisticas';

/* Colunas do elenco, na ordem do cabeçalho, e o valor usado para ordenar cada uma.
   crescente = o 1º clique ordena do menor para o maior. */
const COLUNAS_ELENCO: { chave: ChaveOrdem; label: string; crescente?: boolean; valor: (l: LinhaElenco) => number | string | null | undefined }[] = [
  { chave: 'nome', label: 'Nome', crescente: true, valor: (l) => l.jogador.nome },
  { chave: 'idade', label: 'Idade', valor: (l) => l.jogador.idade },
  { chave: 'geral', label: 'Geral', valor: (l) => l.jogador.overall },
  { chave: 'potencial', label: 'Pot.', valor: (l) => l.jogador.potencial },
  // titulares do goleiro ao atacante (ordem da tabela), reservas depois
  { chave: 'vaga', label: 'Time & Contrato', crescente: true, valor: (l) => (l.vaga === 'SUB' ? 99 : ORDEM_TABELA.indexOf(l.vaga)) },
  { chave: 'salario', label: 'Salário', valor: (l) => l.jogador.salario },
  { chave: 'valor', label: 'Valor', valor: (l) => l.jogador.valor },
  { chave: 'estatisticas', label: 'Estatísticas', valor: (l) => l.jogador.estatisticasTotais },
];

@Component({
  selector: 'app-time-detalhes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './time-detalhes.html',
  styleUrl: './time-detalhes.css',
})
export class TimeDetalhesComponent implements OnInit, OnDestroy {
  time: TimeDetalhes | null = null;
  carregando = true;
  erroCarregamento = false;

  campo: JogadorCampo[] = [];
  linhasElenco: LinhaElenco[] = [];
  private linhasPadrao: LinhaElenco[] = []; // ordem da escalação, para voltar a ela
  ordem: { chave: ChaveOrdem; dir: 'asc' | 'desc' } | null = null;
  readonly colunasElenco = COLUNAS_ELENCO;
  notas: { label: string; valor: number | null }[] = [];
  informacoes: { label: string; valor: string }[] = [];
  batedores: { label: string; valor: string }[] = []; // capitão e cobradores, ao lado do campo

  readonly uniformes: { tipo: string; label: string }[] = [
    { tipo: 'Home', label: 'Uniforme 1' },
    { tipo: 'Away', label: 'Uniforme 2' },
    { tipo: 'Goalkeeper', label: 'Uniforme do Goleiro' },
    { tipo: 'Third', label: 'Uniforme 3' },
  ];

  readonly corPosicao = corPosicao;
  readonly corNota = corNota;

  private desligarHolofotes: (() => void) | null = null;

  /** O canvas só existe depois que o time carrega e se o clube tem holofotes. */
  @ViewChild('holofotes') set canvasHolofotes(ref: ElementRef<HTMLCanvasElement> | undefined) {
    this.desligarHolofotes?.();
    this.desligarHolofotes = null;
    const cv = ref?.nativeElement;
    const foto = cv?.parentElement?.querySelector<HTMLElement>('.td-cena-foto');
    const cfg = this.fundo;
    if (cv && foto && cfg?.proporcao && cfg.refletores && cfg.alvo) {
      this.desligarHolofotes = ligarHolofotes(cv, foto, { proporcao: cfg.proporcao, refletores: cfg.refletores, alvo: cfg.alvo });
    }
  }

  /** Foto do estádio do clube no fundo do topo (null: sem foto, fica o fundo liso). */
  fundo: FundoEstadio | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly timeService: TimeDetalhesService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.carregando = false;
      this.erroCarregamento = true;
      return;
    }

    this.timeService.buscarPorId(Number(id)).subscribe({
      next: (time) => {
        this.time = time;
        this.montarTela(time);
        this.carregando = false;
        this.cdr.detectChanges();
        carregarFundosEstadio().then((fundos) => {
          this.fundo = fundos[time.nome] ?? null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('[time-detalhes] falha ao buscar time', err);
        this.carregando = false;
        this.erroCarregamento = true;
        this.cdr.detectChanges();
      },
    });
  }

  ngOnDestroy(): void {
    this.desligarHolofotes?.();
  }

  voltar(): void {
    this.router.navigate(['/times']);
  }

  /** Resumo quebrado em trechos, marcando os anos (1850–2099) para destacá-los em verde. */
  get historiaTrechos(): { texto: string; ano: boolean }[] {
    const resumo = this.time?.resumoHistorico ?? '';
    return resumo
      .split(/\b(1[89]\d\d|20\d\d)\b/)
      .filter(Boolean)
      .map((texto) => ({ texto, ano: /^(1[89]\d\d|20\d\d)$/.test(texto) }));
  }

  /** "Borussia Dortmund" -> ["Borussia ", "Dortmund"]: a última palavra vai em verde. */
  get nomePartes(): [string, string] {
    const nome = (this.time?.nome ?? '').trim();
    const i = nome.lastIndexOf(' ');
    return i < 0 ? ['', nome] : [nome.slice(0, i + 1), nome.slice(i + 1)];
  }

  uniformeUrl(tipo: string): string | null {
    return this.time?.uniformes?.find((u) => u.tipo === tipo)?.imagemUrl ?? null;
  }

  esconderImagem(evento: Event): void {
    (evento.target as HTMLElement).style.display = 'none';
  }

  /* ============================== Montagem ============================== */

  private montarTela(time: TimeDetalhes): void {
    const elenco = time.elenco ?? [];
    this.campo = this.montarCampo(elenco);
    this.linhasPadrao = this.montarLinhas(elenco);
    this.linhasElenco = [...this.linhasPadrao];
    this.ordem = null;

    this.notas = [
      { label: 'Classificação Geral', valor: arredondar(time.overallMedio) },
      { label: 'Ataque', valor: arredondar(time.overallAtaque) },
      { label: 'Meio-Campo', valor: arredondar(time.overallMeio) },
      { label: 'Defesa', valor: arredondar(time.overallDefesa) },
    ];

    const titulares = this.campo.map((c) => c.jogador).filter((j): j is JogadorTime => !!j);
    const capitao = this.campo.find((c) => c.capitao)?.jogador;
    const idadesXI = titulares.map((j) => j.idade).filter((i): i is number => i != null);

    this.informacoes = [
      { label: 'Estádio', valor: time.estadio || '—' },
      { label: 'Capacidade', valor: time.capacidadeEstadio ? time.capacidadeEstadio.toLocaleString('pt-BR') : '—' },
      { label: 'Cidade', valor: time.cidade || '—' },
      { label: 'Fundação', valor: time.fundacao ? String(time.fundacao) : '—' },
      { label: 'Time Rival', valor: time.rivalNome || '—' },
      { label: 'Prestígio internacional', valor: time.prestigioInternacional != null ? String(time.prestigioInternacional) : '—' },
      { label: 'Prestígio local', valor: time.prestigioLocal != null ? String(time.prestigioLocal) : '—' },
      { label: 'Orçamento de Transferências', valor: formatarEuro(time.orcamento) },
      { label: 'Valor Do Clube', valor: formatarEuro(time.valorElenco) },
      { label: 'Idade Média Inicial dos XI', valor: idadesXI.length ? (soma(idadesXI) / idadesXI.length).toFixed(2) : '—' },
      { label: 'Idade Média da Equipe Inteira', valor: time.idadeMedia ? time.idadeMedia.toFixed(2) : '—' },
    ];

    this.batedores = [
      { label: 'Capitão', valor: capitao?.nome || '—' },
      { label: 'Falta de perto', valor: melhor(titulares, (j) => j.precisaoFalta) },
      { label: 'Falta de longe', valor: melhor(titulares, (j) => somaOuNull(j.precisaoFalta, j.chutesDeLonge)) },
      { label: 'Falta de perto esq.', valor: melhor(titulares, (j) => j.precisaoFalta, 'Left') },
      { label: 'Falta de perto dir.', valor: melhor(titulares, (j) => j.precisaoFalta, 'Right') },
      { label: 'Batedor de pênaltis', valor: melhor(titulares, (j) => j.penaltis) },
      { label: 'Escanteio esquerdo', valor: melhor(titulares, (j) => somaOuNull(j.cruzamento, j.curva), 'Left') },
      { label: 'Escanteio direito', valor: melhor(titulares, (j) => somaOuNull(j.cruzamento, j.curva), 'Right') },
    ];
  }

  /** Encaixa o elenco no 3-4-2-1 e distribui os reservas pela vaga que mais combina com cada um. */
  private montarCampo(elenco: JogadorTime[]): JogadorCampo[] {
    const porOverall = [...elenco].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
    const usados = new Set<number>();
    const escolhido = new Map<string, JogadorTime>();
    const vagas = ORDEM_PREENCHIMENTO.map((s) => FORMACAO.find((v) => v.sigla === s)!);

    /* Cada vaga fica com quem tem a maior nota ajustada: overall menos 4 pontos
       por degrau na lista de preferência da vaga. Assim um ponta de 87 ainda
       ganha de um meia de 75 na posição exata. */
    const preencher = (pontuar: (j: JogadorTime, vaga: VagaFormacao) => number | null) => {
      for (const vaga of vagas) {
        if (escolhido.has(vaga.sigla)) continue;
        let melhorJogador: JogadorTime | null = null;
        let melhorNota = -Infinity;
        for (const j of porOverall) {
          if (usados.has(j.id)) continue;
          const nota = pontuar(j, vaga);
          if (nota != null && nota > melhorNota) {
            melhorNota = nota;
            melhorJogador = j;
          }
        }
        if (melhorJogador) {
          escolhido.set(vaga.sigla, melhorJogador);
          usados.add(melhorJogador.id);
        }
      }
    };

    // 1) posição principal
    preencher((j, v) => {
      const i = v.aceitas.indexOf(j.posicao);
      return i < 0 ? null : (j.overall ?? 0) - 4 * i;
    });
    // 2) posições alternativas
    preencher((j, v) => {
      const i = alternativas(j).reduce((m, p) => {
        const k = v.aceitas.indexOf(p);
        return k >= 0 && k < m ? k : m;
      }, Infinity);
      return i === Infinity ? null : (j.overall ?? 0) - 4 * (i + v.aceitas.length);
    });
    // 3) qualquer um que sobrou (elenco curto)
    preencher((j) => j.overall ?? 0);

    // Reservas: cada um vai para a vaga cuja lista aceita a posição dele mais cedo.
    const reservasPorVaga = new Map<string, JogadorTime[]>(FORMACAO.map((v) => [v.sigla, []]));
    for (const j of porOverall) {
      if (usados.has(j.id)) continue;
      let destino: VagaFormacao | null = null;
      let melhorIndice = Infinity;
      for (const vaga of FORMACAO) {
        const i = vaga.aceitas.indexOf(j.posicao);
        const empate = i === melhorIndice && destino
          && reservasPorVaga.get(vaga.sigla)!.length < reservasPorVaga.get(destino.sigla)!.length;
        if (i >= 0 && (i < melhorIndice || empate)) {
          destino = vaga;
          melhorIndice = i;
        }
      }
      if (destino) reservasPorVaga.get(destino.sigla)!.push(j);
    }

    const titulares = [...escolhido.values()];
    const capitaoId = titulares.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0]?.id;

    return FORMACAO.map((vaga) => {
      const jogador = escolhido.get(vaga.sigla) ?? null;
      return {
        vaga,
        jogador,
        reservas: reservasPorVaga.get(vaga.sigla)!,
        capitao: !!jogador && jogador.id === capitaoId,
      };
    });
  }

  private montarLinhas(elenco: JogadorTime[]): LinhaElenco[] {
    const vagaDoJogador = new Map<number, string>();
    this.campo.forEach((c) => c.jogador && vagaDoJogador.set(c.jogador.id, c.vaga.sigla));

    const linha = (j: JogadorTime): LinhaElenco => {
      const siglas = [j.posicao, ...alternativas(j)]
        .map((p) => SIGLA_PT[p] ?? p)
        .filter((s, i, arr) => arr.indexOf(s) === i);
      return {
        jogador: j,
        vaga: vagaDoJogador.get(j.id) ?? 'SUB',
        nacao: codigoNacao(j.paisCodigo, j.nacionalidade),
        siglas: siglas.map((t) => ({ t, c: corPosicao(t) })),
      };
    };

    const titulares = ORDEM_TABELA
      .map((s) => this.campo.find((c) => c.vaga.sigla === s)?.jogador)
      .filter((j): j is JogadorTime => !!j);
    const reservas = elenco
      .filter((j) => !vagaDoJogador.has(j.id))
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

    return [...titulares, ...reservas].map(linha);
  }

  /**
   * Clique no cabeçalho: 1º ordena (números do maior para o menor; nome de A a Z e
   * posição do goleiro ao atacante),
   * 2º inverte, 3º volta à ordem da escalação. Quem não tem o dado fica sempre no fim.
   */
  ordenar(chave: ChaveOrdem): void {
    const coluna = COLUNAS_ELENCO.find((c) => c.chave === chave)!;
    const inicial: 'asc' | 'desc' = coluna.crescente ? 'asc' : 'desc';
    if (this.ordem?.chave !== chave) this.ordem = { chave, dir: inicial };
    else if (this.ordem.dir === inicial) this.ordem = { chave, dir: inicial === 'asc' ? 'desc' : 'asc' };
    else this.ordem = null;

    if (!this.ordem) {
      this.linhasElenco = [...this.linhasPadrao];
      return;
    }
    const { dir } = this.ordem;
    const sinal = dir === 'asc' ? 1 : -1;
    this.linhasElenco = [...this.linhasPadrao].sort((a, b) => {
      const va = coluna.valor(a);
      const vb = coluna.valor(b);
      if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
      const r = typeof va === 'string' ? va.localeCompare(vb as string, 'pt-BR') : va - (vb as number);
      return r * sinal;
    });
  }

  /** Seta do cabeçalho: ↓/↑ na coluna ordenada, ↕ apagado nas outras. */
  setaOrdem(chave: ChaveOrdem): string {
    if (this.ordem?.chave !== chave) return '↕';
    return this.ordem.dir === 'asc' ? '↑' : '↓';
  }

  ariaOrdem(chave: ChaveOrdem): 'ascending' | 'descending' | 'none' {
    if (this.ordem?.chave !== chave) return 'none';
    return this.ordem.dir === 'asc' ? 'ascending' : 'descending';
  }

  formatarEuro = formatarEuro;
  fotoJogador = urlImagemJogador;
}

/* ============================== Utilitários ============================== */

function alternativas(j: JogadorTime): string[] {
  return (j.posicoesAlternativas ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

function arredondar(v: number | null | undefined): number | null {
  return v == null ? null : Math.round(v);
}

function soma(v: number[]): number {
  return v.reduce((a, b) => a + b, 0);
}

function somaOuNull(a: number | null | undefined, b: number | null | undefined): number | null {
  return a == null || b == null ? null : a + b;
}

/** Nome do titular com o maior valor no critério; prefere o pé indicado, se houver. */
function melhor(
  jogadores: JogadorTime[],
  criterio: (j: JogadorTime) => number | null | undefined,
  pe?: 'Left' | 'Right',
): string {
  const comValor = jogadores.filter((j) => criterio(j) != null);
  const pool = pe ? comValor.filter((j) => j.peDominante === pe) : comValor;
  const lista = pool.length ? pool : comValor;
  if (!lista.length) return '—';
  return lista.reduce((a, b) => ((criterio(b) ?? 0) > (criterio(a) ?? 0) ? b : a)).nome;
}

/** "gb-eng" -> "ENG", "fr" -> "FR"; sem código conhecido, usa o nome do país. */
function codigoNacao(codigo: string | null | undefined, nome: string | null | undefined): string {
  if (codigo && codigo !== 'un') return codigo.split('-').pop()!.toUpperCase();
  return nome || '—';
}

/** 173000 -> "€173K", 68000000 -> "€68M", 1.9e9 -> "€1.9B". Nulo ou zero -> "—". */
function formatarEuro(v: number | null | undefined): string {
  if (!v) return '—';
  const faixas: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [base, sufixo] of faixas) {
    if (v >= base) {
      const n = v / base;
      return `€${n >= 100 ? Math.round(n) : Number(n.toFixed(1))}${sufixo}`;
    }
  }
  return `€${v}`;
}
