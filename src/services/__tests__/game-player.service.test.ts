import { GamePlayerService } from '../game-player.service';
import { GamePlayer } from '../../models/game-player.model';
import Game from '../../models/game.model';
import Card from '../../models/card.model';

jest.mock('../../models/game-player.model', () => ({
  __esModule: true,
  GamePlayer: {
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../models/card.model', () => ({
  __esModule: true,
  default: {
    count: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../models/game.model', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
  },
}));

const mockedGamePlayer = GamePlayer as unknown as {
  findOne: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  findAll: jest.Mock;
  update: jest.Mock;
};

const mockedCard = Card as unknown as {
  count: jest.Mock;
  findAll: jest.Mock;
  update: jest.Mock;
};

const mockedGame = Game as unknown as {
  findByPk: jest.Mock;
};

describe('GamePlayerService', () => {
  const gamePlayerService = new GamePlayerService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinGame', () => {
    it('allows a player to join a waiting game', async () => {
      const mockGame = { id: 1, status: 'waiting', maxPlayers: 4, save: jest.fn() };
      mockedGame.findByPk.mockResolvedValue(mockGame);
      mockedGamePlayer.findOne.mockResolvedValue(null);
      mockedGamePlayer.count.mockResolvedValue(1);
      mockedGamePlayer.create.mockResolvedValue({
        id: 10,
        gameId: 1,
        playerId: 2,
        joinedAt: new Date(),
      });

      const result = await gamePlayerService.joinGame(1, 2);

      expect(mockedGame.findByPk).toHaveBeenCalledWith(1);
      expect(mockedGamePlayer.create).toHaveBeenCalledWith({ gameId: 1, playerId: 2 });
      expect(result.gameId).toBe(1);
      expect(result.playerId).toBe(2);
    });

    it('throws AppError(404) if game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gamePlayerService.joinGame(999, 1)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) if game is not waiting', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });

      await expect(gamePlayerService.joinGame(1, 1)).rejects.toMatchObject({
        message: 'Game is not accepting new players',
        statusCode: 400,
      });
    });

    it('throws AppError(400) if player already in game', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting' });
      mockedGamePlayer.findOne.mockResolvedValue({ id: 1 });

      await expect(gamePlayerService.joinGame(1, 1)).rejects.toMatchObject({
        message: 'Player is already in this game',
        statusCode: 400,
      });
    });

    it('throws AppError(400) if game is full', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting', maxPlayers: 2 });
      mockedGamePlayer.findOne.mockResolvedValue(null);
      mockedGamePlayer.count.mockResolvedValue(2);

      await expect(gamePlayerService.joinGame(1, 1)).rejects.toMatchObject({
        message: 'Game is full',
        statusCode: 400,
      });
    });
  });

  describe('getPlayersByGameId', () => {
    it('returns a list of players in the game', async () => {
      const mockGame = { id: 1 };
      mockedGame.findByPk.mockResolvedValue(mockGame);

      const mockPlayers = [
        { id: 1, gameId: 1, playerId: 101, player: { id: 101, name: 'John' } },
        { id: 2, gameId: 1, playerId: 102, player: { id: 102, name: 'Doe' } },
      ];
      mockedGamePlayer.findAll.mockResolvedValue(mockPlayers);

      const result = await gamePlayerService.getPlayersByGameId(1);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(101);
    });

    it('throws AppError(404) if game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gamePlayerService.getPlayersByGameId(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('leaveGame', () => {
    it('allows a player to leave the game', async () => {
      const mockGame = { id: 1 };
      mockedGame.findByPk.mockResolvedValue(mockGame);

      const mockEntry = {
        id: 1,
        gameId: 1,
        playerId: 2,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      mockedGamePlayer.findOne.mockResolvedValue(mockEntry);

      const result = await gamePlayerService.leaveGame(1, 2);

      expect(mockEntry.destroy).toHaveBeenCalled();
      expect(result.message).toBe('Player left the game successfully');
    });

    it('throws AppError(400) if player is not in game', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1 });
      mockedGamePlayer.findOne.mockResolvedValue(null);

      await expect(gamePlayerService.leaveGame(1, 2)).rejects.toMatchObject({
        message: 'Player is not in this game',
        statusCode: 400,
      });
    });

    it('throws AppError(404) if game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gamePlayerService.leaveGame(999, 2)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) if the game is already finished', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'finished' });

      await expect(gamePlayerService.leaveGame(1, 2)).rejects.toMatchObject({
        message: 'Game is already finished',
        statusCode: 400,
      });
    });

    it('advances currentPlayerId to the next player when the current player leaves', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const mockGame = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 2,
        save,
        players: [
          { id: 2, GamePlayer: { id: 10 } },
          { id: 3, GamePlayer: { id: 11 } },
        ],
      };
      mockedGame.findByPk.mockResolvedValue(mockGame);

      const mockEntry = {
        id: 10,
        gameId: 1,
        playerId: 2,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      mockedGamePlayer.findOne.mockResolvedValue(mockEntry);

      await gamePlayerService.leaveGame(1, 2);

      expect(mockGame.currentPlayerId).toBe(3);
      expect(save).toHaveBeenCalled();
    });

    it('sets currentPlayerId to null when the last remaining player leaves', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const mockGame = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 2,
        save,
        players: [{ id: 2, GamePlayer: { id: 10 } }],
      };
      mockedGame.findByPk.mockResolvedValue(mockGame);

      const mockEntry = {
        id: 10,
        gameId: 1,
        playerId: 2,
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      mockedGamePlayer.findOne.mockResolvedValue(mockEntry);

      await gamePlayerService.leaveGame(1, 2);

      expect(mockGame.currentPlayerId).toBeNull();
      expect(save).toHaveBeenCalled();
    });
  });
  describe('callUno', () => {
    it('flags the player when exactly one card is left in hand', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne.mockResolvedValue({ gameId: 1, playerId: 7, saidUno: false, save });
      mockedCard.count.mockResolvedValue(1);

      const result = await gamePlayerService.callUno(1, 7);

      expect(save).toHaveBeenCalled();
      expect(result).toEqual({ gameId: 1, playerId: 7, saidUno: true });
    });

    it('throws AppError(400) when the hand does not have exactly one card', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne.mockResolvedValue({ gameId: 1, playerId: 7, saidUno: false });
      mockedCard.count.mockResolvedValue(3);

      await expect(gamePlayerService.callUno(1, 7)).rejects.toMatchObject({
        message: 'UNO can only be called with exactly one card in hand',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when the game is not in progress', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting' });

      await expect(gamePlayerService.callUno(1, 7)).rejects.toMatchObject({
        message: 'Game is not in progress',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when the player is not in the game', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne.mockResolvedValue(null);

      await expect(gamePlayerService.callUno(1, 7)).rejects.toMatchObject({
        message: 'Player is not in this game',
        statusCode: 400,
      });
    });

    it('throws AppError(404) when the game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gamePlayerService.callUno(999, 7)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('setReady', () => {
    it('sets the player isReady flag to true when in waiting state', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting' });
      const save = jest.fn().mockResolvedValue(undefined);
      mockedGamePlayer.findOne.mockResolvedValue({ gameId: 1, playerId: 5, isReady: false, save });

      const result = await gamePlayerService.setReady(1, 5);

      expect(save).toHaveBeenCalled();
      expect(result).toEqual({ gameId: 1, playerId: 5, isReady: true });
    });

    it('throws AppError(404) if game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gamePlayerService.setReady(999, 5)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) if game is already started', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });

      await expect(gamePlayerService.setReady(1, 5)).rejects.toMatchObject({
        message: 'Game has already started',
        statusCode: 400,
      });
    });

    it('throws AppError(400) if player is not in game', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting' });
      mockedGamePlayer.findOne.mockResolvedValue(null);

      await expect(gamePlayerService.setReady(1, 5)).rejects.toMatchObject({
        message: 'Player is not in this game',
        statusCode: 400,
      });
    });
  });

  describe('challengeUno', () => {
    it('penalizes the target player with 2 cards if they have 1 card and did not say UNO', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne
        .mockResolvedValueOnce({ gameId: 1, playerId: 1 }) // challenger
        .mockResolvedValueOnce({ gameId: 1, playerId: 2, saidUno: false }); // target
      mockedCard.count.mockResolvedValue(1); // target has 1 card
      mockedCard.findAll.mockResolvedValue([{ id: 101 }, { id: 102 }]);
      mockedCard.update.mockResolvedValue([2]);

      const result = await gamePlayerService.challengeUno(1, 1, 2);

      expect(mockedCard.update).toHaveBeenCalled();
      expect(result).toEqual({
        gameId: 1,
        challengerId: 1,
        targetId: 2,
        penaltyCards: 2,
      });
    });

    it('throws AppError(400) if challenger tries to challenge themselves', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });

      await expect(gamePlayerService.challengeUno(1, 1, 1)).rejects.toMatchObject({
        message: 'You cannot challenge yourself',
        statusCode: 400,
      });
    });

    it('throws AppError(400) if target already said UNO', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne
        .mockResolvedValueOnce({ gameId: 1, playerId: 1 })
        .mockResolvedValueOnce({ gameId: 1, playerId: 2, saidUno: true });
      mockedCard.count.mockResolvedValue(1);

      await expect(gamePlayerService.challengeUno(1, 1, 2)).rejects.toMatchObject({
        message: 'Target player already said UNO',
        statusCode: 400,
      });
    });

    it('throws AppError(400) if target does not have exactly one card', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress' });
      mockedGamePlayer.findOne
        .mockResolvedValueOnce({ gameId: 1, playerId: 1 })
        .mockResolvedValueOnce({ gameId: 1, playerId: 2, saidUno: false });
      mockedCard.count.mockResolvedValue(3);

      await expect(gamePlayerService.challengeUno(1, 1, 2)).rejects.toMatchObject({
        message: 'Target player does not have exactly one card',
        statusCode: 400,
      });
    });
  });
});
