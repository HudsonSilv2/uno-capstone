# Projeto UNO - Backend API

API backend para o jogo UNO, desenvolvida em Node.js com TypeScript, Express e Sequelize.

## Visão Geral

Este projeto implementa o backend da primeira fase do jogo UNO, incluindo:
- Gerenciamento de usuários (Players)
- Gerenciamento de partidas (Games)
- Gerenciamento de cartões (Cards) do baralho
- Estrutura preparada para participantes e pontuação

## Stack Tecnológica

- **Runtime**: Node.js
- **Linguagem**: TypeScript
- **Framework HTTP**: Express.js
- **ORM**: Sequelize
- **Banco de Dados**: PostgreSQL
- **Desenvolvimento**: ts-node-dev
- **Containerização do banco**: Docker Compose

## Requisitos

- Node.js (versão 16+)
- npm
- Docker e Docker Compose (para subir o PostgreSQL localmente)

### Instalação de Dependências

```bash
npm install
```

## Configuração do Ambiente

O projeto usa PostgreSQL como banco de dados. Para que todo o time rode exatamente o mesmo ambiente, o banco é provisionado via Docker Compose — não é necessário instalar o PostgreSQL manualmente na máquina.

### 1. Variáveis de Ambiente

Copie o arquivo de exemplo e ajuste se necessário:

```bash
cp .env.example .env
```

O `.env.example` já vem com valores padrão prontos para desenvolvimento local:

```
PORT=3000

DB_HOST=localhost
DB_PORT=5433
DB_NAME=uno_game
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:5173
```

**Nota sobre `CORS_ORIGIN`:** o front-end roda em outra origem (o servidor de desenvolvimento do Vite), então o navegador só consegue chamar a API se essa origem estiver liberada. A variável aceita uma lista separada por vírgula; sem ela, `http://localhost:5173` e `http://localhost:4173` já são liberados por padrão.

**Nota:** a porta padrão do PostgreSQL no container é mapeada para `5433` no host (em vez da porta padrão `5432`) para evitar conflito com uma instalação nativa de PostgreSQL que já esteja rodando na sua máquina. Se a `5433` também estiver ocupada na sua máquina, altere `DB_PORT` no `.env` livremente — o `docker-compose.yml` respeita essa variável.

O arquivo `.env` nunca deve ser commitado (já está no `.gitignore`), pois pode conter credenciais específicas do seu ambiente.

### 2. Subir o Banco de Dados (PostgreSQL via Docker)

Com o Docker em execução, suba o container do PostgreSQL:

```bash
npm run db:up
```

Isso inicia um container `uno-postgres` com um volume persistente, garantindo que os dados não sejam perdidos entre reinicializações do container.

Para parar o banco:

```bash
npm run db:down
```

### 3. Sincronização das Tabelas

As tabelas são criadas/sincronizadas automaticamente ao iniciar a aplicação (via `sequelize.sync()`), não sendo necessário rodar migrations manualmente nesta fase do projeto.

O `sequelize.sync()` cria tabelas novas, mas não adiciona colunas em tabelas que já existem no banco de quem rodou o projeto antes. Para cobrir essa lacuna sem trazer uma ferramenta de migração, o `src/config/schema-updates.ts` aplica as colunas pendentes de forma idempotente na inicialização. Ao adicionar uma coluna nova a um modelo, registre-a também nesse arquivo.

## Como Executar

1. Suba o banco de dados:
```bash
npm run db:up
```

2. Rode a aplicação em modo desenvolvimento (com hot reload):
```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### Build para Produção

```bash
npm run build
```

### Executar em Produção

```bash
npm start
```

### Front-end

O cliente React fica na pasta `frontend/` e conversa com a API por HTTP. Ele precisa do back-end no ar para funcionar: não há estado de jogo simulado no navegador.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A interface fica em `http://localhost:5173`. O endereço da API vem de `VITE_API_URL` (padrão `http://localhost:3000`).

Fluxo esperado: cadastrar/entrar, criar ou entrar em uma partida, aguardar na sala até dois jogadores, iniciar e jogar na mesa. A API não expõe um canal de tempo real, então a mesa é sincronizada por consulta periódica ao endpoint de estado.

## Padronização de Código

O projeto utiliza **ESLint** e **Prettier** para manter o código consistente entre todos os integrantes do time.

### Ferramentas

