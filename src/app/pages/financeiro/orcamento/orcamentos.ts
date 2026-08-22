import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export interface Categoria {
  id: number;
  nome: string;
  tipo: 'Despesa' | 'Receita';
  alocado: number;
  gasto: number;
  descricao: string;
  icone: string;
  corIcone: string;
}

type Moeda = 'BRL' | 'EUR';

@Component({
  selector: 'app-orcamento',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './orcamentos.html',
  styleUrl: './orcamentos.css',
})
export class OrcamentosComponent {
  constructor(private messageService: MessageService) {}

  // ---------- Estado geral ----------
  modalAberto = false;
  modoEdicao = false;
  categoriaEmEdicaoId: number | null = null;

  moedaAtual: Moeda = 'BRL';
  taxaCambio = 5.35;

  filtroTipo: 'Todas as Categorias' | 'Despesas' | 'Receitas' = 'Todas as Categorias';

  // ---------- Dados ----------
  categorias: Categoria[] = [
    {
      id: 1,
      nome: 'Salários',
      tipo: 'Despesa',
      alocado: 120000000,
      gasto: 85000000,
      descricao: 'Folha de pagamento dos jogadores',
      icone: 'fa-users',
      corIcone: 'text-purple-500',
    },
    {
      id: 2,
      nome: 'Patrocínios',
      tipo: 'Receita',
      alocado: 80000000,
      gasto: 42000000,
      descricao: 'Receita de patrocinadores e naming rights',
      icone: 'fa-handshake',
      corIcone: 'text-info',
    },
    {
      id: 3,
      nome: 'Infraestrutura',
      tipo: 'Despesa',
      alocado: 50000000,
      gasto: 18000000,
      descricao: 'Manutenção de estádio e centro de treinamento',
      icone: 'fa-building',
      corIcone: 'text-orange-400',
    },
  ];

  // ---------- Formulário (modal) ----------
  form: Partial<Categoria> = this.formVazio();

  private proximoId = 4;

  private formVazio(): Partial<Categoria> {
    return {
      nome: '',
      tipo: 'Despesa',
      alocado: 0,
      gasto: 0,
      descricao: '',
    };
  }

  // ---------- Getters computados ----------
  get categoriasFiltradas(): Categoria[] {
    if (this.filtroTipo === 'Despesas') {
      return this.categorias.filter((c) => c.tipo === 'Despesa');
    }
    if (this.filtroTipo === 'Receitas') {
      return this.categorias.filter((c) => c.tipo === 'Receita');
    }
    return this.categorias;
  }

  get orcamentoTotal(): number {
    return this.categorias.reduce((soma, c) => soma + c.alocado, 0);
  }

  get orcamentoUtilizado(): number {
    return this.categorias.reduce((soma, c) => soma + c.gasto, 0);
  }

  get orcamentoDisponivel(): number {
    return this.orcamentoTotal - this.orcamentoUtilizado;
  }

  get percentualUtilizado(): number {
    return this.orcamentoTotal > 0
      ? (this.orcamentoUtilizado / this.orcamentoTotal) * 100
      : 0;
  }

  get percentualDisponivel(): number {
    return 100 - this.percentualUtilizado;
  }

  // ---------- Conversão de moeda ----------
  alternarMoeda(): void {
    this.moedaAtual = this.moedaAtual === 'BRL' ? 'EUR' : 'BRL';
  }

  converter(valorEmBRL: number): number {
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

  percentualCategoria(categoria: Categoria): number {
    if (!categoria.alocado || categoria.alocado <= 0) {
      return 0;
    }
    const percentual = (categoria.gasto / categoria.alocado) * 100;
    return Math.min(Math.max(percentual, 0), 100);
  }

  disponivelCategoria(categoria: Categoria): number {
    return categoria.alocado - categoria.gasto;
  }

  // ---------- CRUD ----------
  abrirModal(): void {
    this.modoEdicao = false;
    this.categoriaEmEdicaoId = null;
    this.form = this.formVazio();
    this.modalAberto = true;
  }

  abrirModalEdicao(categoria: Categoria): void {
    this.modoEdicao = true;
    this.categoriaEmEdicaoId = categoria.id;
    this.form = { ...categoria };
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.form = this.formVazio();
    this.modoEdicao = false;
    this.categoriaEmEdicaoId = null;
  }

  salvarCategoria(): void {
    if (!this.form.nome || !this.form.nome.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Campo Obrigatório',
        detail: 'Informe o nome da categoria.',
      });
      return;
    }

    if (this.modoEdicao && this.categoriaEmEdicaoId !== null) {
      const index = this.categorias.findIndex((c) => c.id === this.categoriaEmEdicaoId);
      if (index !== -1) {
        this.categorias[index] = {
          ...this.categorias[index],
          nome: this.form.nome!,
          tipo: this.form.tipo as 'Despesa' | 'Receita',
          alocado: Number(this.form.alocado) || 0,
          gasto: Number(this.form.gasto) || 0,
          descricao: this.form.descricao || '',
        };
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Categoria Atualizada',
        detail: `${this.form.nome} foi atualizada com sucesso.`,
      });
    } else {
      const novaCategoria: Categoria = {
        id: this.proximoId++,
        nome: this.form.nome!,
        tipo: (this.form.tipo as 'Despesa' | 'Receita') || 'Despesa',
        alocado: Number(this.form.alocado) || 0,
        gasto: Number(this.form.gasto) || 0,
        descricao: this.form.descricao || '',
        icone: 'fa-tag',
        corIcone: 'text-accent',
      };
      this.categorias.push(novaCategoria);
      this.messageService.add({
        severity: 'success',
        summary: 'Categoria Cadastrada',
        detail: `${novaCategoria.nome} foi adicionada ao orçamento.`,
      });
    }

    this.fecharModal();
  }

  excluirCategoria(categoria: Categoria): void {
    this.categorias = this.categorias.filter((c) => c.id !== categoria.id);
    this.messageService.add({
      severity: 'warn',
      summary: 'Categoria Excluída',
      detail: `${categoria.nome} foi removida do orçamento.`,
    });
  }
}