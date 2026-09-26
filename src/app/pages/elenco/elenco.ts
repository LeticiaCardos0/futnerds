import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TimeSelecionado, CHAVE_TIME_SELECIONADO } from '../selecionar-time/selecionar-time';
import { JogadorElenco, CHAVE_ELENCO } from '../jogadores/jogadores';
import { traduzirPosicao } from '../../shared/posicoes.util';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';

interface SlotFormacao {
  posicao: string; // deve bater com JogadorElenco.posicao
  top: number;      // % de cima para baixo (largura do campo)
  left: number;     // % da esquerda (defesa) para a direita (ataque)
}

interface SlotComJogador extends SlotFormacao {
  jogador: JogadorElenco | null;
}

const FORMACOES: Record<string, SlotFormacao[]> = {
  '4-3-3': [
    { posicao: 'Goleiro', top: 50, left: 6 },
    { posicao: 'Lateral', top: 15, left: 22 },
    { posicao: 'Zagueiro', top: 38, left: 20 },
    { posicao: 'Zagueiro', top: 62, left: 20 },
    { posicao: 'Lateral', top: 85, left: 22 },
    { posicao: 'Meio-Campo', top: 30, left: 45 },
    { posicao: 'Meio-Campo', top: 50, left: 40 },
    { posicao: 'Meio-Campo', top: 70, left: 45 },
    { posicao: 'Ponta', top: 18, left: 75 },
    { posicao: 'Atacante', top: 50, left: 85 },
    { posicao: 'Ponta', top: 82, left: 75 },
  ],
  '4-4-2': [
    { posicao: 'Goleiro', top: 50, left: 6 },
    { posicao: 'Lateral', top: 15, left: 22 },
    { posicao: 'Zagueiro', top: 38, left: 20 },
    { posicao: 'Zagueiro', top: 62, left: 20 },
    { posicao: 'Lateral', top: 85, left: 22 },
    { posicao: 'Ponta', top: 15, left: 50 },
    { posicao: 'Meio-Campo', top: 38, left: 45 },
    { posicao: 'Meio-Campo', top: 62, left: 45 },
    { posicao: 'Ponta', top: 85, left: 50 },
    { posicao: 'Atacante', top: 38, left: 78 },
    { posicao: 'Atacante', top: 62, left: 78 },
  ],
  '3-5-2': [
    { posicao: 'Goleiro', top: 50, left: 6 },
    { posicao: 'Zagueiro', top: 25, left: 20 },
    { posicao: 'Zagueiro', top: 50, left: 18 },
    { posicao: 'Zagueiro', top: 75, left: 20 },
    { posicao: 'Lateral', top: 10, left: 48 },
    { posicao: 'Meio-Campo', top: 32, left: 42 },
    { posicao: 'Meio-Campo', top: 50, left: 38 },
    { posicao: 'Meio-Campo', top: 68, left: 42 },
    { posicao: 'Lateral', top: 90, left: 48 },
    { posicao: 'Atacante', top: 38, left: 80 },
    { posicao: 'Atacante', top: 62, left: 80 },
  ],
  '4-2-3-1': [
    { posicao: 'Goleiro', top: 50, left: 6 },
    { posicao: 'Lateral', top: 15, left: 22 },
    { posicao: 'Zagueiro', top: 38, left: 20 },
    { posicao: 'Zagueiro', top: 62, left: 20 },
    { posicao: 'Lateral', top: 85, left: 22 },
    { posicao: 'Meio-Campo', top: 38, left: 38 },
    { posicao: 'Meio-Campo', top: 62, left: 38 },
    { posicao: 'Ponta', top: 15, left: 60 },
    { posicao: 'Meio-Campo', top: 50, left: 65 },
    { posicao: 'Ponta', top: 85, left: 60 },
    { posicao: 'Atacante', top: 50, left: 85 },
  ],
  '5-3-2': [
    { posicao: 'Goleiro', top: 50, left: 6 },
    { posicao: 'Lateral', top: 10, left: 22 },
    { posicao: 'Zagueiro', top: 32, left: 18 },
    { posicao: 'Zagueiro', top: 50, left: 16 },
    { posicao: 'Zagueiro', top: 68, left: 18 },
    { posicao: 'Lateral', top: 90, left: 22 },
    { posicao: 'Meio-Campo', top: 32, left: 45 },
    { posicao: 'Meio-Campo', top: 50, left: 40 },
    { posicao: 'Meio-Campo', top: 68, left: 45 },
    { posicao: 'Atacante', top: 38, left: 78 },
    { posicao: 'Atacante', top: 62, left: 78 },
  ],
};

