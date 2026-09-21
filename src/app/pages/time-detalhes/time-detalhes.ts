import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TimeDetalhes, JogadorTime } from '../times/times.model';
import { TimeDetalhesService } from './time-detalhes.service';
import { traduzirPosicao } from '../../shared/posicoes.util';

type AbaTime = 'overview' | 'squad';

interface SlotFormacao {
  posicao: string; // sigla real do banco: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST
  top: number;
  left: number;
}

interface SlotComJogador extends SlotFormacao {
  jogador: JogadorTime | null;
}

const FORMACAO_4_3_3: SlotFormacao[] = [
  { posicao: 'GK', top: 90, left: 50 },
  { posicao: 'LB', top: 74, left: 14 },
  { posicao: 'CB', top: 80, left: 36 },
  { posicao: 'CB', top: 80, left: 64 },
  { posicao: 'RB', top: 74, left: 86 },
  { posicao: 'CDM', top: 58, left: 50 },
  { posicao: 'CM', top: 44, left: 30 },
  { posicao: 'CM', top: 44, left: 70 },
  { posicao: 'LW', top: 20, left: 16 },
  { posicao: 'ST', top: 10, left: 50 },
  { posicao: 'RW', top: 20, left: 84 },
];

@Component({
  selector: 'app-time-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './time-detalhes.html',
  styleUrl: './time-detalhes.css',
})
export class TimeDetalhesComponent implements OnInit, AfterViewInit {
  time: TimeDetalhes | null = null;
  carregando = true;
  erroCarregamento = false;

  abaAtiva: AbaTime = 'overview';
  traduzirPosicao = traduzirPosicao;

  readonly tiposUniforme: { tipo: 'Home' | 'Away' | 'Third'; label: string }[] = [
    { tipo: 'Home', label: 'Titular' },
    { tipo: 'Away', label: 'Reserva' },
    { tipo: 'Third', label: 'Terceiro' },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly timeService: TimeDetalhesService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      console.error('[time-detalhes] nenhum id encontrado na rota');
      this.carregando = false;
      this.erroCarregamento = true;
      return;
    }

    this.timeService.buscarPorId(Number(id)).subscribe({
      next: (time) => {
        this.time = time;
        this.carregando = false;
        this.cdr.detectChanges();
        this.iniciarAnimacoes();
      },
      error: (err) => {
        console.error('[time-detalhes] falha ao buscar time', err);
        this.carregando = false;
        this.erroCarregamento = true;
        this.cdr.detectChanges();
      },
    });
  }

  ngAfterViewInit(): void {
    if (this.time) this.iniciarAnimacoes();
  }

  selecionarAba(aba: AbaTime): void {
    this.abaAtiva = aba;
    setTimeout(() => this.iniciarAnimacoes(), 30);
  }

  voltar(): void {
    this.router.navigate(['/times']);
  }

  /* ============================== Elenco / campo ============================== */

  get slotsDaFormacao(): SlotComJogador[] {
    const time = this.time;
    if (!time || !time.elenco || time.elenco.length === 0) return [];

    const titulares: JogadorTime[] = time.elenco.filter((j: JogadorTime) => j.titular);

    const poolPorPosicao: Record<string, JogadorTime[]> = {};
    titulares.forEach((j: JogadorTime) => {
      if (!poolPorPosicao[j.posicao]) poolPorPosicao[j.posicao] = [];
      poolPorPosicao[j.posicao].push(j);
    });

    const usados = new Set<number>();

    return FORMACAO_4_3_3.map((slot: SlotFormacao): SlotComJogador => {
      // 1a tentativa: posicao primaria exata, ainda nao usada
      const pool = poolPorPosicao[slot.posicao] || [];
      let jogador: JogadorTime | null = pool.find((j) => !usados.has(j.id)) ?? null;

      // 2a tentativa: algum titular que tenha essa posicao como alternativa
      if (!jogador) {
        jogador =
          titulares.find((j: JogadorTime) => {
            if (usados.has(j.id)) return false;
            const alternativas = (j as unknown as { posicoesAlternativas?: string })
              .posicoesAlternativas;
            if (!alternativas) return false;
            return alternativas
              .split(',')
              .map((s) => s.trim())
              .includes(slot.posicao);
          }) ?? null;
      }

      if (jogador) usados.add(jogador.id);
      return { ...slot, jogador };
    });
  }

  get banco(): JogadorTime[] {
    const time = this.time;
    if (!time || !time.elenco || time.elenco.length === 0) return [];

    const idsEmCampo = new Set(
      this.slotsDaFormacao
        .map((s) => s.jogador?.id)
        .filter((id): id is number => id !== undefined),
    );

    return time.elenco
      .filter((j: JogadorTime) => !idsEmCampo.has(j.id))
      .sort((a: JogadorTime, b: JogadorTime) => b.overall - a.overall);
  }

  /* ============================== Uniformes ============================== */

  uniformePorTipo(tipo: 'Home' | 'Away' | 'Third') {
    return this.time?.uniformes?.find((u) => u.tipo === tipo) ?? null;
  }

  get uniformeTemporada(): string | null {
    return this.time?.uniformes?.[0]?.temporada ?? null;
  }

  get totalTitulos(): number {
    return this.time?.titulos?.reduce((soma, t) => soma + (t.quantidade || 0), 0) ?? 0;
  }

  /* ============================== Animacoes (gauges + barras) ============================== */

  private iniciarAnimacoes(): void {
    setTimeout(() => {
      document.querySelectorAll<SVGCircleElement>('[data-gauge-pct]').forEach((el) => {
        const pct = parseFloat(el.dataset['gaugePct'] || '0');
        const perimetro = 2 * Math.PI * 50;
        const offset = perimetro - (perimetro * pct) / 100;
        requestAnimationFrame(() => (el.style.strokeDashoffset = `${offset}`));
      });

      document.querySelectorAll<HTMLElement>('[data-barra-largura]').forEach((el) => {
        const largura = el.dataset['barraLargura'] || '0';
        requestAnimationFrame(() => (el.style.width = `${largura}%`));
      });

      document.querySelectorAll<HTMLElement>('.td-trofeu').forEach((el, i) => {
        setTimeout(() => el.classList.add('td-trofeu--visivel'), i * 70);
      });
    }, 50);
  }
}