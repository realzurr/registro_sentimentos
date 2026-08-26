# Plano de Arquitetura e Implementação — Sistema de Registros das Virtudes Realizadas

Status: aprovado para execução por agentes autônomos, em fases sequenciais.
Fontes de verdade: `analise/requisitos.txt` (escopo) e este plano (arquitetura e passos).
Nenhuma linha de código existe ainda; este documento orienta a geração da aplicação.

---

## 1. Visão geral

Sistema web de acompanhamento diário dos participantes: registro das **virtudes realizadas**
(qual virtude, se em **grupo** ou **individual**), da **emoção do momento**, dos **sintomas**
e de uma **descrição livre das ações/percepções**, com data e hora automáticas.
Estrutura de telas/fluxo espelhada no app Registro de Microdoses; **única integração externa:
autenticação via Supabase** (idêntica à Virtologia). Todo o banco de dados é **local**
(SQLite), como no microdoses. Sem qualquer registro de consumo (ml/microdoses).

Objetivo final: dados organizados para análise posterior dos participantes (listagem,
painel admin e exportação CSV).

---

## 2. Referências locais verificadas (somente leitura — NUNCA modificar)

| Projeto | Caminho | O que extrair |
|---|---|---|
| Registro de Microdoses | `/home/renato/projetos/microdoses` | Modelo de dados/fluxo e **banco local**: `server_ok.py` (rotas, `init_db`/`ensure_column` para criar/migrar o SQLite na inicialização, regra de edição de 5 min `_pode_modificar`, export CSV), templates em `templates/` (index, meus-registros, dashboard, painel_admin, error) |
| Virtologia | `/home/renato/projetos/virtologia` | Autenticação e stack: `src/lib/supabase/{client,server,server-fn}.ts`, `src/lib/auth.ts`, `src/components/{auth-provider,protected-route,admin-route}.tsx`, `src/routes/{login,auth.callback,__root}.tsx`, `src/lib/virtues.ts` (lista de virtudes), config raiz (vite/tsconfig/eslint/tailwind/shadcn) |

Stack da Virtologia (a replicar): TanStack Start, React 19, Vite 7, Tailwind 4,
shadcn/Radix, TypeScript, zod, Bun como gerenciador de pacotes.

---

## 3. Decisões arquiteturais

1. **Stack = mesma da Virtologia (TanStack Start + React 19 + Vite + Tailwind 4 + shadcn).**
   Motivo: o requisito de autenticação é "a mesma da Virtologia"; essa auth está acoplada à
   stack (`@supabase/ssr`, AuthProvider, server functions). Copiar a stack inteira permite
   reutilizar a auth sem reescrever nada. Alternativa rejeitada: Flask como o microdoses —
   exigiria reinventar a verificação de sessão Supabase, sem código de referência.
2. **Mesmo projeto Supabase da Virtologia, apenas para autenticação.** "Mesma autenticação"
   interpretado como mesmas contas: participantes já cadastrados entram sem novo cadastro.
   As credenciais estão em `/home/renato/projetos/virtologia/.env` (copiar valores para o
   `.env` local; nunca versioná-los). O Supabase NÃO é usado para dados da aplicação.
3. **Banco de dados 100% local em SQLite** (arquivo único na raiz do projeto, ex. `virtudes.db`,
   fora do git), espelhando o padrão do microdoses: criado/migrado automaticamente na
   inicialização (`init_db` + colunas incrementais via `ensure_column`), acesso direto por
   SQL dentro das server functions. Alternativa rejeitada: Postgres do Supabase — o requisito
   exige base local; SQLite é o padrão já operado pelo microdoses.
4. **Isolamento por usuário na camada de aplicação** (SQLite não tem RLS): toda server function
   valida o token Supabase (`getUserFromToken`) e filtra/insere sempre pelo `user_id`
   derivado do token — JAMAIS confiar em `user_id` recebido do cliente.
5. **Papel admin**: tabela local `papeis` (user_id → role), semeada com o e-mail inicial
   admin (padrão `INITIAL_ADMIN_EMAIL` da Virtologia, configurável por env); verificação
   feita no servidor após validar o token. Não usar a tabela `admin_users` nem a service role.
6. **Regra de negócio herdada do microdoses**: registro editável/apagável apenas dentro de
   **5 minutos** após a criação (`_pode_modificar(date_str, minutos=5)`), validado no servidor.
