# Agenda de Virtudes

Sistema de registros diários de virtudes praticadas — tracking de virtudes para o programa Virtologia.

## Stack

- **Frontend/Server**: TanStack Start + React 19 + Vite 7 + Tailwind 4
- **UI**: shadcn/ui (Radix Primitives)
- **Auth**: Supabase (apenas autenticação)
- **Banco**: SQLite local (`node:sqlite`, `DatabaseSync`)
- **Runtime**: Node.js 20+ / Bun 1.4+
- **Deploy**: Nitro (`node-server` preset) + systemd + nginx

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Bun | 1.4+ | `curl -fsSL https://bun.sh/install \| bash` |
| Node.js | 20+ | Via script de setup ou `nvm` |

## Setup local

```bash
# 1. Clonar o repositório
git clone <repo-url> agenda-virtudes
cd agenda-virtudes

# 2. Instalar dependências
bun install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com seus valores (ver seção Variáveis de ambiente)

# 4. Rodar o servidor de desenvolvimento
bun run dev
```

O servidor de desenvolvimento inicia em **http://localhost:5003**.

## Variáveis de ambiente

| Variável | Descrição | Onde usar |
|---|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `.env` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública/anon do Supabase | `.env` |
| `VITE_INITIAL_ADMIN_EMAIL` | Email que recebe papel admin automaticamente | `.env` |

Exemplo de `.env`:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
VITE_INITIAL_ADMIN_EMAIL=admin@email.com
```

> As 3 variáveis usam prefixo `VITE_` e são expostas ao bundle do browser (client-side). Não coloque chaves secretas aqui — o Supabase neste projeto é auth-only; todos os dados ficam em SQLite local.

## Comandos disponíveis

| Comando | Descrição |
|---|---|
| `bun run dev` | Servidor de desenvolvimento (porta 5003) |
| `bun run build` | Build de produção (saída em `.output/`) |
| `bun run preview` | Visualizar build de produção |
| `bun run lint` | ESLint + Prettier |
| `bun run typecheck` | TypeScript (noEmit) |
| `bun run test` | Vitest (unit + integration) |
| `bun run test:e2e` | Playwright (E2E) |
| `bun run test:watch` | Vitest em modo watch |
| `bun run test:coverage` | Vitest com coverage (v8) |

## Estrutura do projeto

```
agenda-virtudes/
├── public/                  # Assets estáticos
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/              # shadcn/ui components
│   │   ├── site-chrome.tsx  # Layout shell (nav + menu)
│   │   ├── auth-provider.tsx
│   │   ├── protected-route.tsx
│   │   └── error-boundary.tsx
│   ├── lib/
│   │   ├── api/             # Server functions (TanStack)
│   │   │   ├── registros.server.ts
│   │   │   ├── admin.server.ts
│   │   │   └── admin-users.server.ts
│   │   ├── supabase/        # Clientes Supabase
│   │   │   ├── client.ts    # Browser client
│   │   │   └── server.ts    # Server client
│   │   ├── db.server.ts     # SQLite CRUD (server-only)
│   │   ├── csv.ts           # Exportação CSV
│   │   ├── format.ts        # Formatação (datas, texto)
│   │   ├── date.ts          # Utilitários de data
│   │   ├── admin-email.ts   # Verificação de admin
│   │   ├── auth.ts          # Auth helpers
│   │   ├── constants.ts     # Constantes (janela de edição)
│   │   └── virtues-list.ts  # Lista das 32 virtudes
│   ├── routes/
│   │   ├── __root.tsx       # Root layout
│   │   ├── index.tsx        # Formulário de registro
│   │   ├── login.tsx        # Página de login
│   │   ├── meus-registros.tsx  # Lista de registros do usuário
│   │   ├── admin.tsx        # Painel administrativo
│   │   └── auth.callback.tsx   # Callback do Supabase
│   └── server.ts            # Entry point do Nitro
├── tests/
│   ├── unit/                # 7 arquivos de teste unitário
│   ├── integration/         # 3 arquivos de teste de integração
│   ├── e2e/                 # 1 arquivo Playwright (5 testes)
│   ├── fixtures/            # Dados de teste
│   ├── helpers/             # Setup e mocks
│   └── config/              # Configuração de testes
├── scripts/                 # Scripts de deploy (Ubuntu 24)
│   ├── setup-server.sh      # Setup inicial do servidor
│   ├── deploy.sh            # Deploy completo (build + server)
│   ├── update.sh            # Atualização (re-deploy)
│   ├── env.sh               # Configurar variáveis no servidor
│   └── backup.sh            # Backup do SQLite
├── .env.example             # Template de variáveis de ambiente
├── vite.config.ts           # Configuração Vite + TanStack Start
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## Deploy em servidor Ubuntu 24.04

