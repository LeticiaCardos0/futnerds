import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

// Mesmo valor de CHAVE_ELENCO em jogadores.ts.
// Repetido aqui (em vez de importado) para evitar import circular entre times.ts <-> jogadores.ts.
const CHAVE_ELENCO_LOCALSTORAGE = 'futnerds_elenco';

export interface TimeSelecionado {
  id: number;
  nome: string;
  logo: string;
  orcamento: number;
}

interface Time {
  id: number;
  logo: string;
  nome: string;
  pais: string;
  liga: string;
  orcamento: number;
}

export const CHAVE_TIME_SELECIONADO = 'futnerds_time_selecionado';

@Component({
  selector: 'app-times',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ToastModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './times.html',
  styleUrl: './times.css'
})
export class TimesComponent {
  times: Time[] = [
    { id: 1, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/real_madrid_logo_2dc50f68.png', nome: 'Real Madrid', pais: 'Espanha', liga: 'La Liga', orcamento: 620000000 },
    { id: 2, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/manchester_city_logo_907a8f19.png', nome: 'Manchester City', pais: 'Inglaterra', liga: 'Premier League', orcamento: 580000000 },
    { id: 3, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/paris_saint-germain_logo_c8518fce.png', nome: 'Paris Saint-Germain', pais: 'França', liga: 'Ligue 1', orcamento: 550000000 },
    { id: 4, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/fc_bayern_m_nchen_logo_83457712.png', nome: 'FC Bayern München', pais: 'Alemanha', liga: 'Bundesliga', orcamento: 500000000 },
    { id: 5, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/liverpool_logo_3665bfc1.png', nome: 'Liverpool', pais: 'Inglaterra', liga: 'Premier League', orcamento: 480000000 },
    { id: 6, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/fc_barcelona_logo_e50504f6.png', nome: 'FC Barcelona', pais: 'Espanha', liga: 'La Liga', orcamento: 380000000 },
    { id: 7, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/arsenal_logo_0cc2bfb2.png', nome: 'Arsenal', pais: 'Inglaterra', liga: 'Premier League', orcamento: 420000000 },
    { id: 8, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/athletic_club_logo_ca941d32.png', nome: 'Athletic Club', pais: 'Espanha', liga: 'La Liga', orcamento: 49000000 },
    { id: 9, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/atl_tico_madrid_logo_0fde6fe6.png', nome: 'Atlético Madrid', pais: 'Espanha', liga: 'La Liga', orcamento: 75000000 },
    { id: 10, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/real_betis_balompi__logo_e6ab180a.png', nome: 'Real Betis', pais: 'Espanha', liga: 'La Liga', orcamento: 16000000 },
    { id: 11, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/real_sociedad_logo_eed16fe3.png', nome: 'Real Sociedad', pais: 'Espanha', liga: 'La Liga', orcamento: 16000000 },
    { id: 12, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/sevilla_fc_logo_33aae96c.png', nome: 'Sevilla FC', pais: 'Espanha', liga: 'La Liga', orcamento: 32000000 },
    { id: 13, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/valencia_cf_logo_3c5df904.png', nome: 'Valencia CF', pais: 'Espanha', liga: 'La Liga', orcamento: 38000000 },
    { id: 14, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/villarreal_cf_logo_58a53628.png', nome: 'Villarreal CF', pais: 'Espanha', liga: 'La Liga', orcamento: 35000000 },
    { id: 15, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/aston_villa_logo_7ec24cee.png', nome: 'Aston Villa', pais: 'Inglaterra', liga: 'Premier League', orcamento: 77000000 },
    { id: 16, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/brighton_hove_albion_logo_f687fe9b.png', nome: 'Brighton', pais: 'Inglaterra', liga: 'Premier League', orcamento: 76000000 },
    { id: 17, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/newcastle_united_logo_a41ae5e0.png', nome: 'Newcastle United', pais: 'Inglaterra', liga: 'Premier League', orcamento: 97000000 },
    { id: 18, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/tottenham_hotspur_logo_cf1b4d28.png', nome: 'Tottenham', pais: 'Inglaterra', liga: 'Premier League', orcamento: 127000000 },
    { id: 19, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/west_ham_united_logo_5c699304.png', nome: 'West Ham', pais: 'Inglaterra', liga: 'Premier League', orcamento: 70000000 },
    { id: 20, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/everton_logo_188343e9.png', nome: 'Everton', pais: 'Inglaterra', liga: 'Premier League', orcamento: 40000000 },
    { id: 21, logo: 'https://upload.wikimedia.org/wikipedia/pt/0/0e/LeicesterCity_logo2014.png', nome: 'Leicester City', pais: 'Inglaterra', liga: 'Premier League', orcamento: 60000000 },
    { id: 22, logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663216916845/hhB4oykfDQM9yCvhQGaX3n/wolverhampton_wanderers_logo_eecd6a5e.png', nome: 'Wolverhampton', pais: 'Inglaterra', liga: 'Premier League', orcamento: 53000000 }
  ];

  constructor(
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  selecionarTime(time: Time) {
    const timeSelecionado: TimeSelecionado = {
      id: time.id,
      nome: time.nome,
      logo: time.logo,
      orcamento: time.orcamento
    };

    const dadosTimeAtual = localStorage.getItem(CHAVE_TIME_SELECIONADO);
    const timeAtual: TimeSelecionado | null = dadosTimeAtual ? JSON.parse(dadosTimeAtual) : null;

    const dadosElenco = localStorage.getItem(CHAVE_ELENCO_LOCALSTORAGE);
    const elencoAtual = dadosElenco ? JSON.parse(dadosElenco) : [];

    this.confirmarSelecaoDoTime(timeSelecionado);
  }

  private confirmarSelecaoDoTime(timeSelecionado: TimeSelecionado): void {
    localStorage.setItem(CHAVE_TIME_SELECIONADO, JSON.stringify(timeSelecionado));

    this.messageService.add({
      severity: 'success',
      summary: 'Time selecionado',
      detail: `${timeSelecionado.nome} foi definido como seu time.`
    });
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}