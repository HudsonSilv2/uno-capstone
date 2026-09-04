import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Player from '../models/player.model';
import { AppError } from '../middlewares/error.middleware';

const SALT_ROUNDS = 10;
const READ_ATTRIBUTES = { exclude: ['password'] };

export class PlayerService {
  private sanitize(player: Player) {
    const { password: _password, ...safe } = player.get({ plain: true }) as Record<string, unknown>;
    return safe;
  }

  public async createPlayer(data: { name: string; email: string }) {
    const existing = await Player.findOne({ where: { email: data.email } });
    if (existing) {
      throw new AppError('Email already in use', 400);
    }

    // This endpoint creates a player without login credentials, but the
    // password column is required (players from /auth/register always
    // have one), so it gets an unusable random hash instead of null.
    const password = await bcrypt.hash(randomUUID(), SALT_ROUNDS);
    const player = await Player.create({ ...data, password });
    return this.sanitize(player);
  }

  public async getPlayerById(id: number) {
    const player = await Player.findByPk(id, { attributes: READ_ATTRIBUTES });
    if (!player) {
      throw new AppError('Player not found', 404);
    }
    return player;
  }

  /* Careful if you change this:
     it reuses getPlayerById and validates whether the email is
     already taken, throwing an error if so.
  */

  public async updatePlayer(id: number, data: { name?: string; email?: string }) {
    const player = await this.getPlayerById(id);
    if (data.email && data.email !== player.email) {
      const existing = await Player.findOne({ where: { email: data.email } });
      if (existing) {
        throw new AppError('Email already in use', 400);
      }
    }
    return await player.update(data);
  }

  public async deletePlayer(id: number) {
    const player = await this.getPlayerById(id);
    await player.destroy();
    return { message: 'Player deleted successfully' };
  }
}
