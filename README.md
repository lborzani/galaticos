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

## Deploy (self-hosted)

Containers (`deploy/compose.yml`): **app** (PocketBase servindo API, painel `/_/` e o PWA) → **push** (sidecar, só na
rede interna). O HTTPS vem de um de dois jeitos:

- **Tailscale Funnel** (usado na Pi de casa): sem abrir porta no roteador, URL `https://<maquina>.<tailnet>.ts.net`.
  Na máquina: instalar Tailscale, `sudo tailscale up --operator=$USER`, e habilitar Funnel no admin do Tailscale.
- **Caddy** (`--profile caddy`): Let's Encrypt num domínio próprio; exige portas 80/443 abertas e DNS apontando.

```bash
git clone <repo> galaticos && cd galaticos/deploy
cp .env.example .env            # preencha DOMAIN, SMTP, VAPID (npx web-push generate-vapid-keys) e PUSH_SECRET
docker compose up -d --build                 # + "--profile caddy" se for usar o Caddy
tailscale funnel --bg 8090                   # só no caminho Tailscale
docker compose exec app ./pocketbase superuser upsert voce@exemplo.com 'senha-forte' --dir /pb_data
```

Depois: entre em `https://SEU_DOMINIO/_/`, crie sua conta pelo app e, no painel, mude seu `role` para `admin`.
SMTP, URL e backup são lidos do `.env` **só na primeira subida**; depois ajuste em `/_/` → Settings.

**Atualizar:** `git pull && docker compose up -d --build` (com `--profile caddy` se usar o Caddy). As migrations rodam sozinhas ao iniciar; o app mostra
"Nova versão disponível" para quem estiver com ele aberto.

### Front na Vercel, API na Pi (produção atual)

O PWA sai da Vercel e fala com o PocketBase da Pi (via Funnel) por `VITE_PB_URL`. Sem essa variável o front usa a
mesma origem, como no deploy só com Docker. O PocketBase já libera CORS, e o login (token no localStorage) e o realtime
funcionam entre origens diferentes.

1. Vercel → Add New → Project → importar o repo. `vercel.json` já define o build (`npm run build`), a saída
   (`pocketbase/pb_public`) e o fallback da SPA.
2. Environment Variables: `VITE_PB_URL=https://homeserver.tailb8b7e1.ts.net` (Production e Preview).
3. Settings → Git → Production Branch: a branch que vai para produção.
4. Domínio `galaticos.app.br` (DNS no Registro.br): na Vercel, Settings → Domains → adicionar `galaticos.app.br` e
   `www.galaticos.app.br` (redirecionando para o primeiro). No Registro.br → DNS → Editar zona, criar os registros que
   a Vercel mostrar: `A` em `galaticos.app.br` (IP da Vercel) e `CNAME` em `www` (`…vercel-dns…`). A Vercel emite o
   HTTPS sozinha quando o DNS propagar.
5. Na Pi, em `/_/` → Settings → Application URL: `https://galaticos.app.br`. É ela que vai nos links dos e-mails.

**Ordem ao atualizar:** primeiro a Pi (`docker compose up -d --build`, roda as migrations), depois o push que dispara
a Vercel. Assim o front novo nunca chega antes do backend.

O PWA servido pela Pi (`.ts.net`) continua funcionando, mas é outra origem: quem migrar para a URL da Vercel precisa
entrar de novo e reativar as notificações.

**Backup:** automático todo dia às 04:00, mantendo 14 cópias em `pb_data/backups` (volume `pb_data`). Copie para fora
do servidor regularmente, ou configure S3 em `/_/` → Settings → Backups.

```bash
docker compose cp app:/pb_data/backups ./backups          # baixar os backups do servidor
```

**Restaurar:** em `/_/` → Settings → Backups → *Restore* (o PocketBase reinicia sozinho). Para um backup vindo de fora:
`docker compose cp arquivo.zip app:/pb_data/backups/` e restaure pelo painel.

**Logs:** `docker compose logs -f app` (falhas de push aparecem aqui e em `/_/` → Logs).
