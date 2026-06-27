# TaskFlow

Aplicação fullstack para gestão de tarefas em quadro Kanban, com autenticação, responsáveis, etiquetas, histórico de movimentações, dashboard analítico e envio assíncrono de e-mails.

## Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, dnd-kit.
- **Backend:** NestJS, TypeScript, TypeORM, JWT, Passport, class-validator.
- **Banco:** PostgreSQL.
- **Fila:** Redis + BullMQ.
- **E-mail:** Nodemailer via SMTP.
- **Infra local:** Docker Compose.

## Funcionalidades

- Cadastro e login com autenticação JWT.
- Cadastro redireciona para login com feedback de sucesso.
- Mensagem de login inválido amigável.
- Quadro Kanban com colunas:
  - A Fazer
  - Em Andamento
  - Em Revisão
  - Concluído
- Criação, edição e exclusão de tarefas.
- Confirmação antes de excluir card.
- Drag and drop para alterar status.
- Histórico de movimentação por tarefa.
- Responsável por tarefa.
- Prioridade por tarefa.
- Título, descrição, responsável, prioridade e data de entrega obrigatórios.
- Tags/etiquetas editáveis.
- Upload opcional de anexos ao criar ou editar tarefas.
- Cards com tamanho fixo.
- Dashboard analítico separado do quadro.
- Métricas por status, prioridade, responsável, tarefas atrasadas e próximas do prazo.
- Filtro por período e fluxo de conclusão ao longo do tempo.
- Fila assíncrona para e-mails com worker separado.
- Envio real de e-mail via SMTP na criação, alteração de status e prazo próximo agendado.

## Atendimento ao Case

| Requisito | Status | Observação |
| --- | --- | --- |
| Login e cadastro de usuários | Feito | Cadastro redireciona para login com feedback de sucesso |
| Autenticação JWT | Feito | Rotas privadas protegidas no backend e sessão usada no frontend |
| Validação de formulários | Feito | Validação no frontend e DTOs com `class-validator` no backend |
| Hash de senha | Feito | Senhas armazenadas com `bcrypt` |
| Kanban com quatro colunas | Feito | A Fazer, Em Andamento, Em Revisão e Concluído |
| Drag and drop de cards | Feito | Mudança de status por arrastar |
| CRUD de cards | Feito | Criação, edição, exclusão e confirmação antes de excluir |
| Modal de edição | Feito | Título, descrição, responsável, prioridade, data, status, tags, anexos e histórico |
| Histórico de movimentações | Feito | Registrado quando o status muda |
| Upload de anexos | Feito | Opcional, com até 5 arquivos por envio |
| Dashboard analítico | Feito | Métricas por status, responsável, atraso, prazo próximo, prioridade e fluxo de conclusão |
| Filtro por período | Feito | Disponível na tela de dados analíticos |
| Fila de e-mail | Feito | Redis + BullMQ + worker separado |
| Notificações por e-mail | Feito | Criação/atribuição, alteração de status e prazo próximo |

## Como Rodar Com Docker

Este é o caminho recomendado para executar o projeto.

Com Docker, o ambiente fica mais previsível porque o projeto já sobe com as versões esperadas de Node.js, PostgreSQL e Redis. Isso reduz problemas comuns de compatibilidade, como versão local do Node diferente da exigida pelo Next.js, PostgreSQL não instalado, Redis desligado ou variáveis apontando para hosts incorretos.

### 1. Pré-requisitos

Instale:

- Docker
- Docker Compose

Confirme se estão disponíveis:

```bash
docker --version
docker compose version
```

### 2. Criar o arquivo de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Para rodar via Docker, mantenha os hosts internos dos serviços:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000

DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=taskflow

REDIS_HOST=redis
REDIS_PORT=6379

JWT_SECRET=change-me-in-production
NEXT_PUBLIC_API_URL=http://localhost:4000
MAIL_WORKER_ENABLED=true

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=TaskFlow
SMTP_FROM_ADDRESS=no-reply@example.com
```

Preencha as variáveis SMTP se quiser testar envio real de e-mail. Para Gmail, use senha de app em `SMTP_PASS`.

### 3. Subir todos os serviços

Na raiz do projeto, execute:

```bash
docker compose up --build
```

Esse comando:

- constrói as imagens do backend e frontend;
- instala as dependências dentro dos containers;
- sobe PostgreSQL;
- sobe Redis;
- sobe o backend NestJS;
- sobe o worker de e-mail;
- sobe o frontend Next.js.

Na primeira execução pode demorar mais por causa da instalação das dependências.

### 4. Acessar a aplicação

Acesse:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### 5. Opcional: Conferir se os containers estão rodando

```bash
docker compose ps
```

Serviços esperados:

- `taskflow-frontend`
- `taskflow-backend`
- `taskflow-mail-worker`
- `taskflow-postgres`
- `taskflow-redis`

### 6. Opcional: Ver logs

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f mail-worker
```

### 7. Opcional: reiniciar serviços após mudar variáveis

Este passo só é necessário se você alterar alguma variável no `.env` depois que os containers já estiverem rodando.

