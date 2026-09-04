import { Request, Response, NextFunction } from 'express';
import { ScoreService } from '../services/score.service';

const scoreService = new ScoreService();

export class ScoreController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { playerId, gameId, score } = req.body;
      const newScore = await scoreService.createScore({
        playerId: playerId.toString(),
        gameId: gameId.toString(),
        score: parseInt(score, 10),
      });
      res.status(201).json(newScore);
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const score = await scoreService.getScoreById(id);
      res.json(score);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { playerId, gameId, score } = req.body;

      const updateData: { playerId?: string; gameId?: string; score?: number } = {};
      if (playerId !== undefined) updateData.playerId = playerId.toString();
      if (gameId !== undefined) updateData.gameId = gameId.toString();
      if (score !== undefined) updateData.score = parseInt(score, 10);

      const updatedScore = await scoreService.updateScore(id, updateData);
      res.json(updatedScore);
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await scoreService.deleteScore(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
