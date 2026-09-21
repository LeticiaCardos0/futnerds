import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Jogador } from '../jogadores/jogadores';
import { JogadorService } from '../jogadores/jogador.service';
import { traduzirPosicao } from '../../shared/posicoes.util';
import { calcularPAC, calcularSHO, calcularPAS, calcularDRI, calcularPHY, calcularDEF, obterEstrelas, obterCorpo, obterClasseStatPill, ehPeEsquerdo, ehPeDireito, traduzirPe, traduzirNacionalidade, obterClasseTier, LAYOUT_CAMPO, imagemPlaystyle, traduzirPlaystyle, descricaoPlaystyle } from '../../shared/jogador-stats.util';


type AbaDetalhes = 'overview' | 'attrs' | 'positions' | 'styles' | 'career';

interface SubAtributo {
  label: string;
  valor: number | null;
}
interface GrupoAtributo {
  label: string;
  total: number | null;
  subs: SubAtributo[];
}

interface PosicaoCampo {
  sigla: string;
  label: string;
  overall: number | null;
  left: number;
  top: number;
  principal?: boolean;
}

/** Uma posição na formação completa exibida na aba Posições — inclui as
 *  que o jogador NÃO joga (mostradas "apagadas", sem número). */
interface PosicaoFormacao {
  sigla: string;
  label: string;
  left: number;
  top: number;
  ativo: boolean;
  principal: boolean;
  overall: number | null;
}


/** Um clube no histórico de carreira do jogador. */
interface ClubeHistorico {
  clube: string;
  anoInicio: string; // ex.: "FIFA 22" ou "FC24"
  anoFim: string | null; // null = clube atual
  overall: number | null;
  escudo?: string;
}

/** Um ponto da evolução do overall (uma edição do jogo). */
interface EvolucaoOverallPonto {
  edicao: string;
  overall: number;
}

/** Um ponto já convertido pra coordenadas de tela, pronto pro SVG. */
interface PontoGrafico {
  x: number;
  y: number;
  valor: number;
  edicao: string;
}