Se você configurou o `.env` antes de executar `docker compose up --build`, pode pular esta etapa.

Quando alterar variáveis de ambiente com os containers em execução, reinicie apenas o serviço afetado:

```bash
docker compose restart backend
docker compose restart frontend
docker compose restart mail-worker
```

Se não souber qual serviço foi afetado, reinicie todos:

```bash
docker compose restart
```

### 8. Parar os containers

```bash
docker compose down
```

Para apagar também os dados persistidos do banco, use:

```bash
docker compose down -v
```

Use `-v` apenas quando quiser resetar o banco local.

### 9. Validar o fluxo principal

Com os serviços no ar:

1. Acesse http://localhost:3000.
2. Crie uma conta.
3. Faça login.
4. Crie tags, se quiser.
5. Crie uma tarefa com título, descrição, responsável, prioridade, data de entrega e, opcionalmente, anexos.
6. Arraste o card entre colunas.
7. Edite o card e confira histórico/anexos.
8. Acesse a tela de dados analíticos.

### 10. Problemas comuns

Se uma dependência nova não aparecer dentro do container, atualize o volume de `node_modules`:

```bash
docker compose exec -u root backend npm ci
docker compose exec -u root backend chown -R node:node /app/node_modules
docker compose restart backend
```

Para frontend:

```bash
docker compose exec -u root frontend npm ci
docker compose exec -u root frontend chown -R node:node /app/node_modules
docker compose restart frontend
```

Se houver conflito de porta, confira se já existe algo usando `3000`, `4000`, `5432` ou `6379`.

Se quiser acompanhar todos os logs juntos:

```bash
docker compose logs -f
```

## Como Rodar Localmente Sem Docker

### 1. Pré-requisitos

Instale na máquina:

- Node.js `>=20.11`
- npm
- PostgreSQL `>=16`
- Redis `>=7`

Confirme as versões:

```bash
node -v
npm -v
psql --version
redis-server --version
```

### 2. Criar o banco PostgreSQL

Acesse o PostgreSQL com um usuário administrador:

```bash
psql -U postgres
```

Crie o banco usado pela aplicação:

```sql
CREATE DATABASE taskflow;
```

Saia do `psql`:

```sql
\q
```

Se o seu PostgreSQL local usa outro usuário ou senha, ajuste `DB_USER` e `DB_PASSWORD` no `.env`.

### 3. Iniciar o Redis

Em um terminal separado, suba o Redis:

```bash
redis-server
```

Em outro terminal, valide:

```bash
redis-cli ping
```

O retorno esperado é:

```text
PONG
```

### 4. Configurar variáveis de ambiente

Crie o `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Para rodar localmente sem Docker, use `localhost` nos serviços:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=taskflow

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=change-me-in-production
NEXT_PUBLIC_API_URL=http://localhost:4000
MAIL_WORKER_ENABLED=true

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=TaskFlow
SMTP_FROM_ADDRESS=no-reply@example.com
```

Para testar e-mail real, preencha as variáveis SMTP. Para Gmail, use senha de app.

### 5. Instalar dependências

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

Volte para a raiz quando terminar:

```bash
cd ..
```

### 6. Rodar o backend

Em um terminal:

```bash
cd backend
npm run start:dev
```

O backend fica em:

```text
http://localhost:4000
```

### 7. Rodar o worker de e-mail

Em outro terminal:

```bash
cd backend
npm run start:worker
```

Esse processo consome a fila BullMQ no Redis e envia os e-mails de forma assíncrona.

### 8. Rodar o frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

Acesse:

```text
http://localhost:3000
```

### 9. Ordem recomendada de execução

Use esta ordem para evitar erro de conexão:

```text
1. PostgreSQL iniciado
2. Redis iniciado
3. Backend: npm run start:dev
4. Worker: npm run start:worker
5. Frontend: npm run dev
```

### 10. Validação rápida

Backend:

```bash
curl http://localhost:4000
```

Retorno esperado:

```text
Hello World!
```

Frontend:

```text
http://localhost:3000
```

Fluxo recomendado para testar:

1. Criar uma conta.
2. Fazer login.
3. Criar tags, se quiser.
4. Criar uma tarefa com título, descrição, responsável, prioridade e data de entrega.
5. Arrastar o card entre colunas.
6. Abrir o modal de edição e conferir histórico.
7. Acessar a aba de dados analíticos.

## Variáveis de Ambiente

Arquivo: `.env`

```env
PORT=4000
FRONTEND_URL=http://localhost:3000

DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=taskflow

REDIS_HOST=redis
REDIS_PORT=6379

JWT_SECRET=change-me-in-production
NEXT_PUBLIC_API_URL=http://localhost:4000
MAIL_WORKER_ENABLED=true

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM_NAME=TaskFlow
SMTP_FROM_ADDRESS=no-reply@example.com
```

Observações:

- Para Gmail, use senha de app em `SMTP_PASS`, não a senha normal da conta.
- `SMTP_FROM_NAME` controla o nome exibido do remetente.
- `SMTP_FROM_ADDRESS` deve ser um endereço autorizado pelo provedor SMTP.
- `MAIL_WORKER_ENABLED=false` é usado no container web para deixar o processamento da fila apenas no `mail-worker`.