| Ferramenta | Função |
|---|---|
| **ESLint** | Análise estática de código (detecta erros, bad practices) |
| **Prettier** | Formatação automática de código (aspas, indentação, etc.) |
| **eslint-config-prettier** | Desativa regras do ESLint que conflitam com o Prettier |
| **@typescript-eslint** | Suporte ao TypeScript no ESLint |

### Scripts Disponíveis

```bash
# Verificar erros de lint
npm run lint

# Corrigir erros de lint automaticamente
npm run lint:fix

# Formatar código com Prettier
npm run format

# Verificar se o código está formatado (útil em CI)
npm run format:check
```

### Regras Aplicadas

- **Aspas simples** (`'string'`)
- **Ponto e vírgula** obrigatório
- **Trailing comma** no estilo ES5
- **Largura máxima** de 100 caracteres por linha
- **Indentação** de 2 espaços
- **`any`** gera aviso (warn) — prefira tipos explícitos
- Variáveis/parâmetros não utilizados geram erro (exceto os prefixados com `_`)

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── components/           # Componentes de interface (UnoCard, Modal, ColorChoice, AppHeader)
│   ├── context/              # Contexto e provider de autenticação (JWT)
│   ├── domain/               # Regras do UNO usadas na tela (validação de jogada, rótulos, pontuação)
│   ├── hooks/                # useAuth e usePolling (sincronização periódica do estado)
│   ├── pages/                # Login, Partidas, Sala de espera, Mesa, Resultado, Perfil, Regras
│   ├── services/             # Cliente HTTP e funções por recurso da API
│   ├── styles/               # Tokens de design e folha de estilo base
│   ├── types/                # Tipos que espelham os contratos da API
│   ├── App.tsx               # Componente raiz e configuração de rotas
│   └── main.tsx              # Ponto de entrada da aplicação
```

### Backend
```
src/
├── config/
│   └── database.ts           # Configuração do Sequelize (PostgreSQL)
├── controllers/
│   ├── player.controller.ts  # Controller de Players (Usuários)
│   ├── game.controller.ts    # Controller de Games (Partidas)
│   └── card.controller.ts    # Controller de Cards (Cartões)
├── models/
│   ├── player.model.ts       # Modelo de Player
│   ├── game.model.ts         # Modelo de Game
│   └── card.model.ts         # Modelo de Card
├── services/
│   ├── player.service.ts     # Serviço de lógica de Players
│   ├── game.service.ts       # Serviço de lógica de Games
│   └── card.service.ts       # Serviço de lógica de Cards
├── routes/
│   ├── index.ts              # Agregador de rotas
│   ├── player.routes.ts      # Rotas de Players
│   ├── game.routes.ts        # Rotas de Games
│   └── card.routes.ts        # Rotas de Cards
├── middlewares/
│   └── error.middleware.ts   # Middleware de tratamento de erros
├── app.ts                    # Configuração da aplicação
└── server.ts                 # Entrada da aplicação

docker-compose.yml             # Ambiente do PostgreSQL compartilhado pelo time
.env.example                   # Modelo de variáveis de ambiente
```

## Arquitetura

O projeto segue o padrão de **3 camadas**:

### 1. Camada de Apresentação (Controllers)
- Recebe requisições HTTP
- Valida estrutura de dados básica
- Chama a camada de negócio
- Retorna respostas HTTP com status apropriado

### 2. Camada de Negócio (Services)
- Implementa regras de negócio
- Valida dados de domínio
- Coordena operações de banco de dados
- Lança exceções estruturadas (AppError)

### 3. Camada de Acesso a Dados (Models)
- Define esquema das entidades usando Sequelize
- Encapsula operações de persistência
- Valida tipos de dados

## Endpoints da API

### Saúde do Servidor

```
GET /health
```

Retorna o status da aplicação.

**Resposta (200 OK):**
```json
{
  "status": "OK"
}
```

### Players (Usuários)

#### Criar Player

```
POST /api/players
Content-Type: application/json

{
  "name": "João Silva",
  "age": 25,
  "email": "joao@example.com"
}
```

**Resposta (201 Created):**
```json
{
  "id": 1,
  "name": "João Silva",
  "age": 25,
  "email": "joao@example.com",
  "createdAt": "2026-07-23T10:30:00.000Z",
  "updatedAt": "2026-07-23T10:30:00.000Z"
}
```

#### Obter Player por ID

```
GET /api/players/:id
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "name": "João Silva",
  "age": 25,
  "email": "joao@example.com",
  "createdAt": "2026-07-23T10:30:00.000Z",
  "updatedAt": "2026-07-23T10:30:00.000Z"
}
```

#### Atualizar Player

```
PUT /api/players/:id
Content-Type: application/json

