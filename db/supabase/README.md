# Ligando a API no Supabase

Roteiro completo. Não é preciso mexer em código: o que muda é o `.env`.

O Supabase entra aqui **como banco Postgres gerenciado**, no lugar do container
do `docker-compose`. A autenticação continua sendo o JWT que a nossa API emite,
e o tempo real continua sendo o Socket.IO — não usamos o Supabase Auth nem o
Supabase Realtime. Isso mantém as regras do jogo num lugar só, no Express.

## 1. Criar o projeto

No [supabase.com](https://supabase.com), crie um projeto. Guarde a senha do
banco que ele pede na criação: ela aparece uma vez só.

## 2. Criar as tabelas

No **SQL Editor** do projeto, rode nesta ordem:

1. [`001_schema.sql`](001_schema.sql) — cria as seis tabelas, chaves
   estrangeiras e índices. É idempotente, pode rodar de novo sem medo.
2. [`002_security.sql`](002_security.sql) — **obrigatório.** Liga Row Level
   Security e tira o acesso dos papéis públicos.

Sobre o passo 2: o Supabase publica o schema `public` numa API REST automática
que responde à chave anônima do projeto — chave pública, que vai para o
navegador. Sem esse arquivo, a tabela `players`, com o hash de senha de todo
mundo, fica legível por qualquer um com a chave. A nossa API não é afetada,
porque conecta direto no Postgres com o usuário `postgres`, que ignora RLS.

Para conferir, rode no SQL Editor:

```sql
SELECT tablename, rowsecurity FROM pg_tables
 WHERE schemaname = 'public' ORDER BY tablename;
```

As seis tabelas precisam aparecer com `rowsecurity = true`.

## 3. Pegar a string de conexão

Em **Project Settings → Database → Connection string**, escolha a aba **URI**.

Prefira a opção **Session pooler** (o host termina em `pooler.supabase.com`).
Duas razões: a conexão direta (`db.<ref>.supabase.co`) só responde em IPv6 sem
um add-on pago, e o *transaction* pooler derruba recursos de sessão que o
Sequelize às vezes usa. O session pooler não tem nenhum dos dois problemas.

Troque `[YOUR-PASSWORD]` pela senha do passo 1.

## 4. Configurar o `.env`

```bash
DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
DB_SYNC=false
```

`DATABASE_URL` tem precedência sobre as variáveis `DB_HOST`, `DB_PORT` e
companhia — pode deixar as antigas no arquivo, elas passam a ser ignoradas.
O TLS liga sozinho, porque o host não é local.

`DB_SYNC=false` desliga o `sequelize.sync()` na inicialização. Com o Supabase o
esquema é dos arquivos SQL acima, não do ORM. Deixar ligado não corrompe nada,
mas evita a API criar tabela por conta própria em produção.

## 5. Subir

```bash
npm run dev
```

Deve aparecer `Database connected and synced.` no console. Se aparecer erro de
autenticação, quase sempre é caractere especial na senha: passe a senha por
[encodeURIComponent](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
antes de colar na URL (`@` vira `%40`, `#` vira `%23`, e assim por diante).

## Adicionando uma coluna nova depois

Com `DB_SYNC=false` a API não altera o esquema sozinha — nem o `sequelize.sync()`
nem o `schema-updates.ts` rodam. No Supabase o esquema é destes arquivos, e só.

Então uma coluna nova exige três passos, não um:

1. Adicionar ao modelo em `src/models/`
2. Adicionar ao `PENDING_COLUMNS` em `src/config/schema-updates.ts`, para quem
   roda no banco local com o banco já criado
3. Adicionar ao [`001_schema.sql`](001_schema.sql) **e** rodar o `ALTER` no SQL
   Editor do Supabase, porque o `CREATE TABLE IF NOT EXISTS` não altera tabela
   que já existe:

```sql
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS "novaColuna" boolean NOT NULL DEFAULT false;
```

Esquecer o passo 3 é o erro fácil: no ambiente local tudo funciona, porque o
`sync()` cria a coluna, e a falha só aparece no Supabase. Foi o que aconteceu
com o `isReady`.

Para isso não repetir existe `src/config/__tests__/supabase-schema.test.ts`, que
compara as colunas de cada modelo com as declaradas no `001_schema.sql` e falha
no `npm test` quando as duas divergem.

## Voltando para o banco local

Comente ou apague o `DATABASE_URL`. Sem ele, o código volta a usar `DB_HOST` e
o container do `docker-compose`, e o `DB_SYNC` volta a valer `true` por padrão.

## Variáveis disponíveis

| Variável | Padrão | Para que serve |
|---|---|---|
| `DATABASE_URL` | — | String de conexão. Quando presente, ignora as `DB_*` |
| `DB_SYNC` | `true` | `false` desliga o `sequelize.sync()` na inicialização |
| `DB_SSL` | automático | Força TLS ligado/desligado. Por padrão liga em host remoto |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` | `true` só se o time instalar o certificado da Supabase |
| `DB_POOL_MAX` | `5` | Máximo de conexões simultâneas no pool |
