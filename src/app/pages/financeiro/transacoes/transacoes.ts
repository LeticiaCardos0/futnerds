import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-transacoes',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './transacoes.html',
  styleUrl: './transacoes.css',
})
export class TransacoesComponent {
  constructor(private messageService: MessageService) {}

  tipos: string[] = ['Receita', 'Despesa', 'Despesa', 'Receita'];
  categorias: string[] = ['Venda de Jogador', 'Salários', 'Compra de Jogador', 'Bônus'];
  descricoes: string[] = [
    'Venda de Messi para PSG',
    'Folha de Pagamento - Maio',
    'Compra de Haaland - Manchester City',
    'Bônus - Vitória na Champions League'
  ];
  datas: string[] = [
    '24/05/2026',
    '21/05/2026',
    '19/05/2026',
    '16/05/2026'
  ];
  valores: number[] = [150000000, 2350000, 180000000, 50000000];

  tipo: string = "";
  categoria: string = "";
  descricao: string = "";
  data: string = "";
  valor: number = 0;

  indiceParaEditar: number = -1;

  // --- Moeda ---
  moedaAtual: 'BRL' | 'EUR' = 'BRL';
  taxaEurPorReal: number = 0.16;

  alternarMoeda(): void {
    this.moedaAtual = this.moedaAtual === 'BRL' ? 'EUR' : 'BRL';
  }

  get simboloMoeda(): string {
    return this.moedaAtual === 'BRL' ? 'R$' : '€';
  }

  converter(valorEmReal: number): number {
    return this.moedaAtual === 'BRL' ? valorEmReal : valorEmReal * this.taxaEurPorReal;
  }

  // --- Filtros ---
  filtroPesquisa: string = "";
  filtroTipo: string = "Todos";
  filtroCategoria: string = "Todas";
  filtroDataInicio: string = "";
  filtroDataFim: string = "";

  private paraData(dataBr: string): Date | null {
    if (!dataBr) return null;
    const partes = dataBr.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes.map(p => parseInt(p, 10));
    return new Date(ano, mes - 1, dia);
  }

  get indicesFiltrados(): number[] {
    return this.descricoes
      .map((_, i) => i)
      .filter(i => {
        if (this.filtroPesquisa.trim() !== "") {
          const termo = this.filtroPesquisa.trim().toLowerCase();
          if (!this.descricoes[i].toLowerCase().includes(termo)) {
            return false;
          }
        }

        if (this.filtroTipo !== "Todos" && this.tipos[i] !== this.filtroTipo) {
          return false;
        }

        if (this.filtroCategoria !== "Todas" && this.categorias[i] !== this.filtroCategoria) {
          return false;
        }

        const dataLinha = this.paraData(this.datas[i]);
        if (this.filtroDataInicio && dataLinha) {
          const inicio = new Date(this.filtroDataInicio);
          if (dataLinha < inicio) return false;
        }
        if (this.filtroDataFim && dataLinha) {
          const fim = new Date(this.filtroDataFim);
          if (dataLinha > fim) return false;
        }

        return true;
      });
  }

  limparFiltros(): void {
    this.filtroPesquisa = "";
    this.filtroTipo = "Todos";
    this.filtroCategoria = "Todas";
    this.filtroDataInicio = "";
    this.filtroDataFim = "";
  }

  // --- Modal ---
  modalAberto: boolean = false;

  abrirModalCadastro(): void {
    this.indiceParaEditar = -1;
    this.tipo = "";
    this.categoria = "";
    this.descricao = "";
    this.data = "";
    this.valor = 0;
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  get totalReceitas(): number {
    let total = 0;
    for (const i of this.indicesFiltrados) {
      if (this.tipos[i] === 'Receita') {
        total += this.valores[i];
      }
    }
    return this.converter(total);
  }

  get totalDespesas(): number {
    let total = 0;
    for (const i of this.indicesFiltrados) {
      if (this.tipos[i] === 'Despesa') {
        total += this.valores[i];
      }
    }
    return this.converter(total);
  }

  get saldoLiquido(): number {
    return this.totalReceitas - this.totalDespesas;
  }

  get totalTransacoes(): number {
    return this.indicesFiltrados.length;
  }

  calcularSaldoAte(limiteIndex: number): number {
    let saldo = 0;
    for (let i = this.valores.length - 1; i >= limiteIndex; i--) {
      if (this.tipos[i] === 'Receita') {
        saldo += this.valores[i];
      } else if (this.tipos[i] === 'Despesa') {
        saldo -= this.valores[i];
      }
    }
    return this.converter(saldo);
  }

  salvar(): void {
    if (this.tipo.trim() === "") {
      this.messageService.add({ severity: 'error', summary: 'Campo Obrigatório', detail: 'Selecione o tipo da transação.' });
      return;
    }

    if (this.categoria.trim() === "") {
      this.messageService.add({ severity: 'error', summary: 'Campo Obrigatório', detail: 'Selecione a categoria.' });
      return;
    }

    if (this.descricao.trim() === "") {
      this.messageService.add({ severity: 'error', summary: 'Campo Obrigatório', detail: 'Informe uma descrição.' });
      return;
    }

    if (this.data === "") {
      this.messageService.add({ severity: 'error', summary: 'Campo Obrigatório', detail: 'Informe a data.' });
      return;
    }

    if (this.valor <= 0) {
      this.messageService.add({ severity: 'error', summary: 'Valor Inválido', detail: 'Informe um valor válido.' });
      return;
    }

    if (this.indiceParaEditar == -1) {
      this.cadastrar();
    } else {
      this.editar();
    }

    this.tipo = "";
    this.categoria = "";
    this.descricao = "";
    this.data = "";
    this.valor = 0;

    this.fecharModal();
  }

  cadastrar(): void {
    this.tipos.unshift(this.tipo);
    this.categorias.unshift(this.categoria);
    this.descricoes.unshift(this.descricao);
    this.datas.unshift(this.data);
    this.valores.unshift(this.valor);

    this.messageService.add({
      severity: 'success',
      summary: 'Transação Registrada',
      detail: `${this.descricao} foi cadastrada com sucesso.`,
    });
  }

  editar(): void {
    const descricaoAnterior = this.descricoes[this.indiceParaEditar];

    this.tipos[this.indiceParaEditar] = this.tipo;
    this.categorias[this.indiceParaEditar] = this.categoria;
    this.descricoes[this.indiceParaEditar] = this.descricao;
    this.datas[this.indiceParaEditar] = this.data;
    this.valores[this.indiceParaEditar] = this.valor;

    this.indiceParaEditar = -1;

    this.messageService.add({
      severity: 'success',
      summary: 'Transação Editada',
      detail: `${descricaoAnterior} foi atualizada com sucesso.`,
    });
  }

  apagar(descricaoTransacao: string): void {
    let indice = this.descricoes.indexOf(descricaoTransacao);
    if (indice !== -1) {
      this.tipos.splice(indice, 1);
      this.categorias.splice(indice, 1);
      this.descricoes.splice(indice, 1);
      this.datas.splice(indice, 1);
      this.valores.splice(indice, 1);

      this.messageService.add({
        severity: 'warn',
        summary: 'Transação Excluída',
        detail: `${descricaoTransacao} foi removida.`,
      });
    }
  }

  preencherCamposParaEditar(
    tipo: string,
    categoria: string,
    descricao: string,
    data: string,
    valor: number
  ): void {
    this.indiceParaEditar = this.descricoes.indexOf(descricao);

    this.tipo = tipo;
    this.categoria = categoria;
    this.descricao = descricao;
    this.data = data;
    this.valor = valor;

    this.modalAberto = true;
  }
}