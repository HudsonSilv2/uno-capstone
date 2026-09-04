import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../hooks/useAuth';
import { socket } from '../services/socket';
import { MIN_PLAYERS_TO_START, STATUS_LABELS } from '../domain/cards';
import type { Game, GamePlayer } from '../types/api';
import './WaitingRoomPage.css';

const POLL_INTERVAL_MS = 2500;

interface RoomData {
  game: Game;
  players: GamePlayer[];
}

/*
  UI-04. The back-end does not store who created the game, so the first player
  to join is treated as the host: they are the one who can start it (PART-04)
  or remove the table before it begins (PART-06).
*/
export function WaitingRoomPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const navigate = useNavigate();
  const { player } = useAuth();

  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const fetchRoom = useCallback(
    async (signal: AbortSignal): Promise<RoomData> => {
      const [game, players] = await Promise.all([
        gamesApi.getById(gameId, signal),
        gamesApi.players(gameId, signal),
      ]);
      return {
        game,
        players: [...players].sort(
          (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        ),
      };
    },
    [gameId]
  );

  const { data, error, isLoading, refresh } = usePolling(fetchRoom, POLL_INTERVAL_MS);

  const game = data?.game ?? null;
  const players = useMemo(() => data?.players ?? [], [data]);

  const host = players[0] ?? null;
  const isHost = host !== null && host.id === player?.id;
  const isMember = players.some((entry) => entry.id === player?.id);
  const isFull = game !== null && players.length >= game.maxPlayers;
  const canStart = isHost && players.length >= MIN_PLAYERS_TO_START;

  useEffect(() => {
    if (!player || !isMember || Number.isNaN(gameId)) {
      return;
    }

    socket.connect();
    socket.emit('game:join', { gameId });

    const refreshRoom = ({ gameId: updatedGameId }: { gameId: number }) => {
      if (updatedGameId === gameId) {
        void refresh();
      }
    };

    socket.on('connect', () => socket.emit('game:join', { gameId }));
    socket.on('game:updated', refreshRoom);

    return () => {
      socket.off('connect');
      socket.off('game:updated', refreshRoom);
      socket.disconnect();
    };
  }, [gameId, isMember, player, refresh]);

  /* Once the host starts, everyone in the room is sent to the table. */
  useEffect(() => {
    if (game?.status === 'in_progress' && isMember) {
      navigate(`/partidas/${gameId}`, { replace: true });
    }
    if (game?.status === 'finished') {
      navigate(`/partidas/${gameId}/resultado`, { replace: true });
    }
  }, [game?.status, isMember, gameId, navigate]);

  const runAction = async (action: () => Promise<unknown>, onDone?: () => void) => {
    setActionError(null);
    setIsBusy(true);
    try {
      await action();
      onDone?.();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'A ação não pôde ser concluída.');
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="page">
        <p className="muted">Carregando sala...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Partida não encontrada</h3>
          <p>{error ?? 'Ela pode ter sido removida por quem criou.'}</p>
          <button type="button" className="btn" onClick={() => navigate('/partidas')}>
            Voltar para a lista
          </button>
        </div>
      </div>
    );
  }

  const emptySlots = Math.max(0, game.maxPlayers - players.length);

  return (
    <div className="page room">
      <div className="page__head">
        <div>
          <p className="eyebrow">Sala de espera</p>
          <h1>{game.title}</h1>
          <p className="page__lead">
            {STATUS_LABELS[game.status]} · {players.length} de {game.maxPlayers} jogadores. São
            necessários {MIN_PLAYERS_TO_START} para iniciar.
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/partidas')}>
          Ver outras partidas
        </button>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {actionError && (
        <p className="notice notice--error" role="alert">
          {actionError}
        </p>
      )}

      <ul className="room__seats">
        {players.map((entry, index) => (
          <li key={entry.id} className="room__seat">
            <span className="room__avatar" aria-hidden="true">
              {entry.name.charAt(0).toUpperCase()}
            </span>
            <span className="room__seat-body">
              <span className="room__seat-name">
                {entry.name}
                {entry.id === player?.id && <span className="room__you">você</span>}
              </span>
              <span className="room__seat-role">
                {index === 0 ? 'Anfitrião · entrou primeiro' : 'Jogador'}
              </span>
            </span>
          </li>
        ))}

        {Array.from({ length: emptySlots }).map((_, index) => (
          <li key={`vaga-${index}`} className="room__seat room__seat--empty">
            <span className="room__avatar room__avatar--empty" aria-hidden="true" />
            <span className="room__seat-body">
              <span className="room__seat-name muted">Vaga livre</span>
              <span className="room__seat-role">Aguardando</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="room__actions">
        {!isMember && (
          <button
            type="button"
            className="btn btn--primary btn--lg"
            disabled={isBusy || isFull}
            onClick={() => runAction(() => gamesApi.join(gameId), refresh)}
          >
            {isFull ? 'Mesa cheia' : 'Entrar nesta partida'}
          </button>
        )}

        {isMember && (
          <>
            <button
              type="button"
              className="btn btn--primary btn--lg"
              disabled={!canStart || isBusy}
              onClick={() => runAction(() => gamesApi.start(gameId), refresh)}
              title={
                !isHost
                  ? 'Somente o anfitrião pode iniciar a partida'
                  : players.length < MIN_PLAYERS_TO_START
                    ? `São necessários ${MIN_PLAYERS_TO_START} jogadores`
                    : undefined
              }
            >
              Iniciar partida
            </button>

            <button
              type="button"
              className="btn"
              disabled={isBusy}
              onClick={() =>
                runAction(
                  () => gamesApi.leave(gameId),
                  () => navigate('/partidas')
                )
              }
            >
              Sair da sala
            </button>

            {isHost && (
              <button
                type="button"
                className="btn btn--danger"
                disabled={isBusy}
                onClick={() =>
                  runAction(
                    () => gamesApi.remove(gameId),
                    () => navigate('/partidas')
                  )
                }
              >
                Remover partida
              </button>
            )}
          </>
        )}
      </div>

      {isMember && !isHost && (
        <p className="muted room__hint">
          Só o anfitrião inicia a partida. Assim que ele iniciar, esta tela leva você para a mesa.
        </p>
      )}
    </div>
  );
}
