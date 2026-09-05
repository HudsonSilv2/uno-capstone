-- =============================================================================
-- UNO Capstone - trava de acesso no Supabase
--
-- RODE ESTE ARQUIVO. Ele não é opcional.
--
-- Por que: o Supabase publica tudo que está no schema `public` através de uma
-- API REST automática (PostgREST), acessível com a chave anônima do projeto —
-- que é uma chave pública, que vai parar no navegador. Uma tabela sem Row Level
-- Security fica legível e gravável por qualquer um que tenha essa chave.
--
-- No nosso caso isso exporia `players`, que guarda o hash de senha de todo
-- mundo, e deixaria qualquer pessoa alterar cartas e pontuação em partidas
-- alheias.
--
-- O que este arquivo faz: liga RLS em todas as tabelas e não cria nenhuma
-- policy. Sem policy, o PostgREST nega tudo para as chaves anon e authenticated.
-- A API continua funcionando normalmente porque ela conecta direto no Postgres
-- com o usuário `postgres`, que ignora RLS.
--
-- Consequência prática: dados só entram e saem pela nossa API em Express. Se um
-- dia o time quiser ler tabela direto do front pelo cliente do Supabase, aí sim
-- precisa escrever policies — e nesse momento vale revisar cada uma com calma.
-- =============================================================================

ALTER TABLE public.players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_trackers ENABLE ROW LEVEL SECURITY;

-- Reforço: mesmo que alguém crie uma policy sem querer, os papéis expostos pela
-- API pública não têm permissão nas tabelas.
--
-- Os papéis `anon` e `authenticated` existem no Supabase, mas não num Postgres
-- comum. O bloco abaixo só age sobre os que existirem, para que este arquivo
-- também rode num banco local sem erro.
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        role_name
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
        role_name
      );
      RAISE NOTICE 'Acesso removido do papel %', role_name;
    ELSE
      RAISE NOTICE 'Papel % não existe neste banco, ignorando', role_name;
    END IF;
  END LOOP;
END
$$;

-- Conferência: as seis tabelas devem aparecer com rowsecurity = true.
--
--   SELECT tablename, rowsecurity
--     FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
