import { GamePlayer } from '../models/game-player.model';
import Game from '../models/game.model';
import Player from '../models/player.model';
import Card from '../models/card.model';
import { AppError } from '../middlewares/error.middleware';

export class GamePlayerService {
  public async joinGame(gameId: number, playerId: number) {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'waiting') {
      throw new AppError('Game is not accepting new players', 400);
    }

    const existingEntry = await GamePlayer.findOne({
      where: { gameId, playerId },
    });
    if (existingEntry) {
      throw new AppError('Player is already in this game', 400);
    }

    const currentPlayerCount = await GamePlayer.count({ where: { gameId } });
    if (currentPlayerCount >= game.maxPlayers) {
      throw new AppError('Game is full', 400);
    }

    const entry = await GamePlayer.create({ gameId, playerId });

    if (!game.currentPlayerId) {
      game.currentPlayerId = playerId;
      await game.save();
    }

    return {
      id: entry.id,
      gameId: entry.gameId,
      playerId: entry.playerId,
      joinedAt: entry.joinedAt,
    };
  }

  public async getPlayersByGameId(gameId: number) {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new AppError('Game not found', 404);
    }

    const entries = await GamePlayer.findAll({
      where: { gameId },
      include: [
        {
          model: Player,
          as: 'player',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return entries.map((entry) => {
      const playerData = (entry as any).player;
      return {
        id: playerData.id,
        name: playerData.name,
        email: playerData.email,
        joinedAt: entry.joinedAt,
        saidUno: entry.saidUno ?? false,
      };
    });
  }

  public async leaveGame(gameId: number, playerId: number) {
    const game = await Game.findByPk(gameId, {
      include: [
        {
          model: Player,
          as: 'players',
          attributes: ['id'],
          through: { attributes: ['id'] },
        },
      ],
    });

    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status === 'finished') {
      throw new AppError('Game is already finished', 400);
    }

    const entry = await GamePlayer.findOne({ where: { gameId, playerId } });
    if (!entry) {
      throw new AppError('Player is not in this game', 400);
    }

    await entry.destroy();

    // If the player who left was the current player, advance to the next one in line
    if (game.currentPlayerId === playerId) {
      const gamePlayers = (game as any).players || [];
      const remaining = gamePlayers
        .filter((p: any) => p.id !== playerId)
        .sort((a: any, b: any) => (a.GamePlayer?.id ?? a.id) - (b.GamePlayer?.id ?? b.id));

      const leavingIndex = gamePlayers
        .sort((a: any, b: any) => (a.GamePlayer?.id ?? a.id) - (b.GamePlayer?.id ?? b.id))
        .findIndex((p: any) => p.id === playerId);

      const nextPlayer = remaining[leavingIndex % remaining.length] ?? null;
      game.currentPlayerId = nextPlayer ? nextPlayer.id : null;
      await game.save();
    }

    return { message: 'Player left the game successfully' };
  }

  /*
    GAME-10: a player signals "UNO" when a single card is left in hand.
    The flag is stored on the game_players row so every participant can see it
    through the game state.
  */
  public async callUno(gameId: number, playerId: number) {
    const game = await Game.findByPk(gameId);
    if (!game) {
      throw new AppError('Game not found', 404);
    }

    if (game.status !== 'in_progress') {
      throw new AppError('Game is not in progress', 400);
    }

    const entry = await GamePlayer.findOne({ where: { gameId, playerId } });
    if (!entry) {
      throw new AppError('Player is not in this game', 400);
    }

    const handSize = await Card.count({ where: { gameId, playerId, location: 'hand' } });
    if (handSize !== 1) {
      throw new AppError('UNO can only be called with exactly one card in hand', 400);
    }

    entry.saidUno = true;
    await entry.save();

    return { gameId, playerId, saidUno: true };
  }

  /*
    Clears the "UNO" flag once the player is no longer down to a single card,
    so the state does not stay stale between turns.
  */
  public async clearUnoFlag(gameId: number, playerId: number) {
    await GamePlayer.update({ saidUno: false }, { where: { gameId, playerId } });
  }
}
