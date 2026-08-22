import { CadastroComponent } from './pages/cadastro/cadastro';
import { HomeComponent } from './pages/home/home';
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/cadastro/login/login';
import { RedefinirSenha } from './pages/cadastro/redefinir-senha/redefinir-senha';
import { TimesComponent } from './pages/times/times';
import { JogadoresComponent } from './pages/jogadores/jogadores';
import { JogadorDetalhesComponent } from './pages/jogador-detalhes/jogador-detalhes';
import { ElencoComponent } from './pages/elenco/elenco';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'cadastro', component: CadastroComponent },
  { path: 'login', component: LoginComponent },
  { path: 'redefinir-senha', component: RedefinirSenha },
  { path: 'times', component: TimesComponent },
  { path: 'jogadores', component: JogadoresComponent },
  { path: 'jogadores/:id', component: JogadorDetalhesComponent },
  { path: 'elenco', component: ElencoComponent },
  { path: '**', redirectTo: '' }
];