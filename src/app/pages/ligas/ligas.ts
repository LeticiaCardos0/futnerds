import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { obterCaminhoLogoLiga } from '../../shared/ligas.util';

export interface Liga {
  id: number;
  nome: string;
  paisNome: string;
  paisCodigo: string;
  quantidadeClubes: number;
}

const ORDEM_FAMA: { [id: number]: number } = {
  13: 1,    // Premier League
  53: 2,    // La Liga
  31: 3,    // Serie A
  19: 4,    // Bundesliga
  16: 5,    // Ligue 1
  7: 6,     // Série A / Brasileirão
  308: 7,   // Primeira Liga
  10: 8,    // Eredivisie
  68: 9,    // Süper Lig
  353: 10,  // Liga Profesional de Fútbol (Argentina)
  2013: 11, // Pro League (Arábia Saudita)
  39: 12,   // Major League Soccer
  14: 13,   // Championship
  4: 14,    // Pro League (Bélgica)
  63: 15,   // Super League (Suíça)
  335: 16,  // Primera Division (Uruguai)
  32: 17,   // Serie B
  54: 18,   // La Liga 2
  20: 19,   // 2. Bundesliga
  17: 20,   // Ligue 2
  60: 21,   // League One
  336: 22,  // Categoría Primera A
  66: 23,   // Ekstraklasa
  189: 24,  // Super League (Grécia)
  2012: 25, // Super League (China)
  83: 26,   // K League 1
  351: 27,  // A-League Men
  61: 28,   // League Two
  41: 29,   // Eliteserien
  56: 30,   // Allsvenskan
  1: 31,    // Superliga (Dinamarca)
  317: 32,  // Hrvatska nogometna liga
  319: 33,  // První liga
  64: 34,   // Nemzeti Bajnokság I
  330: 35,  // Liga I
  318: 36,  // 1. Division
  322: 37,  // Veikkausliiga
  65: 38,   // Premier Division (Irlanda)
  313: 39,  // Premyer Liqa
  2017: 40, // División de Fútbol Profesional
  337: 41,  // División Profesional
  2020: 42, // Liga 1 (Indonésia)
  2076: 43, // 3. Liga
  80: 44,   // Bundesliga (Áustria)
};

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

const APELIDOS_LIGA: { [id: number]: string[] } = {
  7: ['brasileirao', 'brasileirão', 'brasileiro'],
  13: ['premier', 'inglês', 'ingles'],
  53: ['espanhol'],
  31: ['italiano', 'calcio'],
  19: ['alemao', 'alemão'],
  16: ['frances', 'francês'],
  353: ['argentino'],
};

@Component({
  selector: 'app-ligas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ligas.html'
})
export class LigasComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ligas: Liga[] = [];
  termoBusca: string = '';

  paginaAtual: number = 1;
  itensPorPagina: number = 20;

  ngOnInit(): void {
    this.http.get<Liga[]>('http://localhost:8080/api/ligas').subscribe(dados => {
      this.ligas = dados;
      this.cdr.markForCheck();
    });
  }

  get ligasFiltradas(): Liga[] {
    const termo = this.removerAcentos(this.termoBusca.toLowerCase().trim());
    const filtradas = !termo
      ? this.ligas
      : this.ligas.filter(liga => {
          const nomeNormalizado = this.removerAcentos(liga.nome.toLowerCase());
          const apelidos = APELIDOS_LIGA[liga.id] || [];
          const bateApelido = apelidos.some(a => {
            const apelidoNormalizado = this.removerAcentos(a.toLowerCase());
            return apelidoNormalizado.includes(termo) || termo.includes(apelidoNormalizado);
          });
          return nomeNormalizado.includes(termo) || bateApelido;
        });

    return [...filtradas].sort((a, b) => (ORDEM_FAMA[a.id] ?? 999) - (ORDEM_FAMA[b.id] ?? 999));
  }

  private removerAcentos(texto: string): string {
    return texto.normalize('NFD').replace(DIACRITICOS, '');
  }

  get ligasPaginadas(): Liga[] {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    return this.ligasFiltradas.slice(inicio, inicio + this.itensPorPagina);
  }

  get totalItens(): number {
    return this.ligasFiltradas.length;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalItens / this.itensPorPagina));
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

  aoFiltrar(): void {
    this.paginaAtual = 1;
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaAtual = pagina;
  }

  paginaAnterior(): void {
    this.irParaPagina(this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.irParaPagina(this.paginaAtual + 1);
  }

  obterNomeExibicao(liga: Liga): string {
    const mapaNomes: { [id: number]: string } = {
      7: 'Brasileirão',
      20: 'Bundesliga 2',
      80: 'Bundesliga (Áustria)',
    };

    return mapaNomes[liga.id] || liga.nome;
  }

  obterCaminhoLogo(liga: Liga): string {
    return obterCaminhoLogoLiga(liga.nome, liga.id);
  }

  verTimes(liga: Liga): void {
    this.router.navigate(['/times'], {
      queryParams: {
        liga: liga.nome,
        ligaExibicao: liga.nome,
        ligaId: liga.id,
        paisCodigo: liga.paisCodigo
      }
    });
  }

  aoErroImagem(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    if (img.src.endsWith('.png')) {
      img.src = img.src.replace('.png', '.jpeg');
    } else {
      img.style.display = 'none';
      const pai = img.parentElement;
      if (pai && !pai.querySelector('.trofeu-fallback')) {
        const span = document.createElement('span');
        span.className = 'trofeu-fallback text-4xl';
        span.textContent = '🏆';
        pai.appendChild(span);
      }
    }
  }
}
