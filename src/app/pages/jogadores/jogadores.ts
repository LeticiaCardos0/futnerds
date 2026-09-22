import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TimeSelecionado, CHAVE_TIME_SELECIONADO } from '../selecionar-time/selecionar-time';
import { MAPA_POSICOES, traduzirPosicao } from '../../shared/posicoes.util';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { JogadorService } from './jogador.service';
import { urlImagemJogador } from '../../shared/api.util';

export interface JogadorElenco {
  id: number;
  foto: string;
  nome: string;
  idade: number;
  posicao: string;
  timeOriginal: string;
  salario: number;
  valor: number;
  multa: number;
  titular?: boolean;
}

export const CHAVE_ELENCO = 'futnerds_elenco';

export interface Jogador {
  id: number;
  foto: string;
  nome: string;
  idade: number;
  posicao: string;
  timeAtual: string;
  salario: number;
  valor: number;
  multa: number;
  overall?: number;
  potencial?: number;
  nacionalidade?: string;
  peDominante?: 'Esquerdo' | 'Direito';
  paisCodigo?: string;
  escudoClube?: string;
  velocidade?: number;
  finalizacao?: number;
  passe?: number;
  drible?: number;
  traits?: string;
  posicoesAlternativas?: string;
  cruzamento?: number;
  finalizacaoDetalhada?: number;
  cabeceio?: number;
  passeCurto?: number;
  voleio?: number;
  dribleDetalhado?: number;
  curva?: number;
  precisaoFalta?: number;
  passeLongo?: number;
  controleDeBola?: number;
  aceleracao?: number;
  velocidadeSprint?: number;
  agilidade?: number;
  reacoes?: number;
  equilibrio?: number;
  potenciaChute?: number;
  impulsao?: number;
  folego?: number;
  forca?: number;
  chutesDeLonge?: number;
  agressao?: number;
  interceptacao?: number;
  posicionamento?: number;
  visao?: number;
  penaltis?: number;
  compostura?: number;
  marcacao?: number;
  desarmeEmPe?: number;
  desarmeDeslizante?: number;
  /* ---- campos novos (opcionais) para bater com o layout estilo FUTBIN.
     Se sua API ainda não envia esses valores, a tela mostra "—" no lugar
     em vez de quebrar — é só popular quando o backend tiver os dados. ---- */
  peFraco?: number; // estrelas do pé fraco, 1 a 5 (weak foot)
  movimentosHabilidade?: number; // estrelas de movimentos de habilidade, 1 a 5 (skill moves)
  alturaCm?: number;
  pesoKg?: number;
  tipoFisico?: string; // ex.: 'Normal', 'Magro', 'Robusto', 'Explosivo'
  estilosDeJogo?: { titulo: string; descricao: string; icone?: string }[];
  /** Histórico de carreira — uma linha por edição do jogo (FIFA/EA FC),
   *  vindo do backend via JogadorHistoricoRepository. */
  historico?: JogadorHistoricoItem[];
}

/** Uma linha do histórico de carreira numa edição específica do jogo. */
export interface JogadorHistoricoItem {
  edicao: number;
  overall: number;
  potencial: number;
  clube: string;
  liga: string;
  escudoUrl?: string;
}


