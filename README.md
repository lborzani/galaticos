# Galáticos

PWA de organização dos jogos (React + PocketBase).

## Desenvolvimento

```bash
npm install
npm run pb:install                                   # baixa o binário do PocketBase
docker run -d --name galaticos-mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
cp .env.example .env                                 # preencha as chaves VAPID e o PUSH_SECRET
./pocketbase/pocketbase superuser upsert voce@exemplo.com 'senha-forte' --dir pocketbase/pb_data --migrationsDir pocketbase/pb_migrations
npm run pb                                           # API em http://127.0.0.1:8096 (painel em /_/)
npm run push                                         # sidecar de Web Push em :8098
npm run dev                                          # app em http://localhost:5173 (hot reload, sem service worker)
```

E-mails de desenvolvimento chegam em http://localhost:8025.

**PWA e notificações** precisam do service worker, que só existe no build: rode `npm run build` e abra
http://127.0.0.1:8096 (servido pelo PocketBase). Para testar no celular é preciso HTTPS (túnel ou o deploy).

### Como o push funciona

`pb_hooks/lib/push.js` decide quem recebe e quando (lembretes 1 h e 5 min antes via cron, vaga liberada na fila,
evento cancelado) e chama o sidecar `push/server.ts`, que só criptografa e entrega (o JS dos hooks não tem ECDH/ES256).
Se o sidecar estiver fora, o aviso vai para o log e a operação segue normalmente.

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
- `push/` — sidecar de Web Push (Node, `web-push`)
- `tests/` — testes de integração da API (Vitest)
- `e2e/` — testes ponta a ponta no navegador (Playwright)
