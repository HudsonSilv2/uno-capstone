import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from './auth.middleware';
import apiTrackerService from '../services/api-tracker.service';

/**
 * Helper to extract and persist API usage tracking data.
 */
const recordApiUsage = (
  req: Request | AuthRequest,
  res: Response,
  startTime: number,
  timestamp: Date
): void => {
  const responseTime = Date.now() - startTime;
  const endpointAccess = req.originalUrl || req.baseUrl + req.path || req.url;
  const requestMethod = req.method;
  const statusCode = res.statusCode;

  const authReq = req as AuthRequest;
  const userId =
    authReq.user && authReq.user.id !== undefined && authReq.user.id !== null
      ? String(authReq.user.id)
      : null;

  // Persist tracking info asynchronously without blocking the client response
  void apiTrackerService.createLog({
    responseTime,
    endpointAccess,
    requestMethod,
    statusCode,
    timestamp,
    userId,
  });
};

/**
 * Standard Express middleware for tracking API usage across routes.
 */
export const apiTrackerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date();

  res.on('finish', () => {
    recordApiUsage(req, res, startTime, timestamp);
  });

  next();
};

export const withApiTracking = (handler: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const timestamp = new Date();

    res.on('finish', () => {
      recordApiUsage(req, res, startTime, timestamp);
    });

    return handler(req, res, next);
  };
};

export default apiTrackerMiddleware;
