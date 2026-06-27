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
- Data de entrega.
- Tags/etiquetas editáveis.
- Cards com tamanho fixo.
- Dashboard analítico separado do quadro.
- Métricas por status, prioridade, responsável, tarefas atrasadas e próximas do prazo.
- Fila assíncrona para e-mails.
- Envio real de e-mail via SMTP na criação e alteração de status de tarefas.

## Como Rodar Com Docker

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

Preencha as variáveis, especialmente as de SMTP se quiser testar envio real de e-mail.

Suba os serviços:

```bash
docker compose up --build
```

Acesse:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Para reiniciar apenas o backend depois de alterar variáveis de ambiente:

```bash
docker compose restart backend
```

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

## Payloads Principais

Criar tarefa:

```json
{
  "title": "Implementar dashboard",
  "description": "Criar visão analítica do quadro",
  "priority": "MEDIUM",
  "dueDate": "2026-06-30",
  "responsibleId": 1,
  "tagIds": [1, 2]
}
```

Atualizar tarefa:

```json
{
  "title": "Implementar dashboard",
  "description": "Ajustar métricas",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "dueDate": "2026-06-30",
  "responsibleId": 1,
  "tagIds": [1]
}
```

Criar tag:

```json
{
  "name": "Frontend"
}
```

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
- `MailModule`: fila BullMQ + worker de envio de e-mails via SMTP.

### Frontend

- `AuthScreen`: login, cadastro, sessão e header global.
- `KanbanBoard`: quadro, cards, edição, exclusão, dashboard e integração com APIs.
- `lib/api`: cliente HTTP e funções para auth, tasks, users e tags.
- `components/ui`: componentes visuais reutilizáveis.

## Decisões Técnicas

- **JWT:** usado para proteger rotas privadas de tarefas, tags e usuários.
- **TypeORM com `synchronize`:** mantido para facilitar execução local do case.
- **Docker Compose:** concentra Postgres, Redis, backend e frontend.
- **Volumes de `node_modules`:** evitam sobrescrever dependências instaladas dentro dos containers.
- **BullMQ/Redis:** e-mails rodam fora do fluxo principal da requisição.
- **Nodemailer:** permite envio SMTP real sem depender de serviço proprietário.
- **Drag and drop:** feito com `dnd-kit`, mantendo mudança de status apenas por arrastar.
- **Dashboard no frontend:** métricas derivadas dos dados já carregados do quadro, evitando endpoint extra desnecessário para o escopo atual.
- **Histórico:** registrado somente quando há mudança real de status.

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

## Observações de Docker

Serviços:

- `postgres`: banco PostgreSQL 16.
- `redis`: broker para BullMQ.
- `backend`: NestJS em modo watch.
- `frontend`: Next.js em modo dev com webpack.

Volumes:

- `postgres_data`: persistência do banco.
- `backend_node_modules`: dependências do backend dentro do container.
- `frontend_node_modules`: dependências do frontend dentro do container.

Se instalar novas dependências e o container não reconhecer, atualize o volume:

```bash
docker compose exec -u root backend npm ci
docker compose exec -u root backend chown -R node:node /app/node_modules
docker compose restart backend
```

Para frontend, o mesmo raciocínio:

```bash
docker compose exec -u root frontend npm ci
docker compose exec -u root frontend chown -R node:node /app/node_modules
docker compose restart frontend
```

## Segurança

- Usar senha de app para SMTP.
- Não expor credenciais de e-mail no repositório.

