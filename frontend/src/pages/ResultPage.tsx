import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../hooks/useAuth';
import type { Game, ScoreEntry } from '../types/api';
import './ResultPage.css';

interface ResultData {
  game: Game;
  scores: ScoreEntry[];
}

/*
  UI-10 and SCORE-02. The scores come from the rows the back-end writes when
  the round ends, not from any local calculation. The winner is whoever ended
  with the lowest total left in hand (SCORE-01).
*/
export function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const navigate = useNavigate();
  const { player } = useAuth();

  const fetchResult = useCallback(
    async (signal: AbortSignal): Promise<ResultData> => {
      const [game, scores] = await Promise.all([
        gamesApi.getById(gameId, signal),
        gamesApi.scores(gameId, signal),
      ]);
      return { game, scores };
    },
    [gameId]
  );

  const { data, error, isLoading } = usePolling(fetchResult, null);

  /*
    If the same game was scored more than once, keep only the most recent
    record for each player.
  */
  const ranking = useMemo(() => {
    const latestByPlayer = new Map<string, ScoreEntry>();
    for (const entry of data?.scores ?? []) {
      const current = latestByPlayer.get(entry.playerId);
      if (!current || new Date(entry.timestamp) > new Date(current.timestamp)) {
        latestByPlayer.set(entry.playerId, entry);
      }
    }
    return [...latestByPlayer.values()].sort((a, b) => a.score - b.score);
  }, [data?.scores]);

  const winner = ranking[0] ?? null;

  if (isLoading && !data) {
    return (
      <div className="page">
        <p className="muted">Apurando o resultado...</p>
      </div>
    );
  }

  return (
    <div className="page page--narrow result">
      <div className="page__head">
        <div>
          <p className="eyebrow">Fim da rodada</p>
          <h1>{data?.game.title ?? 'Partida encerrada'}</h1>
        </div>
      </div>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {winner ? (
        <div className="result__winner panel">
          <p className="eyebrow">Vencedor da rodada</p>
          <p className="result__winner-name">
            {winner.playerName ?? `Jogador ${winner.playerId}`}
            {Number(winner.playerId) === player?.id && <span className="room__you">você</span>}
          </p>
          <p className="muted numeric">
            Encerrou com {winner.score} ponto{winner.score === 1 ? '' : 's'} em mão.
          </p>
        </div>
      ) : (
        <div className="empty">
          <h3>Ainda não há pontuação registrada</h3>
          <p>A rodada precisa ser encerrada para que os pontos sejam calculados.</p>
        </div>
      )}

      {ranking.length > 0 && (
        <table className="result__table">
          <caption className="sr-only">Pontuação final da rodada</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Jogador</th>
              <th scope="col" className="result__score-col">
                Pontos em mão
              </th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry, index) => (
              <tr
                key={entry.id}
                className={Number(entry.playerId) === player?.id ? 'is-you' : undefined}
              >
                <td className="numeric">{index + 1}</td>
                <td>{entry.playerName ?? `Jogador ${entry.playerId}`}</td>
                <td className="numeric result__score-col">{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted result__note">
        A pontuação segue a tabela tradicional: cartas numéricas valem o número, Pular, Reverter e
        Compra 2 valem 20, e os coringas valem 50.
      </p>

      <div className="row">
        <button type="button" className="btn btn--primary" onClick={() => navigate('/partidas')}>
          Voltar para as partidas
        </button>
      </div>
    </div>
  );
}