{
  "name": "João Silva Atualizado",
  "age": 26,
  "email": "joao.novo@example.com"
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "name": "João Silva Atualizado",
  "age": 26,
  "email": "joao.novo@example.com",
  "createdAt": "2026-07-23T10:30:00.000Z",
  "updatedAt": "2026-07-23T10:35:00.000Z"
}
```

#### Deletar Player

```
DELETE /api/players/:id
```

**Resposta (200 OK):**
```json
{
  "message": "Player deleted successfully"
}
```

### Games (Partidas)

#### Criar Jogo

```
POST /api/games
Content-Type: application/json

{
  "title": "Partida da Tarde",
  "status": "waiting",
  "maxPlayers": 4
}
```

**Resposta (201 Created):**
```json
{
  "id": 1,
  "title": "Partida da Tarde",
  "status": "waiting",
  "maxPlayers": 4,
  "createdAt": "2026-07-23T10:50:00.000Z"
}
```

#### Listar Jogos

```
GET /api/games
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "title": "Partida da Tarde",
    "status": "waiting",
    "maxPlayers": 4,
    "createdAt": "2026-07-23T10:50:00.000Z"
  }
]
```

#### Obter Jogo por ID

```
GET /api/games/:id
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "title": "Partida da Tarde",
  "status": "waiting",
  "maxPlayers": 4,
  "createdAt": "2026-07-23T10:50:00.000Z"
}
```

#### Atualizar Jogo

```
PUT /api/games/:id
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "title": "Partida da Tarde",
  "status": "in_progress",
  "maxPlayers": 4,
  "createdAt": "2026-07-23T10:50:00.000Z"
}
```

#### Deletar Jogo

```
DELETE /api/games/:id
```

**Resposta (200 OK):**
```json
{
  "message": "Game deleted successfully"
}
```

#### Chamar "UNO"

Requer autenticação. Só é aceito com exatamente uma carta na mão; a marcação fica visível para os demais jogadores no estado da partida (`players[].saidUno`) e é limpa automaticamente quando a mão volta a crescer.

```
POST /api/games/:id/uno
```

**Resposta (200 OK):**
```json
{
  "gameId": 1,
  "playerId": 3,
  "saidUno": true
}
```

### Cards (Cartões)

#### Criar Cartão

```
POST /api/cards
Content-Type: application/json

{
  "color": "blue",
  "value": "3",
  "gameId": 1
}
```

**Cores Válidas:** `red`, `blue`, `yellow`, `green`, `wild`

**Valores Válidos:** `0`-`9`, `Skip`, `Reverse`, `Draw Two`, `Wild Card`, `Wild Draw Four`

**Resposta (201 Created):**
```json
{
  "id": 1,
  "color": "blue",
  "value": "3",
  "gameId": 1,
  "createdAt": "2026-07-23T10:40:00.000Z",
  "updatedAt": "2026-07-23T10:40:00.000Z"
}
```

#### Obter Cartão por ID

```
GET /api/cards/:id
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "color": "blue",
  "value": "3",
  "gameId": 1,
  "createdAt": "2026-07-23T10:40:00.000Z",
  "updatedAt": "2026-07-23T10:40:00.000Z"
}
```

#### Atualizar Cartão

```
PUT /api/cards/:id
Content-Type: application/json

{
  "color": "red",
  "value": "Skip"
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "color": "red",
  "value": "Skip",
  "gameId": 1,
  "createdAt": "2026-07-23T10:40:00.000Z",
  "updatedAt": "2026-07-23T10:42:00.000Z"
}
```

#### Deletar Cartão

```
DELETE /api/cards/:id
```

**Resposta (200 OK):**
```json
{
  "message": "Card deleted successfully"
}
```

#### Listar Cartões por Jogo

```
GET /api/cards/game/:gameId
```

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "color": "blue",
    "value": "3",
    "gameId": 1,
    "createdAt": "2026-07-23T10:40:00.000Z",
    "updatedAt": "2026-07-23T10:40:00.000Z"
  },
  {
    "id": 2,
    "color": "red",
    "value": "5",
    "gameId": 1,
    "createdAt": "2026-07-23T10:41:00.000Z",
    "updatedAt": "2026-07-23T10:41:00.000Z"
  }
]
```

### Scores (Pontuações)

#### Registrar Pontuação

```
POST /api/scores
Content-Type: application/json

{
  "playerId": "1",
  "gameId": "1",
  "score": 200
}
```

