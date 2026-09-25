import { CadastroComponent } from './pages/cadastro/cadastro';
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/cadastro/login/login';
import { RedefinirSenha } from './pages/cadastro/redefinir-senha/redefinir-senha';
import { TimesComponent } from './pages/times/times';
import { SelecionarTimeComponent } from './pages/selecionar-time/selecionar-time';
import { JogadoresComponent } from './pages/jogadores/jogadores';
import { ElencoComponent } from './pages/elenco/elenco';
import { NacoesComponent } from './pages/nacoes/nacoes';
import { LigasComponent } from './pages/ligas/ligas';
import { HomeComponent } from './pages/home/home';
import { JogadorDetalhesComponent } from './pages/jogador-detalhes/jogador-detalhes';
import { TimeDetalhesComponent } from './pages/time-detalhes/time-detalhes';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'login', component: LoginComponent },
  { path: 'redefinir-senha', component: RedefinirSenha },
  { path: 'times', component: TimesComponent },
  { path: 'times/:id', component: TimeDetalhesComponent },
  { path: 'selecionar-time', component: SelecionarTimeComponent },
  { path: 'jogadores', component: JogadoresComponent },
  { path: 'jogadores/:id', component: JogadorDetalhesComponent },
  { path: 'nacoes', component: NacoesComponent },
  { path: 'ligas', component: LigasComponent },
  // loadComponent (e não `component`) de propósito: é a única rota que puxa o
  // maplibre-gl, e carregar sob demanda evita ~800 kB no bundle inicial de
  // todas as outras telas. É o único ponto do projeto com lazy loading.
  // semFooter: o mapa ocupa a tela inteira (mapa e painéis são `fixed`), e o
  // footer do shell só servia para criar rolagem e cobrir o mapa. Ver App.
  {
    path: 'ligas/:ligaId',
    loadComponent: () =>
      import('./pages/ligas/liga-mapa/liga-mapa').then((m) => m.LigaMapaPageComponent),
    data: { semFooter: true },
  },
  { path: 'elenco', component: ElencoComponent },
  { path: '**', redirectTo: '' }
];