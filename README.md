# Futnerds

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Rodando o projeto completo (banco + backend + frontend)

O backend Spring Boot fica em [futdb/](futdb/) (vindo de https://github.com/LeticiaCardos0/futdb) e usa PostgreSQL.

| Peça | Endereço |
|---|---|
| Frontend (Angular) | `http://localhost:4200` |
| Backend (Spring Boot) | `http://localhost:8081` — a 8080 fica livre para o Apache/XAMPP |
| Banco (PostgreSQL 18 local) | `localhost:5433`, banco `futdb`, usuário `postgres` / senha `admin` |

O endereço do backend no frontend fica em [src/app/shared/api.util.ts](src/app/shared/api.util.ts); a porta e o banco do backend, em [futdb/src/main/resources/application.properties](futdb/src/main/resources/application.properties).

1. **Backend** (Java 21+): `cd futdb && ./mvnw spring-boot:run`
2. **Frontend**: `npm ci --legacy-peer-deps` (só na primeira vez) e depois `npm start`

### Recriar o banco do zero

1. Criar o banco e as tabelas:
   ```bash
   createdb -U postgres -h localhost -p 5433 futdb
   psql -U postgres -h localhost -p 5433 -d futdb -f futdb/db/schema.sql
   ```
2. Com o backend rodando, importar os CSVs de [futdb/dados/](futdb/dados/):
   ```bash
   curl -X POST http://localhost:8081/api/import/csv
   curl -X POST http://localhost:8081/api/jogadores/historico/importar
   curl -X POST http://localhost:8081/api/jogadores/historico/importar-edicao-atual
   ```
3. Imagens (rodam em segundo plano; acompanhe pelo log do backend):
   ```bash
   curl -X POST http://localhost:8081/api/import/fotos            # fotos dos jogadores (CDN do sofifa, ~6 min)
   curl -X POST http://localhost:8081/api/import/detalhes-times   # escudos e estádios (TheSportsDB, ~30 min)
   curl -X POST http://localhost:8081/api/import/uniformes        # uniformes, só depois dos escudos (~30s por clube, várias horas)
   ```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
