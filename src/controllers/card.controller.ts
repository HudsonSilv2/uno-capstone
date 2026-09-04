import { Request, Response, NextFunction } from 'express';
import { CardService } from '../services/card.service';

const cardService = new CardService();

export class CardController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { color, value, gameId } = req.body;
      const card = await cardService.createCard({ color, value, gameId });
      res.status(201).json(card);
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const card = await cardService.getCardById(id);
      res.json(card);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { color, value, gameId } = req.body;
      const card = await cardService.updateCard(id, { color, value, gameId });
      res.json(card);
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const result = await cardService.deleteCard(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getByGameId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId = parseInt(req.params.gameId as string, 10);
      const cards = await cardService.getCardsByGameId(gameId);
      res.json(cards);
    } catch (error) {
      next(error);
    }
  }
}
