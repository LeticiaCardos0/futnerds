import { environment } from '../../environments/environment';

/**
 * Endereço do backend futdb.
 *
 * Vem do environment, e não fixo aqui: com 'http://localhost:8081' no código,
 * qualquer deploy subia com todas as telas vazias — Nações, Times, Jogadores e
 * os mapas de liga. Em dev aponta para a 8081; em produção é '/api', relativo.
 * Ver src/environments/.
 */
export const API_URL = environment.apiUrl;

export function urlImagemJogador(id: number | undefined): string {
  return `${API_URL}/imagem/jogador/${id}`;
}
