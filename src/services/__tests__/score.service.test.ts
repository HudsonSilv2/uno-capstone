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

jest.mock('../../models/game.model', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../models/player.model', () => ({
  __esModule: true,
  default: {},
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

  describe('getScoreHistory', () => {
    const timestamp = new Date('2026-06-01T12:00:00.000Z');

    const buildHistoryScore = (overrides: Record<string, unknown> = {}) => ({
      id: 1,
      playerId: 10,
      gameId: 5,
      score: 40,
      timestamp,
      player: { id: 10, name: 'Alice' },
      gameRef: { id: 5, title: 'Game 1', status: 'finished' },
      ...overrides,
    });

    it('throws AppError(400) when neither playerId nor gameId is provided', async () => {
      await expect(scoreService.getScoreHistory({})).rejects.toMatchObject({
        message: 'Provide playerId or gameId to query the score history',
        statusCode: 400,
      });
    });

    it('returns history filtered by playerId, only for finished games', async () => {
      mockedScore.findAll.mockResolvedValue([
        buildHistoryScore(),
        buildHistoryScore({ id: 2, gameId: 6, gameRef: { id: 6, title: 'Game 2', status: 'in_progress' } }),
      ]);

      const result = await scoreService.getScoreHistory({ playerId: 10 });

      expect(mockedScore.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { playerId: 10 } })
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        playerId: '10',
        playerName: 'Alice',
        gameId: '5',
        gameTitle: 'Game 1',
        score: 40,
        date: timestamp,
      });
    });

    it('returns history filtered by gameId, only for finished games', async () => {
      mockedScore.findAll.mockResolvedValue([buildHistoryScore()]);

      const result = await scoreService.getScoreHistory({ gameId: 5 });

      expect(mockedScore.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gameId: 5 } })
      );
      expect(result).toHaveLength(1);
      expect(result[0].gameId).toBe('5');
      expect(result[0].gameTitle).toBe('Game 1');
    });

    it('accepts both playerId and gameId simultaneously', async () => {
      mockedScore.findAll.mockResolvedValue([buildHistoryScore()]);

      const result = await scoreService.getScoreHistory({ playerId: 10, gameId: 5 });

      expect(mockedScore.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { playerId: 10, gameId: 5 } })
      );
      expect(result).toHaveLength(1);
    });

    it('excludes entries from games that are not yet finished', async () => {
      mockedScore.findAll.mockResolvedValue([
        buildHistoryScore({ gameRef: { id: 5, title: 'Game in progress', status: 'in_progress' } }),
        buildHistoryScore({ id: 2, gameRef: { id: 5, title: 'Game waiting', status: 'waiting' } }),
      ]);

      const result = await scoreService.getScoreHistory({ playerId: 10 });

      expect(result).toHaveLength(0);
    });

    it('returns an empty array when there are no scores for the filter', async () => {
      mockedScore.findAll.mockResolvedValue([]);

      const result = await scoreService.getScoreHistory({ playerId: 999 });

      expect(result).toEqual([]);
    });

    it('returns results ordered by timestamp DESC (most recent first)', async () => {
      const older = buildHistoryScore({ id: 1, timestamp: new Date('2026-01-01'), score: 20 });
      const newer = buildHistoryScore({ id: 2, timestamp: new Date('2026-06-01'), score: 50 });
      mockedScore.findAll.mockResolvedValue([newer, older]);

      await scoreService.getScoreHistory({ playerId: 10 });

      expect(mockedScore.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ order: [['timestamp', 'DESC']] })
      );
    });

    it('sets playerName to null when the score has no associated player', async () => {
      mockedScore.findAll.mockResolvedValue([buildHistoryScore({ player: undefined })]);

      const [result] = await scoreService.getScoreHistory({ playerId: 10 });

      expect(result.playerName).toBeNull();
    });

    it('sets gameTitle to null when the game ref is missing', async () => {
      mockedScore.findAll.mockResolvedValue([
        buildHistoryScore({ gameRef: { id: 5, title: undefined, status: 'finished' } }),
      ]);

      const [result] = await scoreService.getScoreHistory({ playerId: 10 });

      expect(result.gameTitle).toBeNull();
    });
  });
});
