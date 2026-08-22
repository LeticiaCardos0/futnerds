import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface CategoriaOrcamento {
  nome: string;
  tipo: 'Despesa' | 'Receita';
  alocado: number;
  gasto: number;
  corIcone: string;
}

interface Transacao {
  tipo: 'Receita' | 'Despesa';
  categoria: string;
  descricao: string;
  data: string;
  valor: number;
}

interface MembroDestaque {
  nome: string;
  funcao: string;
  fotoUrl: string | null;
}

type Moeda = 'BRL' | 'EUR'

@Component({
  selector: 'app-financeiro',
  imports: [CommonModule, RouterModule],
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
})

export class FinanceiroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rdsChartRef') rdsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('orcChartRef') orcChartRef!: ElementRef<HTMLCanvasElement>;

  private rdsChart: Chart | null = null;
  private orcChart: Chart | null = null;

  // ---------- Moeda ----------
  // Mesmo padrão usado em orçamento e transações: valores sempre armazenados em BRL,
  // a taxa é só para exibição.
  moedaAtual: Moeda = 'BRL';
  taxaCambio = 5.35; // 1 EUR = 5,35 BRL (referência)

  alternarMoeda(): void {
    this.moedaAtual = this.moedaAtual === 'BRL' ? 'EUR' : 'BRL';
    this.atualizarGraficos();
  }

  private converter(valorEmBRL: number): number {
    return this.moedaAtual === 'EUR' ? valorEmBRL / this.taxaCambio : valorEmBRL;
  }

  formatarMoeda(valorEmBRL: number): string {
    const valorConvertido = this.converter(valorEmBRL);
    const localeConfig =
      this.moedaAtual === 'EUR'
        ? { locale: 'de-DE', currency: 'EUR' }
        : { locale: 'pt-BR', currency: 'BRL' };

    return new Intl.NumberFormat(localeConfig.locale, {
      style: 'currency',
      currency: localeConfig.currency,
      maximumFractionDigits: 0,
    }).format(valorConvertido);
  }

  // ---------- Dados: Orçamento ----------
  // Reflete a mesma estrutura usada em orcamentos.ts.
  // Idealmente isso viria de um serviço compartilhado entre os componentes.
  categoriasOrcamento: CategoriaOrcamento[] = [
    { nome: 'Salários', tipo: 'Despesa', alocado: 120000000, gasto: 85000000, corIcone: '#a855f7' },
    { nome: 'Patrocínios', tipo: 'Receita', alocado: 80000000, gasto: 42000000, corIcone: '#60a5fa' },
    { nome: 'Infraestrutura', tipo: 'Despesa', alocado: 50000000, gasto: 18000000, corIcone: '#fb923c' },
  ];

  get orcamentoTotal(): number {
    return this.categoriasOrcamento.reduce((soma, c) => soma + c.alocado, 0);
  }

  get orcamentoUtilizado(): number {
    return this.categoriasOrcamento.reduce((soma, c) => soma + c.gasto, 0);
  }

  get orcamentoDisponivel(): number {
    return this.orcamentoTotal - this.orcamentoUtilizado;
  }

  get percentualOrcamentoUtilizado(): number {
    return this.orcamentoTotal > 0 ? (this.orcamentoUtilizado / this.orcamentoTotal) * 100 : 0;
  }

  percentualCategoria(categoria: CategoriaOrcamento): number {
    if (!categoria.alocado || categoria.alocado <= 0) return 0;
    return Math.min(Math.max((categoria.gasto / categoria.alocado) * 100, 0), 100);
  }

  // ---------- Dados: Transações ----------
  // Reflete a mesma estrutura usada em transacoes.ts.
  transacoes: Transacao[] = [
    { tipo: 'Receita', categoria: 'Venda de Jogador', descricao: 'Venda de Messi para PSG', data: '24/05/2026', valor: 150000000 },
    { tipo: 'Despesa', categoria: 'Salários', descricao: 'Folha de Pagamento - Maio', data: '21/05/2026', valor: 2350000 },
    { tipo: 'Despesa', categoria: 'Compra de Jogador', descricao: 'Compra de Haaland - Manchester City', data: '19/05/2026', valor: 180000000 },
    { tipo: 'Receita', categoria: 'Bônus', descricao: 'Bônus - Vitória na Champions League', data: '16/05/2026', valor: 50000000 },
  ];

  get totalReceitas(): number {
    return this.transacoes.filter((t) => t.tipo === 'Receita').reduce((soma, t) => soma + t.valor, 0);
  }

  get totalDespesas(): number {
    return this.transacoes.filter((t) => t.tipo === 'Despesa').reduce((soma, t) => soma + t.valor, 0);
  }

  get saldoLiquido(): number {
    return this.totalReceitas - this.totalDespesas;
  }

  get ultimasTransacoes(): Transacao[] {
    return this.transacoes.slice(0, 4);
  }

  // ---------- Dados: Comissão Técnica ----------
  totalMembrosComissao = 4;

  membrosDestaque: MembroDestaque[] = [
    { nome: 'Pep Guardiola', funcao: 'Treinador Principal', fotoUrl: null },
    { nome: 'Michael Carter', funcao: 'Analista de Desempenho', fotoUrl: null },
  ];

  // ---------- Barra de referência para os gráficos CSS ----------
  get maiorAlocado(): number {
    return Math.max(...this.categoriasOrcamento.map((c) => c.alocado), 1);
  }

  // ---------- Gráficos (Chart.js) ----------
  ngAfterViewInit(): void {
    this.criarGraficos();
  }

  ngOnDestroy(): void {
    this.rdsChart?.destroy();
    this.orcChart?.destroy();
  }

  private atualizarGraficos(): void {
    this.rdsChart?.destroy();
    this.orcChart?.destroy();
    this.criarGraficos();
  }

  private criarGraficos(): void {
    this.criarGraficoReceitasDespesas();
    this.criarGraficoOrcamento();
  }

  private criarGraficoReceitasDespesas(): void {
    if (!this.rdsChartRef) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Receitas', 'Despesas', 'Saldo líquido'],
        datasets: [
          {
            data: [this.totalReceitas, this.totalDespesas, this.saldoLiquido],
            backgroundColor: ['#22c55e', '#f87171', '#e5e7eb'],
            borderRadius: 6,
            barThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => this.formatarMoeda(Number(ctx.parsed.y ?? 0)),
            },
          },
        },
        scales: {
          y: {
            ticks: {
              color: '#6b7280',
              font: { size: 10 },
              callback: (valor) => this.formatarValorEixo(Number(valor)),
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          x: {
            ticks: { color: '#9ca3af', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };

    this.rdsChart = new Chart(this.rdsChartRef.nativeElement, config);
  }

  private criarGraficoOrcamento(): void {
    if (!this.orcChartRef) return;

    const utilizado = Math.round(this.percentualOrcamentoUtilizado);
    const disponivel = 100 - utilizado;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Utilizado', 'Disponível'],
        datasets: [
          {
            data: [utilizado, disponivel],
            backgroundColor: ['#22c55e', '#374151'],
            borderColor: '#05070c',
            borderWidth: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    };

    this.orcChart = new Chart(this.orcChartRef.nativeElement, config);
  }

  private formatarValorEixo(valorEmBRL: number): string {
    const convertido = this.moedaAtual === 'EUR' ? valorEmBRL / this.taxaCambio : valorEmBRL;
    const simbolo = this.moedaAtual === 'EUR' ? '€' : 'R$';
    return `${simbolo}${(convertido / 1000000).toFixed(0)}M`;
  }
}