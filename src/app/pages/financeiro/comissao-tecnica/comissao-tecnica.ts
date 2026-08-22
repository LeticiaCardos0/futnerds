import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export interface MembroComissao {
  id: number;
  nome: string;
  funcao: string;
  categoria: 'Treinador' | 'Preparador Físico' | 'Fisioterapeuta' | 'Analista' | 'Diretoria' | 'Outro';
  contato: string;
  dataContratacao: string;
  fotoUrl: string | null;
  nivel: number;
  pais: string;
  especialidades: string;
  salario: number;
  valorContratacao: number;
}

@Component({
  selector: 'app-comissao-tecnica',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './comissao-tecnica.html',
  styleUrl: './comissao-tecnica.css',
})
export class ComissaoTecnicaComponent {
  constructor(private messageService: MessageService) {}

  // ---------- Estado geral ----------
  modalAberto = false;
  modoEdicao = false;
  membroEmEdicaoId: number | null = null;

  filtroCategoria: string = 'Todas as Funções';
  termoPesquisa = '';

  moedaAtual: 'BRL' | 'EUR' = 'BRL';
  taxaCambio = 5.35;

  // ---------- Dados ----------
  membros: MembroComissao[] = [
    {
      id: 1,
      nome: 'Pep Guardiola',
      funcao: 'Treinador Principal',
      categoria: 'Treinador',
      contato: 'pep.guardiola@futnerds.com',
      dataContratacao: '2024-01-15',
      fotoUrl: 'https://s2-oglobo.glbimg.com/O3TkZgbOet5051zCM-Dtsc8dEjg=/0x0:7190x4793/888x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_da025474c0c44edd99332dddb09cabe8/internal_photos/bs/2025/9/0/0INi60SVAtu83FpM7qGQ/111459250-philadelphia-pennsylvania-june-18-manchester-city-manager-pep-guardiola-looks-on-pri.jpg',
      nivel: 5,
      pais: 'Espanha',
      especialidades: 'Táticas Ofensivas, Liderança',
      salario: 1000000,
      valorContratacao: 5000000,
    },
    {
      id: 2,
      nome: 'Carlos Mendes',
      funcao: 'Treinador de Goleiros',
      categoria: 'Treinador',
      contato: 'carlos.mendes@futnerds.com',
      dataContratacao: '2023-08-01',
      fotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4QctrVwpegCaLspLusFesd_k7SbW2YOXH9wR3OON5A0oDJmZ3ZfQuCeeB&s=10',
      nivel: 3,
      pais: 'Portugal',
      especialidades: 'Reflexos, Posicionamento e Saída de Bola',
      salario: 95000,
      valorContratacao: 500000,
    },
    {
      id: 3,
      nome: 'Michael Carter',
      funcao: 'Analista de Desempenho',
      categoria: 'Analista',
      contato: 'michael.carter@futnerds.com',
      dataContratacao: '2024-03-10',
      fotoUrl: 'https://www.portalcomunicare.com.br/wp-content/uploads/2023/07/analistas-futebol-1.jpg',
      nivel: 5,
      pais: 'Inglaterra',
      especialidades: 'Scout, Estatísticas e Análise Tática',
      salario: 220000,
      valorContratacao: 1200000,
    },
  ];

  private proximoId = 4;

  // ---------- Formulário (modal) ----------
  form: Partial<MembroComissao> = this.formVazio();
  previewFoto: string | null = null;

  private formVazio(): Partial<MembroComissao> {
    return {
      nome: '',
      funcao: '',
      categoria: 'Treinador',
      contato: '',
      dataContratacao: '',
      fotoUrl: null,
      nivel: 3,
      pais: '',
      especialidades: '',
      salario: 0,
      valorContratacao: 0,
    };
  }