**Resposta (201 Created):**
```json
{
  "id": "1",
  "playerId": "1",
  "gameId": "1",
  "score": 200,
  "timestamp": "2022-03-23T10:00:00.000Z"
}
```

#### Recuperar Pontuação por ID

```
GET /api/scores/:id
```

**Resposta (200 OK):**
```json
{
  "id": "1",
  "playerId": "1",
  "gameId": "1",
  "score": 200,
  "timestamp": "2022-03-23T10:00:00.000Z"
}
```

#### Atualizar Pontuação

```
PUT /api/scores/:id
Content-Type: application/json

{
  "score": 300
}
```

**Resposta (200 OK):**
```json
{
  "id": "1",
  "playerId": "1",
  "gameId": "1",
  "score": 300,
  "timestamp": "2022-03-23T10:00:00.000Z"
}
```

#### Deletar Pontuação

```
DELETE /api/scores/:id
```

**Resposta (200 OK):**
```json
{
  "message": "Score deleted successfully"
}
```

## Códigos HTTP Esperados

| Código | Significado |
|--------|-------------|
| 200 | Sucesso (consulta, atualização, deleção) |
| 201 | Criação bem-sucedida |
| 400 | Dados inválidos ou erro de validação |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: email duplicado) |
| 500 | Erro interno do servidor |

## Tratamento de Erros

A aplicação possui um middleware centralizado de tratamento de erros que padroniza as respostas de erro.

**Formato de erro:**
```json
{
  "error": "Mensagem descritiva do erro"
}
```

**Exemplos:**

Email duplicado (400):
```json
{
  "error": "Email already in use"
}
```

Recurso não encontrado (404):
```json
{
  "error": "Player not found"
}
```

Validação de cartão (400):
```json
{
  "error": "Color must be red, blue, yellow, green, or wild"
}
```

## Desenvolvimento

### Adicionando Novos Endpoints

Para adicionar novas funcionalidades, siga este padrão:

1. **Criar o Modelo** (`src/models/`):
   - Defina a entidade com Sequelize
   - Especifique tipos e validações

2. **Criar o Serviço** (`src/services/`):
   - Implemente a lógica de negócio
   - Use AppError para erros estruturados

3. **Criar o Controller** (`src/controllers/`):
   - Receba requisições
   - Chame o serviço
   - Retorne respostas HTTP

4. **Criar as Rotas** (`src/routes/`):
   - Defina os endpoints
   - Conecte aos controllers

5. **Registrar as Rotas** (`src/routes/index.ts`):
   - Importe as rotas
   - Adicione ao router

### Padrões de Código

- Use classes para services e controllers
- Sempre lance `AppError` para erros de negócio
- Valide dados na camada de serviço
- Use tipos TypeScript corretamente
- Mantenha responsabilidades bem separadas

## Notas Técnicas

### useDefineForClassFields no tsconfig

O `tsconfig.json` define `"target": "es2022"`, o que faz o TypeScript ativar `useDefineForClassFields` por padrão. Esse comportamento faz com que declarações de campo em classes de modelo (ex.: `public id!: number;`) sobrescrevam, na instância, os getters que o Sequelize injeta para os atributos — resultando em valores `undefined` ao acessar propriedades diretamente na instância (ex.: `game.id`), mesmo com o dado corretamente persistido no banco.

Para evitar esse problema, `useDefineForClassFields: false` foi adicionado explicitamente ao `tsconfig.json`, conforme recomendado pela documentação do Sequelize para uso com TypeScript. Isso preserva o comportamento correto dos getters/setters do Sequelize em todos os modelos (`Player`, `Game`, `Card`).

## Próximas Etapas

As funcionalidades a seguir estão previstas para as próximas entregas:

- **Game Participants**: Adicionar/remover jogadores de partidas
- **Game Engine**: Implementar regras do UNO (validação de jogadas, efeitos de cartas especiais)
- **Scoring**: Calcular pontuação e histórico
- **Frontend**: Interface React para interação com a API

## Referência de Commits

Ao fazer commits, siga o padrão semântico:

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças em documentação
- `refactor`: Refatoração sem mudança de funcionalidade
- `style`: Formatação de código
- `test`: Adição ou modificação de testes
- `perf`: Melhorias de performance

Exemplos:
```
feat: implement card CRUD endpoints
docs: update README with API documentation
fix: validate card color in service layer
```

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação acima
2. Consulte os comentários no código

---

**Última atualização**: 23 de julho de 2026
**Versão**: 1.1.0
