import { AuthService } from '../auth.service';
import Player from '../../models/player.model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { addToBlacklist } from '../../middlewares/auth.middleware';

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
    compare: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(),
  },
}));

jest.mock('../../middlewares/auth.middleware', () => ({
  __esModule: true,
  addToBlacklist: jest.fn(),
}));

const mockedPlayer = Player as unknown as {
  findOne: jest.Mock;
  findByPk: jest.Mock;
  create: jest.Mock;
};

const mockedBcrypt = bcrypt as unknown as { hash: jest.Mock; compare: jest.Mock };
const mockedJwt = jwt as unknown as { sign: jest.Mock };
const mockedAddToBlacklist = addToBlacklist as jest.Mock;

describe('AuthService', () => {
  const authService = new AuthService();

  describe('register', () => {
    const validData = { name: 'Felipe', email: 'felipe@example.com', password: 'secret123' };

    it('registers a player with a hashed password and no password in the response', async () => {
      mockedPlayer.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-password');
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      mockedPlayer.create.mockResolvedValue({
        id: 1,
        name: validData.name,
        email: validData.email,
        password: 'hashed-password',
        createdAt,
      });

      const result = await authService.register(validData);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(validData.password, 10);
      expect(mockedPlayer.create).toHaveBeenCalledWith({
        name: validData.name,
        email: validData.email,
        password: 'hashed-password',
      });
      expect(result).toEqual({ id: 1, name: validData.name, email: validData.email, createdAt });
      expect(result).not.toHaveProperty('password');
    });

    it('throws AppError(400) when name is missing', async () => {
      await expect(authService.register({ ...validData, name: '' })).rejects.toMatchObject({
        message: 'Name, email, and password are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when email is missing', async () => {
      await expect(authService.register({ ...validData, email: '' })).rejects.toMatchObject({
        message: 'Name, email, and password are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when password is missing', async () => {
      await expect(authService.register({ ...validData, password: '' })).rejects.toMatchObject({
        message: 'Name, email, and password are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when password is shorter than 6 characters', async () => {
      await expect(authService.register({ ...validData, password: '123' })).rejects.toMatchObject({
        message: 'Password must be at least 6 characters',
        statusCode: 400,
      });
      expect(mockedPlayer.create).not.toHaveBeenCalled();
    });

    it('throws AppError(400) when the email is already in use', async () => {
      mockedPlayer.findOne.mockResolvedValue({ id: 1, email: validData.email });

      await expect(authService.register(validData)).rejects.toMatchObject({
        message: 'Email already in use',
        statusCode: 400,
      });
      expect(mockedPlayer.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const credentials = { email: 'felipe@example.com', password: 'secret123' };

    it('returns a token and the player data when credentials are valid', async () => {
      const player = {
        id: 1,
        name: 'Felipe',
        email: credentials.email,
        password: 'hashed-password',
      };
      mockedPlayer.findOne.mockResolvedValue(player);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedJwt.sign.mockReturnValue('signed-token');

      const result = await authService.login(credentials);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(credentials.password, player.password);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { id: player.id, email: player.email },
        expect.any(String),
        { expiresIn: '24h' }
      );
      expect(result).toEqual({
        token: 'signed-token',
        player: { id: player.id, name: player.name, email: player.email },
      });
    });

    it('throws AppError(400) when email is missing', async () => {
      await expect(authService.login({ ...credentials, email: '' })).rejects.toMatchObject({
        message: 'Email and password are required',
        statusCode: 400,
      });
    });

    it('throws AppError(400) when password is missing', async () => {
      await expect(authService.login({ ...credentials, password: '' })).rejects.toMatchObject({
        message: 'Email and password are required',
        statusCode: 400,
      });
    });

    it('throws AppError(401) when the player does not exist', async () => {
      mockedPlayer.findOne.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    });

    it('throws AppError(401) when the password is invalid', async () => {
      mockedPlayer.findOne.mockResolvedValue({
        id: 1,
        email: credentials.email,
        password: 'hashed-password',
      });
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
      });
      expect(mockedJwt.sign).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('adds the token to the blacklist and returns a confirmation message', async () => {
      const result = await authService.logout('some-token');

      expect(mockedAddToBlacklist).toHaveBeenCalledWith('some-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getProfile', () => {
    it('returns the player data without the password field', async () => {
      const createdAt = new Date('2026-01-01T10:00:00.000Z');
      mockedPlayer.findByPk.mockResolvedValue({
        id: 1,
        name: 'Felipe',
        email: 'felipe@example.com',
        createdAt,
      });

      const result = await authService.getProfile(1);

      expect(mockedPlayer.findByPk).toHaveBeenCalledWith(1, {
        attributes: { exclude: ['password'] },
      });
      expect(result).toEqual({ id: 1, name: 'Felipe', email: 'felipe@example.com', createdAt });
    });

    it('throws AppError(404) when the player does not exist', async () => {
      mockedPlayer.findByPk.mockResolvedValue(null);

      await expect(authService.getProfile(999)).rejects.toMatchObject({
        message: 'Player not found',
        statusCode: 404,
      });
    });
  });
});