  // ---------- Utilitário de estrelas ----------
  estrelas(nivel: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < nivel ? 1 : 0));
  }

  // ---------- Getters computados ----------
  get categoriasDisponiveis(): string[] {
    return ['Treinador', 'Preparador Físico', 'Fisioterapeuta', 'Analista', 'Diretoria', 'Outro'];
  }

  get membrosFiltrados(): MembroComissao[] {
    let lista = this.membros;

    if (this.filtroCategoria !== 'Todas as Funções') {
      lista = lista.filter((m) => m.categoria === this.filtroCategoria);
    }

    if (this.termoPesquisa.trim()) {
      const termo = this.termoPesquisa.trim().toLowerCase();
      lista = lista.filter(
        (m) =>
          m.nome.toLowerCase().includes(termo) ||
          m.funcao.toLowerCase().includes(termo) ||
          m.contato.toLowerCase().includes(termo)
      );
    }

    return lista;
  }

  get totalMembros(): number {
    return this.membros.length;
  }

  get totalTreinadores(): number {
    return this.membros.filter((m) => m.categoria === 'Treinador').length;
  }

  get totalSuporte(): number {
    return this.membros.filter((m) => m.categoria !== 'Treinador').length;
  }

  // ---------- Upload de imagem ----------
  aoSelecionarImagem(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const arquivo = input.files[0];

    if (!arquivo.type.startsWith('image/')) {
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result as string;
      this.previewFoto = resultado;
      this.form.fotoUrl = resultado;
    };
    leitor.readAsDataURL(arquivo);
  }

  removerImagem(): void {
    this.previewFoto = null;
    this.form.fotoUrl = null;
  }

  // ---------- CRUD ----------
  abrirModal(): void {
    this.modoEdicao = false;
    this.membroEmEdicaoId = null;
    this.form = this.formVazio();
    this.previewFoto = null;
    this.modalAberto = true;
  }

  abrirModalEdicao(membro: MembroComissao): void {
    this.modoEdicao = true;
    this.membroEmEdicaoId = membro.id;
    this.form = { ...membro };
    this.previewFoto = membro.fotoUrl;
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.form = this.formVazio();
    this.previewFoto = null;
    this.modoEdicao = false;
    this.membroEmEdicaoId = null;
  }

  salvarMembro(): void {
    if (!this.form.nome || !this.form.nome.trim() || !this.form.funcao || !this.form.funcao.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Campos Obrigatórios',
        detail: 'Preencha nome e função para continuar.',
      });
      return;
    }

    if (this.modoEdicao && this.membroEmEdicaoId !== null) {
      const index = this.membros.findIndex((m) => m.id === this.membroEmEdicaoId);
      if (index !== -1) {
        this.membros[index] = {
          ...this.membros[index],
          nome: this.form.nome!,
          funcao: this.form.funcao!,
          categoria: (this.form.categoria as MembroComissao['categoria']) || 'Outro',
          contato: this.form.contato || '',
          dataContratacao: this.form.dataContratacao || '',
          fotoUrl: this.form.fotoUrl ?? null,
          nivel: Number(this.form.nivel) || 0,
          pais: this.form.pais || '',
          especialidades: this.form.especialidades || '',
          salario: Number(this.form.salario) || 0,
          valorContratacao: Number(this.form.valorContratacao) || 0,
        };
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Membro Atualizado',
        detail: `${this.form.nome} foi atualizado com sucesso.`,
      });
    } else {
      const novoMembro: MembroComissao = {
        id: this.proximoId++,
        nome: this.form.nome!,
        funcao: this.form.funcao!,
        categoria: (this.form.categoria as MembroComissao['categoria']) || 'Outro',
        contato: this.form.contato || '',
        dataContratacao: this.form.dataContratacao || '',
        fotoUrl: this.form.fotoUrl ?? null,
        nivel: Number(this.form.nivel) || 0,
        pais: this.form.pais || '',
        especialidades: this.form.especialidades || '',
        salario: Number(this.form.salario) || 0,
        valorContratacao: Number(this.form.valorContratacao) || 0,
      };
      this.membros.push(novoMembro);
      this.messageService.add({
        severity: 'success',
        summary: 'Membro Cadastrado',
        detail: `${novoMembro.nome} foi adicionado à comissão técnica.`,
      });
    }

    this.fecharModal();
  }

  excluirMembro(membro: MembroComissao): void {
    this.membros = this.membros.filter((m) => m.id !== membro.id);
    this.messageService.add({
      severity: 'warn',
      summary: 'Membro Excluído',
      detail: `${membro.nome} foi removido da comissão técnica.`,
    });
  }

  // ---------- Utilitários de exibição ----------
  iniciais(nome: string): string {
    const partes = nome.trim().split(' ').filter(Boolean);
    if (partes.length === 0) return '';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  corCategoria(categoria: string): string {
    const mapa: Record<string, string> = {
      Treinador: 'text-purple-500',
      'Preparador Físico': 'text-orange-400',
      Fisioterapeuta: 'text-info',
      Analista: 'text-warning',
      Diretoria: 'text-accent',
      Outro: 'text-fg-muted',
    };
    return mapa[categoria] || 'text-fg-muted';
  }

  alternarMoeda(): void {
    this.moedaAtual = this.moedaAtual === 'BRL' ? 'EUR' : 'BRL';
  }

  converter(valorEmBRL: number): number {
    return this.moedaAtual === 'EUR' ? valorEmBRL / this.taxaCambio : valorEmBRL;
  }

  formatarMoeda(valorEmBRL: number): string {
    const valorConvertido = this.converter(valorEmBRL || 0);
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
}