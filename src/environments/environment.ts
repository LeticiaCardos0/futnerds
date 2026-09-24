/**
 * Ambiente PADRÃO — é o que vai para o build de produção.
 *
 * `apiUrl` relativo de propósito: em produção o front e o backend ficam atrás
 * do mesmo host, com /api encaminhado ao futdb por proxy reverso. Assim o
 * domínio não precisa estar fixo no código e o mesmo artefato serve qualquer
 * ambiente (staging, produção, preview).
 *
 * No `ng serve` este arquivo é trocado por environment.development.ts
 * (ver fileReplacements em angular.json).
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
