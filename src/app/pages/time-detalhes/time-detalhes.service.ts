import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimeDetalhes } from '../times/times.model';

@Injectable({ providedIn: 'root' })
export class TimeDetalhesService {
  // mesmo padrão do JogadorService — ajuste se sua base tiver outro prefixo
  private readonly apiUrl = 'http://localhost:8080/api/times';

  constructor(private http: HttpClient) {}

  // TODO (backend): criar TimeDetalhesController#buscarPorId retornando o
  // formato de TimeDetalhes (times.model.ts). Ele precisa juntar:
  //  - dados do Time (já existe)
  //  - jogadores do elenco vinculados a esse time (já existe -> Jogador.timeAtual)
  //  - uniformes (novo -> ver lookupequipment.php da TheSportsDB)
  //  - títulos (novo -> fonte ainda a definir)
  buscarPorId(id: number): Observable<TimeDetalhes> {
    return this.http.get<TimeDetalhes>(`${this.apiUrl}/${id}`);
  }
}