@Component({
  selector: 'app-elenco',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialogModule, ToastModule, ButtonModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './elenco.html',
  styleUrl: './elenco.css'
})
export class ElencoComponent implements OnInit {

  traduzirPosicao = traduzirPosicao;

  timeSelecionado: TimeSelecionado | null = null;
  elenco: JogadorElenco[] = [];
  totalGastos: number = 0;

  // ---------- Formação Tática ----------
  formacoesDisponiveis: string[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
  formacaoSelecionada: string = '4-3-3';

get slotsDaFormacao(): SlotComJogador[] {

  const slots = FORMACOES[this.formacaoSelecionada] || [];

  const poolPorPosicao: Record<string, JogadorElenco[]> = {};

  this.elenco.forEach(jogador => {

    if (!poolPorPosicao[jogador.posicao]) {
      poolPorPosicao[jogador.posicao] = [];
    }

    poolPorPosicao[jogador.posicao].push(jogador);

  });

  return slots.map(slot => {

    const jogadoresPosicao = poolPorPosicao[slot.posicao] || [];

    let jogador: JogadorElenco | null = null;

    // procura um titular
    const titular = jogadoresPosicao.find(j => j.titular);

    if (titular) {

      jogador = titular;

      jogadoresPosicao.splice(
        jogadoresPosicao.indexOf(titular),
        1
      );

    } else if (jogadoresPosicao.length) {

      jogador = jogadoresPosicao.shift()!;

    }

    return {
      ...slot,
      jogador
    };
    

  });

  

}
definirTitular(jogador: JogadorElenco): void {

  this.elenco.forEach(j => {

    if (j.posicao === jogador.posicao) {
      j.titular = false;
    }

  });

  jogador.titular = true;

  localStorage.setItem(
    CHAVE_ELENCO,
    JSON.stringify(this.elenco)
  );
  this.messageService.add({
          severity: 'success',
          summary: 'Jogador Titular',
          detail: `${jogador.nome} foi adicionado do elenco titular.`
        });

}

  get titularesEscalados(): number {
    return this.slotsDaFormacao.filter((s) => s.jogador !== null).length;
  }

  selecionarFormacao(formacao: string): void {
    this.formacaoSelecionada = formacao;
  }

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }

  ngOnInit() {
    this.carregarDados();
  }

  private carregarDados(): void {
    const dadosTime = localStorage.getItem(CHAVE_TIME_SELECIONADO);
    this.timeSelecionado = dadosTime ? JSON.parse(dadosTime) : null;

    const dadosElenco = localStorage.getItem(CHAVE_ELENCO);
    this.elenco = dadosElenco ? JSON.parse(dadosElenco) : [];

    this.calcularTotalGastos();
  }

  calcularTotalGastos() {
    this.totalGastos = this.elenco.reduce((total, jogador) => total + jogador.salario, 0);
  }

  removerJogador(jogadorId: number) {
    const jogador = this.elenco.find((j) => j.id === jogadorId);
    if (!jogador) return;

    this.confirmationService.confirm({
      header: 'Remover Jogador',
      message: `Tem certeza que deseja remover <strong>${jogador.nome}</strong> do elenco?`,
      icon: '',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-confirm-dialog-accept',
      rejectButtonStyleClass: 'p-confirm-dialog-reject',
      accept: () => {
        this.elenco = this.elenco.filter((j) => j.id !== jogadorId);
        localStorage.setItem(CHAVE_ELENCO, JSON.stringify(this.elenco));
        this.calcularTotalGastos();

        this.messageService.add({
          severity: 'success',
          summary: 'Jogador removido',
          detail: `${jogador.nome} foi removido do elenco.`
        });
      }
    });
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  limparElenco() {
    this.confirmationService.confirm({
      message: 'Tem certeza que deseja limpar todo o elenco e o time selecionado? Essa ação não pode ser desfeita.',
      header: 'Limpar Time e Elenco',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, limpar tudo',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        localStorage.removeItem(CHAVE_TIME_SELECIONADO);
        localStorage.removeItem(CHAVE_ELENCO);
        this.timeSelecionado = null;
        this.elenco = [];
        this.totalGastos = 0;

        this.messageService.add({
          severity: 'warn',
          summary: 'Elenco limpo',
          detail: 'O time e o elenco foram removidos.'
        });
      }
    });
  }
}