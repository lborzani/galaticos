#!/bin/sh
# PocketBase descartável servindo o build do front, como em produção. Usado pelo webServer do Playwright.
set -eu
cd "$(dirname "$0")/../pocketbase"
DATA=$(mktemp -d)
trap 'rm -rf "$DATA"' EXIT INT TERM
DIRS="--dir $DATA --migrationsDir pb_migrations --hooksDir pb_hooks --publicDir pb_public"
./pocketbase migrate up $DIRS >/dev/null
./pocketbase superuser upsert "$E2E_SU_EMAIL" "$E2E_SU_PASSWORD" $DIRS >/dev/null
./pocketbase serve --http 127.0.0.1:8097 --hooksWatch=false $DIRS
