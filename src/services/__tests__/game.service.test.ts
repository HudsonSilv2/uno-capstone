import { Op } from 'sequelize';
import { GameService } from '../game.service';
import Game from '../../models/game.model';
import Card from '../../models/card.model';
import Score from '../../models/score.model';

jest.mock('../../models/game.model', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../models/card.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
    destroy: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../models/game-player.model', () => ({
  __esModule: true,
  default: {
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue([0]),
  },
}));

jest.mock('../../models/score.model', () => ({
  __esModule: true,
  default: {
    bulkCreate: jest.fn(),
  },
}));

const mockedGame = Game as unknown as {
  findByPk: jest.Mock;
  findAll: jest.Mock;
  create: jest.Mock;
};

const mockedCard = Card as unknown as {
  findOne: jest.Mock;
  findAll: jest.Mock;
  findByPk: jest.Mock;
  count: jest.Mock;
  destroy: jest.Mock;
  bulkCreate: jest.Mock;
  update: jest.Mock;
};

const mockedScore = Score as unknown as {
  bulkCreate: jest.Mock;
};

const buildGame = (
  overrides: Partial<{
    id: number;
    title: string;
    status: string;
    maxPlayers: number;
    currentPlayerId: number | null;
    direction: string;
    players: any[];
  }> = {}
) => ({
  id: 1,
  title: 'Partida da Tarde',
  status: 'waiting',
  maxPlayers: 4,
  currentPlayerId: 1,
  direction: 'clockwise',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('GameService', () => {
  const gameService = new GameService();

  describe('createGame', () => {
    it('creates a game and returns it in the standard output shape', async () => {
      const game = buildGame();
      mockedGame.create.mockResolvedValue(game);

      const result = await gameService.createGame({
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
      });

      expect(mockedGame.create).toHaveBeenCalledWith({
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
      });
      expect(result).toEqual({
        id: game.id,
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
        currentPlayerId: game.currentPlayerId,
        direction: game.direction,
        createdAt: game.createdAt,
      });
    });
  });

  describe('getGameById', () => {
    it('returns the raw game instance when found', async () => {
      const game = buildGame();
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.getGameById(1);

      expect(mockedGame.findByPk).toHaveBeenCalledWith(1);
      expect(result).toBe(game);
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.getGameById(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('getGameByIdFormatted', () => {
    it('returns the game in the standard output shape', async () => {
      const game = buildGame();
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.getGameByIdFormatted(1);

      expect(result).toEqual({
        id: game.id,
        title: game.title,
        status: game.status,
        maxPlayers: game.maxPlayers,
        currentPlayerId: game.currentPlayerId,
        direction: game.direction,
        createdAt: game.createdAt,
      });
    });
  });

  describe('getAllGames', () => {
    it('returns every game formatted', async () => {
      const games = [buildGame({ id: 1 }), buildGame({ id: 2, title: 'Partida da Noite' })];
      mockedGame.findAll.mockResolvedValue(games);

      const result = await gameService.getAllGames();

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({ id: 2, title: 'Partida da Noite' });
    });

    it('returns an empty array when there are no games', async () => {
      mockedGame.findAll.mockResolvedValue([]);

      const result = await gameService.getAllGames();

      expect(result).toEqual([]);
    });
  });

  describe('updateGame', () => {
    it('updates the game and returns the standard output shape', async () => {
      const update = jest.fn().mockResolvedValue(undefined);
      const game = { ...buildGame(), status: 'in_progress', update };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.updateGame(1, { status: 'in_progress' });

      expect(update).toHaveBeenCalledWith({ status: 'in_progress' });
      expect(result.status).toBe('in_progress');
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.updateGame(999, { status: 'in_progress' })).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('deleteGame', () => {
    it('deletes the game when it exists', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      mockedGame.findByPk.mockResolvedValue({ ...buildGame(), destroy });

      const result = await gameService.deleteGame(1);

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Game deleted successfully' });
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.deleteGame(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('getGameState', () => {
    it('returns complete game state with private hand and public player card counts', async () => {
      const game = buildGame({
        id: 1,
        status: 'in_progress',
        currentPlayerId: 2,
        direction: 'clockwise',
        players: [
          { id: 1, name: 'Player 1' },
          { id: 2, name: 'Player 2' },
        ],
      });
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findOne.mockResolvedValue({ id: 10, color: 'red', value: '7' });
      mockedCard.findAll.mockResolvedValue([
        { id: 101, color: 'blue', value: '3' },
        { id: 102, color: 'yellow', value: 'Skip' },
      ]);
      mockedCard.count.mockImplementation(({ where }: any) => {
        if (where.playerId === 1) return Promise.resolve(2);
        if (where.playerId === 2) return Promise.resolve(5);
        return Promise.resolve(0);
      });

      const state = await gameService.getGameState(1, 1);

      expect(state).toEqual({
        id: 1,
        title: 'Partida da Tarde',
        status: 'in_progress',
        maxPlayers: 4,
        currentPlayerId: 2,
        direction: 'clockwise',
        topDiscard: { id: 10, color: 'red', value: '7' },
        players: [
          { id: 1, name: 'Player 1', cardCount: 2, saidUno: false },
          { id: 2, name: 'Player 2', cardCount: 5, saidUno: false },
        ],
        hand: [
          { id: 101, color: 'blue', value: '3' },
          { id: 102, color: 'yellow', value: 'Skip' },
        ],
      });
    });

    it('throws AppError(404) when game is not found', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.getGameState(999, 1)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(403) when requesting player is not in the game', async () => {
      const game = buildGame({
        id: 1,
        players: [{ id: 2, name: 'Player 2' }],
      });
      mockedGame.findByPk.mockResolvedValue(game);

      await expect(gameService.getGameState(1, 99)).rejects.toMatchObject({
        message: 'Player is not part of this game',
        statusCode: 403,
      });
    });
  });

  describe('getTopDiscard', () => {
    it('returns the id, color and value of the top discard card', async () => {
      mockedGame.findByPk.mockResolvedValue(buildGame({ id: 1 }));
      mockedCard.findOne.mockResolvedValue({ id: 10, color: 'red', value: '7' });

      const result = await gameService.getTopDiscard(1);

      expect(result).toEqual({ id: 10, color: 'red', value: '7' });
    });

    it('returns null fields when the discard pile has not been started', async () => {
      mockedGame.findByPk.mockResolvedValue(buildGame({ id: 1 }));
      mockedCard.findOne.mockResolvedValue(null);

      const result = await gameService.getTopDiscard(1);

      expect(result).toEqual({ id: null, color: null, value: null });
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.getTopDiscard(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });
  });

  describe('startGame', () => {
    it('shuffles a full 108-card deck, deals 7 cards per player, and marks the game in_progress', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const players = [
        { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
        { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
      ];
      const game: any = { id: 1, status: 'waiting', players, save };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.destroy.mockResolvedValue(undefined);
      mockedCard.bulkCreate.mockImplementation((cards: any[]) =>
        Promise.resolve(cards.map((c, i) => ({ ...c, id: i + 1 })))
      );
      mockedCard.update.mockResolvedValue([7]);

      const result = await gameService.startGame(1);

      expect(mockedCard.destroy).toHaveBeenCalledWith({ where: { gameId: 1 } });
      const dealtDeck = mockedCard.bulkCreate.mock.calls[0][0];
      expect(dealtDeck).toHaveLength(108);
      // 2 calls to deal hands + 1 call to flip the starter discard card
      expect(mockedCard.update).toHaveBeenCalledTimes(3);
      expect(game.status).toBe('in_progress');
      expect(game.direction).toBe('clockwise');
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({
        gameId: 1,
        status: 'in_progress',
        direction: 'clockwise',
        totalCards: 108,
        players: [
          { id: 1, name: 'Alice', cardsDealt: 7 },
          { id: 2, name: 'Bob', cardsDealt: 7 },
        ],
      });
    });

    it('never starts the discard pile with a wild card, even if the first cards after dealing are wild', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const players = [
        { id: 1, name: 'Alice', GamePlayer: { id: 10 } },
        { id: 2, name: 'Bob', GamePlayer: { id: 11 } },
      ];
      const game: any = { id: 1, status: 'waiting', players, save };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.destroy.mockResolvedValue(undefined);

      // 14 cards dealt to hands (ids 1-14), then two wild cards (ids 15-16)
      // right after dealing, then the first colored card (id 17).
      const fixedDeck = Array.from({ length: 108 }, (_, i) => ({
        id: i + 1,
        gameId: 1,
        location: 'deck',
        color: i < 14 ? 'red' : i === 14 || i === 15 ? 'wild' : 'blue',
        value: i < 14 ? '1' : i === 14 || i === 15 ? 'Wild Card' : '2',
      }));
      mockedCard.bulkCreate.mockResolvedValue(fixedDeck);
      mockedCard.update.mockResolvedValue([1]);

      await gameService.startGame(1);

      const discardCall = mockedCard.update.mock.calls.find(
        ([data]) => data.location === 'discard'
      );
      expect(discardCall).toBeDefined();
      expect(discardCall![0]).toEqual({ location: 'discard', playerId: null });
      expect(discardCall![1]).toEqual({ where: { id: 17 } });
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.startGame(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game is not waiting for players', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', players: [] });

      await expect(gameService.startGame(1)).rejects.toMatchObject({
        message: 'Game has already started or is finished',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when there are fewer than 2 players', async () => {
      mockedGame.findByPk.mockResolvedValue({
        id: 1,
        status: 'waiting',
        players: [{ id: 1, name: 'Alice', GamePlayer: { id: 10 } }],
      });

      await expect(gameService.startGame(1)).rejects.toMatchObject({
        message: 'At least 2 players are required to start the game',
        statusCode: 400,
      });
    });
  });

  describe('getTurn', () => {
    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.getTurn(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game has no players', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, players: [] });

      await expect(gameService.getTurn(1)).rejects.toMatchObject({
        message: 'No players in this game',
        statusCode: 400,
      });
    });

    it('returns the current player when currentPlayerId matches an existing player', async () => {
      const save = jest.fn();
      const game = {
        id: 1,
        currentPlayerId: 2,
        direction: 'clockwise',
        save,
        players: [
          { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
          { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
        ],
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.getTurn(1);

      expect(save).not.toHaveBeenCalled();
      expect(result).toEqual({
        gameId: 1,
        currentPlayerId: 2,
        currentPlayer: { id: 2, name: 'Bob', email: 'bob@x.com' },
        direction: 'clockwise',
      });
    });

    it('defaults to the first player by join order when currentPlayerId matches no one', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: null,
        direction: null,
        save,
        players: [
          { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
          { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
        ],
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.getTurn(1);

      expect(game.currentPlayerId).toBe(1);
      expect(save).toHaveBeenCalled();
      expect(result.currentPlayerId).toBe(1);
      expect(result.direction).toBe('clockwise');
    });
  });

  describe('advanceTurn', () => {
    const threePlayers = () => [
      { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
      { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
      { id: 3, name: 'Carol', email: 'carol@x.com', GamePlayer: { id: 12 } },
    ];

    it('throws AppError(400) for an unrecognized cardValue', async () => {
      await expect(gameService.advanceTurn(1, 1, 'Not A Card')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.advanceTurn(999, 1)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game has no players', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, players: [] });

      await expect(gameService.advanceTurn(1, 1)).rejects.toMatchObject({
        message: 'No players in this game',
        statusCode: 400,
      });
    });

    it('throws AppError(403) when it is not the requesting player turn', async () => {
      mockedGame.findByPk.mockResolvedValue({
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        players: threePlayers(),
      });

      await expect(gameService.advanceTurn(1, 2)).rejects.toMatchObject({
        message: 'It is not your turn',
        statusCode: 403,
      });
    });

    it('falls back to the first player when currentPlayerId is not among the game players', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 99,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.advanceTurn(1, 99);

      expect(result.previousPlayerId).toBe(1);
      expect(result.currentPlayerId).toBe(2);
    });

    it('advances to the next player clockwise on a normal play', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.advanceTurn(1, 1);

      expect(game.currentPlayerId).toBe(2);
      expect(game.direction).toBe('clockwise');
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({
        gameId: 1,
        previousPlayerId: 1,
        currentPlayerId: 2,
        currentPlayer: { id: 2, name: 'Bob', email: 'bob@x.com' },
        direction: 'clockwise',
      });
      expect(result).not.toHaveProperty('drawEffect');
    });

    it('skips one player forward when a Skip card is played', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.advanceTurn(1, 1, 'Skip');

      expect(result.currentPlayerId).toBe(3);
      expect(result).not.toHaveProperty('drawEffect');
    });

    it('reverses the direction with 3+ players without skipping a turn', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.advanceTurn(1, 1, 'Reverse');

      expect(result.direction).toBe('counter-clockwise');
      expect(result.currentPlayerId).toBe(3);
    });

    it('reversing with exactly 2 players keeps the turn with the same player', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const twoPlayers = [
        { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
        { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
      ];
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: twoPlayers,
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const result = await gameService.advanceTurn(1, 1, 'Reverse');

      expect(result.direction).toBe('counter-clockwise');
      expect(result.currentPlayerId).toBe(1);
    });

    it('makes the skipped player draw 2 cards when a Draw Two is played and the deck has cards', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findAll.mockResolvedValue([{ id: 501 }, { id: 502 }]);
      mockedCard.update.mockResolvedValue([2]);

      const result = await gameService.advanceTurn(1, 1, 'Draw Two');

      expect(mockedCard.findAll).toHaveBeenCalledWith({
        where: { gameId: 1, location: 'deck', playerId: null },
        limit: 2,
        order: [['id', 'ASC']],
      });
      expect(mockedCard.update).toHaveBeenCalledWith(
        { playerId: 2, location: 'hand' },
        { where: { id: { [Op.in]: [501, 502] } } }
      );
      expect(result.currentPlayerId).toBe(3);
      expect(result).toMatchObject({
        drawEffect: { targetPlayerId: 2, targetPlayerName: 'Bob', cardsDrawn: 2 },
      });
    });

    it('makes the skipped player draw 4 cards when a Wild Draw Four is played', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
      mockedCard.update.mockResolvedValue([4]);

      const result = await gameService.advanceTurn(1, 1, 'Wild Draw Four');

      expect(mockedCard.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 4 }));
      expect(result).toMatchObject({
        drawEffect: { targetPlayerId: 2, targetPlayerName: 'Bob', cardsDrawn: 4 },
      });
    });

    it('does not report a draw effect when the deck is empty', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        currentPlayerId: 1,
        direction: 'clockwise',
        save,
        players: threePlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findAll.mockResolvedValue([]);

      const result = await gameService.advanceTurn(1, 1, 'Draw Two');

      expect(mockedCard.update).not.toHaveBeenCalled();
      expect(result).not.toHaveProperty('drawEffect');
    });
  });

  describe('playCard', () => {
    const twoPlayers = () => [
      { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
      { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
    ];

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.playCard(999, 1, 5)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game is not in progress', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting', currentPlayerId: 1 });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'Game is not in progress',
        statusCode: 400,
      });
    });

    it('throws AppError(403) when it is not the requesting player turn', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 2 });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'It is not your turn',
        statusCode: 403,
      });
    });

    it('throws AppError(404) when the card does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue(null);

      await expect(gameService.playCard(1, 1, 999)).rejects.toMatchObject({
        message: 'Card not found',
        statusCode: 404,
      });
    });

    it('throws AppError(404) when the card belongs to a different game', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({ id: 5, gameId: 2 });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'Card not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the card is not in the requesting player hand', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({ id: 5, gameId: 1, location: 'deck', playerId: null });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'Card is not in your hand',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when the discard pile has not been started yet', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'red',
        value: '5',
      });
      mockedCard.findOne.mockResolvedValue(null);

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'The discard pile has not been started yet',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when the card matches neither the color nor the value', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'red',
        value: '5',
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'blue', value: '9' });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({
        message: 'Card does not match the current color or value',
        statusCode: 400,
      });
    });

    it('plays a card that matches by color and advances the turn', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'red',
        value: '5',
        update: cardUpdate,
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });

      const result = await gameService.playCard(1, 1, 5);

      expect(cardUpdate).toHaveBeenCalledWith({
        location: 'discard',
        playerId: null,
        color: 'red',
      });
      expect(result.playedCard).toEqual({ id: 5, color: 'red', value: '5' });
      expect(result.currentPlayerId).toBe(2);
    });

    it('plays a card that matches by value even when the color is different', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'blue',
        value: '9',
        update: cardUpdate,
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });

      const result = await gameService.playCard(1, 1, 5);

      expect(cardUpdate).toHaveBeenCalledWith({
        location: 'discard',
        playerId: null,
        color: 'blue',
      });
      expect(result.currentPlayerId).toBe(2);
    });

    it('throws AppError(400) when playing a wild card without choosing a color', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'wild',
        value: 'Wild Card',
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });

      await expect(gameService.playCard(1, 1, 5)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws AppError(400) when the chosen color is not a valid UNO color', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 1 });
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'wild',
        value: 'Wild Card',
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });

      await expect(gameService.playCard(1, 1, 5, 'pink')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('plays a wild card and sets the chosen color on the discard pile', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'wild',
        value: 'Wild Card',
        update: cardUpdate,
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });

      const result = await gameService.playCard(1, 1, 5, 'green');

      expect(cardUpdate).toHaveBeenCalledWith({
        location: 'discard',
        playerId: null,
        color: 'green',
      });
      expect(result.playedCard).toEqual({ id: 5, color: 'green', value: 'Wild Card' });
    });

    it('plays a Wild Draw Four (always legal) and makes the next player draw 4 cards', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findByPk.mockResolvedValue({
        id: 5,
        gameId: 1,
        location: 'hand',
        playerId: 1,
        color: 'wild',
        value: 'Wild Draw Four',
        update: cardUpdate,
      });
      mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });
      mockedCard.findAll.mockResolvedValue([{ id: 501 }, { id: 502 }, { id: 503 }, { id: 504 }]);
      mockedCard.update.mockResolvedValue([4]);

      const result = await gameService.playCard(1, 1, 5, 'blue');

      expect(result).toMatchObject({
        drawEffect: { targetPlayerId: 2, targetPlayerName: 'Bob', cardsDrawn: 4 },
        playedCard: { id: 5, color: 'blue', value: 'Wild Draw Four' },
      });
    });
  });

  describe('drawCard', () => {
    const twoPlayers = () => [
      { id: 1, name: 'Alice', email: 'alice@x.com', GamePlayer: { id: 10 } },
      { id: 2, name: 'Bob', email: 'bob@x.com', GamePlayer: { id: 11 } },
    ];

    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.drawCard(999, 1)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game is not in progress', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting', currentPlayerId: 1 });

      await expect(gameService.drawCard(1, 1)).rejects.toMatchObject({
        message: 'Game is not in progress',
        statusCode: 400,
      });
    });

    it('throws AppError(403) when it is not the requesting player turn', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'in_progress', currentPlayerId: 2 });

      await expect(gameService.drawCard(1, 1)).rejects.toMatchObject({
        message: 'It is not your turn',
        statusCode: 403,
      });
    });

    it('draws a card that cannot be played and advances the turn automatically', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const drawnCard = {
        id: 50,
        gameId: 1,
        location: 'deck',
        playerId: null,
        color: 'blue',
        value: '4',
        update: cardUpdate,
      };

      mockedCard.findOne.mockImplementation(({ where }: any) => {
        if (where.location === 'deck') return Promise.resolve(drawnCard);
        if (where.location === 'discard')
          return Promise.resolve({ id: 1, color: 'red', value: '9' });
        return Promise.resolve(null);
      });

      const result = await gameService.drawCard(1, 1);

      expect(cardUpdate).toHaveBeenCalledWith({ location: 'hand', playerId: 1 });
      expect(result.canPlayDrawnCard).toBe(false);
      expect(result.drawnCard).toEqual({ id: 50, color: 'blue', value: '4' });
      expect(result.currentPlayerId).toBe(2);
    });

    it('draws a card that can be played and leaves the turn with the same player', async () => {
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const drawnCard = {
        id: 50,
        gameId: 1,
        location: 'deck',
        playerId: null,
        color: 'red',
        value: '4',
        update: cardUpdate,
      };

      mockedCard.findOne.mockImplementation(({ where }: any) => {
        if (where.location === 'deck') return Promise.resolve(drawnCard);
        if (where.location === 'discard')
          return Promise.resolve({ id: 1, color: 'red', value: '9' });
        return Promise.resolve(null);
      });

      const result = await gameService.drawCard(1, 1);

      expect(result).toEqual({
        gameId: 1,
        currentPlayerId: 1,
        drawnCard: { id: 50, color: 'red', value: '4' },
        canPlayDrawnCard: true,
      });
    });

    it('reshuffles the discard pile into the deck when the deck has run out', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
        save,
      };
      mockedGame.findByPk.mockResolvedValue(game);

      const cardUpdate = jest.fn().mockResolvedValue(undefined);
      const reshuffledCard = {
        id: 60,
        gameId: 1,
        location: 'deck',
        playerId: null,
        color: 'green',
        value: '2',
        update: cardUpdate,
      };

      let deckCallCount = 0;
      mockedCard.findOne.mockImplementation(({ where }: any) => {
        if (where.location === 'deck') {
          deckCallCount += 1;
          return Promise.resolve(deckCallCount === 1 ? null : reshuffledCard);
        }
        if (where.location === 'discard')
          return Promise.resolve({ id: 1, color: 'red', value: '9' });
        return Promise.resolve(null);
      });
      mockedCard.update.mockResolvedValue([5]);

      const result = await gameService.drawCard(1, 1);

      expect(mockedCard.update).toHaveBeenCalledWith(
        { location: 'deck', playerId: null },
        { where: { gameId: 1, location: 'discard', id: { [Op.ne]: 1 } } }
      );
      expect(result.drawnCard).toEqual({ id: 60, color: 'green', value: '2' });
    });

    it('throws AppError(400) when there are no cards left to draw even after reshuffling', async () => {
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 1,
        direction: 'clockwise',
        players: twoPlayers(),
      };
      mockedGame.findByPk.mockResolvedValue(game);

      mockedCard.findOne.mockImplementation(({ where }: any) => {
        if (where.location === 'deck') return Promise.resolve(null);
        if (where.location === 'discard') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await expect(gameService.drawCard(1, 1)).rejects.toMatchObject({
        message: 'No cards left to draw',
        statusCode: 400,
      });
    });
  });

  describe('endGame', () => {
    it('throws AppError(404) when the game does not exist', async () => {
      mockedGame.findByPk.mockResolvedValue(null);

      await expect(gameService.endGame(999)).rejects.toMatchObject({
        message: 'Game not found',
        statusCode: 404,
      });
    });

    it('throws AppError(400) when the game is not in progress', async () => {
      mockedGame.findByPk.mockResolvedValue({ id: 1, status: 'waiting', players: [] });

      await expect(gameService.endGame(1)).rejects.toMatchObject({
        message: 'Game is not in progress',
        statusCode: 400,
      });
    });

    it('scores every player by their remaining hand, persists the scores, and declares the lowest score the winner', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const game: any = {
        id: 1,
        status: 'in_progress',
        currentPlayerId: 2,
        save,
        players: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Carol' },
        ],
      };
      mockedGame.findByPk.mockResolvedValue(game);
      mockedCard.findAll.mockImplementation(({ where }: any) => {
        if (where.playerId === 1)
          return Promise.resolve([{ value: '0' }, { value: '9' }, { value: 'Skip' }]);
        if (where.playerId === 2)
          return Promise.resolve([{ value: 'Reverse' }, { value: 'Draw Two' }]);
        if (where.playerId === 3)
          return Promise.resolve([{ value: 'Wild Card' }, { value: 'Wild Draw Four' }]);
        return Promise.resolve([]);
      });
      mockedScore.bulkCreate.mockResolvedValue([]);

      const result = await gameService.endGame(1);

      expect(mockedScore.bulkCreate).toHaveBeenCalledWith([
        { playerId: 1, gameId: 1, score: 29 },
        { playerId: 2, gameId: 1, score: 40 },
        { playerId: 3, gameId: 1, score: 100 },
      ]);
      expect(game.status).toBe('finished');
      expect(game.currentPlayerId).toBeNull();
      expect(save).toHaveBeenCalled();
      expect(result).toEqual({
        gameId: 1,
        status: 'finished',
        winner: { playerId: 1, playerName: 'Alice', score: 29 },
        scores: [
          { playerId: 1, playerName: 'Alice', score: 29 },
          { playerId: 2, playerName: 'Bob', score: 40 },
          { playerId: 3, playerName: 'Carol', score: 100 },
        ],
      });
    });
  });
});

