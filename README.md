# Galáticos

PWA de organização dos jogos (React + PocketBase).

## Desenvolvimento

```bash
npm install
npm run pb:install                                   # baixa o binário do PocketBase
docker run -d --name galaticos-mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
set -a; . ./.env.example; set +a                     # SMTP do Mailpit para a 1ª migração
./pocketbase/pocketbase superuser upsert voce@exemplo.com 'senha-forte' --dir pocketbase/pb_data --migrationsDir pocketbase/pb_migrations
npm run pb                                           # API em http://127.0.0.1:8096 (painel em /_/)
npm run dev                                          # app em http://localhost:5173
```

E-mails de desenvolvimento chegam em http://localhost:8025.

**Tornar alguém admin:** painel `/_/` → `users` → campo `role` = `admin`.

## Verificações

```bash
npm test          # integração contra um PocketBase temporário
npm run typecheck
npm run build     # gera o front em pocketbase/pb_public (servido pelo próprio PocketBase)
npm run e2e       # Playwright: build + PocketBase descartável na :8097, Chromium desktop e Pixel 7
```

Primeira vez: `npx playwright install chromium`. Falhas deixam trace em `test-results/` (`npx playwright show-trace <arquivo>`).

## Estrutura

- `src/` — front (Vite, React Router, Tailwind + shadcn/ui)
- `pocketbase/pb_migrations/` — schema e regras de acesso versionados
- `pocketbase/pb_hooks/` — regras de negócio no servidor
- `tests/` — testes de integração da API (Vitest)
- `e2e/` — testes ponta a ponta no navegador (Playwright)
