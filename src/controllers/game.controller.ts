import { Request, Response, NextFunction } from 'express';
import { GameService } from '../services/game.service';
import { GamePlayerService } from '../services/game-player.service';
import { ScoreService } from '../services/score.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { syncGame } from '../realtime/game.socket';

const gameService = new GameService();
const gamePlayerService = new GamePlayerService();
const scoreService = new ScoreService();

export class GameController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, status, maxPlayers } = req.body;
      const game = await gameService.createGame({ title, status, maxPlayers });
      res.status(201).json(game);
    } catch (error) {
      next(error);
    }
  }

  public async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const games = await gameService.getAllGames();
      res.json(games);
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const game = await gameService.getGameByIdFormatted(id);
      res.json(game);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { title, status, maxPlayers } = req.body;
      const game = await gameService.updateGame(id, { title, status, maxPlayers });
      res.json(game);
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const result = await gameService.deleteGame(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async join(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const result = await gamePlayerService.joinGame(gameId, playerId);
      await syncGame(gameId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getPlayers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const players = await gamePlayerService.getPlayersByGameId(gameId);
      res.json(players);
    } catch (error) {
      next(error);
    }
  }

  public async leave(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const result = await gamePlayerService.leaveGame(gameId, playerId);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async endGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const result = await gameService.endGame(gameId);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getState(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const userId = req.user!.id;
      const state = await gameService.getGameState(gameId, userId);
      res.json(state);
    } catch (error) {
      next(error);
    }
  }

  public async startGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const result = await gameService.startGame(gameId);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getTurn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const turn = await gameService.getTurn(gameId);
      res.json(turn);
    } catch (error) {
      next(error);
    }
  }

  public async advanceTurn(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const { cardValue } = req.body || {};
      const turn = await gameService.advanceTurn(gameId, playerId, cardValue);
      await syncGame(gameId);
      res.json(turn);
    } catch (error) {
      next(error);
    }
  }

  public async getScoresByGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const scores = await scoreService.getScoresByGameId(gameId);
      res.json(scores);
    } catch (error) {
      next(error);
    }
  }

  public async getTopDiscard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const topDiscard = await gameService.getTopDiscard(gameId);
      res.json(topDiscard);
    } catch (error) {
      next(error);
    }
  }

  public async playCard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const { cardId, chosenColor } = req.body || {};
      const result = await gameService.playCard(gameId, playerId, cardId, chosenColor);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async callUno(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const result = await gamePlayerService.callUno(gameId, playerId);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async drawCard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.id as string, 10);
      const playerId = req.user!.id;
      const result = await gameService.drawCard(gameId, playerId);
      await syncGame(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