describe('GameService - round victory (GAME-11)', () => {
  const gameService = new GameService();

  it('finishes the round and scores the hands when the player empties their hand', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const cardUpdate = jest.fn().mockResolvedValue(undefined);
    const game: any = {
      id: 1,
      status: 'in_progress',
      currentPlayerId: 1,
      direction: 'clockwise',
      players: [
        { id: 1, name: 'Player 1' },
        { id: 2, name: 'Player 2' },
      ],
      save,
    };
    mockedGame.findByPk.mockResolvedValue(game);
    mockedCard.findByPk.mockResolvedValue({
      id: 5,
      gameId: 1,
      location: 'hand',
      playerId: 1,
      color: 'red',
      value: '5',
      update: cardUpdate,
    });
    mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });
    // No cards left in the winner's hand
    mockedCard.count.mockResolvedValue(0);
    // Hands used for scoring: winner is empty, the opponent still holds a Skip
    mockedCard.findAll
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ value: 'Skip' }]);
    mockedScore.bulkCreate.mockResolvedValue([]);

    const result: any = await gameService.playCard(1, 1, 5);

    expect(result.roundFinished).toBe(true);
    expect(result.status).toBe('finished');
    expect(result.currentPlayerId).toBeNull();
    expect(result.winner).toEqual({ playerId: 1, playerName: 'Player 1', score: 0 });
    expect(result.scores).toEqual([
      { playerId: 1, playerName: 'Player 1', score: 0 },
      { playerId: 2, playerName: 'Player 2', score: 20 },
    ]);
    expect(mockedScore.bulkCreate).toHaveBeenCalledWith([
      { playerId: 1, gameId: 1, score: 0 },
      { playerId: 2, gameId: 1, score: 20 },
    ]);
    expect(game.status).toBe('finished');
  });

  it('keeps passing the turn while the player still holds cards', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const game: any = {
      id: 1,
      status: 'in_progress',
      currentPlayerId: 1,
      direction: 'clockwise',
      players: [
        { id: 1, name: 'Player 1', GamePlayer: { id: 1 } },
        { id: 2, name: 'Player 2', GamePlayer: { id: 2 } },
      ],
      save,
    };
    mockedGame.findByPk.mockResolvedValue(game);
    mockedCard.findByPk.mockResolvedValue({
      id: 5,
      gameId: 1,
      location: 'hand',
      playerId: 1,
      color: 'red',
      value: '5',
      update: jest.fn().mockResolvedValue(undefined),
    });
    mockedCard.findOne.mockResolvedValue({ id: 1, color: 'red', value: '9' });
    mockedCard.count.mockResolvedValue(3);

    const result: any = await gameService.playCard(1, 1, 5);

    expect(result.roundFinished).toBe(false);
    expect(result.currentPlayerId).toBe(2);
    expect(mockedScore.bulkCreate).not.toHaveBeenCalled();
  });
});
