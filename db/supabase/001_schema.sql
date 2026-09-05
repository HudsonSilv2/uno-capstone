-- =============================================================================
-- UNO Capstone - esquema para Supabase
--
-- Rode este arquivo UMA VEZ no SQL Editor do projeto Supabase, antes de subir
-- a API apontando para lá. Ele cria exatamente as mesmas tabelas que o
-- sequelize.sync() cria no ambiente local, com os mesmos nomes de coluna
-- (camelCase entre aspas) e as mesmas chaves estrangeiras.
--
-- Tudo aqui é idempotente: rodar de novo não quebra nem apaga dado.
--
-- Depois deste arquivo, rode o 002_security.sql. Ele é obrigatório: sem ele as
-- tabelas ficam legíveis pela chave anônima do Supabase.
-- =============================================================================

-- players ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id          serial PRIMARY KEY,
  name        varchar(255) NOT NULL,
  email       varchar(255) NOT NULL UNIQUE,
  password    varchar(255) NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- games -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.games (
  id                serial PRIMARY KEY,
  title             varchar(255) NOT NULL,
  status            varchar(255) NOT NULL DEFAULT 'waiting',
  "maxPlayers"      integer NOT NULL,
  "currentPlayerId" integer REFERENCES public.players (id),
  direction         varchar(255) DEFAULT 'clockwise',
  "createdAt"       timestamptz NOT NULL DEFAULT now(),
  "updatedAt"       timestamptz NOT NULL DEFAULT now()
);

-- game_players ----------------------------------------------------------------
-- Tabela de junção. A unicidade (gameId, playerId) é o que impede um jogador de
-- entrar duas vezes na mesma partida (PLAYER-01).
CREATE TABLE IF NOT EXISTS public.game_players (
  id          serial PRIMARY KEY,
  "gameId"    integer NOT NULL REFERENCES public.games (id) ON UPDATE CASCADE ON DELETE CASCADE,
  "playerId"  integer NOT NULL REFERENCES public.players (id) ON UPDATE CASCADE,
  "joinedAt"  timestamptz NOT NULL DEFAULT now(),
  "saidUno"   boolean NOT NULL DEFAULT false,
  "isReady"   boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "game_players_gameId_playerId_key" UNIQUE ("gameId", "playerId")
);

-- cards -----------------------------------------------------------------------
-- location assume 'deck', 'hand' ou 'discard'. Apagar a partida leva as cartas
-- junto; apagar o jogador apenas solta a carta de volta.
CREATE TABLE IF NOT EXISTS public.cards (
  id          serial PRIMARY KEY,
  color       varchar(255) NOT NULL,
  value       varchar(255) NOT NULL,
  "gameId"    integer NOT NULL REFERENCES public.games (id) ON UPDATE CASCADE ON DELETE CASCADE,
  "playerId"  integer REFERENCES public.players (id) ON UPDATE CASCADE ON DELETE SET NULL,
  location    varchar(255) DEFAULT 'deck',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- scores ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scores (
  id          serial PRIMARY KEY,
  "playerId"  integer NOT NULL REFERENCES public.players (id) ON UPDATE CASCADE,
  "gameId"    integer NOT NULL REFERENCES public.games (id) ON UPDATE CASCADE,
  score       integer NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- api_trackers ----------------------------------------------------------------
-- Alimentada pelo middleware de estatísticas, uma linha por requisição.
CREATE TABLE IF NOT EXISTS public.api_trackers (
  id               serial PRIMARY KEY,
  "responseTime"   integer NOT NULL,
  "endpointAccess" varchar(255) NOT NULL,
  "requestMethod"  varchar(255) NOT NULL,
  "statusCode"     integer NOT NULL,
  "timestamp"      timestamptz NOT NULL DEFAULT now(),
  "userId"         varchar(255),
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  "updatedAt"      timestamptz NOT NULL DEFAULT now()
);

-- Índices ---------------------------------------------------------------------
-- As consultas mais quentes do motor filtram cartas por partida, por mão de
-- jogador e por pilha. Sem estes índices o Postgres varre a tabela inteira a
-- cada jogada, e cards é de longe a maior tabela (108 linhas por partida).
CREATE INDEX IF NOT EXISTS cards_game_location_idx ON public.cards ("gameId", location);
CREATE INDEX IF NOT EXISTS cards_game_player_location_idx ON public.cards ("gameId", "playerId", location);
CREATE INDEX IF NOT EXISTS game_players_game_idx ON public.game_players ("gameId");
CREATE INDEX IF NOT EXISTS scores_game_idx ON public.scores ("gameId");
CREATE INDEX IF NOT EXISTS scores_player_idx ON public.scores ("playerId");
CREATE INDEX IF NOT EXISTS api_trackers_timestamp_idx ON public.api_trackers ("timestamp");