@Component({
  selector: 'app-jogador-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jogador-detalhes.html',
  styleUrl: './jogador-detalhes.css',
})
export class JogadorDetalhesComponent implements OnInit, AfterViewInit {
  jogador!: Jogador;
  carregando = true;
  erroCarregamento = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly jogadorService: JogadorService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const nav = this.router.getCurrentNavigation();
    const jogadorViaState = nav?.extras?.state?.['jogador'] as Jogador | undefined;
    if (jogadorViaState) {
      this.jogador = jogadorViaState;
      this.carregando = false;
    }
  }

  ngOnInit(): void {
    if (this.jogador) return;

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      console.error('[jogador-detalhes] nenhum id encontrado na rota');
      this.carregando = false;
      this.erroCarregamento = true;
      return;
    }

    this.jogadorService.buscarPorId(Number(id)).subscribe({
      next: (jogador) => {
        this.jogador = jogador;
        this.carregando = false;
        this.cdr.detectChanges();
        this.iniciarAnimacoes();
      },
      error: (err) => {
        console.error('[jogador-detalhes] falha ao buscar jogador', err);
        this.carregando = false;
        this.erroCarregamento = true;
        this.cdr.detectChanges();
      },
    });
  }

  abaAtiva: AbaDetalhes = 'overview';
  selecionarAba(aba: AbaDetalhes): void {
    this.abaAtiva = aba;
    setTimeout(() => {
      this.cdr.detectChanges(); // garante que o DOM já existe antes de medir
      this.medirLarguraGrafico();
      this.iniciarAnimacoes();
    }, 30);
  }

  /* ============================== gráfico de carreira — largura real =====
     Em vez de depender de CSS (aspect-ratio, preserveAspectRatio) pra evitar
     que o gráfico estique de forma desproporcional, medimos a largura real
     do container em pixels e usamos esse valor como largura do viewBox do
     SVG. Assim 1 unidade do gráfico = 1 pixel de verdade, sempre, em
     qualquer tamanho de tela — sem distorção possível. */
  @ViewChild('graficoWrap') graficoWrap?: ElementRef<HTMLDivElement>;
  larguraGraficoPx = 900; // valor inicial, só usado antes da 1ª medição

  private medirLarguraGrafico(): void {
    const largura = this.graficoWrap?.nativeElement?.clientWidth;
    if (largura && largura > 0) {
      this.larguraGraficoPx = Math.round(largura);
    }
  }

  calcularPAC = calcularPAC;
  calcularSHO = calcularSHO;
  calcularPAS = calcularPAS;
  calcularDRI = calcularDRI;
  calcularPHY = calcularPHY;
  calcularDEF = calcularDEF;
  obterEstrelas = obterEstrelas;
  obterCorpo = obterCorpo;
  obterClasseStatPill = obterClasseStatPill;
  ehPeEsquerdo = ehPeEsquerdo;
  ehPeDireito = ehPeDireito;
  traduzirPe = traduzirPe;
  traduzirNacionalidade = traduzirNacionalidade;

  /** Wrapper seguro pra traduzirPosicao — se a função original lançar erro
   *  pra alguma sigla (ex.: uma que não exista no mapa dela), isso evita
   *  que a página inteira quebre silenciosamente. Cai pra sigla crua. */
  traduzirPosicaoSegura(sigla: string | undefined | null): string {
    if (!sigla) return '—';
    try {
      return traduzirPosicao(sigla) || sigla;
    } catch (e) {
      console.warn('[jogador-detalhes] traduzirPosicao falhou para', sigla, e);
      return sigla;
    }
  }

  get classeTier(): string {
    return obterClasseTier(this.jogador?.overall ?? 0);
  }

  get statsResumo(): { label: string; valor: number | null }[] {
    return [
      { label: 'Ritmo', valor: calcularPAC(this.jogador) },
      { label: 'Finalização', valor: calcularSHO(this.jogador) },
      { label: 'Passe', valor: calcularPAS(this.jogador) },
      { label: 'Drible', valor: calcularDRI(this.jogador) },
      { label: 'Defesa', valor: calcularDEF(this.jogador) },
      { label: 'Físico', valor: calcularPHY(this.jogador) },
    ];
  }

  get gruposAtributos(): GrupoAtributo[] {
    const j = this.jogador;
    if (!j) return [];
    return [
      {
        label: 'Ritmo', total: calcularPAC(j),
        subs: [
          { label: 'Aceleração', valor: j.aceleracao ?? null },
          { label: 'Vel. Sprint', valor: j.velocidadeSprint ?? null },
        ],
      },
      {
        label: 'Finalização', total: calcularSHO(j),
        subs: [
          { label: 'Posic. Atq.', valor: j.posicionamento ?? null },
          { label: 'Finalização', valor: j.finalizacaoDetalhada ?? null },
          { label: 'Potência Chute', valor: j.potenciaChute ?? null },
          { label: 'Falta', valor: j.precisaoFalta ?? null },
          { label: 'Chute de Longe', valor: j.chutesDeLonge ?? null },
          { label: 'Voleio', valor: j.voleio ?? null },
          { label: 'Pênalti', valor: j.penaltis ?? null },
        ],
      },
      {
        label: 'Passe', total: calcularPAS(j),
        subs: [
          { label: 'Visão', valor: j.visao ?? null },
          { label: 'Cruzamento', valor: j.cruzamento ?? null },
          { label: 'Passe Longo', valor: j.passeLongo ?? null },
          { label: 'Passe Curto', valor: j.passeCurto ?? null },
          { label: 'Curva', valor: j.curva ?? null },
        ],
      },
      {
        label: 'Drible', total: calcularDRI(j),
        subs: [
          { label: 'Agilidade', valor: j.agilidade ?? null },
          { label: 'Equilíbrio', valor: j.equilibrio ?? null },
          { label: 'Reações', valor: j.reacoes ?? null },
          { label: 'Compostura', valor: j.compostura ?? null },
          { label: 'Controle de Bola', valor: j.controleDeBola ?? null },
          { label: 'Drible', valor: j.dribleDetalhado ?? null },
        ],
      },
      {
        label: 'Defesa', total: calcularDEF(j),
        subs: [
          { label: 'Interceptação', valor: j.interceptacao ?? null },
          { label: 'Cabeceio', valor: j.cabeceio ?? null },
          { label: 'Marcação', valor: j.marcacao ?? null },
          { label: 'Desarme em Pé', valor: j.desarmeEmPe ?? null },
          { label: 'Desarme Deslizante', valor: j.desarmeDeslizante ?? null },
        ],
      },
      {
        label: 'Físico', total: calcularPHY(j),
        subs: [
          { label: 'Impulsão', valor: j.impulsao ?? null },
          { label: 'Fôlego', valor: j.folego ?? null },
          { label: 'Força', valor: j.forca ?? null },
          { label: 'Agressão', valor: j.agressao ?? null },
        ],
      },
    ];
  }

  larguraBarra(valor: number | null): number {
    if (valor === null) return 0;
    return Math.min(100, Math.round((valor / 99) * 100));
  }

  /* ============================== Posições (lista simples, ainda usada
     em outros lugares se precisar) ============================== */
  get posicoesCampo(): PosicaoCampo[] {
    const j = this.jogador;
    if (!j) return [];

    const posicoes: PosicaoCampo[] = [];
    const coordsPrincipal = LAYOUT_CAMPO[j.posicao];
    if (coordsPrincipal) {
      posicoes.push({
        sigla: j.posicao, label: this.traduzirPosicaoSegura(j.posicao), overall: j.overall ?? null,
        ...coordsPrincipal, principal: true,
      });
    }
    if (j.posicoesAlternativas) {
      j.posicoesAlternativas.split(',').forEach((siglaBruta) => {
        const sigla = siglaBruta.trim();
        if (!sigla || sigla === j.posicao) return;
        const coords = LAYOUT_CAMPO[sigla];
        if (coords) {
          posicoes.push({ sigla, label: this.traduzirPosicaoSegura(sigla), overall: null, left: coords.left, top: coords.top });
        }
      });
    }
    return posicoes;
  }

  /* ============================== Formação completa (tema Holográfico)
     ============================== */
  /** Layout fixo de um 4-3-3 — usado só pra desenhar o campo completo.
   *  "chave" é a sigla real (batendo com jogador.posicao/posicoesAlternativas)
   *  quando ela difere da sigla mostrada no card (ex.: as duas zagas usam
   *  a mesma sigla real "CB"). */
  private readonly FORMACAO_4_3_3: { sigla: string; chave?: string; left: number; top: number }[] = [
    { sigla: 'LW', left: 16, top: 14 },
    { sigla: 'ST', left: 50, top: 10 },
    { sigla: 'RW', left: 84, top: 14 },
    { sigla: 'LM', left: 22, top: 44 },
    { sigla: 'CAM', left: 50, top: 38 },
    { sigla: 'RM', left: 78, top: 44 },
    { sigla: 'CM', left: 50, top: 58 },
    { sigla: 'LB', left: 14, top: 80 },
    { sigla: 'CB', left: 38, top: 86 },
    { sigla: 'CB2', chave: 'CB', left: 62, top: 86 },
    { sigla: 'RB', left: 86, top: 80 },
  ];

  /** Retorna as 11 posições da formação, marcando quais o jogador
   *  realmente joga (ativo=true, com overall quando disponível) e quais
   *  ficam só de contorno (ativo=false). */
  get formacaoCompleta(): PosicaoFormacao[] {
    const j = this.jogador;
    if (!j) return [];

    const posicoesDoJogador = new Map<string, { overall: number | null; principal: boolean }>();
    posicoesDoJogador.set(j.posicao, { overall: j.overall ?? null, principal: true });
    if (j.posicoesAlternativas) {
      j.posicoesAlternativas.split(',').forEach((s) => {
        const sigla = s.trim();
        if (sigla && !posicoesDoJogador.has(sigla)) {
          posicoesDoJogador.set(sigla, { overall: null, principal: false });
        }
      });
    }

    return this.FORMACAO_4_3_3.map((slot) => {
      const chave = slot.chave ?? slot.sigla;
      const info = posicoesDoJogador.get(chave);
      let label = slot.sigla; // reserva: se traduzirPosicao falhar, mostra a própria sigla
      label = this.traduzirPosicaoSegura(chave);
      return {
        sigla: slot.sigla,
        label,
        left: slot.left,
        top: slot.top,
        ativo: !!info,
        principal: info?.principal ?? false,
        overall: info?.overall ?? null,
      };
    });
  }

  /* ============================== Estilos ============================== */
  get estilosParaExibir(): { titulo: string; descricao?: string; imagem: string; ehPlus: boolean }[] {
    try {
      if (this.jogador?.estilosDeJogo?.length) {
        return this.jogador.estilosDeJogo.map((e) => ({
          titulo: e.titulo,
          descricao: e.descricao,
          imagem: e.icone ?? imagemPlaystyle(e.titulo),
          ehPlus: false,
        }));
      }
      if (this.jogador?.traits) {
        return this.jogador.traits
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((brutoComPossivelPlus) => {
            const ehPlus = brutoComPossivelPlus.endsWith('+');
            const nomeOriginal = brutoComPossivelPlus.replace(/\+$/, '').trim();
            return {
              titulo: traduzirPlaystyle(nomeOriginal),
              descricao: descricaoPlaystyle(nomeOriginal, ehPlus),
              imagem: imagemPlaystyle(nomeOriginal, ehPlus),
              ehPlus,
            };
          });
      }
      return [];
    } catch (e) {
      console.warn('[jogador-detalhes] estilosParaExibir falhou', e);
      return [];
    }
  }


  /* ============================== Carreira ============================== */
  get overallAtual(): number | null {
    return this.jogador?.overall ?? null;
  }

  /** Nome de exibição da edição, a partir do número puro que vem do banco
   *  (15-23 = "FIFA", 24 em diante = "FC", que foi quando a EA trocou o
   *  nome da franquia). */
  private nomeEdicao(edicao: number): string {
    return edicao >= 24 ? `FC${edicao}` : `FIFA ${edicao}`;
  }

  /** Histórico de clubes, agrupando edições consecutivas no mesmo clube
   *  numa única linha (ex.: 3 edições seguidas no mesmo time viram um
   *  card só, com a faixa de edições). Deriva tudo de `jogador.historico`,
   *  que já vem pronto do backend (uma linha por edição do jogo). */
  get historicoClubes(): ClubeHistorico[] {
    const linhas = this.jogador?.historico ?? [];
    if (!linhas.length) return [];

    const grupos: ClubeHistorico[] = [];
    for (const linha of linhas) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clube === linha.clube) {
        // mesma sequência de clube — só estende o fim e atualiza o overall
        ultimo.anoFim = this.nomeEdicao(linha.edicao);
        ultimo.overall = linha.overall;
        if (linha.escudoUrl) ultimo.escudo = linha.escudoUrl;
      } else {
        grupos.push({
          clube: linha.clube,
          anoInicio: this.nomeEdicao(linha.edicao),
          anoFim: this.nomeEdicao(linha.edicao),
          overall: linha.overall,
          escudo: linha.escudoUrl,
        });
      }
    }
    // o clube mais recente mostra "atual" no lugar da edição final
    // (o HTML já trata anoFim === null como "atual" via `?? 'atual'`)
    if (grupos.length) {
      grupos[grupos.length - 1].anoFim = null;
    }
    return grupos.reverse(); // mais recente primeiro
  }

  /** Evolução do overall por edição — pega direto de `jogador.historico`,
   *  já ordenado da edição mais antiga pra mais recente (o backend já
   *  entrega assim). */
  get evolucaoOverall(): EvolucaoOverallPonto[] {
    const linhas = this.jogador?.historico ?? [];
    return linhas.map((l) => ({ edicao: this.nomeEdicao(l.edicao), overall: l.overall }));
  }

  /** Converte a evolução em pontos de tela pro SVG (escala automática
   *  conforme o menor/maior overall da lista). */
  get pontosGrafico(): PontoGrafico[] {
    const dados = this.evolucaoOverall;
    if (!dados.length) return [];
    const largura = this.larguraGraficoPx, altura = 220, margemX = 30, margemTopo = 24, margemBaixo = 40;
    const valores = dados.map((d) => d.overall);
    const min = Math.min(...valores) - 3;
    const max = Math.max(...valores) + 3;
    const passoX = dados.length > 1 ? (largura - margemX * 2) / (dados.length - 1) : 0;
    return dados.map((d, i) => {
      const x = margemX + i * passoX;
      const proporcao = max === min ? 0.5 : (d.overall - min) / (max - min);
      const y = margemTopo + (altura - margemTopo - margemBaixo) * (1 - proporcao);
      return { x, y, valor: d.overall, edicao: d.edicao };
    });
  }

  get linhaGraficoPath(): string {
    const pts = this.pontosGrafico;
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  }

  get areaGraficoPath(): string {
    const pts = this.pontosGrafico;
    if (!pts.length) return '';
    const ultimo = pts[pts.length - 1];
    const primeiro = pts[0];
    return `${this.linhaGraficoPath} L${ultimo.x},200 L${primeiro.x},200 Z`;
  }

  /* ============================== ciclo de vida — animações ============================== */
  ngAfterViewInit(): void {
    this.iniciarParticulas();
    if (this.jogador) this.iniciarAnimacoes();
  }

  /** Pontinhos de luz soltos no fundo do tema Holográfico — puramente
   *  decorativo, gerado uma vez ao montar a view. */
  private iniciarParticulas(): void {
    const container = document.getElementById('holoParticles');
    if (!container || container.childElementCount > 0) return;
    for (let i = 0; i < 28; i++) {
      const dot = document.createElement('div');
      dot.className = 'holo-dot';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.top = Math.random() * 100 + '%';
      dot.style.animationDelay = Math.random() * 8 + 's';
      dot.style.animationDuration = 6 + Math.random() * 6 + 's';
      container.appendChild(dot);
    }
  }

  private iniciarAnimacoes(): void {
    setTimeout(() => {
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const alvo = parseInt(el.dataset['count'] || '0', 10);
        this.contarAte(el, alvo);
      });
      document.querySelectorAll<HTMLElement>('.jd-barra-fill, .holo-bar-fill').forEach((el) => {
        const largura = el.dataset['largura'] || '0';
        requestAnimationFrame(() => (el.style.width = largura + '%'));
      });

      // desenha a linha do gráfico de evolução (aba Carreira) usando o
      // comprimento real do path — funciona com qualquer quantidade de
      // pontos, não é um valor fixo "chutado".
      const linhaCarreira = document.querySelector<SVGPathElement>('.jd-carreira-linha');
      if (linhaCarreira) {
        const comprimento = linhaCarreira.getTotalLength();
        linhaCarreira.style.strokeDasharray = `${comprimento}`;
        linhaCarreira.style.strokeDashoffset = `${comprimento}`;
        linhaCarreira.getBoundingClientRect(); // força reflow antes de animar
        linhaCarreira.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)';
        requestAnimationFrame(() => (linhaCarreira.style.strokeDashoffset = '0'));
      }
    }, 50);
  }

  private contarAte(el: HTMLElement, alvo: number, duracao = 1000): void {
    const inicio = performance.now();
    const tick = (agora: number) => {
      const p = Math.min((agora - inicio) / duracao, 1);
      el.textContent = String(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}