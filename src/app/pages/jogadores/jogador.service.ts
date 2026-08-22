import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Jogador } from './jogadores';

@Injectable({ providedIn: 'root' })
export class JogadorService {
  private readonly apiUrl = 'http://localhost:8080/api/jogadores';

  constructor(private http: HttpClient) {}

  listar(page: number, size: number, nome?: string, posicao?: string): Observable<{ jogadores: Jogador[]; paginaAtual: number; totalPaginas: number; totalItens: number }> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (nome) params = params.set('nome', nome);
    if (posicao && posicao !== 'Todas') params = params.set('posicao', posicao);
    return this.http.get<any>(this.apiUrl, { params });
  }
}
