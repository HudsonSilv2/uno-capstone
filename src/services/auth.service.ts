import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Player from '../models/player.model';
import { AppError } from '../middlewares/error.middleware';
import { addToBlacklist } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_me';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export class AuthService {
  /*
    Registers a new player with an encrypted password.
    Returns the player data without exposing the password.
  */
  public async register(data: { name: string; email: string; password: string }) {
    if (!data.name || !data.email || !data.password) {
      throw new AppError('Name, email, and password are required', 400);
    }

    if (data.password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const existing = await Player.findOne({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already in use', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const player = await Player.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    return {
      id: player.id,
      name: player.name,
      email: player.email,
      createdAt: player.createdAt,
    };
  }

  /*
    Authenticates the player by email and password.
    Returns a JWT token valid for 24 hours.
  */
  public async login(data: { email: string; password: string }) {
    if (!data.email || !data.password) {
      throw new AppError('Email and password are required', 400);
    }

    const player = await Player.findOne({ where: { email: data.email } });
    if (!player) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(data.password, player.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign(
      { id: player.id, email: player.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      token,
      player: {
        id: player.id,
        name: player.name,
        email: player.email,
      },
    };
  }

  /*
    Invalidates the token by adding it to the in-memory blacklist.
  */
  public async logout(token: string) {
    addToBlacklist(token);
    return { message: 'Logged out successfully' };
  }

  /*
    Returns the authenticated player's data (without the password).
  */
  public async getProfile(playerId: number) {
    const player = await Player.findByPk(playerId, {
      attributes: { exclude: ['password'] },
    });

    if (!player) {
      throw new AppError('Player not found', 404);
    }

    return {
      id: player.id,
      name: player.name,
      email: player.email,
      createdAt: player.createdAt,
    };
  }
}
