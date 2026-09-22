import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { obterCaminhoLogoLiga, temLogoLiga } from '../../shared/ligas.util';
import { API_URL } from '../../shared/api.util';

export interface Liga {
  id: number;
  nome: string;
  paisNome: string;
  paisCodigo: string;
  quantidadeClubes: number;
}

// ATUALIZADO para FC 27: o backend deixa de fornecer um league_id estável
// (o dataset novo não tem essa coluna), então a ordem de destaque e os
// apelidos agora são chaveados pelo NOME da liga, que é o único dado
// que se mantém igual entre imports.
const ORDEM_FAMA: { [nomeLiga: string]: number } = {
  'Premier League': 1,
  'LALIGA EA SPORTS': 2,
  'Serie A Enilive': 3,
  'Bundesliga': 4,
  'Ligue 1 McDonald\'s': 5,
  'Liga do Brasil': 6,
  'Liga Portugal': 7,
  'Eredivisie': 8,
  'Trendyol Süper Lig': 9,
  'LPF': 10,
  'ROSHN Saudi League': 11,
  'MLS': 12,
  'EFL Championship': 13,
  '1A Pro League': 14,
  'Brack Super League': 15,
  'Primera Division': 16,
  'Serie BKT': 17,
  'LALIGA HYPERMOTION': 18,
  'Bundesliga 2': 19,
  'Ligue 2 BKT': 20,
  'EFL League One': 21,
  'Liga Colombia': 22,
  'Ekstraklasa': 23,
  'CSL': 24,
  'K League 1': 25,
  'Isuzu UTE A League': 26,
  'EFL League Two': 27,
  'Eliteserien': 28,
  'Allsvenskan': 29,
  'SUPERLIGA': 30,
  'Liga Hrvatska': 31,
  'Česká Liga': 32,
  'Magyar Liga': 33,
  'Finnliiga': 34,
  'SSE Airtricity Men\'s Premier Division': 35,
  'Liga Azerbaijan': 36,
  '3. Liga': 37,
  'Ö. Bundesliga': 38,
  // Continentais aparecem logo no topo por serem competições de destaque
  'CONMEBOL Libertadores': 0,
  'CONMEBOL Sudamericana': 0.5,
};

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

const APELIDOS_LIGA: { [nomeLiga: string]: string[] } = {
  'Liga do Brasil': ['brasileirao', 'brasileirão', 'brasileiro'],
  'Premier League': ['inglês', 'ingles'],
  'LALIGA EA SPORTS': ['espanhol', 'la liga'],
  'Serie A Enilive': ['italiano', 'calcio', 'serie a'],
  'Bundesliga': ['alemao', 'alemão'],
  'Ligue 1 McDonald\'s': ['frances', 'francês', 'ligue 1'],
  'LPF': ['argentino'],
  'CONMEBOL Libertadores': ['libertadores'],
  'CONMEBOL Sudamericana': ['sudamericana', 'sul-americana'],
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
    this.http.get<Liga[]>(`${API_URL}/ligas`).subscribe(dados => {
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
          const apelidos = APELIDOS_LIGA[liga.nome] || [];
          const bateApelido = apelidos.some(a => {
            const apelidoNormalizado = this.removerAcentos(a.toLowerCase());
            return apelidoNormalizado.includes(termo) || termo.includes(apelidoNormalizado);
          });
          return nomeNormalizado.includes(termo) || bateApelido;
        });

    return [...filtradas].sort((a, b) => (ORDEM_FAMA[a.nome] ?? 999) - (ORDEM_FAMA[b.nome] ?? 999));
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
    const mapaNomes: { [nomeLiga: string]: string } = {
      'Liga do Brasil': 'Brasileirão',
      'Bundesliga 2': 'Bundesliga 2',
      'Ö. Bundesliga': 'Bundesliga (Áustria)',
      'CONMEBOL Libertadores': 'Libertadores',
      'CONMEBOL Sudamericana': 'Sul-Americana',
    };

    return mapaNomes[liga.nome] || liga.nome;
  }

  // Se a liga está na lista das 28 sem escudo salvo, nem tenta carregar
  // imagem — evita 404 e já mostra o fallback de troféu direto.
  temLogo(liga: Liga): boolean {
    return temLogoLiga(liga.nome);
  }

  obterCaminhoLogo(liga: Liga): string {
    return obterCaminhoLogoLiga(liga.nome);
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