### Visão geral

O deploy usa:
- **Nitro** (`node-server` preset) para o build de produção
- **systemd** para gerenciar o processo Node.js
- **nginx** como reverse proxy (SSL, cache de assets)
- **Certbot** para SSL Let's Encrypt
- **Backup automático** do SQLite via cron

### Arquitetura

```
Internet → nginx (443/HTTPS) → Node.js app (127.0.0.1:3000)
                                      ↓
                                 virtudes.db (SQLite)
```

### Deploy rápido (resumo)

```bash
# No servidor Ubuntu 24.04 (root ou sudo):
curl -fsSL https://bun.sh/install | bash
bun install
cp .env.example .env   # Configurar variáveis
scripts/setup-server.sh # Instala nginx, certbot, configura firewall
scripts/deploy.sh       # Build + deploy + start
```

### Passo a passo detalhado

Leia o guia completo em `scripts/SETUP.md`.

Resumo dos scripts:

| Script | Quando usar | O que faz |
|---|---|---|
| `scripts/setup-server.sh` | 1ª vez no servidor | Instala Node, Bun, nginx, certbot, firewall UFW, cria usuário `deploy` |
| `scripts/env.sh` | 1ª vez ou atualizar vars | Configura variáveis de ambiente no `/var/lib/agenda/.env` |
| `scripts/deploy.sh` | Toda atualização | Build de produção, copia para `/var/lib/agenda/`, reinicia serviço |
| `scripts/backup.sh` | Cron diário | Faz backup do `virtudes.db` para `/var/backups/agenda/` |
| `scripts/update.sh` | Atualização rápida | Pull + deploy (atalho para git pull + deploy.sh) |

### Diretórios no servidor

```
/var/lib/agenda/              # Diretório da aplicação (dados persistentes)
├── .env                      # Variáveis de ambiente (secreto)
├── virtudes.db               # Banco SQLite (dados do app)
├── virtudes.db-shm           # SQLite WAL shared memory
├── virtudes.db-wal           # SQLite WAL journal
└── current/                  # Symlink para o build mais recente
    └── .output/              # Build do Nitro
        ├── public/           # Assets estáticos (CSS, JS)
        └── server/index.mjs  # Entry point do servidor

/var/backups/agenda/          # Backups diários do SQLite (últimos 30 dias)
/etc/nginx/sites-available/agenda  # Configuração nginx
/etc/systemd/system/agenda.service # Serviço systemd
```

### Comandos úteis no servidor

```bash
# Status do serviço
sudo systemctl status agenda

# Logs em tempo real
sudo journalctl -u agenda -f

# Reiniciar manualmente
sudo systemctl restart agenda

# Backup manual
sudo /home/deploy/agenda-virtudes/scripts/backup.sh

# Verificar SSL
sudo certbot certificates
```

## Arquitetura

- **Auth via Supabase**: OAuth/.magic-link via Supabase (mesmo projeto da Virtologia). Só auth — nenhum dado de aplicação vai para o Supabase.
- **Dados locais em SQLite**: Tudo fica em `virtudes.db` no servidor. Criado automaticamente no 1º acesso.
- **Janela de edição de 5 minutos**: Registros só podem ser editados/excluídos nos primeiros 5 minutos após criação.
- **Papel admin local**: Tabela `papeis` no SQLite. O email definido em `VITE_INITIAL_ADMIN_EMAIL` recebe papel admin automaticamente.

## Referências

- [TanStack Start](https://tanstack.com/start)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Nitro](https://nitro.unjs.io)
