#!/usr/bin/env bash
# Recria o banco `futdb` numa máquina nova. Roda no Git Bash (Windows), Linux e macOS.
#
#   bash scripts/recriar-banco.sh                 restaura o backup futdb/db/futdb.dump (minutos)
#   bash scripts/recriar-banco.sh --do-zero       schema + importações pelo backend (horas)
#   bash scripts/recriar-banco.sh --substituir    apaga um futdb que já tenha dados antes de recriar
#   bash scripts/recriar-banco.sh --gerar-backup  atualiza futdb/db/futdb.dump a partir do banco local
#
# Conexão: a mesma do README (localhost:5433, postgres/admin). Para outra, exporte
# PGHOST, PGPORT, PGUSER e PGPASSWORD antes de rodar (e BANCO para outro nome).
#
# O backup é a cópia exata do banco, inclusive fotos, escudos e uniformes, que do
# zero são baixados de novo do sofifa e do TheSportsDB (e o que tiver saído do ar
# por lá não volta). Prefira o backup; o --do-zero é para quando ele não servir.
set -euo pipefail

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5433}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-admin}"
BANCO="${BANCO:-futdb}"
API="${API:-http://localhost:8081/api}"

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP="$RAIZ/futdb/db/futdb.dump"
SCHEMA="$RAIZ/futdb/db/schema.sql"

modo=backup
substituir=false
for arg in "$@"; do
  case "$arg" in
    --do-zero) modo=zero ;;
    --gerar-backup) modo=gerar ;;
    --substituir) substituir=true ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Opção desconhecida: $arg (veja --help)"; exit 1 ;;
  esac
done

# --- ferramentas do PostgreSQL ----------------------------------------------
# No Windows o instalador não põe o bin no PATH; procura na pasta padrão.
if ! command -v psql >/dev/null 2>&1; then
  for d in "/c/Program Files/PostgreSQL/"*/bin "/Library/PostgreSQL/"*/bin /usr/lib/postgresql/*/bin; do
    if [ -x "$d/psql" ] || [ -x "$d/psql.exe" ]; then PATH="$d:$PATH"; fi
  done
fi
command -v psql >/dev/null 2>&1 || { echo "psql não encontrado. Instale o PostgreSQL ou ponha o bin dele no PATH."; exit 1; }

sql() { psql -X -q -v ON_ERROR_STOP=1 -tA "$@"; }

if ! sql -d postgres -c 'select 1' >/dev/null 2>&1; then
  echo "Não conectei no PostgreSQL em $PGHOST:$PGPORT como $PGUSER. Ele está rodando? A senha confere?"
  exit 1
fi

# --- gerar backup -------------------------------------------------------------
if [ "$modo" = gerar ]; then
  pg_dump -d "$BANCO" -Fc -Z 9 --no-owner --no-privileges -f "$BACKUP"
  echo "Backup atualizado: futdb/db/futdb.dump ($(du -h "$BACKUP" | cut -f1))."
  echo "Faça commit dele para a outra máquina receber."
  exit 0
fi

# --- (re)cria o banco vazio ---------------------------------------------------
existe=$(sql -d postgres -c "select 1 from pg_database where datname = '$BANCO'")
if [ "$existe" = 1 ]; then
  tem_dados=$(sql -d "$BANCO" -c "select exists (select 1 from information_schema.tables where table_schema = 'public')")
  if [ "$tem_dados" = t ] && [ "$substituir" != true ]; then
    echo "O banco $BANCO já existe e tem tabelas. Para apagar e recriar, rode de novo com --substituir."
    exit 1
  fi
  echo "Apagando o banco $BANCO..."
  dropdb --force "$BANCO"
fi
createdb "$BANCO"

# --- restaurar o backup -------------------------------------------------------
if [ "$modo" = backup ]; then
  [ -f "$BACKUP" ] || { echo "Sem futdb/db/futdb.dump. Use --do-zero, ou gere o backup na máquina de origem com --gerar-backup."; exit 1; }
  echo "Restaurando futdb/db/futdb.dump..."
  pg_restore -d "$BANCO" --no-owner --no-privileges "$BACKUP"
  for t in liga nacao clube jogador jogador_historico uniforme; do
    printf '  %-18s %s\n' "$t" "$(sql -d "$BANCO" -c "select count(*) from $t")"
  done
  echo "Pronto. Suba o backend (cd futdb && ./mvnw spring-boot:run) e o site (npm start)."
  exit 0
fi

# --- do zero: schema + importações pelo backend -------------------------------
echo "Criando as tabelas..."
sql -d "$BANCO" -f "$SCHEMA" >/dev/null

if ! curl -s -o /dev/null "$API/times?size=1"; then
  echo
  echo "As tabelas foram criadas, mas as importações rodam pelo backend, e ele não respondeu em $API."
  echo "Suba o backend em outro terminal (cd futdb && ./mvnw spring-boot:run) e rode de novo:"
  echo "  bash scripts/recriar-banco.sh --do-zero --substituir"
  exit 1
fi

post() { echo "POST $1"; curl -sS -f -X POST "$API$1"; echo; }
post /import/csv
post /jogadores/historico/importar
post /jogadores/historico/importar-edicao-atual

# Rodam em segundo plano no backend. Os uniformes dependem dos escudos, então
# só começam quando não houver mais clube com detalhe pendente.
post /import/fotos
post /import/detalhes-times
echo "Esperando escudos e estádios (TheSportsDB, ~30 min)..."
anterior=""
parado=0
while :; do
  pend=$(curl -s "$API/import/status-detalhes-times" | sed -n 's/.*"pendentesDetalhes":\([0-9]*\).*/\1/p')
  if [ "$pend" != "$anterior" ]; then
    echo "  clubes pendentes: ${pend:-?}"
    anterior="$pend"
    parado=0
  else
    parado=$((parado + 1))
  fi
  [ "$pend" = 0 ] && break
  # Parou de cair por 5 min: os que sobraram não existem no TheSportsDB.
  if [ "$parado" -ge 5 ]; then
    echo "  ${pend:-?} clube(s) sem detalhe no TheSportsDB; seguindo."
    break
  fi
  sleep 60
done
post /import/uniformes
echo "Uniformes iniciados (~30 s por clube, várias horas). Acompanhe pelo log do backend."
