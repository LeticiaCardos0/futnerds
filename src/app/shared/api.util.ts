// Endereço do backend futdb (pasta futdb/ na raiz do projeto).
// Roda na 8081 porque a 8080 fica livre para o Apache/XAMPP.
// Se mudar a porta, ajuste também server.port em futdb/src/main/resources/application.properties.
export const API_URL = 'http://localhost:8081/api';

export function urlImagemJogador(id: number | undefined): string {
  return `${API_URL}/imagem/jogador/${id}`;
}