## Scripts

Backend:

```bash
cd backend
npm run start:dev
npm run build
npm run lint
npm run test
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## Endpoints

### Autenticação

| Método | Rota | Protegida | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/register` | Não | Cria usuário |
| POST | `/auth/login` | Não | Autentica e retorna JWT |
| GET | `/auth/me` | Sim | Retorna usuário logado |

### Usuários

| Método | Rota | Protegida | Descrição |
| --- | --- | --- | --- |
| GET | `/users` | Sim | Lista usuários para seleção de responsável |

### Tarefas

| Método | Rota | Protegida | Descrição |
| --- | --- | --- | --- |
| POST | `/tasks` | Sim | Cria tarefa |
| GET | `/tasks` | Sim | Lista tarefas com responsável e tags |
| GET | `/tasks/:id` | Sim | Busca tarefa por ID |
| GET | `/tasks/:id/history` | Sim | Lista histórico de status |
| PATCH | `/tasks/:id` | Sim | Atualiza tarefa |
| DELETE | `/tasks/:id` | Sim | Exclui tarefa |

### Tags

| Método | Rota | Protegida | Descrição |
| --- | --- | --- | --- |
| POST | `/tags` | Sim | Cria tag |
| GET | `/tags` | Sim | Lista tags |
| DELETE | `/tags/:id` | Sim | Exclui tag |

## Arquitetura

```text
.
├── backend
│   └── src
│       ├── auth
│       ├── users
│       ├── tasks
│       ├── tags
│       ├── task-history
│       └── mail
├── frontend
│   └── src
│       ├── app
│       ├── components
│       ├── features
│       │   ├── auth
│       │   └── kanban
│       └── lib
└── docker-compose.yml
```

### Backend

- `AuthModule`: cadastro, login, JWT e rota `/auth/me`.
- `UsersModule`: listagem de usuários sanitizados.
- `TasksModule`: CRUD de tarefas, relacionamento com responsável/tags e histórico.
- `TagsModule`: CRUD básico de etiquetas.
- `TaskHistoryModule`: entidade de histórico de status.
- `MailModule`: fila BullMQ e envio de e-mails via SMTP.
- `worker.ts`: processo dedicado para consumir a fila de e-mails.

### Frontend

- `AuthScreen`: login, cadastro, sessão e header global.
- `KanbanBoard`: quadro, cards, edição, exclusão, dashboard e integração com APIs.
- `lib/api`: cliente HTTP e funções para auth, tasks, users e tags.
- `components/ui`: componentes visuais reutilizáveis.

## Decisões Técnicas

- **JWT:** usado para proteger rotas privadas de tarefas, tags e usuários.
- **TypeORM com `synchronize`:** mantido para facilitar a execução do case sem etapa manual de migrations. Em produção, o ideal seria usar migrations versionadas.
- **Docker Compose:** concentra Postgres, Redis, backend, worker de e-mail e frontend. Essa foi a forma recomendada para reduzir incompatibilidades de Node.js, banco, Redis e rede local.
- **Volumes de `node_modules`:** evitam sobrescrever dependências instaladas dentro dos containers.
- **BullMQ/Redis:** e-mails rodam fora do fluxo principal da requisição e são processados pelo `mail-worker`.
- **Nodemailer:** permite envio SMTP real sem depender de serviço proprietário.
- **Drag and drop:** feito com `dnd-kit`, mantendo mudança de status apenas por arrastar. Ordenação manual dentro da coluna ficou fora do escopo final.
- **Dashboard no frontend:** métricas derivadas dos dados já carregados do quadro, com filtro de período e fluxo de conclusão sem endpoint extra para o escopo atual. Para bases maiores, agregações no backend seriam mais adequadas.
- **Histórico:** registrado somente quando há mudança real de status.
- **Upload local em disco:** simplifica a execução do case e funciona bem em ambiente local. Em produção, o ideal seria usar storage externo, como S3 ou equivalente.
- **Anexos servidos por `/uploads`:** facilita o teste local. Em produção, os downloads deveriam passar por rota autenticada.
- **Worker separado:** o processamento de e-mails fica isolado da API HTTP, evitando que envio SMTP bloqueie a resposta ao usuário.

## Limitações e Melhorias Futuras

- Ordenação manual dos cards dentro da coluna ainda não foi implementada; hoje a ordenação vem da API.
- Upload usa armazenamento local em disco; em produção, usar storage externo.
- Anexos são servidos por URL pública local; em produção, proteger download com autenticação.
- O projeto usa `synchronize` do TypeORM para simplificar o case; em produção, substituir por migrations.
- Testes automatizados cobrem backend e serviços principais, mas ainda não há teste E2E completo do fluxo visual no navegador.
- Dashboard é calculado no frontend; para grande volume de dados, criar endpoints analíticos agregados no backend.

## Testes e Build

Validações recomendadas antes da entrega:

```bash
cd backend
npm run lint
npm run build
npm run test
```

```bash
cd frontend
npm run lint
npm run build
```

Com Docker:

```bash
docker compose up --build
```
