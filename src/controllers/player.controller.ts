import { Request, Response, NextFunction } from 'express';
import { PlayerService } from '../services/player.service';

const playerService = new PlayerService();

/* Full CRUD with the basics, but it can be refined if needed.
   Example of a refinement: move all validations here instead of the service,
   wrap them in a try/catch if you want, but leave it as is for now.
*/

export class PlayerController {
  public async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email } = req.body;
      const player = await playerService.createPlayer({ name, email });
      res.status(201).json(player);
    } catch (error) {
      next(error);
    }
  }

  public async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const player = await playerService.getPlayerById(id);
      res.json(player);
    } catch (error) {
      next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { name, email } = req.body;
      const player = await playerService.updatePlayer(id, { name, email });
      res.json(player);
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      const result = await playerService.deletePlayer(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
