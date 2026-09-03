import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { obterCaminhoLogoLiga } from '../../shared/ligas.util';

export interface Time {
  id: number;
  nome: string;
  escudoUrl: string;
  ligaNome: string;
  overallMedio: number;
  quantidadeJogadores: number;
  valorElenco: number;
  idadeMedia: number;
}

@Component({
  selector: 'app-times',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './times.html'
})
export class TimesComponent implements OnInit {
  obterCaminhoLogoLiga = obterCaminhoLogoLiga;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  times: Time[] = [];
  termoBusca: string = '';
  filtroLiga: string | null = null;
  filtroPais: string | null = null;
  filtroLigaExibicao: string | null = null;
  filtroPaisCodigo: string | null = null;
  filtroLigaId: number | null = null;

  paginaAtual: number = 1;
  totalPaginas: number = 1;
  totalItens: number = 0;

  private termoBuscaSubject = new Subject<string>();

  ngOnInit(): void {
    this.termoBuscaSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.paginaAtual = 1;
      this.carregarTimes();
    });

    this.route.queryParams.subscribe(params => {
      this.filtroLiga = params['liga'] || null;
      this.filtroPais = params['pais'] || null;
      this.filtroLigaExibicao = params['ligaExibicao'] || null;
      this.filtroPaisCodigo = params['paisCodigo'] || null;
      this.filtroLigaId = params['ligaId'] ? Number(params['ligaId']) : null;
      this.paginaAtual = 1;
      this.carregarTimes();
    });
  }

  carregarTimes(): void {
    const params: any = { page: this.paginaAtual - 1, size: 30 };
    if (this.termoBusca) params.nome = this.termoBusca;
    if (this.filtroLiga) params.liga = this.filtroLiga;
    if (this.filtroPais) params.pais = this.filtroPais;

    this.http.get<any>('http://localhost:8080/api/times', { params }).subscribe(resultado => {
      this.times = resultado.times;
      this.totalPaginas = resultado.totalPaginas;
      this.totalItens = resultado.totalItens;
      this.cdr.markForCheck();
    });
  }

  aoFiltrar(): void {
    this.termoBuscaSubject.next(this.termoBusca);
  }

  limparFiltroOrigem(): void {
    this.router.navigate(['/times']);
  }

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
    this.carregarTimes();
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  obterEstrelas(overallMedio: number): number {
    if (overallMedio >= 90) return 5;
    if (overallMedio >= 85) return 4;
    if (overallMedio >= 78) return 3;
    if (overallMedio >= 70) return 2;
    return 1;
  }

  obterArrayEstrelas(): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatarValorCompacto(valor: number): string {
    if (!valor) return '—';
    if (valor >= 1000000) return `€${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `€${(valor / 1000).toFixed(0)}K`;
    return `€${valor}`;
  }

  aoErroEscudo(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    img.style.display = 'none';
    const pai = img.parentElement;
    if (pai && !pai.querySelector('.escudo-fallback')) {
      const icone = document.createElement('i');
      icone.className = 'escudo-fallback fas fa-shield-alt text-green-700 text-xl';
      pai.appendChild(icone);
    }
  }
}
