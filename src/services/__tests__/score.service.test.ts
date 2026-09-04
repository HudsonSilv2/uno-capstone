import { ScoreService } from '../score.service';
import Score from '../../models/score.model';

jest.mock('../../models/score.model', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

const mockedScore = Score as unknown as {
  findByPk: jest.Mock;
  findAll: jest.Mock;
  create: jest.Mock;
};

const buildScore = (
  overrides: Partial<{
    id: number;
    playerId: string;
    gameId: string;
    score: number;
    timestamp: Date;
  }> = {}
) => ({
  id: 1,
  playerId: '1',
  gameId: '1',
  score: 200,
  timestamp: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('ScoreService', () => {
  const scoreService = new ScoreService();

  describe('createScore', () => {
    it('creates a score and returns it with string ids', async () => {
      const score = buildScore();
      mockedScore.create.mockResolvedValue(score);

      const result = await scoreService.createScore({
        playerId: score.playerId,
        gameId: score.gameId,
        score: score.score,
      });

      expect(mockedScore.create).toHaveBeenCalledWith({
        playerId: score.playerId,
        gameId: score.gameId,
        score: score.score,
      });
      expect(result).toEqual({
        id: '1',
        playerId: '1',
        gameId: '1',
        score: 200,
        timestamp: score.timestamp,
      });
    });
  });

  describe('getScoreById', () => {
    it('returns the score when found', async () => {
      const score = buildScore();
      mockedScore.findByPk.mockResolvedValue(score);

      const result = await scoreService.getScoreById('1');

      expect(mockedScore.findByPk).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        id: '1',
        playerId: '1',
        gameId: '1',
        score: 200,
        timestamp: score.timestamp,
      });
    });

    it('throws AppError(404) when the score does not exist', async () => {
      mockedScore.findByPk.mockResolvedValue(null);

      await expect(scoreService.getScoreById('999')).rejects.toMatchObject({
        message: 'Score not found',
        statusCode: 404,
      });
    });
  });

  describe('updateScore', () => {
    it('updates the score and returns it with string ids', async () => {
      const updatedScore = buildScore({ score: 300 });
      const update = jest.fn().mockResolvedValue(updatedScore);
      mockedScore.findByPk.mockResolvedValue({ ...buildScore(), update });

      const result = await scoreService.updateScore('1', { score: 300 });

      expect(update).toHaveBeenCalledWith({ score: 300 });
      expect(result.score).toBe(300);
    });

    it('throws AppError(404) when the score does not exist', async () => {
      mockedScore.findByPk.mockResolvedValue(null);

      await expect(scoreService.updateScore('999', { score: 300 })).rejects.toMatchObject({
        message: 'Score not found',
        statusCode: 404,
      });
    });
  });

  describe('deleteScore', () => {
    it('deletes the score when it exists', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      mockedScore.findByPk.mockResolvedValue({ ...buildScore(), destroy });

      const result = await scoreService.deleteScore('1');

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Score deleted successfully' });
    });

    it('throws AppError(404) when the score does not exist', async () => {
      mockedScore.findByPk.mockResolvedValue(null);

      await expect(scoreService.deleteScore('999')).rejects.toMatchObject({
        message: 'Score not found',
        statusCode: 404,
      });
    });
  });

  describe('getScoresByGameId', () => {
    it('returns the scores of a game sorted by score, including the player name', async () => {
      const timestamp = new Date('2026-01-01T10:00:00.000Z');
      const scores = [
        { id: 2, playerId: 2, gameId: 1, score: 100, timestamp, player: { id: 2, name: 'Bob' } },
        { id: 1, playerId: 1, gameId: 1, score: 300, timestamp, player: { id: 1, name: 'Alice' } },
      ];
      mockedScore.findAll.mockResolvedValue(scores);

      const result = await scoreService.getScoresByGameId(1);

      expect(mockedScore.findAll).toHaveBeenCalledWith({
        where: { gameId: 1 },
        include: [{ model: expect.anything(), as: 'player', attributes: ['id', 'name'] }],
        order: [['score', 'ASC']],
      });
      expect(result).toEqual([
        { id: '2', playerId: '2', playerName: 'Bob', gameId: '1', score: 100, timestamp },
        { id: '1', playerId: '1', playerName: 'Alice', gameId: '1', score: 300, timestamp },
      ]);
    });

    it('returns playerName as null when the score has no associated player', async () => {
      mockedScore.findAll.mockResolvedValue([
        { id: 1, playerId: 1, gameId: 1, score: 200, timestamp: new Date() },
      ]);

      const [result] = await scoreService.getScoresByGameId(1);

      expect(result.playerName).toBeNull();
    });

    it('returns an empty array when the game has no scores', async () => {
      mockedScore.findAll.mockResolvedValue([]);

      const result = await scoreService.getScoresByGameId(999);

      expect(result).toEqual([]);
    });
  });
});
