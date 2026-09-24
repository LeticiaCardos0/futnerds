/**
 * Ambiente de DESENVOLVIMENTO — usado pelo `ng serve`.
 *
 * Aponta direto para o futdb na 8081 (a 8080 fica livre para o Apache/XAMPP).
 * Se mudar a porta, ajuste também server.port em
 * futdb/src/main/resources/application.properties.
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081/api',
};