@Component({
  selector: 'app-jogadores',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './jogadores.html',
  styleUrl: './jogadores.css'
})
export class JogadoresComponent implements OnInit {
  readonly urlImagemJogador = urlImagemJogador;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private jogadorService: JogadorService,
    private cdr: ChangeDetectorRef
  ) { }

  jogadores: Jogador[] = [];

  timeSelecionado: TimeSelecionado | null = null;
  mostrarModalAdicionar: boolean = false;
  jogadorParaAdicionar: JogadorElenco | null = null;

  mostrarModalResumo: boolean = false;
  jogadorParaResumo: Jogador | null = null;

  paginaAtual: number = 1;
  itensPorPagina: number = 30;
  totalPaginas: number = 1;
  totalItens: number = 0;

  termoBusca: string = '';
  termoBuscaAplicado: string | null = null;
  buscando: boolean = false;
  posicaoSelecionada: string = 'Todas';

  // filtro rápido vindo por query params (ex: card "Wonderkids" da Home) —
  // a API não suporta idade/potencial como filtro server-side hoje, então
  // é aplicado no cliente sobre a página carregada (ver carregarJogadores)
  filtroIdadeMax: number | null = null;
  filtroPotencialMin: number | null = null;

  private termoBuscaSubject = new Subject<string>();

  posicoesDisponiveis: { sigla: string; rotulo: string }[] = [
    { sigla: 'Todas', rotulo: 'Todas' },
    ...Object.entries(MAPA_POSICOES).map(([sigla, rotulo]) => ({ sigla, rotulo }))
  ];

  traduzirPosicao = traduzirPosicao;

  get paginasArray(): number[] {
    const total = this.totalPaginas;
    const atual = this.paginaAtual;
    const janela = 5;

    let inicio = Math.max(1, atual - Math.floor(janela / 2));
    let fim = Math.min(total, inicio + janela - 1);

    if (fim - inicio + 1 < janela) {
      inicio = Math.max(1, fim - janela + 1);
    }

    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
    this.carregarJogadores();
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  aoFiltrar(): void {
    this.termoBuscaSubject.next(this.termoBusca);
  }

  /** Dispara a busca imediatamente (botão "Buscar" ou Enter), sem esperar o debounce. */
  buscarAgora(): void {
    this.paginaAtual = 1;
    this.carregarJogadores();
  }

  limparBusca(): void {
    this.termoBusca = '';
    this.paginaAtual = 1;
    this.carregarJogadores();
  }

  selecionarPosicao(posicao: string): void {
    this.posicaoSelecionada = posicao;
    this.paginaAtual = 1;
    this.carregarJogadores();
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.posicaoSelecionada = 'Todas';
    this.paginaAtual = 1;
    // navega sem query params — isso também limpa o filtro rápido vindo da Home
    // (idadeMax/potencialMin) via a própria assinatura de queryParams no ngOnInit
    this.router.navigate(['/jogadores']);
  }

  /** Limpa só o filtro rápido de origem (ex: veio do card "Wonderkids" da Home). */
  limparFiltroOrigem(): void {
    this.router.navigate(['/jogadores']);
  }

  ngOnInit() {
    this.carregarTimeSelecionado();

    this.termoBuscaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.paginaAtual = 1;
      this.carregarJogadores();
    });

    this.route.queryParams.subscribe(params => {
      this.filtroIdadeMax = params['idadeMax'] ? Number(params['idadeMax']) : null;
      this.filtroPotencialMin = params['potencialMin'] ? Number(params['potencialMin']) : null;
      this.paginaAtual = 1;
      this.carregarJogadores();
    });
  }

  carregarJogadores(): void {
    const temFiltroRapido = this.filtroIdadeMax != null || this.filtroPotencialMin != null;
    // com filtro rápido ativo, busca um lote maior (a API só pagina/ordena por
    // overall) pra ter mais chance de achar os sub-21/alto-potencial nele
    const tamanho = temFiltroRapido ? 100 : this.itensPorPagina;

    this.buscando = true;
    this.jogadorService.listar(this.paginaAtual - 1, tamanho, this.termoBusca, this.posicaoSelecionada).subscribe(resultado => {
      let jogadores = resultado.jogadores;
      let totalPaginas = resultado.totalPaginas;
      let totalItens = resultado.totalItens;

      if (temFiltroRapido) {
        jogadores = jogadores.filter(j =>
          (this.filtroIdadeMax == null || j.idade < this.filtroIdadeMax) &&
          (this.filtroPotencialMin == null || (j.potencial ?? 0) >= this.filtroPotencialMin!)
        );
        totalItens = jogadores.length;
        totalPaginas = 1;
      }

      this.jogadores = jogadores;
      this.totalPaginas = totalPaginas;
      this.totalItens = totalItens;
      this.termoBuscaAplicado = this.termoBusca.trim() || null;
      this.buscando = false;
      this.preencherSalariosFaltantes();
      this.cdr.markForCheck();
    });
  }

  private preencherSalariosFaltantes(): void {
    const comSalario = this.jogadores.filter(j => j.salario > 0);
    if (comSalario.length === 0) return;

    const media = Math.round(
      comSalario.reduce((soma, j) => soma + j.salario, 0) / comSalario.length
    );

    this.jogadores.forEach(j => {
      if (!j.salario || j.salario <= 0) {
        j.salario = media;
      }
    });
  }

  private carregarTimeSelecionado(): void {
    const dados = localStorage.getItem(CHAVE_TIME_SELECIONADO);
    this.timeSelecionado = dados ? JSON.parse(dados) : null;

  }

  private carregarElenco(): JogadorElenco[] {
    const dados = localStorage.getItem(CHAVE_ELENCO);
    return dados ? JSON.parse(dados) : [];
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarSalarioInput(event: any): void {
    if (this.jogadorParaAdicionar) {
      let valor = event.target.value.replace(/\D/g, '');
      if (valor) {
        const numeroFormatado = parseInt(valor, 10);
        this.jogadorParaAdicionar.salario = numeroFormatado;
        event.target.value = this.formatarNumeroComPonto(numeroFormatado);
      }
    }
  }

  formatarNumeroComPonto(valor: number): string {
    return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  obterValorFormatado(valor: number): string {
    return this.formatarNumeroComPonto(valor);
  }

  abrirModalAdicionar(jogador: Jogador) {
    this.carregarTimeSelecionado();

    if (!this.timeSelecionado) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nenhum time selecionado',
        detail: 'Selecione um time primeiro para montar seu elenco.'
      });
      this.router.navigate(['/selecionar-time']);
      return;
    }

    this.jogadorParaAdicionar = {
      id: jogador.id,
      foto: jogador.foto,
      nome: jogador.nome,
      idade: jogador.idade,
      posicao: jogador.posicao,
      timeOriginal: jogador.timeAtual,
      salario: jogador.salario,
      valor: jogador.valor,
      multa: jogador.multa
    };
    this.mostrarModalAdicionar = true;
  }

  fecharModalAdicionar() {
    this.mostrarModalAdicionar = false;
    this.jogadorParaAdicionar = null;
  }

  abrirModalResumo(jogador: Jogador): void {
    this.jogadorParaResumo = jogador;
    this.mostrarModalResumo = true;
  }

  fecharModalResumo(): void {
    this.mostrarModalResumo = false;
    this.jogadorParaResumo = null;
  }

  irParaDetalhes(jogador: Jogador): void {
    console.log('[jogadores] irParaDetalhes -> navegando para /jogadores/' + jogador.id, jogador);
    this.fecharModalResumo();
    this.router.navigate(['/jogadores', jogador.id]);
  }

  adicionarJogadorAoElenco() {
    if (this.jogadorParaAdicionar && this.timeSelecionado) {
      const elenco = this.carregarElenco();

      const jaExiste = elenco.some(j => j.id === this.jogadorParaAdicionar!.id);

      if (jaExiste) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Jogador já está no elenco',
          detail: `${this.jogadorParaAdicionar.nome} já faz parte do seu elenco.`
        });
        this.fecharModalAdicionar();
        return;
      }

      elenco.push(this.jogadorParaAdicionar);
      localStorage.setItem(CHAVE_ELENCO, JSON.stringify(elenco));

      this.messageService.add({
        severity: 'success',
        summary: 'Jogador adicionado',
        detail: `${this.jogadorParaAdicionar.nome} foi adicionado ao elenco do ${this.timeSelecionado.nome}.`
      });

      this.fecharModalAdicionar();
    }
  }
  obterClasseOverall(overall: number): string {
    if (overall >= 90) return 'bg-amber-500/10 text-amber-400';
    if (overall >= 80) return 'bg-green-500/10 text-green-400';
    if (overall >= 75) return 'bg-accent/10 text-accent';
    return 'bg-fg/5 text-fg-muted';

  }

  obterClasseOverallSvg(overall: number): string {
    if (overall >= 90) return 'hex-dourado';
    if (overall >= 80) return 'hex-verde';
    if (overall >= 75) return 'hex-azul';
    return 'hex-cinza';
  }

  /** Mesma faixa de overall usada no hexágono, aplicada como moldura do
   *  "card" de foto do jogador (dourado/verde/azul/cinza), pra remeter
   *  ao card de rating do FUTBIN. */
  obterClasseCartao(overall: number): string {
    if (overall >= 90) return 'player-card--dourado';
    if (overall >= 80) return 'player-card--verde';
    if (overall >= 75) return 'player-card--azul';
    return 'player-card--cinza';
  }
  formatarValorCompacto(valor: number | null | undefined): string {
    if (!valor) return '—';
    if (valor >= 1000000) return `€${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `€${(valor / 1000).toFixed(0)}K`;
    return `€${valor}`;
  }

  /* ==========================================================
     ESTATÍSTICAS ESTILO FUTBIN (PAC/SHO/PAS/DRI/DEF/PHY) — calculadas
     a partir dos atributos detalhados que já existem no modelo (sem
     inventar dados: se os sub-atributos não vierem preenchidos pela
     API, cai no atributo simples equivalente, ou mostra "—" quando
     nenhum dos dois existir).
     ========================================================== */
  private media(...valores: Array<number | undefined>): number | null {
    const validos = valores.filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (!validos.length) return null;
    return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
  }

  calcularPAC(j: Jogador): number | null {
    return this.media(j.aceleracao, j.velocidadeSprint) ?? j.velocidade ?? null;
  }
  calcularSHO(j: Jogador): number | null {
    return this.media(j.finalizacaoDetalhada, j.potenciaChute, j.precisaoFalta, j.penaltis, j.voleio) ?? j.finalizacao ?? null;
  }
  calcularPAS(j: Jogador): number | null {
    return this.media(j.passeCurto, j.passeLongo, j.visao, j.curva) ?? j.passe ?? null;
  }
  calcularDRI(j: Jogador): number | null {
    return this.media(j.dribleDetalhado, j.controleDeBola, j.agilidade, j.equilibrio, j.reacoes) ?? j.drible ?? null;
  }
  calcularDEF(j: Jogador): number | null {
    return this.media(j.marcacao, j.desarmeEmPe, j.desarmeDeslizante, j.interceptacao);
  }
  calcularPHY(j: Jogador): number | null {
    return this.media(j.forca, j.folego, j.impulsao, j.agressao);
  }

  /** Classe de cor da pílula de estatística, seguindo a mesma faixa de
   *  cores usada pelo FUTBIN/EA (verde/amarelo/laranja/vermelho). */
  obterClasseStatPill(valor: number | null): string {
    if (valor === null) return 'stat-pill--vazio';
    if (valor >= 80) return 'stat-pill--verde';
    if (valor >= 70) return 'stat-pill--amarelo';
    if (valor >= 60) return 'stat-pill--laranja';
    return 'stat-pill--vermelho';
  }

  /** Repete um caractere de estrela N vezes (weak foot / skill moves).
   *  Retorna null quando o valor não existe, para a tela mostrar "—". */
  obterEstrelas(valor: number | undefined): string | null {
    if (!valor || valor < 1) return null;
    return '★'.repeat(Math.min(5, Math.round(valor)));
  }

  /** Texto "180cm | 75kg" a partir de altura/peso — mostra só o que existir. */
  obterCorpo(j: Jogador): string {
    const partes: string[] = [];
    if (j.alturaCm) partes.push(`${j.alturaCm}cm`);
    if (j.pesoKg) partes.push(`${j.pesoKg}kg`);
    return partes.length ? partes.join(' | ') : '—';
  }

  /** Comparação tolerante do pé dominante — a checagem exata (=== 'Esquerdo')
   *  quebra silenciosamente se o backend mandar em maiúsculas ('ESQUERDO',
   *  comum em enum Java), com espaço extra, ou em inglês ('LEFT'/'RIGHT').
   *  Essas duas funções cobrem essas variações sem precisar mudar a API. */
  private normalizarPe(valor: string | undefined | null): string {
    return (valor ?? '').toString().trim().toLowerCase();
  }
  ehPeEsquerdo(j: Jogador): boolean {
    const v = this.normalizarPe(j.peDominante);
    return v === 'esquerdo' || v === 'left' || v === 'l' || v === 'e';
  }
  ehPeDireito(j: Jogador): boolean {
    const v = this.normalizarPe(j.peDominante);
    return v === 'direito' || v === 'right' || v === 'r' || v === 'd';
  }
}

/*
jogadoresMock: Jogador[] = [
  { id: 1, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/e_haaland_18d525d6.png', nome: 'E. Haaland', idade: 24, posicao: 'Atacante', timeAtual: 'Manchester City', salario: 550000, valor: 172500000, multa: 34500000, overall: 91, potencial: 94, nacionalidade: 'Noruega', paisCodigo: 'no', escudoClube: 'https://logodetimes.com/times/manchester-city/logo-manchester-city-256.png', peDominante: 'Esquerdo' },
  { id: 2, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/k_mbapp_a6fff8a4.png', nome: 'K. Mbappé', idade: 26, posicao: 'Ponta', timeAtual: 'Real Madrid', salario: 500000, valor: 157000000, multa: 31400000, overall: 91, potencial: 93, nacionalidade: 'França', paisCodigo: 'fr', escudoClube: 'https://logodetimes.com/times/real-madrid/logo-real-madrid-256.png', peDominante: 'Direito' },
  { id: 3, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/vitinha_62b448f1.png', nome: 'Vitinha', idade: 25, posicao: 'Meio-Campo', timeAtual: 'Paris Saint-Germain', salario: 420000, valor: 149000000, multa: 29800000, overall: 87, potencial: 90, nacionalidade: 'Portugal', paisCodigo: 'pt', escudoClube: 'https://logodetimes.com/times/paris-saint-germain/logo-paris-saint-germain-256.png', peDominante: 'Direito' },
  { id: 4, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/pedri_a88bfe80.png', nome: 'Pedri', idade: 22, posicao: 'Meio-Campo', timeAtual: 'FC Barcelona', salario: 380000, valor: 165000000, multa: 33000000, overall: 88, potencial: 93, nacionalidade: 'Espanha', paisCodigo: 'es', escudoClube: 'https://logodetimes.com/times/barcelona/logo-barcelona-256.png', peDominante: 'Direito' },
  { id: 5, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/t_courtois_4dff6960.png', nome: 'T. Courtois', idade: 33, posicao: 'Goleiro', timeAtual: 'Real Madrid', salario: 300000, valor: 39000000, multa: 7800000, overall: 89, potencial: 89, nacionalidade: 'Bélgica', paisCodigo: 'be', escudoClube: 'https://logodetimes.com/times/real-madrid/logo-real-madrid-256.png', peDominante: 'Esquerdo' },
  { id: 6, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/player-images/h_kane_yvw1p4rp.png', nome: 'H. Kane', idade: 31, posicao: 'Atacante', timeAtual: 'FC Bayern München', salario: 480000, valor: 101000000, multa: 20200000, overall: 90, potencial: 90, nacionalidade: 'Inglaterra', paisCodigo: 'gb-eng', escudoClube: 'https://logodetimes.com/times/bayern-de-munique/logo-bayern-de-munique-256.png', peDominante: 'Direito' },
  { id: 7, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/o_dembl_f54bdfd5.png', nome: 'O. Dembélé', idade: 28, posicao: 'Ponta', timeAtual: 'Paris Saint-Germain', salario: 410000, valor: 122500000, multa: 24500000, overall: 89, potencial: 90, nacionalidade: 'França', paisCodigo: 'fr', escudoClube: 'https://logodetimes.com/times/paris-saint-germain/logo-paris-saint-germain-256.png', peDominante: 'Direito' },
  { id: 8, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/rodri_d8867883.png', nome: 'Rodri', idade: 29, posicao: 'Meio-Campo', timeAtual: 'Manchester City', salario: 430000, valor: 88000000, multa: 17600000, overall: 90, potencial: 90, nacionalidade: 'Espanha', paisCodigo: 'es', escudoClube: 'https://logodetimes.com/times/manchester-city/logo-manchester-city-256.png', peDominante: 'Direito' },
  { id: 9, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/m_salah_239a2be2.png', nome: 'M. Salah', idade: 33, posicao: 'Ponta', timeAtual: 'Liverpool', salario: 350000, valor: 64000000, multa: 12800000, overall: 88, potencial: 88, nacionalidade: 'Egito', paisCodigo: 'eg', escudoClube: 'https://logodetimes.com/times/liverpool/logo-liverpool-256.png', peDominante: 'Esquerdo' },
  { id: 10, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/gabriel_2e790224.png', nome: 'Gabriel Magalhães', idade: 27, posicao: 'Zagueiro', timeAtual: 'Arsenal', salario: 320000, valor: 104000000, multa: 20800000, overall: 86, potencial: 87, nacionalidade: 'Brasil', paisCodigo: 'br', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Esquerdo' },
  { id: 11, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/f_valverde_e06132c0.png', nome: 'F. Valverde', idade: 26, posicao: 'Meio-Campo', timeAtual: 'Real Madrid', salario: 400000, valor: 120500000, multa: 24100000, overall: 87, potencial: 89, nacionalidade: 'Uruguai', paisCodigo: 'uy', escudoClube: 'https://logodetimes.com/times/real-madrid/logo-real-madrid-256.png', peDominante: 'Direito' },
  { id: 12, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/player-images/a_hakimi_8lmu3w65.png', nome: 'A. Hakimi', idade: 26, posicao: 'Lateral', timeAtual: 'Paris Saint-Germain', salario: 360000, valor: 111000000, multa: 22200000, overall: 87, potencial: 88, nacionalidade: 'Marrocos', paisCodigo: 'ma', escudoClube: 'https://logodetimes.com/times/paris-saint-germain/logo-paris-saint-germain-256.png', peDominante: 'Direito' },
  { id: 13, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/g_donnarumma_099ac8ec.png', nome: 'G. Donnarumma', idade: 26, posicao: 'Goleiro', timeAtual: 'Paris Saint-Germain', salario: 330000, valor: 97000000, multa: 19400000, overall: 88, potencial: 90, nacionalidade: 'Itália', paisCodigo: 'it', escudoClube: 'https://logodetimes.com/times/paris-saint-germain/logo-paris-saint-germain-256.png', peDominante: 'Direito' },
  { id: 14, foto: 'https://cdn-img.staticzz.com/img/jogadores/new/75/32/737532_jude_bellingham_20250618231333.png', nome: 'J. Bellingham', idade: 22, posicao: 'Meio-Campo', timeAtual: 'Real Madrid', salario: 390000, valor: 150500000, multa: 30100000, overall: 88, potencial: 94, nacionalidade: 'Inglaterra', paisCodigo: 'gb-eng', escudoClube: 'https://logodetimes.com/times/real-madrid/logo-real-madrid-256.png', peDominante: 'Direito' },
  { id: 15, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/vini_jr_25114c31.png', nome: 'Vini Jr.', idade: 24, posicao: 'Ponta', timeAtual: 'Real Madrid', salario: 440000, valor: 141000000, multa: 28200000, overall: 90, potencial: 92, nacionalidade: 'Brasil', paisCodigo: 'br', escudoClube: 'https://logodetimes.com/times/real-madrid/logo-real-madrid-256.png', peDominante: 'Direito' },
  { id: 16, foto: 'https://images.fifaindex.com/fc26/players/277643.webp', nome: 'Lamine Yamal', idade: 17, posicao: 'Ponta', timeAtual: 'FC Barcelona', salario: 180000, valor: 147000000, multa: 29400000, overall: 87, potencial: 95, nacionalidade: 'Espanha', paisCodigo: 'es', escudoClube: 'https://logodetimes.com/times/barcelona/logo-barcelona-256.png', peDominante: 'Esquerdo' },
  { id: 17, foto: 'https://images.fifaindex.com/fc26/players/256790.webp', nome: 'J. Musiala', idade: 22, posicao: 'Meio-Campo', timeAtual: 'FC Bayern München', salario: 380000, valor: 133500000, multa: 26700000, overall: 87, potencial: 92, nacionalidade: 'Alemanha', paisCodigo: 'de', escudoClube: 'https://logodetimes.com/times/bayern-de-munique/logo-bayern-de-munique-256.png', peDominante: 'Direito' },
  { id: 18, foto: 'https://images.fifaindex.com/fc26/players/246669.webp', nome: 'B. Saka', idade: 23, posicao: 'Ponta', timeAtual: 'Arsenal', salario: 400000, valor: 103500000, multa: 20700000, overall: 87, potencial: 91, nacionalidade: 'Inglaterra', paisCodigo: 'gb-eng', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Esquerdo' },
  { id: 19, foto: 'https://images.fifaindex.com/fc26/players/241084.webp', nome: 'L. Díaz', idade: 28, posicao: 'Ponta', timeAtual: 'Liverpool', salario: 350000, valor: 80000000, multa: 16000000, overall: 85, potencial: 86, nacionalidade: 'Colômbia', paisCodigo: 'co', escudoClube: 'https://logodetimes.com/times/liverpool/logo-liverpool-256.png', peDominante: 'Esquerdo' },
  { id: 20, foto: 'https://images.fifaindex.com/fc26/players/237383.webp', nome: 'A. Bastoni', idade: 26, posicao: 'Zagueiro', timeAtual: 'Inter de Milão', salario: 320000, valor: 87000000, multa: 17400000, overall: 86, potencial: 88, nacionalidade: 'Itália', paisCodigo: 'it', escudoClube: 'https://logodetimes.com/times/inter-de-milao/logo-inter-de-milao-256.png', peDominante: 'Esquerdo' },
  { id: 21, foto: 'https://images.fifaindex.com/fc26/players/247635.webp', nome: 'K. Kvaratskhelia', idade: 24, posicao: 'Ponta', timeAtual: 'Napoli', salario: 380000, valor: 109000000, multa: 21800000, overall: 87, potencial: 91, nacionalidade: 'Geórgia', paisCodigo: 'ge', escudoClube: 'https://logodetimes.com/times/napoli/logo-napoli-256.png', peDominante: 'Esquerdo' },
  { id: 22, foto: 'https://images.fifaindex.com/fc26/players/256630.webp', nome: 'F. Wirtz', idade: 22, posicao: 'Meio-Campo', timeAtual: 'B. Leverkusen', salario: 360000, valor: 116500000, multa: 23300000, overall: 87, potencial: 93, nacionalidade: 'Alemanha', paisCodigo: 'de', escudoClube: 'https://logodetimes.com/times/bayer-leverkusen/logo-bayer-leverkusen-256.png', peDominante: 'Direito' },
  { id: 23, foto: 'https://images.fifaindex.com/fc26/players/222665.webp', nome: 'M. Ødegaard', idade: 26, posicao: 'Meio-Campo', timeAtual: 'Arsenal', salario: 390000, valor: 110000000, multa: 22000000, overall: 87, potencial: 89, nacionalidade: 'Noruega', paisCodigo: 'no', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Esquerdo' },
  { id: 24, foto: 'https://images.fifaindex.com/fc26/players/203376.webp', nome: 'V. van Dijk', idade: 33, posicao: 'Zagueiro', timeAtual: 'Liverpool', salario: 400000, valor: 43500000, multa: 8700000, overall: 89, potencial: 89, nacionalidade: 'Holanda', paisCodigo: 'nl', escudoClube: 'https://logodetimes.com/times/liverpool/logo-liverpool-256.png', peDominante: 'Direito' },
  { id: 25, foto: 'https://images.fifaindex.com/fc26/players/212831.webp', nome: 'Alisson', idade: 32, posicao: 'Goleiro', timeAtual: 'Liverpool', salario: 300000, valor: 45000000, multa: 9000000, overall: 88, potencial: 88, nacionalidade: 'Brasil', paisCodigo: 'br', escudoClube: 'https://logodetimes.com/times/liverpool/logo-liverpool-256.png', peDominante: 'Direito' },
  { id: 26, foto: 'https://images.fifaindex.com/fc26/players/212622.webp', nome: 'J. Kimmich', idade: 30, posicao: 'Meio-Campo', timeAtual: 'FC Bayern München', salario: 380000, valor: 86000000, multa: 17200000, overall: 87, potencial: 87, nacionalidade: 'Alemanha', paisCodigo: 'de', escudoClube: 'https://logodetimes.com/times/bayern-de-munique/logo-bayern-de-munique-256.png', peDominante: 'Direito' },
  { id: 27, foto: 'https://images.fifaindex.com/fc26/players/212198.webp', nome: 'B. Fernandes', idade: 30, posicao: 'Meio-Campo', timeAtual: 'Manchester United', salario: 390000, valor: 88000000, multa: 17600000, overall: 87, potencial: 87, nacionalidade: 'Portugal', paisCodigo: 'pt', escudoClube: 'https://logodetimes.com/times/manchester-united/logo-manchester-united-256.png', peDominante: 'Direito' },
  { id: 28, foto: 'https://images.fifaindex.com/fc26/players/233419.webp', nome: 'Raphinha', idade: 28, posicao: 'Ponta', timeAtual: 'FC Barcelona', salario: 350000, valor: 104000000, multa: 20800000, overall: 87, potencial: 88, nacionalidade: 'Brasil', paisCodigo: 'br', escudoClube: 'https://logodetimes.com/times/barcelona/logo-barcelona-256.png', peDominante: 'Esquerdo' },
  { id: 29, foto: 'https://images.fifaindex.com/fc26/players/231478.webp', nome: 'L. Martínez', idade: 27, posicao: 'Atacante', timeAtual: 'Inter de Milão', salario: 420000, valor: 99000000, multa: 19800000, overall: 88, potencial: 88, nacionalidade: 'Argentina', paisCodigo: 'ar', escudoClube: 'https://logodetimes.com/times/inter-de-milao/logo-inter-de-milao-256.png', peDominante: 'Direito' },
  { id: 30, foto: 'https://images.fifaindex.com/fc26/players/224232.webp', nome: 'N. Barella', idade: 28, posicao: 'Meio-Campo', timeAtual: 'Inter de Milão', salario: 380000, valor: 91500000, multa: 18300000, overall: 87, potencial: 87, nacionalidade: 'Itália', paisCodigo: 'it', escudoClube: 'https://logodetimes.com/times/inter-de-milao/logo-inter-de-milao-256.png', peDominante: 'Direito' },
  { id: 31, foto: 'https://images.fifaindex.com/fc26/players/234378.webp', nome: 'D. Rice', idade: 26, posicao: 'Meio-Campo', timeAtual: 'Arsenal', salario: 400000, valor: 96000000, multa: 19200000, overall: 87, potencial: 88, nacionalidade: 'Inglaterra', paisCodigo: 'gb-eng', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Direito' },
  { id: 32, foto: 'https://images.fifaindex.com/fc26/players/256079.webp', nome: 'M. Caicedo', idade: 23, posicao: 'Meio-Campo', timeAtual: 'Chelsea', salario: 350000, valor: 107000000, multa: 21400000, overall: 86, potencial: 90, nacionalidade: 'Equador', paisCodigo: 'ec', escudoClube: 'https://logodetimes.com/times/chelsea/logo-chelsea-256.png', peDominante: 'Direito' },
  { id: 33, foto: 'https://images.fifaindex.com/fc26/players/252145.webp', nome: 'Nuno Mendes', idade: 23, posicao: 'Lateral', timeAtual: 'Paris Saint-Germain', salario: 320000, valor: 115500000, multa: 23100000, overall: 85, potencial: 89, nacionalidade: 'Portugal', paisCodigo: 'pt', escudoClube: 'https://logodetimes.com/times/paris-saint-germain/logo-paris-saint-germain-256.png', peDominante: 'Esquerdo' },
  { id: 34, foto: 'https://images.fifaindex.com/fc26/players/233731.webp', nome: 'A. Isak', idade: 25, posicao: 'Atacante', timeAtual: 'Newcastle United', salario: 350000, valor: 96500000, multa: 19300000, overall: 86, potencial: 89, nacionalidade: 'Suécia', paisCodigo: 'se', escudoClube: 'https://logodetimes.com/times/newcastle-united/logo-newcastle-united-256.png', peDominante: 'Direito' },
  { id: 35, foto: 'https://images.fifaindex.com/fc26/players/232293.webp', nome: 'V. Osimhen', idade: 26, posicao: 'Atacante', timeAtual: 'Galatasaray SK', salario: 400000, valor: 95000000, multa: 19000000, overall: 87, potencial: 88, nacionalidade: 'Nigéria', paisCodigo: 'ng', escudoClube: 'https://logodetimes.com/times/galatasaray/logo-galatasaray-256.png', peDominante: 'Direito' },
  { id: 36, foto: 'https://images.fifaindex.com/fc26/players/220901.webp', nome: 'David Raya', idade: 29, posicao: 'Goleiro', timeAtual: 'Arsenal', salario: 280000, valor: 54500000, multa: 10900000, overall: 86, potencial: 87, nacionalidade: 'Espanha', paisCodigo: 'es', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Direito' },
  { id: 37, foto: 'https://images.fifaindex.com/fc26/players/215698.webp', nome: 'M. Maignan', idade: 29, posicao: 'Goleiro', timeAtual: 'AC Milan', salario: 300000, valor: 61000000, multa: 12200000, overall: 87, potencial: 87, nacionalidade: 'França', paisCodigo: 'fr', escudoClube: 'https://logodetimes.com/times/milan/logo-milan-256.png', peDominante: 'Direito' },
  { id: 38, foto: 'https://images.fifaindex.com/fc26/players/213331.webp', nome: 'J. Tah', idade: 29, posicao: 'Zagueiro', timeAtual: 'B. Leverkusen', salario: 320000, valor: 66500000, multa: 13300000, overall: 84, potencial: 84, nacionalidade: 'Alemanha', paisCodigo: 'de', escudoClube: 'https://logodetimes.com/times/bayer-leverkusen/logo-bayer-leverkusen-256.png', peDominante: 'Direito' },
  { id: 39, foto: 'https://images.fifaindex.com/fc26/players/239837.webp', nome: 'A. Mac Allister', idade: 26, posicao: 'Meio-Campo', timeAtual: 'Liverpool', salario: 380000, valor: 105000000, multa: 21000000, overall: 86, potencial: 87, nacionalidade: 'Argentina', paisCodigo: 'ar', escudoClube: 'https://logodetimes.com/times/liverpool/logo-liverpool-256.png', peDominante: 'Direito' },
  { id: 40, foto: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/gabriel_2e790224.png', nome: 'Gabriel', idade: 27, posicao: 'Zagueiro', timeAtual: 'Arsenal', salario: 200000, valor: 104000000, multa: 20800000, overall: 86, potencial: 87, nacionalidade: 'Brasil', paisCodigo: 'br', escudoClube: 'https://logodetimes.com/times/arsenal/logo-arsenal-256.png', peDominante: 'Esquerdo' },
];
*/