7. **Lista de virtudes**: reutilizar a lista/slugs de `src/lib/virtues.ts` da Virtologia para
   manter consistência entre sistemas (o campo registra qual virtude foi trabalhada).

---

## 4. Modelo de dados (SQLite local)

Arquivo `virtudes.db` na raiz do projeto (ignorado no git). Criado/migrado na inicialização
da aplicação, sem passo manual. Duas tabelas:

**`registros_virtudes`**

| Campo | Tipo SQLite | Regras |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `user_id` | TEXT NOT NULL | uuid do usuário Supabase (sem FK — auth é externa) |
| `data_registro` | TEXT NOT NULL | ISO `YYYY-MM-DDTHH:mm` (ou `YYYY-MM-DD`); data e hora em que a prática/evento foi realizada |
| `criado_em` | TEXT NOT NULL | ISO datetime; data+hora do registro (requisito) |
| `atualizado_em` | TEXT | atualizado a cada edição |
| `virtude` | TEXT NOT NULL | valor da lista de virtudes da Virtologia |
| `modalidade` | TEXT NOT NULL | `grupo` ou `individual` (CHECK constraint) |
| `emocao_atual` | TEXT NOT NULL | emoção no momento do registro |
| `sintomas_atuais` | TEXT | sintomas do momento (opcional) |
| `descricao_acoes` | TEXT NOT NULL | descrição livre das ações/percepções |

Índices: `user_id` e `data_registro`.

**`papeis`**

| Campo | Tipo SQLite | Regras |
|---|---|---|
| `user_id` | TEXT PK | uuid do usuário Supabase |
| `role` | TEXT NOT NULL | `admin` ou `user`; semeada com o admin inicial por env |

Correspondência com `registros` do microdoses: `user`→`user_id`; `date`→`data_registro`;
`emocao_atual`←`emotions`; `sintomas_atuais`←`conditions`; `descricao_acoes`←`comentario_livre`;
`dose_ml` e campos de medicamentos → **removidos** (fora de escopo).

Segurança (sem RLS — enforcement obrigatório no código): toda query/insert/update/delete
de registros parte de uma server function que valida o token Supabase e aplica
`WHERE user_id = <id do token>`; leitura de todos os registros apenas em server fn admin
(tabela `papeis`). Nenhum dado sensível sai do servidor sem essa filtragem.

Migração incremental: seguir o padrão `ensure_column` do microdoses para evoluir o schema
sem quebrar o banco existente dos usuários.

---

## 5. Telas e rotas (mapa microdoses → agenda)

| Microdoses (referência) | Agenda (rota) | Conteúdo |
|---|---|---|
| `/` + `index.html` | `/` (protegida) | Formulário do registro do dia: virtude, modalidade, emoção, sintomas, descrição; data/hora automáticas; botão salvar → server fn insert |
| `/meus-registros` | `/meus-registros` (protegida) | Lista dos próprios registros; editar/excluir somente dentro da janela de 5 min |
| `/dashboard`, `/dashboard-emocoes` | `/acompanhamento` (protegida) | Resumo simplestico do próprio histórico (fase opcional, após núcleo) |
| `/painel-admin` + `/registros` | `/admin` (guard admin) | Todos os registros, filtros por período/participante, export CSV |
| `/exportar-csv` | ação em `/admin` | Export CSV dos registros filtrados |
| `/login`, `/cadastro`, `/logout` | `/login`, `/auth/callback`, logout no menu | Auth Supabase copiada da Virtologia (sem tela de cadastro: contas vêm da Virtologia) |

---

## 6. Fora de escopo (não implementar, não copiar)

- Qualquer registro de dose/ml/microdoses (`dose_ml`, `ALLOWED_DOSES`) — proibido por requisito.
- Campos `medicamentos`, `medicamentos_detalhes`, `alerta_processado`, APIs de aniversários
  (`aniversarios.db`) e integração WhatsApp do microdoses.
- Rate limiting/CSRF manuais do Flask — desnecessários: sessão/token Supabase + server functions.
- Tela de cadastro próprio e recuperação de senha (gerenciados pelo Supabase/Virtologia).

---

## 7. Plano de execução (fases sequenciais, cada uma com aceite verificável)

### Fase 0 — Fundações
- Criar projeto TanStack Start na raiz, copiando da Virtologia: `vite.config.ts`,
  `tsconfig.json`, `eslint.config.js`, `components.json`, `.prettierrc`, `src/styles.css`,
  componentes shadcn necessários (`src/components/ui/*`) — sem código de domínio.
