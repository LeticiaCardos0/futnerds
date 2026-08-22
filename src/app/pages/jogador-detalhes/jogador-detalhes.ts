import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Jogador } from '../jogadores/jogadores';
import { traduzirPosicao, traduzirPeDominante } from '../../shared/posicoes.util';
import { obterCaminhoIconePlaystyle } from '../../shared/traits.util';

@Component({
  selector: 'app-jogador-detalhes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './jogador-detalhes.html',
  styleUrl: './jogador-detalhes.css'
})
export class JogadorDetalhesComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  jogador: Jogador | null = null;
  abaSelecionada: string = 'informacoes';
  traduzirPosicao = traduzirPosicao;
  traduzirPeDominante = traduzirPeDominante;
  obterCaminhoIconePlaystyle = obterCaminhoIconePlaystyle;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<Jogador>(`http://localhost:8080/api/jogadores/${id}`).subscribe(dados => {
      this.jogador = dados;
      this.cdr.markForCheck();
    });
  }

  selecionarAba(aba: string): void {
    this.abaSelecionada = aba;
  }

  voltar(): void {
    this.router.navigate(['/jogadores']);
  }

  obterTraits(): string[] {
    if (!this.jogador?.traits) return [];
    return this.jogador.traits.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  obterPosicoesAlternativas(): string[] {
    if (!this.jogador?.posicoesAlternativas) return [];
    return this.jogador.posicoesAlternativas.split(',').map(p => p.trim()).filter(p => p);
  }

  private coordenadasPosicoes: { [key: string]: { x: number; y: number } } = {
    GK: { x: 350, y: 460 },
    CB: { x: 350, y: 380 }, LCB: { x: 260, y: 380 }, RCB: { x: 440, y: 380 },
    LB: { x: 100, y: 360 }, RB: { x: 600, y: 360 },
    LWB: { x: 100, y: 300 }, RWB: { x: 600, y: 300 },
    CDM: { x: 350, y: 300 }, LDM: { x: 260, y: 300 }, RDM: { x: 440, y: 300 },
    CM: { x: 350, y: 230 }, LCM: { x: 240, y: 230 }, RCM: { x: 460, y: 230 },
    LM: { x: 100, y: 230 }, RM: { x: 600, y: 230 },
    CAM: { x: 350, y: 160 },
    LW: { x: 120, y: 130 }, RW: { x: 580, y: 130 },
    LF: { x: 260, y: 95 }, RF: { x: 440, y: 95 }, CF: { x: 350, y: 95 },
    ST: { x: 350, y: 70 }
  };

  obterCoordenada(posicao: string): { x: number; y: number } {
    return this.coordenadasPosicoes[posicao?.trim()] || { x: 350, y: 250 };
  }

  formatarValorCompacto(valor: number | undefined): string {
    if (!valor) return '—';
    if (valor >= 1000000) return `€${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `€${(valor / 1000).toFixed(0)}K`;
    return `€${valor}`;
  }
}
