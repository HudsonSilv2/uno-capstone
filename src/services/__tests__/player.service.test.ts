import { PlayerService } from '../player.service';
import Player from '../../models/player.model';
import bcrypt from 'bcrypt';
import { AppError } from '../../middlewares/error.middleware';

jest.mock('../../models/player.model', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

const mockedPlayer = Player as unknown as {
  findOne: jest.Mock;
  findByPk: jest.Mock;
  create: jest.Mock;
};

const mockedBcrypt = bcrypt as unknown as { hash: jest.Mock };

describe('PlayerService', () => {
  const playerService = new PlayerService();

  describe('createPlayer', () => {
    it('creates a player with a random unusable password and never returns it', async () => {
      const data = { name: 'Felipe', email: 'felipe@example.com' };
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      mockedPlayer.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('random-hashed-password');
      const createdInstance = {
        get: jest.fn().mockReturnValue({
          id: 1,
          name: data.name,
          email: data.email,
          password: 'random-hashed-password',
          createdAt,
        }),
      };
      mockedPlayer.create.mockResolvedValue(createdInstance);

      const result = await playerService.createPlayer(data);

      expect(mockedPlayer.findOne).toHaveBeenCalledWith({ where: { email: data.email } });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(expect.any(String), 10);
      expect(mockedPlayer.create).toHaveBeenCalledWith({
        ...data,
        password: 'random-hashed-password',
      });
      expect(createdInstance.get).toHaveBeenCalledWith({ plain: true });
      expect(result).toEqual({ id: 1, name: data.name, email: data.email, createdAt });
      expect(result).not.toHaveProperty('password');
    });

    it('throws AppError(400) when the email is already in use', async () => {
      const data = { name: 'Felipe', email: 'felipe@example.com' };
      mockedPlayer.findOne.mockResolvedValue({ id: 1, ...data });

      await expect(playerService.createPlayer(data)).rejects.toMatchObject({
        message: 'Email already in use',
        statusCode: 400,
      });
      expect(mockedPlayer.create).not.toHaveBeenCalled();
    });
  });

  describe('getPlayerById', () => {
    it('returns the player when found', async () => {
      const player = { id: 1, name: 'Felipe', email: 'felipe@example.com' };
      mockedPlayer.findByPk.mockResolvedValue(player);

      const result = await playerService.getPlayerById(1);

      expect(mockedPlayer.findByPk).toHaveBeenCalledWith(1, {
        attributes: { exclude: ['password'] },
      });
      expect(result).toBe(player);
    });

    it('throws AppError(404) when the player does not exist', async () => {
      mockedPlayer.findByPk.mockResolvedValue(null);

      await expect(playerService.getPlayerById(999)).rejects.toMatchObject({
        message: 'Player not found',
        statusCode: 404,
      });
    });
  });

  describe('updatePlayer', () => {
    it('updates the player when the email stays the same', async () => {
      const update = jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Felipe Araújo', email: 'felipe@example.com' });
      const existingPlayer = { id: 1, name: 'Felipe', email: 'felipe@example.com', update };
      mockedPlayer.findByPk.mockResolvedValue(existingPlayer);

      await playerService.updatePlayer(1, { name: 'Felipe Araújo' });

      expect(mockedPlayer.findOne).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({ name: 'Felipe Araújo' });
    });

    it('updates the player when the new email is free', async () => {
      const update = jest
        .fn()
        .mockResolvedValue({ id: 1, name: 'Felipe', email: 'new@example.com' });
      const existingPlayer = { id: 1, name: 'Felipe', email: 'felipe@example.com', update };
      mockedPlayer.findByPk.mockResolvedValue(existingPlayer);
      mockedPlayer.findOne.mockResolvedValue(null);

      await playerService.updatePlayer(1, { email: 'new@example.com' });

      expect(mockedPlayer.findOne).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
      expect(update).toHaveBeenCalledWith({ email: 'new@example.com' });
    });

    it('throws AppError(400) when the new email belongs to another player', async () => {
      const update = jest.fn();
      const existingPlayer = { id: 1, name: 'Felipe', email: 'felipe@example.com', update };
      mockedPlayer.findByPk.mockResolvedValue(existingPlayer);
      mockedPlayer.findOne.mockResolvedValue({ id: 2, email: 'taken@example.com' });

      await expect(
        playerService.updatePlayer(1, { email: 'taken@example.com' })
      ).rejects.toMatchObject({
        message: 'Email already in use',
        statusCode: 400,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('throws AppError(404) when the player does not exist', async () => {
      mockedPlayer.findByPk.mockResolvedValue(null);

      await expect(playerService.updatePlayer(999, { name: 'Nobody' })).rejects.toMatchObject({
        message: 'Player not found',
        statusCode: 404,
      });
    });
  });

  describe('deletePlayer', () => {
    it('deletes the player when it exists', async () => {
      const destroy = jest.fn().mockResolvedValue(undefined);
      mockedPlayer.findByPk.mockResolvedValue({ id: 1, destroy });

      const result = await playerService.deletePlayer(1);

      expect(destroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Player deleted successfully' });
    });

    it('throws AppError(404) when the player does not exist', async () => {
      mockedPlayer.findByPk.mockResolvedValue(null);

      await expect(playerService.deletePlayer(999)).rejects.toMatchObject({
        message: 'Player not found',
        statusCode: 404,
      });
    });
  });
});

// Sanity check that AppError is the error class actually thrown by the service.
describe('AppError', () => {
  it('carries the HTTP status code alongside the message', () => {
    const error = new AppError('Player not found', 404);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(404);
  });
});
