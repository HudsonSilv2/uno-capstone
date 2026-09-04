import { Request, Response, NextFunction } from 'express';
import apiTrackerService from '../services/api-tracker.service';

export class StatsController {
  public getRequests = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await apiTrackerService.getRequestStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  public getResponseTimes = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await apiTrackerService.getResponseTimeStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  public getStatusCodes = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await apiTrackerService.getStatusCodeStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  public getPopularEndpoints = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await apiTrackerService.getPopularEndpointStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };
}

export const statsController = new StatsController();
export default statsController;
