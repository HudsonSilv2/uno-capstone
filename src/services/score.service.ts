import Score from '../models/score.model';
import Player from '../models/player.model';
import Game from '../models/game.model';
import { AppError } from '../middlewares/error.middleware';

export class ScoreService {
  public async createScore(data: { playerId: string; gameId: string; score: number }) {
    const newScore = await Score.create(data);
    return {
      id: newScore.id.toString(),
      playerId: newScore.playerId.toString(),
      gameId: newScore.gameId.toString(),
      score: newScore.score,
      timestamp: newScore.timestamp,
    };
  }

  public async getScoreById(id: string) {
    const score = await Score.findByPk(id);
    if (!score) {
      throw new AppError('Score not found', 404);
    }
    return {
      id: score.id.toString(),
      playerId: score.playerId.toString(),
      gameId: score.gameId.toString(),
      score: score.score,
      timestamp: score.timestamp,
    };
  }

  public async updateScore(
    id: string,
    data: { playerId?: string; gameId?: string; score?: number }
  ) {
    const score = await Score.findByPk(id);
    if (!score) {
      throw new AppError('Score not found', 404);
    }
    const updatedScore = await score.update(data);
    return {
      id: updatedScore.id.toString(),
      playerId: updatedScore.playerId.toString(),
      gameId: updatedScore.gameId.toString(),
      score: updatedScore.score,
      timestamp: updatedScore.timestamp,
    };
  }

  public async deleteScore(id: string) {
    const score = await Score.findByPk(id);
    if (!score) {
      throw new AppError('Score not found', 404);
    }
    await score.destroy();
    return { message: 'Score deleted successfully' };
  }

  public async getScoresByGameId(gameId: number) {
    const scores = await Score.findAll({
      where: { gameId },
      include: [{ model: Player, as: 'player', attributes: ['id', 'name'] }],
      order: [['score', 'ASC']],
    });

    return scores.map((s) => ({
      id: s.id.toString(),
      playerId: s.playerId.toString(),
      playerName: (s as any).player?.name ?? null,
      gameId: s.gameId.toString(),
      score: s.score,
      timestamp: s.timestamp,
    }));
  }

  public async getScoreHistory(filters: { playerId?: number; gameId?: number }) {
    const { playerId, gameId } = filters;

    if (!playerId && !gameId) {
      throw new AppError('Provide playerId or gameId to query the score history', 400);
    }

    const where: Record<string, unknown> = {};
    if (playerId) where['playerId'] = playerId;
    if (gameId) where['gameId'] = gameId;

    const scores = await Score.findAll({
      where,
      include: [
        { model: Player, as: 'player', attributes: ['id', 'name'] },
        { model: Game, as: 'gameRef', attributes: ['id', 'title', 'status'] },
      ],
      order: [['timestamp', 'DESC']],
    });

    const history = scores.filter((s) => (s as any).gameRef?.status === 'finished');

    return history.map((s) => ({
      id: s.id.toString(),
      playerId: s.playerId.toString(),
      playerName: (s as any).player?.name ?? null,
      gameId: s.gameId.toString(),
      gameTitle: (s as any).gameRef?.title ?? null,
      score: s.score,
      date: s.timestamp,
    }));
  }
}
