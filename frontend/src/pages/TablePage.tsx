import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../hooks/useAuth';
import { emitGameAction, socket } from '../services/socket';
import { UnoCard, UnoCardBack } from '../components/UnoCard';
import { Modal } from '../components/Modal';
import { ColorChoice } from '../components/ColorChoice';
import {
  cardLabel,
  isPlayable,
  isWild,
  hasPlayableCard,
  COLOR_LABELS,
  DIRECTION_LABELS,
} from '../domain/cards';
import type {
  Card,
  CardColor,
  ChallengeResult,
  DrawCardResult,
  GameState,
  GameStatePlayer,
  PlayCardResult,
  UnoCallResult,
} from '../types/api';
import './TablePage.css';

const POLL_INTERVAL_MS = 2000;
/*
  While the socket is up the server pushes every change, so polling drops to a
  slow heartbeat. It is not switched off entirely: a push that never arrives
  (a dropped event, a server restart) would otherwise leave the table frozen.
*/
const REALTIME_FALLBACK_POLL_MS = 20000;
const MAX_LOG_ENTRIES = 12;

/*
  UI-05, UI-07, UI-08 and UI-09.

  Every rule is decided by the back-end: the screen sends the play and reapplies
  whatever state the server returns. The local check (isPlayable) only disables
  cards the server would reject, giving visual feedback before the request.
*/
export function TablePage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const navigate = useNavigate();
  const { player } = useAuth();

  const [hostId, setHostId] = useState<number | null>(null);
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const previousTurnRef = useRef<number | null>(null);

  const pushLog = useCallback((message: string) => {
    setLog((entries) => [message, ...entries].slice(0, MAX_LOG_ENTRIES));
  }, []);

  const fetchState = useCallback((signal: AbortSignal) => gamesApi.state(gameId, signal), [gameId]);

  const [isRealtime, setIsRealtime] = useState(() => socket.connected);

  const { data, error, isLoading, refresh, applyExternalData } = usePolling<GameState>(
    fetchState,
    isRealtime ? REALTIME_FALLBACK_POLL_MS : POLL_INTERVAL_MS
  );

  useEffect(() => {
    if (!player || Number.isNaN(gameId)) {
      return;
    }

    const join = () => socket.emit('game:join', { gameId });
    const onConnect = () => {
      setIsRealtime(true);
      join();
    };
    const onDisconnect = () => setIsRealtime(false);
    const applyState = (nextState: GameState) => {
      if (nextState.id === gameId) {
        applyExternalData(nextState);
      }
    };
    const applyError = ({ message }: { message: string }) => setActionError(message);

    /* Named handlers: socket is a shared module, so off() must not be blanket. */
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('game:state', applyState);
    socket.on('game:error', applyError);

    socket.connect();
    join();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game:state', applyState);
      socket.off('game:error', applyError);
      socket.disconnect();
    };
  }, [gameId, player, applyExternalData]);

  /* The host (first to join) is the one who can end the game (PART-05). */
  useEffect(() => {
    const controller = new AbortController();
    gamesApi
      .players(gameId, controller.signal)
      .then((players) => {
        const sorted = [...players].sort(
          (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
        );
        setHostId(sorted[0]?.id ?? null);
      })
      .catch(() => setHostId(null));
    return () => controller.abort();
  }, [gameId]);

  const state = data;

  /* Leaving the table unmounts the screen, and unmounting stops the polling. */
  useEffect(() => {
    if (state?.status === 'finished') {
      navigate(`/partidas/${gameId}/resultado`, { replace: true });
    }
    if (state?.status === 'waiting') {
      navigate(`/partidas/${gameId}/sala`, { replace: true });
    }
  }, [state?.status, gameId, navigate]);

  /* PLAYER-04: announces the turn change picked up by the polling. */
  useEffect(() => {
    if (!state || state.status !== 'in_progress') {
      return;
    }
    const current = state.currentPlayerId;
    if (current === null || previousTurnRef.current === current) {
      return;
    }
    if (previousTurnRef.current !== null) {
      const name = state.players.find((entry) => entry.id === current)?.name ?? 'Jogador';
      pushLog(current === player?.id ? 'É a sua vez.' : `Vez de ${name}.`);
    }
    previousTurnRef.current = current;
  }, [state, player?.id, pushLog]);

  const me = useMemo<GameStatePlayer | null>(
    () => state?.players.find((entry) => entry.id === player?.id) ?? null,
    [state, player?.id]
  );

  const opponents = useMemo(
    () => state?.players.filter((entry) => entry.id !== player?.id) ?? [],
    [state, player?.id]
  );

  const hand = state?.hand ?? [];
  const topDiscard = state?.topDiscard ?? null;
  const isMyTurn = state?.currentPlayerId === player?.id && state?.status === 'in_progress';
  const canDraw = isMyTurn && !isActing;
  const canCallUno = state?.status === 'in_progress' && me?.cardCount === 1 && !me.saidUno;
  const noPlayableCard = isMyTurn && !hasPlayableCard(hand, topDiscard);

  const runAction = async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setActionError(null);
    setIsActing(true);
    try {
      return await action();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'A jogada não foi aceita.');
      await refresh();
      return null;
    } finally {
      setIsActing(false);
    }
  };

  const playCard = async (card: Card, chosenColor?: CardColor) => {
    const result = await runAction(() =>
      emitGameAction<PlayCardResult>(
        'game:play-card',
        chosenColor ? { gameId, cardId: card.id, chosenColor } : { gameId, cardId: card.id },
        'play-card'
      )
    );
    if (!result) {
      return;
    }

    const playedLabel = chosenColor
      ? `${cardLabel(card)} (cor escolhida: ${COLOR_LABELS[chosenColor]})`
      : cardLabel(card);
    pushLog(`Você jogou ${playedLabel}.`);

    if (result.roundFinished) {
      navigate(`/partidas/${gameId}/resultado`, { replace: true });
      return;
    }

    if (result.drawEffect) {
      pushLog(
        `${result.drawEffect.targetPlayerName} comprou ${result.drawEffect.cardsDrawn} carta(s) e perdeu a vez.`
      );
    }

    await refresh();
  };

  /* UI-07: the color picker only shows up when the played card is a wild. */
  const handleSelectCard = (card: Card) => {
    if (!isMyTurn || isActing) {
      return;
    }
    if (isWild(card)) {
      setPendingWild(card);
      return;
    }
    void playCard(card);
  };

  const handleChooseColor = async (color: CardColor) => {
    const card = pendingWild;
    setPendingWild(null);
    if (card) {
      await playCard(card, color);
    }
  };

  const handleDraw = async () => {
    const result = await runAction(() =>
      emitGameAction<DrawCardResult>('game:draw-card', { gameId }, 'draw-card')
    );
    if (!result) {
      return;
    }
    pushLog(
      result.canPlayDrawnCard
        ? `Você comprou ${cardLabel(result.drawnCard)} e pode jogá-la.`
        : `Você comprou ${cardLabel(result.drawnCard)} e passou a vez.`
    );
    await refresh();
  };

  const handleCallUno = async () => {
    const result = await runAction(() =>
      emitGameAction<UnoCallResult>('game:uno', { gameId }, 'uno')
    );
    if (result) {
      pushLog('Você gritou UNO.');
      await refresh();
    }
  };

  const handleChallenge = async (targetPlayerId: number, targetName: string) => {
    const result = await runAction(() =>
      emitGameAction<ChallengeResult>('game:challenge', { gameId, targetPlayerId }, 'challenge')
    );
    if (result) {
      pushLog(
        result.penaltyCards > 0
          ? `Você desafiou ${targetName}! Ele comprou ${result.penaltyCards} carta(s) de penalidade.`
          : `Você desafiou ${targetName}, mas não havia cartas no baralho para penalizá-lo.`
      );
      await refresh();
    }
  };

  const handleEndGame = async () => {
    const result = await runAction(() => gamesApi.end(gameId));
    if (result) {
      navigate(`/partidas/${gameId}/resultado`, { replace: true });
    }
  };

  if (isLoading && !state) {
    return (
      <div className="page">
        <p className="muted">Carregando mesa...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="page">
        <div className="empty">
          <h3>Não foi possível abrir a mesa</h3>
          <p>{error ?? 'Verifique se você ainda faz parte desta partida.'}</p>
          <button type="button" className="btn" onClick={() => navigate('/partidas')}>
            Voltar para a lista
          </button>
        </div>
      </div>
    );
  }

  const currentName =
    state.players.find((entry) => entry.id === state.currentPlayerId)?.name ?? 'Indefinido';

  return (
    <div className="table-page">
      <header className="table-bar">
        <div className="table-bar__identity">
          <p className="eyebrow">Mesa</p>
          <h1>{state.title}</h1>
        </div>

        <div className="table-bar__facts">
          <span className={`table-turn ${isMyTurn ? 'is-mine' : ''}`}>
            <span className="table-turn__label">Vez de</span>
            <strong>{isMyTurn ? 'você' : currentName}</strong>
          </span>
          <span className="table-bar__direction" title={DIRECTION_LABELS[state.direction]}>
            <DirectionMark direction={state.direction} />
            {DIRECTION_LABELS[state.direction]}
          </span>
        </div>

        <div className="table-bar__tools">
          {hostId === player?.id && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleEndGame}
              disabled={isActing}
            >
              Encerrar partida
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/partidas')}>
            Sair da mesa
          </button>
        </div>
      </header>

      {error && (
        <p className="notice notice--error table-page__notice" role="alert">
          {error}
        </p>
      )}

      <div className="table-layout">
        <section className="table-felt">
          <ul className="opponents">
            {opponents.map((opponent) => (
              <li
                key={opponent.id}
                className={`opponent ${opponent.id === state.currentPlayerId ? 'is-turn' : ''}`}
              >
                <span className="opponent__avatar" aria-hidden="true">
                  {opponent.name.charAt(0).toUpperCase()}
                </span>
                <span className="opponent__body">
                  <span className="opponent__name">{opponent.name}</span>
                  <span className="opponent__count numeric">
                    {opponent.cardCount} carta{opponent.cardCount === 1 ? '' : 's'}
                  </span>
                </span>
                {opponent.saidUno && <span className="uno-flag">UNO</span>}
                {opponent.cardCount === 1 && !opponent.saidUno && (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    disabled={isActing}
                    onClick={() => void handleChallenge(opponent.id, opponent.name)}
                    title={`Desafiar ${opponent.name} por não ter dito UNO`}
                  >
                    Desafiar
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="piles">
            <div className="pile">
              <p className="eyebrow">Compra</p>
              <UnoCardBack
                size="lg"
                onClick={canDraw ? handleDraw : undefined}
                disabled={!canDraw}
                label="Comprar uma carta"
              />
              <p className="pile__hint muted">
                {isMyTurn
                  ? noPlayableCard
                    ? 'Sem jogada válida: compre uma carta.'
                    : 'Compre se preferir não jogar.'
                  : 'Disponível apenas na sua vez.'}
              </p>
            </div>

            <div className="pile">
              <p className="eyebrow">Descarte</p>
              {topDiscard ? (
                <UnoCard card={topDiscard} size="lg" />
              ) : (
                <div className="pile__placeholder">Descarte vazio</div>
              )}
              <p className="pile__hint muted">
                {topDiscard ? cardLabel(topDiscard) : 'A partida ainda não virou a primeira carta.'}
              </p>
            </div>
          </div>
        </section>

        <aside className="table-side">
          <div className="panel stack stack--tight">
            <h2>Jogadores</h2>
            <ul className="seat-list">
              {state.players.map((entry) => (
                <li
                  key={entry.id}
                  className={`seat-list__item ${entry.id === state.currentPlayerId ? 'is-turn' : ''}`}
                >
                  <span className="seat-list__name">
                    {entry.name}
                    {entry.id === player?.id && <span className="room__you">você</span>}
                  </span>
                  <span className="seat-list__count numeric">{entry.cardCount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel stack stack--tight">
            <h2>Acontecimentos</h2>
            {log.length === 0 ? (
              <p className="muted">As jogadas aparecem aqui conforme a partida avança.</p>
            ) : (
              <ul className="log">
                {log.map((entry, index) => (
                  <li key={`${entry}-${index}`} className="log__item">
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <section className="hand-area">
        <div className="hand-area__head">
          <div>
            <p className="eyebrow">
              Sua mão
              {me?.saidUno && <span className="uno-flag hand-area__flag">UNO</span>}
            </p>
            <p className="muted numeric">
              {hand.length} carta{hand.length === 1 ? '' : 's'}
              {!isMyTurn && ' · aguarde a sua vez para jogar'}
            </p>
          </div>

          <div className="hand-area__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleCallUno}
              disabled={!canCallUno || isActing}
              title={canCallUno ? undefined : 'Disponível com exatamente uma carta na mão'}
            >
              Gritar UNO
            </button>
          </div>
        </div>

        {actionError && (
          <p className="notice notice--error" role="alert">
            {actionError}
          </p>
        )}

        {hand.length === 0 ? (
          <p className="muted">Sua mão está vazia.</p>
        ) : (
          <ul className="hand">
            {hand.map((card) => {
              const playable = isMyTurn && isPlayable(card, topDiscard);
              return (
                <li key={card.id}>
                  <UnoCard
                    card={card}
                    size="lg"
                    disabled={!playable || isActing}
                    onSelect={handleSelectCard}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pendingWild && (
        <Modal
          title="Escolha a nova cor"
          description={`Você jogou ${cardLabel(pendingWild)}. A cor escolhida passa a valer para a próxima jogada.`}
          onClose={() => setPendingWild(null)}
        >
          <ColorChoice onChoose={handleChooseColor} disabled={isActing} />
        </Modal>
      )}
    </div>
  );
}

function DirectionMark({ direction }: { direction: GameState['direction'] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="direction-mark"
      aria-hidden="true"
      style={direction === 'counter-clockwise' ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M20 12a8 8 0 1 1-2.4-5.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 3v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
