import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../hooks/useAuth';
import { MAX_PLAYERS_ALLOWED, MIN_PLAYERS_TO_START, STATUS_LABELS } from '../domain/cards';
import type { Game, GamePlayer } from '../types/api';
import './GamesPage.css';

const POLL_INTERVAL_MS = 5000;

interface GameRow {
  game: Game;
  players: GamePlayer[];
  isMember: boolean;
}

/*
  UI-02 and UI-03. The join list only shows games with an open seat and the
  "waiting for players" status (PART-02). Games the player is already in are
  listed separately, so they can get back to the table.
*/
export function GamesPage() {
  const { player } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(MAX_PLAYERS_ALLOWED);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyGameId, setBusyGameId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRows = useCallback(
    async (signal: AbortSignal): Promise<GameRow[]> => {
      const games = await gamesApi.list(signal);
      const open = games.filter((game) => game.status !== 'finished');

      /*
        A game can be removed between listing it and fetching its players. With
        Promise.all a single failure like that took the whole list down, so the
        games that fail are simply dropped.
      */
      const rows = await Promise.allSettled(
        open.map(async (game) => {
          const players = await gamesApi.players(game.id, signal);
          return {
            game,
            players: [...players].sort(
              (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
            ),
            isMember: players.some((entry) => entry.id === player?.id),
          };
        })
      );

      return rows
        .filter((row): row is PromiseFulfilledResult<GameRow> => row.status === 'fulfilled')
        .map((row) => row.value);
    },
    [player?.id]
  );

  const { data, error, isLoading, refresh } = usePolling(fetchRows, POLL_INTERVAL_MS);

  const rows = useMemo(() => data ?? [], [data]);
  const myGames = useMemo(() => rows.filter((row) => row.isMember), [rows]);
  const openGames = useMemo(
    () =>
      rows.filter(
        (row) =>
          !row.isMember && row.game.status === 'waiting' && row.players.length < row.game.maxPlayers
      ),
    [rows]
  );

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (title.trim().length < 3) {
      setFormError('Dê um nome com pelo menos 3 caracteres para a partida.');
      return;
    }

    setIsCreating(true);
    try {
      const game = await gamesApi.create({ title: title.trim(), maxPlayers });
      /*
        Whoever creates the game joins right after. The back-end stores no
        creator, so the first player to join runs the waiting room.
      */
      await gamesApi.join(game.id);
      navigate(`/partidas/${game.id}/sala`);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível criar a partida.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (gameId: number) => {
    setActionError(null);
    setBusyGameId(gameId);
    try {
      await gamesApi.join(gameId);
      navigate(`/partidas/${gameId}/sala`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Não foi possível entrar.');
      await refresh();
    } finally {
      setBusyGameId(null);
    }
  };

  return (
    <div className="page games">
      <div className="page__head">
        <div>
          <p className="eyebrow">Partidas</p>
          <h1>Entre em uma mesa</h1>
          <p className="page__lead">
            A lista é atualizada automaticamente. Cada mesa aceita no máximo{' '}
            {MAX_PLAYERS_ALLOWED} jogadores e precisa de {MIN_PLAYERS_TO_START} para começar.
          </p>
        </div>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="games__layout">
        <section className="stack">
          {myGames.length > 0 && (
            <div className="stack stack--tight">
              <h2>Suas partidas</h2>
              <ul className="games__list">
                {myGames.map((row) => (
                  <GameCard
                    key={row.game.id}
                    row={row}
                    action={
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() =>
                          navigate(
                            row.game.status === 'in_progress'
                              ? `/partidas/${row.game.id}`
                              : `/partidas/${row.game.id}/sala`
                          )
                        }
                      >
                        {row.game.status === 'in_progress' ? 'Voltar à mesa' : 'Abrir sala'}
                      </button>
                    }
                  />
                ))}
              </ul>
            </div>
          )}

          <div className="stack stack--tight">
            <h2>Disponíveis para entrar</h2>

            {actionError && (
              <p className="notice notice--error" role="alert">
                {actionError}
              </p>
            )}

            {isLoading && <p className="muted">Carregando partidas...</p>}

            {!isLoading && openGames.length === 0 && (
              <div className="empty">
                <h3>Nenhuma partida com vaga no momento</h3>
                <p>Crie uma nova mesa ao lado e chame o restante do grupo.</p>
              </div>
            )}

            {openGames.length > 0 && (
              <ul className="games__list">
                {openGames.map((row) => (
                  <GameCard
                    key={row.game.id}
                    row={row}
                    action={
                      <button
                        type="button"
                        className="btn"
                        disabled={busyGameId === row.game.id}
                        onClick={() => handleJoin(row.game.id)}
                      >
                        {busyGameId === row.game.id ? 'Entrando...' : 'Entrar'}
                      </button>
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside>
          <form className="panel stack" onSubmit={handleCreate}>
            <div>
              <h2>Nova partida</h2>
              <p className="muted games__aside-lead">
                Você entra na mesa automaticamente e comanda a sala de espera.
              </p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="title">
                Nome da partida
              </label>
              <input
                id="title"
                className="field__control"
                value={title}
                placeholder="Mesa do grupo 2"
                onChange={(event) => setTitle(event.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="maxPlayers">
                Limite de jogadores
              </label>
              <select
                id="maxPlayers"
                className="field__control"
                value={maxPlayers}
                onChange={(event) => setMaxPlayers(Number(event.target.value))}
                disabled={isCreating}
              >
                {[2, 3, 4].map((option) => (
                  <option key={option} value={option}>
                    {option} jogadores
                  </option>
                ))}
              </select>
            </div>

            {formError && (
              <p className="notice notice--error" role="alert">
                {formError}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block" disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar e abrir sala'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function GameCard({ row, action }: { row: GameRow; action: ReactNode }) {
  const { game, players } = row;
  const statusClass =
    game.status === 'waiting' ? 'waiting' : game.status === 'in_progress' ? 'running' : 'finished';

  return (
    <li className="game-card">
      <div className="game-card__main">
        <div className="row row--wrap game-card__title-row">
          <h3>{game.title}</h3>
          <span className={`tag tag--${statusClass}`}>
            <span className="tag__dot" aria-hidden="true" />
            {STATUS_LABELS[game.status]}
          </span>
        </div>
        <p className="muted game-card__meta numeric">
          {players.length} de {game.maxPlayers} jogadores
          {players.length > 0 && ` · ${players.map((entry) => entry.name).join(', ')}`}
        </p>
      </div>
      <div className="game-card__action">{action}</div>
    </li>
  );
}