- `package.json` com scripts: `dev` (vite dev), `build` (vite build), `preview`, `lint`.
  Ignorar scripts específicos de Windows da Virtologia (`build:node`).
- **Aceite**: `bun install && bun run dev` sobe a app; `bun run lint` sem erros.

### Fase 1 — Autenticação (cópia fiel da Virtologia)
- Copiar `src/lib/auth.ts`, `src/lib/supabase/{client,server,server-fn}.ts` (sem `admin.ts`
  — service role não será usada), `src/components/{auth-provider,protected-route,admin-route}.tsx`,
  rotas `login.tsx` e `auth.callback.tsx`; montar `__root.tsx` com AuthProvider.
  Adaptar `requireAdminFromToken`: validar token com `getUserFromToken` e consultar a tabela
  local `papeis` em vez de `admin_users` no Supabase.
- Criar `.env` com `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `INITIAL_ADMIN_EMAIL`
  (valores da Virtologia / do admin) e `.env.example` documentando-as.
  Adicionar `.env` ao `.gitignore`.
- **Aceite**: login com conta real do projeto funciona; logout funciona; rota protegida sem
  sessão redireciona para `/login`; erros de login exibidos em PT-BR (errorMap do AuthProvider).

### Fase 2 — Banco de dados local
- Implementar módulo de acesso ao SQLite (ex. `better-sqlite3`) com `init_db()` executado na
  inicialização do servidor: cria `virtudes.db`, tabelas `registros_virtudes` e `papeis`,
  índices, CHECK de `modalidade` e seed do admin inicial conforme Seção 4.
- **Aceite**: subir a app cria o arquivo `virtudes.db` com as duas tabelas; reiniciar não
  duplica nem apaga dados; arquivo listado no `.gitignore`.

### Fase 3 — Registro do dia (`/`)
- Formulário com validação zod; server function de insert usando o `user_id` do token validado;
  `data_registro` = hoje (editável), `criado_em` automático no servidor.
- **Aceite**: salvar grava linha com `user_id` correto; campos obrigatórios bloqueiam envio;
  mensagem de sucesso/erro em PT-BR.

### Fase 4 — Meus registros
- Listagem ordenada por data desc; editar/excluir via server fns que recusam operações fora
  da janela de 5 min (`criado_em`/`atualizado_em`) e filtram sempre pelo `user_id` do token.
- **Aceite**: usuário A não enxerga nem altera registros de B (filtro por token validado,
  testado com 2 contas); edição além de 5 min retorna erro amigável.

### Fase 5 — Painel admin + CSV
- Guard `AdminRoute` + server fn que valida token e confere `role='admin'` na tabela local
  `papeis`; tabela de todos os registros com filtros (período, participante, virtude,
  modalidade); export CSV.
- **Aceite**: não-admin recebe negação; admin lista tudo; CSV baixa com todas as colunas.

### Fase 6 — Qualidade e encerramento
- `bun run lint`, checagem de tipos e `bun run build` passando; revisão de textos em PT-BR;
  README mínimo (como rodar, variáveis de ambiente); atualização deste plano se decisões mudarem.
- **Aceite global**: busca por "dose"/"ml" no código não retorna resíduos de domínio;
  fluxo completo login → registrar → listar → admin → CSV executável manualmente.

Ordem obrigatória: Fases 0→6. Nenhuma fase começa sem o aceite da anterior.
Verificação mínima ao fim de cada fase: `bun run lint && bun run build`.

---

## 8. Convenções para agentes autônomos

- Domínio e UI em português; nomes de campos conforme Seção 4 (sem variações).
- Projetos de referência são **somente leitura**; toda escrita acontece em `/home/renato/projetos/agenda`.
- Supabase é EXCLUSIVAMENTE autenticação: nenhum dado de aplicação vai para lá.
  Todo dado vive no SQLite local; toda query de registro filtra pelo `user_id` derivado
  do token validado — nunca pelo valor vindo do cliente.
- Nunca commitar `.env`, chaves, tokens ou `virtudes.db`; service role do Supabase não é usada.
- Preferir copiar padrões dos projetos de referência a inventar estruturas novas
  (auth/UI da Virtologia; banco/fluxo do microdoses).
- Conflito entre documentos: `requisitos.txt` > este plano > intuição. Persistindo a dúvida,
  perguntar ao usuário antes de implementar.
