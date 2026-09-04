import { Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const authService = new AuthService();

export class AuthController {
  public async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const player = await authService.register({ name, email, password });
      res.status(201).json(player);
    } catch (error) {
      next(error);
    }
  }

  public async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization as string;
      const token = authHeader.split(' ')[1];
      const result = await authService.logout(token);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const playerId = req.user!.id;
      const profile = await authService.getProfile(playerId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
}
