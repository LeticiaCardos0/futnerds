import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-redefinir-senha',
  imports: [RouterLink],
  templateUrl: './redefinir-senha.html',
  styleUrl: './redefinir-senha.css',
})
export class RedefinirSenha {
mostrarSenha = false;
mostrarConfirmacao = false;

toggleSenha() {
  this.mostrarSenha = !this.mostrarSenha;
}

toggleConfirmacao() {
  this.mostrarConfirmacao = !this.mostrarConfirmacao;
}
}
